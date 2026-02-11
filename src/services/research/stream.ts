import type { ActivityMessage, ResearchResult } from '@/types/research';

export interface ResearchStream {
  sendActivity(activity: ActivityMessage): void;
  sendResult(result: Partial<ResearchResult>): void;
  sendComplete(): void;
  sendError(error: string): void;
  getReadableStream(): ReadableStream;
}

/**
 * Creates an SSE stream for pushing research activity to the client.
 * Fully implemented — reuses the existing SSE pattern from the app.
 */
export function createResearchStream(): ResearchStream {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  function send(data: unknown) {
    if (!controller) return;
    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(message));
    } catch {
      // Stream may have been closed by the client
    }
  }

  function close() {
    try {
      controller?.close();
    } catch {
      // Already closed
    }
  }

  return {
    sendActivity(activity: ActivityMessage) {
      send({ type: 'activity', data: activity });
    },

    sendResult(result: Partial<ResearchResult>) {
      send({ type: 'result', data: result });
    },

    sendComplete() {
      send({ type: 'complete', data: {} });
      close();
    },

    sendError(error: string) {
      send({ type: 'error', data: { error } });
      close();
    },

    getReadableStream() {
      return stream;
    },
  };
}
