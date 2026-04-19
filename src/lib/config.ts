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
  includedCompanies: [], 
  
  // Company Exclusion: Companies to skip if found
  excludedCompanies: ['Amazon', 'Facebook', 'Meta', 'Google'],
  
  // Search recency (Google search 'after:' operator)
  searchAfterDate: '2025-04-01',
  
  // Sync Frequency (display only, actual schedule is in vercel.json)
  syncFrequencyHours: 6,
};
