import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { AppError } from '@/lib/errors';
import { orchestrator } from '@/services/research';

/**
 * POST /api/research/initiate
 *
 * Initiates a new research session.
 * Returns session ID and optionally clarifying questions.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await validateSession(request);

    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const result = await orchestrator.initiate(user.id, query.trim());

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error initiating research:', error);
    return NextResponse.json(
      { error: 'Failed to initiate research' },
      { status: 500 }
    );
  }
}
