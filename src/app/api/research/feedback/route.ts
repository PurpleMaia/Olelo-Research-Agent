import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { feedbackService, sessionStore } from '@/services/research';

/**
 * POST /api/research/feedback
 *
 * Saves user feedback for a completed research session.
 *
 * Body: {
 *   sessionId: string,
 *   rating: 1 | -1,       // required: thumbs up/down
 *   accuracy?: number,     // optional: 1–5
 *   completeness?: number, // optional: 1–5
 *   comment?: string       // optional
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const body = await request.json();
    const { sessionId, rating, accuracy, completeness, comment } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    if (rating !== 1 && rating !== -1) {
      return NextResponse.json(
        { error: 'rating must be 1 (thumbs up) or -1 (thumbs down)' },
        { status: 400 }
      );
    }

    // Verify session belongs to the requesting user
    const session = await sessionStore.getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate optional ratings
    if (accuracy !== undefined && (accuracy < 1 || accuracy > 5 || !Number.isInteger(accuracy))) {
      return NextResponse.json({ error: 'accuracy must be an integer between 1 and 5' }, { status: 400 });
    }
    if (completeness !== undefined && (completeness < 1 || completeness > 5 || !Number.isInteger(completeness))) {
      return NextResponse.json({ error: 'completeness must be an integer between 1 and 5' }, { status: 400 });
    }

    const feedback = await feedbackService.saveFeedback({
      sessionId,
      rating,
      accuracy,
      completeness,
      comment,
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error saving feedback:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
