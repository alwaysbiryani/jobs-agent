/**
 * JobScout Agent Configuration
 * 
 * Customize your job search parameters here.
 */

export const AGENT_CONFIG = {
  // Roles to scout for
  roles: ['Software Engineer', 'Product Manager', 'Founding Engineer'],
  
  // Role Synonyms: Automatically expands short searches
  synonyms: {
    'Product': '("Product Manager" OR "Product Owner" OR "Product Lead")',
    'Senior Product Manager': '("Senior Product Manager" OR "Lead Product Manager" OR "Principal Product Manager" OR "Director of Product")',
    'Senior PM': '("Senior Product Manager" OR "Lead Product Manager" OR "Principal Product Manager" OR "Director of Product")',
    'Eng': '("Software Engineer" OR "Developer" OR "Fullstack")',
    'Design': '("Product Designer" OR "UX Designer" OR "UI Designer")'
  } as Record<string, string>,

  // Locations to target
  locations: ['Remote', 'San Francisco', 'London', 'New York', 'Dubai', 'Delhi', 'Noida', 'Gurgaon'],
  
  // Location Synonyms: Expands specific cities to regions/country names
  locationSynonyms: {
    'Dubai': '(Dubai OR UAE OR "United Arab Emirates")',
    'Delhi': '(Delhi OR Noida OR Gurgaon OR NCR)',
    'SF': '("San Francisco" OR "Bay Area")',
    'London': '(London OR "United Kingdom" OR UK)'
  } as Record<string, string>,

  // Target Job Boards (Direct ATS systems)
  searchSites: [
    'site:boards.greenhouse.io',
    'site:jobs.lever.co',
    'site:linkedin.com/jobs',
    'site:jobs.ashbyhq.com',
    'site:wellfound.com/jobs',
    'site:applytojob.com',
    'site:wd5.myworkdayjobs.com',
    'site:bayt.com',
    'site:gulftalent.com',
    'site:drjobs.ae'
  ],

  // Company Inclusion: If not empty, only these companies will be considered
  includedCompanies: [] as string[], 
  
  // Company Exclusion: Companies to skip if found
  excludedCompanies: ['Amazon', 'Facebook', 'Meta', 'Google'] as string[],
  
  // Search recency (Google search 'after:' operator)
  searchAfterDate: '2025-04-01',
  
  // Sync Frequency (display only, actual schedule is in vercel.json)
  syncFrequencyHours: 6,
};
