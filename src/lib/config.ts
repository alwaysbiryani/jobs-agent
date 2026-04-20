/**
 * JobScout Agent Configuration
 */

export const AGENT_CONFIG = {
  roles: ['Software Engineer', 'Product Manager', 'Founding Engineer'],

  synonyms: {
    Product: '("Product Manager" OR "Product Owner" OR "Product Lead")',
    'Senior Product Manager': '("Senior Product Manager" OR "Lead Product Manager" OR "Principal Product Manager" OR "Director of Product")',
    'Senior PM': '("Senior Product Manager" OR "Lead Product Manager" OR "Principal Product Manager" OR "Director of Product")',
    Eng: '("Software Engineer" OR "Developer" OR "Fullstack")',
    Design: '("Product Designer" OR "UX Designer" OR "UI Designer")',
  } as Record<string, string>,

  locations: ['Remote', 'San Francisco', 'London', 'New York', 'Dubai', 'Delhi', 'Noida', 'Gurgaon'],

  locationSynonyms: {
    Dubai: '(Dubai OR UAE OR "United Arab Emirates")',
    Delhi: '(Delhi OR Noida OR Gurgaon OR NCR)',
    SF: '("San Francisco" OR "Bay Area")',
    London: '(London OR "United Kingdom" OR UK)',
  } as Record<string, string>,

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
    'site:drjobs.ae',
  ],

  includedCompanies: [] as string[],
  excludedCompanies: ['Amazon', 'Facebook', 'Meta', 'Google'] as string[],

  // Display only. Actual schedule is controlled by deployment cron config.
  syncFrequencyHours: 24,
};
