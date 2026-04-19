import { NextResponse } from 'next/server';
import { getJobs, dismissJob } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  
  try {
    const jobs = await getJobs(userId);
    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId, jobId, action } = await request.json();
  
  if (!userId || !jobId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  
  try {
    if (action === 'dismiss') {
      await dismissJob(userId, jobId);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
