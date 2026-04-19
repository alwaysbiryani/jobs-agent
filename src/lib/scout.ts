const SERPER_API_KEY = process.env.SERPER_API_KEY;

export async function searchJobs(query: string) {
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

  const data = await response.json();
  return data.organic || [];
}

export function parseSource(url: string): 'linkedin' | 'greenhouse' | 'lever' | 'other' {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  return 'other';
}
