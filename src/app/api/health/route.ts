import { NextResponse } from 'next/server';
import { checkConnection } from '@/lib/db';

export async function GET() {
  const env = {
    SERPER_API_KEY: !!process.env.SERPER_API_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
    CRON_SECRET: !!process.env.CRON_SECRET,
  };

  const dbResult = await checkConnection();

  const health = {
    overall: dbResult.connected ? 'ok' : 'degraded',
    database: dbResult.connected ? 'connected' : 'error',
    dependencies: {
      database: {
        configured: env.DATABASE_URL,
        status: dbResult.connected ? 'connected' : 'error',
        code: dbResult.code ?? null,
        message: dbResult.message ?? null,
      },
      serper: {
        configured: env.SERPER_API_KEY,
      },
      gemini: {
        configured: env.GEMINI_API_KEY,
      },
      cronSecret: {
        configured: env.CRON_SECRET,
      },
    },
    env,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(health, { status: 200 });
}
