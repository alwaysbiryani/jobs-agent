import Database from 'better-sqlite3';
import { Job, JobStatus, JobView, UserPreferences } from './types';
import path from 'path';

type SaveJobInput = Pick<Job, 'title' | 'company' | 'location' | 'url' | 'source'> &
  Partial<
    Pick<
      Job,
      | 'posted_at'
      | 'industry'
      | 'company_size'
      | 'company_stage'
      | 'description_summary'
      | 'search_role'
      | 'search_location'
    >
  >;

let db: Database.Database;

function getDb() {
  if (!db) {
    const dbPath = path.resolve(process.cwd(), 'jobs.db');
    db = new Database(dbPath);

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
        description_summary TEXT,
        search_role TEXT,
        search_location TEXT
      );

      CREATE TABLE IF NOT EXISTS job_interactions (
        user_id TEXT NOT NULL,
        job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, job_id)
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        roles TEXT NOT NULL DEFAULT '[]',
        locations TEXT NOT NULL DEFAULT '[]',
        work_modes TEXT NOT NULL DEFAULT '[]',
        seniority TEXT NOT NULL DEFAULT '[]',
        must_have_keywords TEXT NOT NULL DEFAULT '[]',
        excluded_keywords TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  return db;
}

function parseJsonArray(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export async function createTables() {
  getDb();
}

export async function saveJob(job: SaveJobInput) {
  const sqlite = getDb();
  const id = crypto.randomUUID();

  const stmt = sqlite.prepare(`
    INSERT INTO jobs (
      id, title, company, location, url, source, posted_at,
      industry, company_size, company_stage, description_summary, search_role, search_location
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (url) DO UPDATE SET
      title = excluded.title,
      company = excluded.company,
      location = excluded.location,
      search_role = COALESCE(jobs.search_role, excluded.search_role),
      search_location = COALESCE(jobs.search_location, excluded.search_location),
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
    job.description_summary || null,
    job.search_role || null,
    job.search_location || null
  );

  const result = sqlite.prepare('SELECT id FROM jobs WHERE url = ?').get(job.url) as { id: string };
  return { rows: [result] };
}

export async function getJobs(userId: string, view: JobView = 'new') {
  const sqlite = getDb();

  const queryByView: Record<JobView, string> = {
    new: `
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      LEFT JOIN job_interactions i ON j.id = i.job_id AND i.user_id = ?
      WHERE i.status IS NULL OR i.status = 'seen'
      ORDER BY j.discovered_at DESC
      LIMIT 100
    `,
    saved: `
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      JOIN job_interactions i ON j.id = i.job_id
      WHERE i.user_id = ? AND i.status = 'saved'
      ORDER BY i.created_at DESC
      LIMIT 100
    `,
    applied: `
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      JOIN job_interactions i ON j.id = i.job_id
      WHERE i.user_id = ? AND i.status = 'applied'
      ORDER BY i.created_at DESC
      LIMIT 100
    `,
    interviewing: `
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      JOIN job_interactions i ON j.id = i.job_id
      WHERE i.user_id = ? AND i.status = 'interviewing'
      ORDER BY i.created_at DESC
      LIMIT 100
    `,
    dismissed: `
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      JOIN job_interactions i ON j.id = i.job_id
      WHERE i.user_id = ? AND i.status = 'dismissed'
      ORDER BY i.created_at DESC
      LIMIT 100
    `,
    all: `
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      LEFT JOIN job_interactions i ON j.id = i.job_id AND i.user_id = ?
      ORDER BY j.discovered_at DESC
      LIMIT 200
    `,
  };

  return sqlite.prepare(queryByView[view]).all(userId);
}

export async function markAsSeen(userId: string, jobId: string) {
  const sqlite = getDb();
  const stmt = sqlite.prepare(`
    INSERT INTO job_interactions (user_id, job_id, status)
    VALUES (?, ?, 'seen')
    ON CONFLICT (user_id, job_id) DO UPDATE SET status = 'seen', created_at = CURRENT_TIMESTAMP
  `);
  return stmt.run(userId, jobId);
}

export async function setJobStatus(userId: string, jobId: string, status: JobStatus) {
  const sqlite = getDb();
  const stmt = sqlite.prepare(`
    INSERT INTO job_interactions (user_id, job_id, status)
    VALUES (?, ?, ?)
    ON CONFLICT (user_id, job_id) DO UPDATE SET status = excluded.status, created_at = CURRENT_TIMESTAMP
  `);
  return stmt.run(userId, jobId, status);
}

export async function clearJobStatus(userId: string, jobId: string) {
  const sqlite = getDb();
  const stmt = sqlite.prepare(`
    DELETE FROM job_interactions
    WHERE user_id = ? AND job_id = ?
  `);
  return stmt.run(userId, jobId);
}

export async function dismissJob(userId: string, jobId: string) {
  return setJobStatus(userId, jobId, 'dismissed');
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const sqlite = getDb();
  const row = sqlite
    .prepare(`
      SELECT user_id, roles, locations, work_modes, seniority, must_have_keywords, excluded_keywords, updated_at
      FROM user_preferences
      WHERE user_id = ?
      LIMIT 1
    `)
    .get(userId) as
    | {
        user_id: string;
        roles: string;
        locations: string;
        work_modes: string;
        seniority: string;
        must_have_keywords: string;
        excluded_keywords: string;
        updated_at: string;
      }
    | undefined;

  if (!row) return null;

  return {
    user_id: row.user_id,
    roles: parseJsonArray(row.roles),
    locations: parseJsonArray(row.locations),
    work_modes: parseJsonArray(row.work_modes),
    seniority: parseJsonArray(row.seniority),
    must_have_keywords: parseJsonArray(row.must_have_keywords),
    excluded_keywords: parseJsonArray(row.excluded_keywords),
    updated_at: row.updated_at,
  };
}

export async function upsertUserPreferences(
  userId: string,
  preferences: Omit<UserPreferences, 'user_id' | 'updated_at'>
) {
  const sqlite = getDb();

  const stmt = sqlite.prepare(`
    INSERT INTO user_preferences (
      user_id, roles, locations, work_modes, seniority, must_have_keywords, excluded_keywords, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      roles = excluded.roles,
      locations = excluded.locations,
      work_modes = excluded.work_modes,
      seniority = excluded.seniority,
      must_have_keywords = excluded.must_have_keywords,
      excluded_keywords = excluded.excluded_keywords,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(
    userId,
    JSON.stringify(preferences.roles),
    JSON.stringify(preferences.locations),
    JSON.stringify(preferences.work_modes),
    JSON.stringify(preferences.seniority),
    JSON.stringify(preferences.must_have_keywords),
    JSON.stringify(preferences.excluded_keywords)
  );

  const row = await getUserPreferences(userId);
  return { rows: row ? [row] : [] };
}
