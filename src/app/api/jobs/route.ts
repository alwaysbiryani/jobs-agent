import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobs, saveJobInteraction } from '@/lib/db';
import { JobView } from '@/lib/types';

const viewSchema = z.enum(['new', 'saved', 'applied', 'interviewing', 'dismissed', 'all']);
const postSchema = z.object({
  userId: z.string().min(1),
  jobId: z.string().min(1),
  action: z.enum(['dismiss', 'save', 'unsave', 'applied', 'interviewing']),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const viewCandidate = searchParams.get('view') ?? 'all';
  const viewResult = viewSchema.safeParse(viewCandidate);
  const view: JobView = viewResult.success ? viewResult.data : 'all';
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
  const payload = await request.json();
  const parsed = postSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, jobId, action } = parsed.data;

  try {
    if (action === 'dismiss') {
      await saveJobInteraction(userId, jobId, 'dismissed');
    } else if (action === 'save') {
      await saveJobInteraction(userId, jobId, 'saved');
    } else if (action === 'unsave') {
      await saveJobInteraction(userId, jobId, 'seen');
    } else if (action === 'applied') {
      await saveJobInteraction(userId, jobId, 'applied');
    } else if (action === 'interviewing') {
      await saveJobInteraction(userId, jobId, 'interviewing');
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
