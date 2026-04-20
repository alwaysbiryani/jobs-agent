import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSchemaReady, saveJob } from '@/lib/db';
import { toErrorResponse } from '@/lib/errors';
import { enrichJobWithKey } from '@/lib/enricher';
import { AGENT_CONFIG } from '@/lib/config';
import { parseSource, searchJobsWithKey } from '@/lib/scout';

export const maxDuration = 300;

const syncSchema = z.object({
  role: z.string().min(2).max(120).optional(),
  location: z.string().min(2).max(120).optional(),
  customSites: z.array(z.string()).max(12).optional().default([]),
});

type AuthResult = {
  authenticated: boolean;
  usedLegacy: boolean;
};

function getBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim();
}

function resolveCronAuth(request: Request, searchParams?: URLSearchParams): AuthResult {
  const expected = process.env.CRON_SECRET;
  if (!expected) return { authenticated: true, usedLegacy: false };

  const bearer = getBearerToken(request);
  if (bearer && bearer === expected) return { authenticated: true, usedLegacy: false };

  const headerSecret = request.headers.get('x-cron-secret');
  if (headerSecret && headerSecret === expected) return { authenticated: true, usedLegacy: true };

  const queryToken = searchParams?.get('token');
  if (queryToken && queryToken === expected) return { authenticated: true, usedLegacy: true };

  return { authenticated: false, usedLegacy: false };
}

function syncResponse(body: unknown, status: number, auth?: AuthResult) {
  const headers = new Headers();
  if (auth?.usedLegacy) {
    headers.set('X-Auth-Deprecated', 'true');
  }

  return NextResponse.json(body, { status, headers });
}

function readHeaderKey(request: Request, key: string) {
  const value = request.headers.get(key);
  return value ? value.trim() : '';
}

function resolveSyncKeys(request: Request, allowServerKeys: boolean) {
  const serperFromHeader = readHeaderKey(request, 'x-serper-key');
  const geminiFromHeader = readHeaderKey(request, 'x-gemini-key');

  const serperFromEnv = allowServerKeys ? process.env.SERPER_API_KEY || '' : '';
  const geminiFromEnv = allowServerKeys ? process.env.GEMINI_API_KEY || '' : '';

  return {
    serperKey: serperFromHeader || serperFromEnv,
    geminiKey: geminiFromHeader || geminiFromEnv || undefined,
  };
}

function sanitizeSite(site: string) {
  const trimmed = site.trim().toLowerCase();
  const bare = trimmed.startsWith('site:') ? trimmed.slice(5) : trimmed;
  const validDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/.test(bare);
  if (!validDomain) return null;
  return `site:${bare}`;
}

