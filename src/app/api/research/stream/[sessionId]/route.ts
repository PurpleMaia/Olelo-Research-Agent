import { NextRequest } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { orchestrator, createResearchStream } from '@/services/research';

/**
 * GET /api/research/stream/[sessionId]
 *
 * Server-Sent Events endpoint for streaming research activity.
 * Connects to the research orchestrator and streams real-time updates.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    await validateSession(request);
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const { sessionId } = await params;

  const stream = createResearchStream();

  // Execute the research pipeline asynchronously — don't await.
  // Results stream to the client via SSE as the pipeline progresses.
  orchestrator.execute(sessionId, stream).catch((err) => {
    console.error('[stream] Orchestrator execution error:', err);
    stream.sendError('Research pipeline failed');
  });

  return new Response(stream.getReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
