export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: 'linkedin' | 'greenhouse' | 'lever' | 'other';
  posted_at: string;
  discovered_at: string;
  
  // Enriched metadata
  industry?: string;
  company_size?: string;
  company_stage?: string;
  description_summary?: string;
  search_role?: string;
  search_location?: string;
  
  // Status tracking
  is_seen?: boolean;
  interaction_status?: JobStatus;
}

export type JobStatus = 'seen' | 'saved' | 'dismissed' | 'applied' | 'interviewing';
export type JobView = 'new' | 'saved' | 'applied' | 'interviewing' | 'dismissed' | 'all';

export interface UserInteraction {
  user_id: string;
  job_id: string;
  status: JobStatus;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  roles: string[];
  locations: string[];
  work_modes: string[];
  seniority: string[];
  must_have_keywords: string[];
  excluded_keywords: string[];
  updated_at: string;
}
