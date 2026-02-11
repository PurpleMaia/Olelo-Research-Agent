import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { orchestrator } from '@/services/research';

/**
 * POST /api/research/clarify
 *
 * Submit answers to clarifying questions and continue research.
 */
export async function POST(request: NextRequest) {
  try {
    await validateSession(request);

    const body = await request.json();
    const { sessionId, answers } = body;

    if (!sessionId || !answers) {
      return NextResponse.json(
        { error: 'Session ID and answers are required' },
        { status: 400 }
      );
    }

    await orchestrator.clarify(sessionId, answers);

    return NextResponse.json({
      status: 'researching',
      message: 'Research continuing with your preferences',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error submitting answers:', error);
    return NextResponse.json(
      { error: 'Failed to submit answers' },
      { status: 500 }
    );
  }
}
