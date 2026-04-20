import { NextResponse } from 'next/server';
import { getJobs, saveJobInteraction } from '@/lib/db';
import { JobView } from '@/lib/types';

export async function GET(request: Request) {
  const userId = searchParams.get('userId');
  const view = (searchParams.get('view') as JobView) || 'all';
  const role = searchParams.get('role') || undefined;
  const location = searchParams.get('location') || undefined;
  
  if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  
  try {
    const jobs = await getJobs(userId, view, role, location);
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    console.error(`Error in GET /api/jobs?view=${view}:`, error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId, jobId, action } = await request.json();
  
  if (!userId || !jobId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  
  try {
    if (action === 'dismiss') {
      await saveJobInteraction(userId, jobId, 'dismissed');
    } else if (action === 'save') {
      await saveJobInteraction(userId, jobId, 'saved');
    } else if (action === 'unsave') {
      await saveJobInteraction(userId, jobId, 'seen');
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
