import { NextResponse } from 'next/server';
import { createTables, saveJob } from '@/lib/db';
import { searchJobsWithKey, parseSource } from '@/lib/scout';
import { enrichJobWithKey } from '@/lib/enricher';
import { AGENT_CONFIG } from '@/lib/config';

export const maxDuration = 300; // 5 minutes for enrichment

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
    const location = (AGENT_CONFIG as any).locationSynonyms[locationParam] ||
                    (locationParam.startsWith('"') ? locationParam : `"${locationParam}"`);

    await createTables();

    // Merge config sites with any user-supplied custom boards
    const customSitesParam = searchParams.get('customSites');
    const customSites = customSitesParam
      ? customSitesParam.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const sites = [...AGENT_CONFIG.searchSites, ...customSites];

    const results = [];
    for (const site of sites) {
      const query = `${site} ${role} ${location} after:${AGENT_CONFIG.searchAfterDate}`;
      console.log(`Searching: ${query}`);
      const listings = await searchJobsWithKey(query, serperKey);
      console.log(`Found ${listings.length} results for ${site}`);
      results.push(...listings);
    }

    // Deduplicate
    const uniqueListings = Array.from(new Map(results.map(item => [item.link, item])).values());
    console.log(`Unique listings found: ${uniqueListings.length}`);

    if (uniqueListings.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No jobs found for ${role} in ${location}. Try broadening your search terms or checking your API limits.`
      }, { status: 404 });
    }

    const syncedJobs = [];
    for (const listing of uniqueListings.slice(0, 15)) {
      const companyMatch = listing.title.match(/at\s+(.*?)(?=\s+|$)/) || listing.title.match(/(.*?)\s+Job/) || [null, listing.title.split(' - ')[1] || 'Unknown'];
      const company = companyMatch[1] || 'Unknown';

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
        location: location,
        url: listing.link,
        source: parseSource(listing.link),
        industry: metadata?.industry,
        company_size: metadata?.company_size,
        company_stage: metadata?.company_stage,
        description_summary: metadata?.summary,
        search_role: role,
        search_location: location
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
