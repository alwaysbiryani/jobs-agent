const SERPER_API_KEY = process.env.SERPER_API_KEY;

export async function searchJobs(query: string, useFallback = true) {
  if (!SERPER_API_KEY) {
    console.error('SERPER_API_KEY is missing');
    return [];
  }

  const performSearch = async (q: string, tbs?: string) => {
    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: q,
          num: 40,
          tbs: tbs,
        }),
      });
      const data = await response.json();
      
      if (data.error) {
        console.error('Serper API Error:', data.error);
        return [];
      }
      
      if (!data.organic || data.organic.length === 0) {
        console.log(`Zero results for: ${q} (range: ${tbs || 'broad'})`);
      }
      
      return data.organic || [];
    } catch (err) {
      console.error('Serper Fetch Error:', err);
      return [];
    }
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

export function parseSource(url: string): 'linkedin' | 'greenhouse' | 'lever' | 'ashby' | 'wellfound' | 'workday' | 'bayt' | 'gulftalent' | 'other' {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('ashbyhq.com')) return 'ashby';
  if (url.includes('wellfound.com') || url.includes('angellist')) return 'wellfound';
  if (url.includes('myworkdayjobs.com')) return 'workday';
  if (url.includes('bayt.com')) return 'bayt';
  if (url.includes('gulftalent.com')) return 'gulftalent';
  return 'other';
}
