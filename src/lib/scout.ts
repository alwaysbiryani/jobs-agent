const SERPER_API_KEY = process.env.SERPER_API_KEY;

export async function searchJobs(query: string, useFallback = true) {
  if (!SERPER_API_KEY) {
    console.error('SERPER_API_KEY is missing');
    return [];
  }

  const performSearch = async (q: string, tbs?: string) => {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: q,
        num: 40, // Increased for better selection
        tbs: tbs,
      }),
    });
    const data = await response.json();
    return data.organic || [];
  };

  // Try with past week first
  let results = await performSearch(query, 'qdr:w');
  
  // Fallback: Try with past month if no results
  if (results.length === 0 && useFallback) {
    console.log('No results found for past week, falling back to past month...');
    results = await performSearch(query, 'qdr:m');
  }

  // Final Fallback: Try without any time restriction or role quotes if still nothing
  if (results.length === 0 && useFallback) {
    console.log('No results found for past month, falling back to broad search...');
    // Remove "after:" if present in query string for final fallback
    const broadQuery = query.split(' after:')[0].replace(/"/g, '');
    results = await performSearch(broadQuery);
  }

  return results;
}

export function parseSource(url: string): 'linkedin' | 'greenhouse' | 'lever' | 'other' {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  return 'other';
}
