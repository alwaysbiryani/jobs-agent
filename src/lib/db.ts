import { sql } from '@vercel/postgres';
import { Job } from './types';

export async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL,
      posted_at TIMESTAMPTZ,
      discovered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      industry TEXT,
      company_size TEXT,
      company_stage TEXT,
      description_summary TEXT
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS job_interactions (
      user_id TEXT NOT NULL,
      job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, job_id)
    );
  `;
}

export async function saveJob(job: Partial<Job>) {
  return await sql`
    INSERT INTO jobs (title, company, location, url, source, posted_at, industry, company_size, company_stage, description_summary)
    VALUES (${job.title}, ${job.company}, ${job.location}, ${job.url}, ${job.source}, ${job.posted_at || null}, ${job.industry || null}, ${job.company_size || null}, ${job.company_stage || null}, ${job.description_summary || null})
    ON CONFLICT (url) DO UPDATE SET
      title = EXCLUDED.title,
      company = EXCLUDED.company,
      location = EXCLUDED.location,
      industry = COALESCE(jobs.industry, EXCLUDED.industry),
      company_size = COALESCE(jobs.company_size, EXCLUDED.company_size),
      company_stage = COALESCE(jobs.company_stage, EXCLUDED.company_stage),
      description_summary = COALESCE(jobs.description_summary, EXCLUDED.description_summary)
    RETURNING id;
  `;
}

export async function getJobs(userId: string) {
  const { rows } = await sql`
    SELECT j.*, i.status as interaction_status
    FROM jobs j
    LEFT JOIN job_interactions i ON j.id = i.job_id AND i.user_id = ${userId}
    WHERE i.status IS NULL OR i.status != 'dismissed'
    ORDER BY j.discovered_at DESC
    LIMIT 100;
  `;
  return rows;
}

export async function markAsSeen(userId: string, jobId: string) {
  return await sql`
    INSERT INTO job_interactions (user_id, job_id, status)
    VALUES (${userId}, ${jobId}, 'seen')
    ON CONFLICT (user_id, job_id) DO UPDATE SET status = 'seen';
  `;
}

export async function dismissJob(userId: string, jobId: string) {
  return await sql`
    INSERT INTO job_interactions (user_id, job_id, status)
    VALUES (${userId}, ${jobId}, 'dismissed')
    ON CONFLICT (user_id, job_id) DO UPDATE SET status = 'dismissed';
  `;
}
