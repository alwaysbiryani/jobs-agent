import { NextResponse } from 'next/server';
import { createTables, saveJob } from '@/lib/db';
import { searchJobs, parseSource } from '@/lib/scout';
import { enrichJob } from '@/lib/enricher';
import { AGENT_CONFIG } from '@/lib/config';

export const maxDuration = 300; // 5 minutes for enrichment

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || AGENT_CONFIG.roles[0];
    const location = searchParams.get('location') || AGENT_CONFIG.locations[0];
    
    await createTables();

    // Define sites to search
    const sites = [
      'site:boards.greenhouse.io',
      'site:jobs.lever.co',
      'site:linkedin.com/jobs'
    ];

    const results = [];
    for (const site of sites) {
      const query = `${site} "${role}" "${location}" after:${AGENT_CONFIG.searchAfterDate}`;
      const listings = await searchJobs(query);
      results.push(...listings);
    }

    // Limit and filter
    const uniqueListings = Array.from(new Map(results.map(item => [item.link, item])).values());
    
    const syncedJobs = [];
    for (const listing of uniqueListings.slice(0, 15)) {
      // Basic extraction from snippet/title
      const companyMatch = listing.title.match(/at\s+(.*?)(?=\s+|$)/) || listing.title.match(/(.*?)\s+Job/) || [null, listing.title.split(' - ')[1] || 'Unknown'];
      const company = companyMatch[1] || 'Unknown';

      // Company Exclusion Filter
      if (AGENT_CONFIG.excludedCompanies.some(ex => company.toLowerCase().includes(ex.toLowerCase()))) {
        console.log(`Skipping excluded company: ${company}`);
        continue;
      }
      
      // Company Inclusion Filter (if active)
      if (AGENT_CONFIG.includedCompanies.length > 0 && !AGENT_CONFIG.includedCompanies.some(inc => company.toLowerCase().includes(inc.toLowerCase()))) {
        console.log(`Skipping non-included company: ${company}`);
        continue;
      }
      console.log(`Processing: ${listing.title} at ${listing.snippet}`);
      
      // Basic extraction from snippet/title
      const companyMatch = listing.title.match(/at\s+(.*?)(?=\s+|$)/) || listing.title.match(/(.*?)\s+Job/) || [null, listing.title.split(' - ')[1] || 'Unknown'];
      const company = companyMatch[1] || 'Unknown';

      // Enrich with Gemini
      const metadata = await enrichJob(listing.link);

      const jobData = {
        title: listing.title.split(' - ')[0],
        company: company,
        location: location,
        url: listing.link,
        source: parseSource(listing.link),
        industry: metadata?.industry,
        company_size: metadata?.company_size,
        company_stage: metadata?.company_stage,
        description_summary: metadata?.summary
      };

      await saveJob(jobData);
      syncedJobs.push(jobData);
    }

    return NextResponse.json({ success: true, count: syncedJobs.length, jobs: syncedJobs });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
