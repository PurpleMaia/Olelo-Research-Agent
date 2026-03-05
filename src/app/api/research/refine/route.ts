import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { orchestrator } from '@/services/research';

/**
 * POST /api/research/refine
 *
 * Submits a follow-up query against a completed research session.
 * Checks for topic drift before creating a new session.
 *
 * Body: { parentSessionId: string, refinementQuery: string }
 *
 * Returns:
 *   { sessionId, status, isOffTopic: false }               — proceed with streaming
 *   { sessionId, status, isOffTopic: true, offTopicReason } — prompt user to start fresh
 */
export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const body = await request.json();
    const { parentSessionId, refinementQuery } = body;

    if (!parentSessionId || typeof parentSessionId !== 'string') {
      return NextResponse.json(
        { error: 'parentSessionId is required' },
        { status: 400 }
      );
    }

    if (!refinementQuery || typeof refinementQuery !== 'string' || refinementQuery.trim().length === 0) {
      return NextResponse.json(
        { error: 'refinementQuery is required' },
        { status: 400 }
      );
    }

    const result = await orchestrator.refine(
      user.id,
      parentSessionId,
      refinementQuery.trim()
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error processing refinement:', error);
    return NextResponse.json(
      { error: 'Failed to process follow-up query' },
      { status: 500 }
    );
  }
}
