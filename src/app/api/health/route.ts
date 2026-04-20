import { NextResponse } from 'next/server';
import { checkConnection } from '@/lib/db';

export async function GET() {
  const dbStatus = await checkConnection();
  
  const health = {
    database: dbStatus ? 'connected' : 'error',
    env: {
      SERPER_API_KEY: !!process.env.SERPER_API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
    },
    timestamp: new Date().toISOString(),
  };

  const status = dbStatus && process.env.SERPER_API_KEY ? 200 : 500;
  return NextResponse.json(health, { status });
}
