const SERPER_API_KEY = process.env.SERPER_API_KEY;

export interface SearchListing {
  title: string;
  link: string;
  snippet?: string;
  date?: string;
}

interface SerperResponse {
  organic?: SearchListing[];
}

export async function searchJobs(query: string): Promise<SearchListing[]> {
  if (!SERPER_API_KEY) {
    console.error('SERPER_API_KEY is missing');
    return [];
  }

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: 20,
      tbs: 'qdr:w', // Past week
    }),
  });

  if (!response.ok) {
    console.error(`Serper request failed: ${response.status}`);
    return [];
  }

  const data = (await response.json()) as SerperResponse;
  return data.organic || [];
}

export function parseSource(url: string): 'linkedin' | 'greenhouse' | 'lever' | 'other' {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  return 'other';
}

export function normalizeJobUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';

    if (parsed.hostname.includes('linkedin.com')) {
      parsed.pathname = parsed.pathname.replace(/\/$/, '');
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
