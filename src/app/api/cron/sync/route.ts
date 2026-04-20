import { NextResponse } from 'next/server';
import { createTables, saveJob } from '@/lib/db';
import { searchJobsWithKey, parseSource } from '@/lib/scout';
import { enrichJobWithKey } from '@/lib/enricher';
import { AGENT_CONFIG } from '@/lib/config';

export const maxDuration = 300; // 5 minutes for enrichment

type SearchListing = {
  title?: string;
  link?: string;
  snippet?: string;
};

type RankedListing = SearchListing & {
  relevanceScore: number;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenize(value: string) {
  return value
    .replace(/[()"]/g, ' ')
    .split(/\s+OR\s+|\s+/i)
    .map(token => token.trim())
    .filter(token => token.length > 2 && !['and', 'or'].includes(token.toLowerCase()));
}

function getRecentAfterDate(daysAgo = 45) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function buildQueryVariants(site: string, role: string, location: string, afterDate: string) {
  return [
    `${site} ${role} ${location} (hiring OR careers OR opening) after:${afterDate}`,
    `${site} ${role} ${location} (job OR role)`,
    `${site} ${role} (remote OR hybrid OR onsite)`,
  ];
}

function calcRelevanceScore(
  listing: SearchListing,
  roleTokens: string[],
  locationTokens: string[]
) {
  const title = (listing.title || '').toLowerCase();
  const snippet = (listing.snippet || '').toLowerCase();
  const text = `${title} ${snippet}`;
  const link = (listing.link || '').toLowerCase();
  let score = 0;

  for (const token of roleTokens) {
    const rx = new RegExp(`\\b${escapeRegex(token.toLowerCase())}\\b`, 'i');
    if (rx.test(text)) score += title.includes(token.toLowerCase()) ? 5 : 3;
  }

  for (const token of locationTokens) {
    const rx = new RegExp(`\\b${escapeRegex(token.toLowerCase())}\\b`, 'i');
    if (rx.test(text) || link.includes(token.toLowerCase())) score += 2;
  }

  if (title.includes('senior') || title.includes('staff') || title.includes('lead')) score += 1;
  if (title.includes('intern') || title.includes('graduate')) score -= 3;
  if (link.includes('/jobs') || link.includes('/careers')) score += 1;

  return score;
}

function rankListings(
  listings: SearchListing[],
  roleTokens: string[],
  locationTokens: string[]
): RankedListing[] {
  const ranked = listings
    .map(item => ({ ...item, relevanceScore: calcRelevanceScore(item, roleTokens, locationTokens) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const strict = ranked.filter(item => item.relevanceScore >= 3);
  if (strict.length > 0) return strict;

  // Never hard-fail at ranking time if we still have potentially useful leads.
  // Keep top candidates with non-negative signal to reduce false "zero result" outcomes.
  return ranked.filter(item => item.relevanceScore >= 0).slice(0, 25);
}

function extractCompany(title: string) {
  const patterns = [
    / at ([^-|]+)/i,
    /^([^-|]+)\s+(?:is\s+)?hiring/i,
    / - ([^-|]+)$/
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match?.[1]) return match[1].trim();
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

    const roleParam = searchParams.get('role') || AGENT_CONFIG.roles[0];
    const locationParam = searchParams.get('location') || AGENT_CONFIG.locations[0];

    // Broaden role using synonyms, avoiding double quotes if already present
    const role = AGENT_CONFIG.synonyms[roleParam] ||
                 (roleParam.startsWith('"') ? roleParam : `"${roleParam}"`);

    // Expand location using config map, defaulting to quoted search
    const location = AGENT_CONFIG.locationSynonyms[locationParam] ||
                    (locationParam.startsWith('"') ? locationParam : `"${locationParam}"`);

    await createTables();

    // Merge config sites with any user-supplied custom boards
    const customSitesParam = searchParams.get('customSites');
    const customSites = customSitesParam
      ? customSitesParam.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const sites = [...AGENT_CONFIG.searchSites, ...customSites];

    const results: SearchListing[] = [];
    const recentAfterDate = getRecentAfterDate();
    const roleTokens = tokenize(roleParam);
    const locationTokens = tokenize(locationParam);

    for (const site of sites) {
      const queryVariants = buildQueryVariants(site, role, location, recentAfterDate);
      const siteResults: SearchListing[] = [];

      for (const query of queryVariants) {
        console.log(`Searching: ${query}`);
        const listings = await searchJobsWithKey(query, serperKey);
        siteResults.push(...listings);
        if (siteResults.length >= 10) break;
      }

      console.log(`Found ${siteResults.length} raw results for ${site}`);
      results.push(...siteResults);
    }

    // Deduplicate
    const uniqueListings = Array.from(new Map(results.filter(item => !!item.link).map(item => [item.link, item])).values());
    const rankedListings = rankListings(uniqueListings, roleTokens, locationTokens);

    console.log(`Unique listings found: ${uniqueListings.length}`);
    console.log(`Relevant listings after ranking: ${rankedListings.length}`);

    if (rankedListings.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No relevant jobs found for ${roleParam} in ${locationParam}. Try broadening the role/location, or add more boards in settings.`,
        stats: {
          rawResults: results.length,
          uniqueResults: uniqueListings.length,
          relevantResults: 0
        }
      }, { status: 404 });
    }

    const syncedJobs = [];
    for (const listing of rankedListings.slice(0, 15)) {
      const safeTitle = listing.title || 'Unknown Role';
      const safeLink = listing.link || '';
      const company = extractCompany(safeTitle);

      if (!safeLink) {
        console.log(`Skipping result with missing link: ${safeTitle}`);
        continue;
      }

      if (AGENT_CONFIG.excludedCompanies.some(ex => company.toLowerCase().includes(ex.toLowerCase()))) {
        console.log(`Skipping excluded company: ${company}`);
        continue;
      }

      if (AGENT_CONFIG.includedCompanies.length > 0 && !AGENT_CONFIG.includedCompanies.some(inc => company.toLowerCase().includes(inc.toLowerCase()))) {
        console.log(`Skipping non-included company: ${company}`);
        continue;
      }

      console.log(`Enriching: ${safeTitle} from ${safeLink}`);
      const metadata = await enrichJobWithKey(safeLink, geminiKey);

      if (!metadata) {
        console.warn(`Failed to enrich job at ${safeLink}`);
      }

      const jobData = {
        title: safeTitle.split(' - ')[0],
        company: company,
        location: locationParam,
        url: safeLink,
        source: parseSource(safeLink),
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
    return NextResponse.json({
      success: true,
      count: syncedJobs.length,
      jobs: syncedJobs,
      stats: {
        rawResults: results.length,
        uniqueResults: uniqueListings.length,
        relevantResults: rankedListings.length
      }
    });
  } catch (error: unknown) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
