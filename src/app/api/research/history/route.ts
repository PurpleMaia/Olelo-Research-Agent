import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { sessionStore } from '@/services/research';

/**
 * GET /api/research/history
 *
 * Fetch the authenticated user's research history from the database.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const sessions = await sessionStore.getSessionsByUser(user.id);

    return NextResponse.json({ sessions });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch research history' },
      { status: 500 }
    );
  }
}
