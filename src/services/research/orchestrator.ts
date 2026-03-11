import type {
  ResearchStatus,
  ClarifyingQuestion,
  QuestionAnswer,
  ActivityMessage,
} from '@/types/research';
import * as sessionStore from './session-store';
import * as claude from './claude';
import type { ConversationContext } from './claude';
import * as embedding from './embedding';
import * as vectorSearch from './vector-search';
import * as papakilo from './papakilo';
import { researchConfig } from '@/lib/config/research';
import type { ResearchStream } from './stream';

export interface InitiateResult {
  sessionId: string;
  status: ResearchStatus;
  clarifyingQuestions?: ClarifyingQuestion[];
}

export interface RefineResult {
  sessionId: string;
  status: ResearchStatus;
  isOffTopic: boolean;
  offTopicReason?: string;
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
 * Starts a refinement research session based on a prior completed session.
 * Checks whether the new query is on-topic relative to the original research.
 * If off-topic, returns isOffTopic=true so the UI can prompt the user to
 * start a fresh search instead.
 */
export async function refine(
  userId: string,
  parentSessionId: string,
  refinementQuery: string
): Promise<RefineResult> {
  // Load the parent session for context
  const parentSession = await sessionStore.getSessionById(parentSessionId);
  if (!parentSession || !parentSession.results) {
    // Parent not found or incomplete — treat as a fresh initiation
    const result = await initiate(userId, refinementQuery);
    return { ...result, isOffTopic: false };
  }

  const conversationContext: ConversationContext = {
    originalQuery: parentSession.query,
    summary: parentSession.results.summary,
  };

  // Analyze with topic drift detection
  const analysis = await claude.analyzeQuery(refinementQuery, { conversationContext });

  if (analysis.isOffTopic) {
    return {
      sessionId: parentSessionId,
      status: 'complete',
      isOffTopic: true,
      offTopicReason: analysis.offTopicReason,
    };
  }

  // On-topic — create a new session and store the conversation context
  const sessionId = await sessionStore.createSession(userId, refinementQuery);
  await sessionStore.saveConversationContext(sessionId, conversationContext);
  await sessionStore.updateStatus(sessionId, 'researching');

  return { sessionId, status: 'researching', isOffTopic: false };
}

/**
 * Executes the full research pipeline for a session, streaming activity
 * updates and results to the client via SSE.
 *
 * Pipeline steps:
 * 1. Thinking — analyze query (incorporating answers for better search terms)
 * 2. Embed — generate query embedding for vector search
 * 3. Search — vector search + Papakilo live search (parallel)
 * 4. Read — process retrieved documents and newspaper articles
 * 5. Synthesize — use Claude to generate results (with conversation context)
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

    // Load conversation context if this is a refinement session
    const conversationContext = await sessionStore.getConversationContext(sessionId);

    // Step 1: Thinking — re-analyze with answers so search terms reflect user clarifications
    sendActivity(stream, 'thinking', 'Analyzing your research question...');
    const analysis = await claude.analyzeQuery(session.query, {
      answers: session.answers,
      conversationContext: conversationContext ?? undefined,
    });
    sendActivity(stream, 'thinking', `Identified ${analysis.searchTerms.length} search terms`);
    await sleep(500);

    // Build embedding query — combine original query with answer context for richer search
    const embeddingQuery = buildEmbeddingQuery(session.query, session.answers, analysis.searchTerms);

    // Step 2: Embed the query (optional — skip vector search if embedding fails)
    sendActivity(stream, 'searching', 'Preparing semantic search...');
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await embedding.embed(embeddingQuery);
    } catch (embedErr) {
      console.warn('[orchestrator] Embedding unavailable, skipping vector search:', embedErr);
    }

    // Step 3: Vector search + Papakilo live search in parallel
    sendActivity(stream, 'searching', 'Searching Hawaiian document corpus...', {
      source: 'Document Corpus',
    });

    // T012 (US2): Emit Papakilo search start activity
    if (researchConfig.papakiloEnabled) {
      sendActivity(stream, 'searching', 'Searching Papakilo Database for Hawaiian newspapers...', {
        source: 'Papakilo Database',
      });
    }

    // Build papakilo promise with timeout (T016, T017 US3)
    const papakiloPromise = researchConfig.papakiloEnabled
      ? Promise.race([
          papakilo.researchWithPapakilo(analysis.searchTerms, {
            maxTerms: researchConfig.papakiloMaxTerms,
            maxArticlesPerTerm: 3,
            timeoutMs: researchConfig.papakiloTimeoutMs,
          }),
          sleep(researchConfig.papakiloTimeoutMs).then(() => ({
            articles: [],
            sources: [],
            totalFound: 0,
          })),
        ])
      : Promise.resolve({ articles: [], sources: [], totalFound: 0 });

    const [vectorResult, papakiloResult] = await Promise.allSettled([
      queryEmbedding ? vectorSearch.search(queryEmbedding, { limit: 10 }) : Promise.resolve([]),
      papakiloPromise,
    ]);

    const vectorResults = vectorResult.status === 'fulfilled' ? vectorResult.value : [];
    const papakiloData =
      papakiloResult.status === 'fulfilled'
        ? papakiloResult.value
        : { articles: [], sources: [], totalFound: 0 };

    await sleep(300);

    // Step 4a: Report vector search findings
    if (vectorResults.length > 0) {
      sendActivity(stream, 'found', `Found ${vectorResults.length} relevant documents`, {
        count: vectorResults.length,
      });
      for (const doc of vectorResults.slice(0, 3)) {
        sendActivity(stream, 'reading', `Reading: ${doc.documentTitle}`, {
          articleTitle: doc.documentTitle,
          source: doc.publication ?? doc.docType,
        });
        await sleep(200);
      }
    } else {
      sendActivity(stream, 'searching', 'No documents found in corpus. Using query analysis only.');
    }

    // Step 4b: Report Papakilo findings (T013, T014, T015 US2)
    if (researchConfig.papakiloEnabled) {
      if (papakiloData.articles.length > 0) {
        sendActivity(stream, 'found', `Found ${papakiloData.articles.length} newspaper articles on Papakilo`, {
          source: 'Papakilo Database',
          count: papakiloData.articles.length,
        });
        for (const article of papakiloData.articles.slice(0, 3)) {
          sendActivity(stream, 'reading', `Reading: ${article.title || article.articleId}`, {
            source: 'Papakilo Database',
            articleTitle: article.title || article.articleId,
          });
          await sleep(100);
        }
      } else {
        sendActivity(stream, 'searching', 'Papakilo Database unavailable, using corpus only');
      }
    }

    // Step 5: Merge context from both sources and synthesize with Claude (pass conversation context)
    sendActivity(stream, 'analyzing', 'Synthesizing research findings...');

    const vectorContext = vectorResults.map((r) => ({
      content: r.chunkContent,
      title: r.documentTitle,
      docType: r.docType,
      publication: r.publication ?? undefined,
      date: r.date ?? undefined,
      url: r.url ?? undefined,
      author: r.author ?? undefined,
    }));

    const papakiloContext = papakiloData.articles.map((a) => ({
      content: a.rawText.slice(0, 2000),
      title: a.title || a.articleId,
      docType: 'papakilo-live' as const,
      publication: extractNewspaperCode(a.articleId),
      date: extractDateFromArticleId(a.articleId),
      url: a.url ?? undefined,
    }));

    const mergedContext = [...vectorContext, ...papakiloContext];

    const researchResult = await claude.synthesize(
      session.query,
      mergedContext,
      session.answers,
      conversationContext ?? undefined
    );

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

/**
 * Builds a richer embedding query by appending answer values and search terms
 * to the original query. This gives the vector search more signal when the user
 * has specified time period, geography, or aspect via clarifying questions.
 */
function buildEmbeddingQuery(
  query: string,
  answers: QuestionAnswer[] | undefined,
  searchTerms: string[]
): string {
  const parts: string[] = [query];

  if (answers && answers.length > 0) {
    const answerValues = answers
      .map((a) => (Array.isArray(a.answer) ? a.answer.join(' ') : a.answer))
      .filter(Boolean);
    if (answerValues.length > 0) parts.push(answerValues.join(' '));
  }

  if (searchTerms.length > 0) {
    parts.push(searchTerms.slice(0, 4).join(' '));
  }

  return parts.join(' ');
}

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

/**
 * Extracts a human-readable newspaper name from a Papakilo article ID.
 * Article IDs follow the pattern: NEWSPAPER_CODE+DATE-ISSUE.SECTION.ARTICLE
 * e.g., "KNK19030327-01.2.34" → "Ka Nupepa Kuokoa"
 */
function extractNewspaperCode(articleId: string): string | undefined {
  const codeMap: Record<string, string> = {
    KNK: 'Ka Nupepa Kuokoa',
    KHHA: 'Ka Hoku o Hawaii',
    KAA: 'Ke Aloha Aina',
    KHR: 'Kuokoa Home Rula',
    KWO: 'Ka Wai Ola',
  };
  const match = articleId.match(/^([A-Z]+)/);
  if (!match) return undefined;
  return codeMap[match[1]] ?? match[1];
}

/**
 * Extracts a date string from a Papakilo article ID.
 * Article IDs follow the pattern: CODE+YYYYMMDD-...
 * e.g., "KNK19030327-01.2.34" → "1903-03-27"
 */
function extractDateFromArticleId(articleId: string): string | undefined {
  const match = articleId.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}-${match[3]}`;
}
