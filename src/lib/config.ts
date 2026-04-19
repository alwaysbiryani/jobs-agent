/**
 * JobScout Agent Configuration
 * 
 * Customize your job search parameters here.
 */

export const AGENT_CONFIG = {
  // Roles to scout for
  roles: ['Software Engineer', 'Product Manager', 'Founding Engineer'],
  
  // Locations to target
  locations: ['Remote', 'San Francisco', 'London', 'New York'],
  
  // Company Inclusion: If not empty, only these companies will be considered
  includedCompanies: [] as string[], 
  
  // Company Exclusion: Companies to skip if found
  excludedCompanies: ['Amazon', 'Facebook', 'Meta', 'Google'] as string[],
  
  // Search recency window in days (used to build the Google `after:` filter)
  searchLookbackDays: 14,
  
  // Sync Frequency (display only, actual schedule is in vercel.json)
  syncFrequencyHours: 24,
};
