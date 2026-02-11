import type {
  ResearchStatus,
  ClarifyingQuestion,
  QuestionAnswer,
  ActivityMessage,
} from '@/types/research';
import * as sessionStore from './session-store';
import * as claude from './claude';
import * as embedding from './embedding';
import * as vectorSearch from './vector-search';
import type { ResearchStream } from './stream';

export interface InitiateResult {
  sessionId: string;
  status: ResearchStatus;
  clarifyingQuestions?: ClarifyingQuestion[];
}

/**
 * Starts a new research session. Analyzes the query with Claude to determine
 * if clarification is needed, then either returns questions or marks the
 * session as ready to research.
 */
export async function initiate(userId: string, query: string): Promise<InitiateResult> {
  // 1. Persist the session
  const sessionId = await sessionStore.createSession(userId, query);

  // 2. Analyze the query
  const analysis = await claude.analyzeQuery(query);

  if (analysis.needsClarification && analysis.questions) {
    // Store questions and return them to the user
    await sessionStore.saveQuestions(sessionId, analysis.questions);
    return {
      sessionId,
      status: 'clarifying',
      clarifyingQuestions: analysis.questions,
    };
  }

  // No clarification needed — mark as ready to research
  await sessionStore.updateStatus(sessionId, 'researching');
  return {
    sessionId,
    status: 'researching',
  };
}

/**
 * Submits answers to clarifying questions and transitions the session
 * to the researching state.
 */
export async function clarify(sessionId: string, answers: QuestionAnswer[]): Promise<void> {
  await sessionStore.saveAnswers(sessionId, answers);
}

/**
 * Executes the full research pipeline for a session, streaming activity
 * updates and results to the client via SSE.
 *
 * Pipeline steps:
 * 1. Thinking — analyze query
 * 2. Embed — generate query embedding for vector search
 * 3. Search — find relevant documents via pgvector
 * 4. Read — process retrieved documents
 * 5. Synthesize — use Claude to generate results
 * 6. Persist — save results to database
 * 7. Complete — signal completion
 */
export async function execute(sessionId: string, stream: ResearchStream): Promise<void> {
  try {
    const session = await sessionStore.getSessionById(sessionId);
    if (!session) {
      stream.sendError('Session not found');
      return;
    }

    // Step 1: Thinking
    sendActivity(stream, 'thinking', 'Analyzing your research question...');
    const analysis = await claude.analyzeQuery(session.query);
    await sleep(500); // Brief pause for UX

    // Step 2: Embed the query
    sendActivity(stream, 'searching', 'Preparing semantic search...');
    const queryEmbedding = await embedding.embed(session.query);

    // Step 3: Vector search
    sendActivity(stream, 'searching', 'Searching Hawaiian document corpus...', {
      source: 'Document Corpus',
    });
    const results = await vectorSearch.search(queryEmbedding, {
      limit: 10,
    });
    await sleep(300);

    if (results.length > 0) {
      sendActivity(stream, 'found', `Found ${results.length} relevant documents`, {
        count: results.length,
      });

      // Step 4: Read — show which documents are being processed
      for (const doc of results.slice(0, 3)) {
        sendActivity(stream, 'reading', `Reading: ${doc.documentTitle}`, {
          articleTitle: doc.documentTitle,
          source: doc.publication ?? doc.docType,
        });
        await sleep(200);
      }
    } else {
      sendActivity(
        stream,
        'searching',
        'No documents found in corpus. Using query analysis only.'
      );
    }

    // Step 5: Synthesize with Claude
    sendActivity(stream, 'analyzing', 'Synthesizing research findings...');
    const context = results.map((r) => ({
      content: r.chunkContent,
      title: r.documentTitle,
      docType: r.docType,
      publication: r.publication ?? undefined,
      date: r.date ?? undefined,
    }));

    const researchResult = await claude.synthesize(session.query, context, session.answers);

    // Send progressive result
    stream.sendResult(researchResult);

    // Step 6: Persist results
    await sessionStore.saveResults(sessionId, researchResult);

    // Step 7: Complete
    sendActivity(stream, 'complete', 'Research complete!');
    stream.sendComplete();
  } catch (err) {
    console.error(`[orchestrator] Error executing research for session ${sessionId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    await sessionStore.saveError(sessionId, errorMessage);
    stream.sendError(errorMessage);
  }
}

// --- Helpers ---

function sendActivity(
  stream: ResearchStream,
  type: ActivityMessage['type'],
  message: string,
  metadata?: ActivityMessage['metadata']
) {
  stream.sendActivity({
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    message,
    timestamp: new Date(),
    metadata,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
