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
  
  // Status tracking
  is_seen?: boolean;
}

export interface UserInteraction {
  user_id: string;
  job_id: string;
  status: 'seen' | 'dismissed' | 'applied';
  created_at: string;
}
