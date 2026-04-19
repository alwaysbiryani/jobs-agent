import { NextResponse } from 'next/server';
import { createTables, getUserPreferences, upsertUserPreferences } from '@/lib/db';
import { upsertUserPreferencesBodySchema } from '@/lib/schemas';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  try {
    await createTables();
    const preferences = await getUserPreferences(userId);
    return NextResponse.json({
      preferences: preferences ?? {
        roles: [],
        locations: [],
        work_modes: [],
        seniority: [],
        must_have_keywords: [],
        excluded_keywords: [],
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = upsertUserPreferencesBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userId, preferences } = parsed.data;

  try {
    await createTables();
    const { rows } = await upsertUserPreferences(userId, preferences);
    return NextResponse.json({ preferences: rows[0] });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
