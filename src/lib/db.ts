import Database from 'better-sqlite3';
import { Job } from './types';
import path from 'path';

// Singleton for SQLite connection
let db: Database.Database;

function getDb() {
  if (!db) {
    const dbPath = path.resolve(process.cwd(), 'jobs.db');
    db = new Database(dbPath);
    
    // Initialize Schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        source TEXT NOT NULL,
        posted_at TEXT,
        discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
        industry TEXT,
        company_size TEXT,
        company_stage TEXT,
        description_summary TEXT
      );

      CREATE TABLE IF NOT EXISTS job_interactions (
        user_id TEXT NOT NULL,
        job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, job_id)
      );
    `);
  }
  return db;
}

export async function createTables() {
  getDb(); // Schema managed in constructor
}

export async function saveJob(job: Partial<Job>) {
  const sqlite = getDb();
  const id = crypto.randomUUID();
  
  const stmt = sqlite.prepare(`
    INSERT INTO jobs (id, title, company, location, url, source, posted_at, industry, company_size, company_stage, description_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (url) DO UPDATE SET
      title = excluded.title,
      company = excluded.company,
      location = excluded.location,
      industry = COALESCE(jobs.industry, excluded.industry),
      company_size = COALESCE(jobs.company_size, excluded.company_size),
      company_stage = COALESCE(jobs.company_stage, excluded.company_stage),
      description_summary = COALESCE(jobs.description_summary, excluded.description_summary)
  `);

  stmt.run(
    id,
    job.title,
    job.company,
    job.location,
    job.url,
    job.source,
    job.posted_at || null,
    job.industry || null,
    job.company_size || null,
    job.company_stage || null,
    job.description_summary || null
  );

  const result = sqlite.prepare('SELECT id FROM jobs WHERE url = ?').get(job.url) as { id: string };
  return { rows: [result] };
}

export async function getJobs(userId: string) {
  const sqlite = getDb();
  const stmt = sqlite.prepare(`
    SELECT j.*, i.status as interaction_status
    FROM jobs j
    LEFT JOIN job_interactions i ON j.id = i.job_id AND i.user_id = ?
    WHERE i.status IS NULL OR i.status != 'dismissed'
    ORDER BY j.discovered_at DESC
    LIMIT 100
  `);
  
  return stmt.all(userId);
}

export async function markAsSeen(userId: string, jobId: string) {
  const sqlite = getDb();
  const stmt = sqlite.prepare(`
    INSERT INTO job_interactions (user_id, job_id, status)
    VALUES (?, ?, 'seen')
    ON CONFLICT (user_id, job_id) DO UPDATE SET status = 'seen'
  `);
  return stmt.run(userId, jobId);
}

export async function dismissJob(userId: string, jobId: string) {
  const sqlite = getDb();
  const stmt = sqlite.prepare(`
    INSERT INTO job_interactions (user_id, job_id, status)
    VALUES (?, ?, 'dismissed')
    ON CONFLICT (user_id, job_id) DO UPDATE SET status = 'dismissed'
  `);
  return stmt.run(userId, jobId);
}
