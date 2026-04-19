import { NextResponse } from 'next/server';
import { clearJobStatus, getJobs, setJobStatus } from '@/lib/db';
import { jobViewSchema, setJobActionBodySchema } from '@/lib/schemas';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const rawStatus = searchParams.get('status') || 'new';
  
  if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

  const status = jobViewSchema.safeParse(rawStatus);
  if (!status.success) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }
  
  try {
    const jobs = await getJobs(userId, status.data);
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = setJobActionBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userId, jobId, action } = parsed.data;
  
  try {
    if (action === 'clear') {
      await clearJobStatus(userId, jobId);
      return NextResponse.json({ success: true });
    }

    await setJobStatus(userId, jobId, action);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
