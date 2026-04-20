import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Job, JobStatus, JobView, UserPreferences } from './types';

// Lazy-initialize Neon SQL client
let _sql: NeonQueryFunction<false, false> | null = null;

function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL is missing. Database operations will fail.');
      // Return a proxy that throws on call to prevent top-level crashes but catch runtime errors
      return (() => {
        throw new Error('Database connection failed: DATABASE_URL is not defined.');
      }) as unknown as NeonQueryFunction<false, false>;
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export async function checkConnection() {
  const sql = getSql();
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

export async function createTables() {
  const sql = getSql();
  try {
    // Jobs Table
    await sql(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        source TEXT NOT NULL,
        posted_at TEXT,
        discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        industry TEXT,
        company_size TEXT,
        company_stage TEXT,
        description_summary TEXT,
        search_role TEXT,
        search_location TEXT
      );
    `);

    // Job Interactions Table
    await sql(`
      CREATE TABLE IF NOT EXISTS job_interactions (
        user_id TEXT NOT NULL,
        job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, job_id)
      );
    `);

    // User Preferences Table
    await sql(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        roles JSONB NOT NULL DEFAULT '[]',
        locations JSONB NOT NULL DEFAULT '[]',
        work_modes JSONB NOT NULL DEFAULT '[]',
        seniority JSONB NOT NULL DEFAULT '[]',
        must_have_keywords JSONB NOT NULL DEFAULT '[]',
        excluded_keywords JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    

    await sql(`CREATE INDEX IF NOT EXISTS idx_jobs_discovered_at ON jobs(discovered_at DESC);`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_jobs_search_role ON jobs(search_role);`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_jobs_search_location ON jobs(search_location);`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_interactions_user_status_created ON job_interactions(user_id, status, created_at DESC);`);

        console.log('Database tables verified/created successfully.');
  } catch (error) {
    console.error('Error creating database tables:', error);
  }
}

export async function saveJob(job: Partial<Job>) {
  const sql = getSql();
  const id = crypto.randomUUID();
  
  const result = await sql(`
    INSERT INTO jobs (
      id, title, company, location, url, source, posted_at, 
      industry, company_size, company_stage, description_summary, search_role, search_location
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (url) DO UPDATE SET
      title = EXCLUDED.title,
      company = EXCLUDED.company,
      location = EXCLUDED.location,
      search_role = COALESCE(jobs.search_role, EXCLUDED.search_role),
      search_location = COALESCE(jobs.search_location, EXCLUDED.search_location),
      industry = COALESCE(jobs.industry, EXCLUDED.industry),
      company_size = COALESCE(jobs.company_size, EXCLUDED.company_size),
      company_stage = COALESCE(jobs.company_stage, EXCLUDED.company_stage),
      description_summary = COALESCE(jobs.description_summary, EXCLUDED.description_summary)
    RETURNING id
  `, [
    id, job.title, job.company, job.location, job.url, job.source, job.posted_at || null,
    job.industry || null, job.company_size || null, job.company_stage || null, 
    job.description_summary || null, job.search_role || null, job.search_location || null
  ]);

  return { rows: result };
}

export async function setJobStatus(userId: string, jobId: string, status: JobStatus) {
  const sql = getSql();
  return await sql(`
    INSERT INTO job_interactions (user_id, job_id, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, job_id) DO UPDATE SET status = EXCLUDED.status, created_at = CURRENT_TIMESTAMP
  `, [userId, jobId, status]);
}

export async function clearJobStatus(userId: string, jobId: string) {
  const sql = getSql();
  return await sql(`
    DELETE FROM job_interactions
    WHERE user_id = $1 AND job_id = $2
  `, [userId, jobId]);
}

export async function saveJobInteraction(userId: string, jobId: string, status: 'dismissed' | 'saved' | 'seen' | 'applied' | 'interviewing') {
  return setJobStatus(userId, jobId, status);
}

export async function getJobs(userId: string, view: JobView = 'new', role?: string, location?: string) {
  const sql = getSql();
  
  const r = role && role !== 'all' ? `%${role}%` : null;
  const l = location && location !== 'all' ? `%${location}%` : null;

  if (view === 'saved') {
    return await sql`
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      JOIN job_interactions i ON j.id = i.job_id
      WHERE i.user_id = ${userId} AND i.status = 'saved'
        AND (${r}::text IS NULL OR j.title ILIKE ${r} OR j.search_role ILIKE ${r})
        AND (${l}::text IS NULL OR j.location ILIKE ${l} OR j.search_location ILIKE ${l})
      ORDER BY i.created_at DESC LIMIT 100
    `;
  }

  if (view === 'applied') {
    return await sql`
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      JOIN job_interactions i ON j.id = i.job_id
      WHERE i.user_id = ${userId} AND i.status = 'applied'
      ORDER BY i.created_at DESC LIMIT 100
    `;
  }

  if (view === 'interviewing') {
    return await sql`
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      JOIN job_interactions i ON j.id = i.job_id
      WHERE i.user_id = ${userId} AND i.status = 'interviewing'
      ORDER BY i.created_at DESC LIMIT 100
    `;
  }

  if (view === 'dismissed') {
    return await sql`
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      JOIN job_interactions i ON j.id = i.job_id
      WHERE i.user_id = ${userId} AND i.status = 'dismissed'
      ORDER BY i.created_at DESC LIMIT 100
    `;
  }

  if (view === 'all') {
    return await sql`
      SELECT j.*, i.status AS interaction_status
      FROM jobs j
      LEFT JOIN job_interactions i ON j.id = i.job_id AND i.user_id = ${userId}
      WHERE 1=1
        AND (${r}::text IS NULL OR j.title ILIKE ${r} OR j.search_role ILIKE ${r})
        AND (${l}::text IS NULL OR j.location ILIKE ${l} OR j.search_location ILIKE ${l})
      ORDER BY j.discovered_at DESC LIMIT 200
    `;
  }

  // Default: 'new'
  return await sql`
    SELECT j.*, i.status AS interaction_status
    FROM jobs j
    LEFT JOIN job_interactions i ON j.id = i.job_id AND i.user_id = ${userId}
    WHERE (i.status IS NULL OR i.status = 'seen')
      AND (${r}::text IS NULL OR j.title ILIKE ${r} OR j.search_role ILIKE ${r})
      AND (${l}::text IS NULL OR j.location ILIKE ${l} OR j.search_location ILIKE ${l})
    ORDER BY j.discovered_at DESC LIMIT 100
  `;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const sql = getSql();
  const rows = await sql(`
    SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1
  `, [userId]);

  if (rows.length === 0) return null;
  return rows[0] as UserPreferences;
}

export async function upsertUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
  const sql = getSql();
  return await sql(`
    INSERT INTO user_preferences (
      user_id, roles, locations, work_modes, seniority, must_have_keywords, excluded_keywords, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      roles = EXCLUDED.roles,
      locations = EXCLUDED.locations,
      work_modes = EXCLUDED.work_modes,
      seniority = EXCLUDED.seniority,
      must_have_keywords = EXCLUDED.must_have_keywords,
      excluded_keywords = EXCLUDED.excluded_keywords,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `, [
    userId, 
    JSON.stringify(preferences.roles || []),
    JSON.stringify(preferences.locations || []),
    JSON.stringify(preferences.work_modes || []),
    JSON.stringify(preferences.seniority || []),
    JSON.stringify(preferences.must_have_keywords || []),
    JSON.stringify(preferences.excluded_keywords || [])
  ]);
}
