import { NextResponse } from 'next/server';
import { createTables, getUserPreferences, saveJob } from '@/lib/db';
import { normalizeJobUrl, parseSource, searchJobs, SearchListing } from '@/lib/scout';
import { enrichJob } from '@/lib/enricher';
import { AGENT_CONFIG } from '@/lib/config';
import { UserPreferences } from '@/lib/types';

export const maxDuration = 300; // 5 minutes for enrichment

type SearchCandidate = SearchListing & {
  searchRole: string;
  searchLocation: string;
  normalizedLink: string;
};

function parseListParam(searchParams: URLSearchParams, key: string): string[] {
  const values = searchParams.getAll(key).flatMap((value) => value.split(','));
  return values.map((value) => value.trim()).filter(Boolean);
}

function getAfterDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function buildPreferenceSuffix(preferences: UserPreferences | null): string {
  if (!preferences) return '';

  const requiredTerms = [
    ...preferences.work_modes,
    ...preferences.seniority,
    ...preferences.must_have_keywords,
  ]
    .map((term) => `"${term}"`)
    .join(' ');

  const excludedTerms = preferences.excluded_keywords
    .map((term) => `-"${term}"`)
    .join(' ');

  return [requiredTerms, excludedTerms].filter(Boolean).join(' ').trim();
}

function extractCompany(title: string) {
  const atMatch = title.match(/\bat\s+(.+?)(?=\s+\(|\s+-|$)/i);
  if (atMatch?.[1]) return atMatch[1].trim();

  const parts = title.split(' - ').map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return parts[1];

  const jobSuffixMatch = title.match(/(.+?)\s+Job/i);
  if (jobSuffixMatch?.[1]) return jobSuffixMatch[1].trim();

  return 'Unknown';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkOnly = searchParams.get('check') === 'true';

    // Check keys
    if (!process.env.SERPER_API_KEY || !process.env.GEMINI_API_KEY) {
      const error = `Missing API keys: ${!process.env.SERPER_API_KEY ? 'SERPER ' : ''}${!process.env.GEMINI_API_KEY ? 'GEMINI' : ''}`;
      if (checkOnly) return NextResponse.json({ success: false, error });
      throw new Error(error);
    }
    if (checkOnly) return NextResponse.json({ success: true });
    const userId = searchParams.get('userId');
    await createTables();
    const preferences = userId ? await getUserPreferences(userId) : null;

    const requestedRoles = parseListParam(searchParams, 'role');
    const requestedLocations = parseListParam(searchParams, 'location');
    const roles =
      requestedRoles.length > 0
        ? requestedRoles
        : preferences?.roles.length
          ? preferences.roles
          : AGENT_CONFIG.roles;
    const locations =
      requestedLocations.length > 0
        ? requestedLocations
        : preferences?.locations.length
          ? preferences.locations
          : AGENT_CONFIG.locations;
    const preferenceQuerySuffix = buildPreferenceSuffix(preferences);
    const searchAfterDate = getAfterDate(AGENT_CONFIG.searchLookbackDays);

    // Define sites to search
    const sites = [
      'site:boards.greenhouse.io',
      'site:jobs.lever.co',
      'site:linkedin.com/jobs'
    ];

    const targets = roles
      .flatMap((role) => locations.map((location) => ({ role, location })))
      .slice(0, 6);

    const results: SearchCandidate[] = [];
    for (const target of targets) {
      for (const site of sites) {
        const query = `${site} "${target.role}" "${target.location}" ${preferenceQuerySuffix} after:${searchAfterDate}`
          .replace(/\s+/g, ' ')
          .trim();
        const listings = await searchJobs(query);
        for (const listing of listings) {
          if (!listing.link) continue;

          results.push({
            ...listing,
            searchRole: target.role,
            searchLocation: target.location,
            normalizedLink: normalizeJobUrl(listing.link),
          });
        }
      }
    }

    // Limit and filter
    const uniqueListings = Array.from(new Map(results.map((item) => [item.normalizedLink, item])).values());
    
    const syncedJobs = [];
    let excludedCount = 0;
    let notIncludedCount = 0;
    for (const listing of uniqueListings.slice(0, 30)) {
      const company = extractCompany(listing.title);

      // Company Exclusion Filter
      if (AGENT_CONFIG.excludedCompanies.some(ex => company.toLowerCase().includes(ex.toLowerCase()))) {
        excludedCount += 1;
        continue;
      }
      
      // Company Inclusion Filter (if active)
      if (AGENT_CONFIG.includedCompanies.length > 0 && !AGENT_CONFIG.includedCompanies.some(inc => company.toLowerCase().includes(inc.toLowerCase()))) {
        notIncludedCount += 1;
        continue;
      }
      
      // Enrich with Gemini
      const metadata = await enrichJob(listing.link);

      const jobData = {
        title: listing.title.split(' - ')[0],
        company: company,
        location: listing.searchLocation,
        url: listing.normalizedLink,
        source: parseSource(listing.link),
        industry: metadata?.industry,
        company_size: metadata?.company_size,
        company_stage: metadata?.company_stage,
        description_summary: metadata?.summary,
        search_role: listing.searchRole,
        search_location: listing.searchLocation,
      };

      await saveJob(jobData);
      syncedJobs.push(jobData);
    }

    return NextResponse.json({
      success: true,
      count: syncedJobs.length,
      scanned: uniqueListings.length,
      skipped: {
        excludedCompanies: excludedCount,
        notIncludedCompanies: notIncludedCount,
      },
      targets,
      jobs: syncedJobs
    });
  } catch (error: unknown) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
