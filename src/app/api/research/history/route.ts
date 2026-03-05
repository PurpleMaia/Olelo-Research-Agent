import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { sessionStore, feedbackService } from '@/services/research';

/**
 * GET /api/research/history
 *
 * Fetch the authenticated user's research history from the database.
 * Also returns feedbackSessionIds — the set of session IDs that have
 * associated feedback, used by the sidebar to show indicators.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const [sessions, feedbackIds] = await Promise.all([
      sessionStore.getSessionsByUser(user.id),
      feedbackService.getFeedbackSessionIds(user.id),
    ]);

    return NextResponse.json({
      sessions,
      feedbackSessionIds: Array.from(feedbackIds),
    });
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
