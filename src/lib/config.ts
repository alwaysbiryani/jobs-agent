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
    'Eng': '("Software Engineer" OR "Developer" OR "Fullstack")',
    'Design': '("Product Designer" OR "UX Designer" OR "UI Designer")'
  } as Record<string, string>,

  // Locations to target
  locations: ['Remote', 'San Francisco', 'London', 'New York', 'Delhi', 'Noida', 'Gurgaon'],
  
  // Target Job Boards (Direct ATS systems)
  searchSites: [
    'site:boards.greenhouse.io',
    'site:jobs.lever.co',
    'site:linkedin.com/jobs',
    'site:jobs.ashbyhq.com',
    'site:wellfound.com/jobs',
    'site:applytojob.com',
    'site:wd5.myworkdayjobs.com'
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
