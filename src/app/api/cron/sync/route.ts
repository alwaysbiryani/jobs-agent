import { NextResponse } from 'next/server';
import { createTables, saveJob } from '@/lib/db';
import { searchJobsWithKey, parseSource } from '@/lib/scout';
import { enrichJobWithKey } from '@/lib/enricher';
import { AGENT_CONFIG } from '@/lib/config';

export const maxDuration = 300; // 5 minutes for enrichment

function cleanInput(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeRole(role: string) {
  const cleanedRole = cleanInput(role);
  return AGENT_CONFIG.synonyms[cleanedRole] ||
    (cleanedRole.startsWith('"') ? cleanedRole : `"${cleanedRole}"`);
}

function normalizeLocation(location: string) {
  const cleanedLocation = cleanInput(location);
  return AGENT_CONFIG.locationSynonyms[cleanedLocation] ||
    (cleanedLocation.startsWith('"') ? cleanedLocation : `"${cleanedLocation}"`);
}

function buildSearchQueries(site: string, roleParam: string, locationParam: string) {
  const strictRole = normalizeRole(roleParam);
  const strictLocation = normalizeLocation(locationParam);
  const broadRole = roleParam.replace(/"/g, '').trim();
  const broadLocation = locationParam.replace(/"/g, '').trim();

  const strict = `${site} ${strictRole} ${strictLocation} after:${AGENT_CONFIG.searchAfterDate}`;
  const relaxed = `${site} ${strictRole} ${strictLocation}`;
  const broad = `${site} ${broadRole} ${broadLocation} job`;

  return [strict, relaxed, broad];
}

function scoreListingRelevance(title: string, roleParam: string, locationParam: string) {
  const titleLower = title.toLowerCase();
  const roleTokens = roleParam
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
  const locationTokens = locationParam
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);

  const roleHits = roleTokens.filter(token => titleLower.includes(token)).length;
  const locationHits = locationTokens.filter(token => titleLower.includes(token)).length;

  return roleHits * 2 + locationHits;
}

function extractCompany(title: string, source: string) {
  const normalized = title.replace(/\s+/g, ' ').trim();
  const patterns = [
    /\s+at\s+([^|,-]+)/i,
    /\s+\|\s+([^|,-]+)/,
    /\s+-\s+([^|,-]+)/,
    /([^|,-]+)\s+(is hiring|careers|jobs?)/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  if (source.includes('linkedin')) {
    const linkedInPieces = normalized.split(' - ');
    if (linkedInPieces.length > 1) return linkedInPieces[1].trim();
  }

  return 'Unknown';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const headers = request.headers;
    const checkOnly = searchParams.get('check') === 'true';

    // BYOK: accept user-supplied keys from headers as fallbacks
    const serperKey = process.env.SERPER_API_KEY || headers.get('x-serper-key') || '';
    const geminiKey = process.env.GEMINI_API_KEY || headers.get('x-gemini-key') || '';

    // Check keys
    if (!serperKey || !geminiKey) {
      const error = `Missing API keys: ${!serperKey ? 'SERPER ' : ''}${!geminiKey ? 'GEMINI' : ''}`;
      if (checkOnly) return NextResponse.json({ success: false, error });
      throw new Error(error);
    }
    if (checkOnly) return NextResponse.json({ success: true });

    const roleParam = cleanInput(searchParams.get('role') || AGENT_CONFIG.roles[0]);
    const locationParam = cleanInput(searchParams.get('location') || AGENT_CONFIG.locations[0]);

    await createTables();

    // Merge config sites with any user-supplied custom boards
    const customSitesParam = searchParams.get('customSites');
    const customSites = customSitesParam
      ? customSitesParam.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const sites = [...AGENT_CONFIG.searchSites, ...customSites];

    const results = [];
    for (const site of sites) {
      const listingsForSite = [];
      const queries = buildSearchQueries(site, roleParam, locationParam);
      for (const query of queries) {
        if (listingsForSite.length >= 10) break;
        console.log(`Searching: ${query}`);
        const listings = await searchJobsWithKey(query, serperKey, false);
        console.log(`Found ${listings.length} results for ${site}`);
        listingsForSite.push(...listings);
      }
      results.push(...listingsForSite);
    }

    // Deduplicate
    const uniqueListings = Array.from(new Map(results.map(item => [item.link, item])).values());
    console.log(`Unique listings found: ${uniqueListings.length}`);

    const relevantListings = uniqueListings
      .map(listing => ({
        ...listing,
        relevanceScore: scoreListingRelevance(listing.title || '', roleParam, locationParam)
      }))
      .filter(listing => listing.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(`Relevant listings after scoring: ${relevantListings.length}`);

    if (relevantListings.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No relevant jobs found for ${roleParam} in ${locationParam}. Try broader role/location terms or add more boards.`
      }, { status: 404 });
    }

    const syncedJobs = [];
    for (const listing of relevantListings.slice(0, 20)) {
      const company = extractCompany(listing.title || '', listing.link || '');

      if (AGENT_CONFIG.excludedCompanies.some(ex => company.toLowerCase().includes(ex.toLowerCase()))) {
        console.log(`Skipping excluded company: ${company}`);
        continue;
      }

      if (AGENT_CONFIG.includedCompanies.length > 0 && !AGENT_CONFIG.includedCompanies.some(inc => company.toLowerCase().includes(inc.toLowerCase()))) {
        console.log(`Skipping non-included company: ${company}`);
        continue;
      }

      console.log(`Enriching: ${listing.title} from ${listing.link}`);
      const metadata = await enrichJobWithKey(listing.link, geminiKey);

      if (!metadata) {
        console.warn(`Failed to enrich job at ${listing.link}`);
      }

      const jobData = {
        title: listing.title.split(' - ')[0],
        company: company,
        location: locationParam,
        url: listing.link,
        source: parseSource(listing.link),
        industry: metadata?.industry,
        company_size: metadata?.company_size,
        company_stage: metadata?.company_stage,
        description_summary: metadata?.summary,
        search_role: roleParam,
        search_location: locationParam
      };

      await saveJob(jobData);
      syncedJobs.push(jobData);
    }

    console.log(`Successfully synced ${syncedJobs.length} jobs.`);
    return NextResponse.json({ success: true, count: syncedJobs.length, jobs: syncedJobs });
  } catch (error: unknown) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