function cleanInput(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeRole(roleParam: string) {
  const cleanedRole = cleanInput(roleParam);
  return AGENT_CONFIG.synonyms[cleanedRole] || (cleanedRole.startsWith('"') ? cleanedRole : `"${cleanedRole}"`);
}

function normalizeLocation(locationParam: string) {
  const cleanedLocation = cleanInput(locationParam);
  const locationMap = AGENT_CONFIG.locationSynonyms;
  return locationMap[cleanedLocation] || (cleanedLocation.startsWith('"') ? cleanedLocation : `"${cleanedLocation}"`);
}

function buildSearchQueries(site: string, roleParam: string, locationParam: string, afterDate: string) {
  const strictRole = normalizeRole(roleParam);
  const strictLocation = normalizeLocation(locationParam);
  const broadRole = roleParam.replace(/"/g, '').trim();
  const broadLocation = locationParam.replace(/"/g, '').trim();
  const strict = `${site} ${strictRole} ${strictLocation} after:${afterDate}`;
  const relaxed = `${site} ${strictRole} ${strictLocation}`;
  const broad = `${site} ${broadRole} ${broadLocation} job`;

  return {
    strict,
    relaxed,
    broad,
  };
}

function scoreListingRelevance(title: string, role: string, location: string) {
  const titleLower = title.toLowerCase();
  const roleTokens = role
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
  const locationTokens = location
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
  const roleHits = roleTokens.filter((token) => titleLower.includes(token)).length;
  const locationHits = locationTokens.filter((token) => titleLower.includes(token)).length;
  return roleHits * 2 + locationHits;
}

function extractCompany(title: string, source: string) {
  const normalized = title.replace(/\s+/g, ' ').trim();
  const patterns = [/\s+at\s+([^|,-]+)/i, /\s+\|\s+([^|,-]+)/, /\s+-\s+([^|,-]+)/, /([^|,-]+)\s+(is hiring|careers|jobs?)/i];
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

function getSearchAfterDate() {
  const days = Number(process.env.SEARCH_LOOKBACK_DAYS || '14');
  const target = new Date(Date.now() - Math.max(days, 1) * 24 * 60 * 60 * 1000);
  return target.toISOString().slice(0, 10);
}

async function runSync({
  roleParam,
  locationParam,
  customSites,
  serperKey,
  geminiKey,
}: {
  roleParam: string;
  locationParam: string;
  customSites: string[];
  serperKey: string;
  geminiKey?: string;
}) {
  const cleanRoleParam = cleanInput(roleParam);
  const cleanLocationParam = cleanInput(locationParam);

  // Preflight schema/database connectivity before network-heavy crawl operations.
  await ensureSchemaReady();

  const safeCustomSites = customSites.map(sanitizeSite).filter((site): site is string => Boolean(site));
  const sites = Array.from(new Set([...AGENT_CONFIG.searchSites, ...safeCustomSites]));
  const afterDate = getSearchAfterDate();

  const rawResults: Array<{ title: string; link: string; snippet?: string }> = [];
  for (const site of sites) {
    const listingsForSite: Array<{ title: string; link: string; snippet?: string }> = [];
    const queries = buildSearchQueries(site, cleanRoleParam, cleanLocationParam, afterDate);

    const strictListings = await searchJobsWithKey(queries.strict, serperKey, true);
    listingsForSite.push(...strictListings);

    if (listingsForSite.length < 10) {
      const relaxedListings = await searchJobsWithKey(queries.relaxed, serperKey, false);
      listingsForSite.push(...relaxedListings);
    }

    if (listingsForSite.length < 10) {
      const broadListings = await searchJobsWithKey(queries.broad, serperKey, false);
      listingsForSite.push(...broadListings);
    }

    rawResults.push(...listingsForSite);
  }

  const deduped = Array.from(new Map(rawResults.map((item) => [item.link, item])).values())
    .filter((item) => item?.link && item?.title)
    .map((item) => ({
      item,
      score: scoreListingRelevance(item.title, cleanRoleParam, cleanLocationParam),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  if (deduped.length === 0) {
    return {
      success: false,
      error: `No jobs found for ${cleanRoleParam} in ${cleanLocationParam}. Try broader role/location terms.`,
      enrichmentEnabled: Boolean(geminiKey),
    };
  }

  const syncedJobs = [];
  for (const listing of deduped.slice(0, 25)) {
    const source = parseSource(listing.link);
    const company = extractCompany(listing.title, source);

    if (AGENT_CONFIG.excludedCompanies.some((ex) => company.toLowerCase().includes(ex.toLowerCase()))) {
      continue;
    }

    if (
      AGENT_CONFIG.includedCompanies.length > 0 &&
      !AGENT_CONFIG.includedCompanies.some((inc) => company.toLowerCase().includes(inc.toLowerCase()))
    ) {
      continue;
    }

    const metadata = geminiKey ? await enrichJobWithKey(listing.link, geminiKey) : null;

    const jobData = {
      title: listing.title.split(' - ')[0].trim(),
      company,
      location: cleanLocationParam,
      url: listing.link,
      source,
      industry: metadata?.industry,
      company_size: metadata?.company_size,
      company_stage: metadata?.company_stage,
      description_summary: metadata?.summary,
      search_role: cleanRoleParam,
      search_location: cleanLocationParam,
    };

    await saveJob(jobData);
    syncedJobs.push(jobData);
  }

  return {
    success: true,
    count: syncedJobs.length,
    jobs: syncedJobs,
    enrichmentEnabled: Boolean(geminiKey),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkOnly = searchParams.get('check') === 'true';

  const auth = resolveCronAuth(request, searchParams);
  if (process.env.CRON_SECRET && !auth.authenticated) {
    return NextResponse.json({ code: 'UNAUTHORIZED', success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { serperKey, geminiKey } = resolveSyncKeys(request, true);
  if (!serperKey) {
    return syncResponse(
      { code: 'MISSING_SERPER_API_KEY', success: false, error: 'Missing required Serper API key.' },
      checkOnly ? 200 : 400,
      auth
    );
  }

  if (checkOnly) {
    return syncResponse({ success: true, enrichmentEnabled: Boolean(geminiKey) }, 200, auth);
  }

  const roleParam = searchParams.get('role') || AGENT_CONFIG.roles[0];
  const locationParam = searchParams.get('location') || AGENT_CONFIG.locations[0];
  const customSites = (searchParams.get('customSites') || '')
    .split(',')
    .map((site) => site.trim())
    .filter(Boolean);

  try {
    const result = await runSync({ roleParam, locationParam, customSites, serperKey, geminiKey });
    return syncResponse(result, result.success ? 200 : 404, auth);
  } catch (error: unknown) {
    console.error('Sync error (GET):', error);
    const normalized = toErrorResponse(error);
    return syncResponse(normalized.body, normalized.status, auth);
  }
}

export async function POST(request: Request) {
  const auth = resolveCronAuth(request);
  const { serperKey, geminiKey } = resolveSyncKeys(request, auth.authenticated);

  if (!serperKey) {
    return NextResponse.json(
      {
        code: 'MISSING_SERPER_API_KEY',
        success: false,
        error: 'Missing required Serper API key. Provide x-serper-key or configure SERPER_API_KEY for trusted cron calls.',
      },
      { status: 400 }
    );
  }

  try {
    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json(
        { code: 'INVALID_REQUEST', success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const payload = syncSchema.safeParse(parsedBody);
    if (!payload.success) {
      return NextResponse.json(
        { code: 'INVALID_REQUEST', success: false, error: 'Invalid sync payload', details: payload.error.flatten() },
        { status: 400 }
      );
    }

    const roleParam = payload.data.role || AGENT_CONFIG.roles[0];
    const locationParam = payload.data.location || AGENT_CONFIG.locations[0];

    const result = await runSync({
      roleParam,
      locationParam,
      customSites: payload.data.customSites,
      serperKey,
      geminiKey,
    });

    return syncResponse(result, result.success ? 200 : 404, auth);
  } catch (error: unknown) {
    console.error('Sync error (POST):', error);
    const normalized = toErrorResponse(error);
    return syncResponse(normalized.body, normalized.status, auth);
  }
}
