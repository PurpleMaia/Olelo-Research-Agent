/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/db/kysely/client';
import type {
  ResearchSession,
  ResearchStatus,
  ResearchResult,
  ClarifyingQuestion,
  QuestionAnswer,
} from '@/types/research';
import type { ConversationContext } from './claude';

/**
 * CRUD operations for persisted research sessions.
 * Fully implemented against the research_sessions table.
 */

export async function createSession(userId: string, query: string): Promise<string> {
  const result = await db
    .insertInto('research_sessions' as any)
    .values({
      user_id: userId,
      query,
      status: 'idle',
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  return (result as any).id;
}

export async function getSessionById(sessionId: string): Promise<ResearchSession | null> {
  const row = await db
    .selectFrom('research_sessions' as any)
    .selectAll()
    .where('id', '=', sessionId)
    .executeTakeFirst();

  if (!row) return null;
  return mapRowToSession(row);
}

export async function getSessionsByUser(userId: string): Promise<ResearchSession[]> {
  const rows = await db
    .selectFrom('research_sessions' as any)
    .selectAll()
    .where('user_id', '=', userId)
    .orderBy('created_at', 'desc')
    .execute();

  return rows.map(mapRowToSession);
}

export async function updateStatus(sessionId: string, status: ResearchStatus): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date(),
  };

  if (status === 'complete') {
    update.completed_at = new Date();
  }

  await db
    .updateTable('research_sessions' as any)
    .set(update)
    .where('id', '=', sessionId)
    .execute();
}

export async function saveQuestions(
  sessionId: string,
  questions: ClarifyingQuestion[]
): Promise<void> {
  await db
    .updateTable('research_sessions' as any)
    .set({
      questions: JSON.stringify(questions),
      status: 'clarifying',
      updated_at: new Date(),
    })
    .where('id', '=', sessionId)
    .execute();
}

export async function saveAnswers(
  sessionId: string,
  answers: QuestionAnswer[]
): Promise<void> {
  await db
    .updateTable('research_sessions' as any)
    .set({
      answers: JSON.stringify(answers),
      status: 'researching',
      updated_at: new Date(),
    })
    .where('id', '=', sessionId)
    .execute();
}

export async function saveResults(
  sessionId: string,
  results: ResearchResult
): Promise<void> {
  await db
    .updateTable('research_sessions' as any)
    .set({
      results: JSON.stringify(results),
      status: 'complete',
      updated_at: new Date(),
      completed_at: new Date(),
    })
    .where('id', '=', sessionId)
    .execute();
}

export async function saveError(sessionId: string, error: string): Promise<void> {
  await db
    .updateTable('research_sessions' as any)
    .set({
      error,
      status: 'error',
      updated_at: new Date(),
    })
    .where('id', '=', sessionId)
    .execute();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db
    .deleteFrom('research_sessions' as any)
    .where('id', '=', sessionId)
    .execute();
}

/**
 * Saves conversation context (prior query + summary) to a session's answers
 * field, stored under a reserved key. This avoids a schema migration while
 * allowing the orchestrator to pass prior context to Claude for refinements.
 */
export async function saveConversationContext(
  sessionId: string,
  context: ConversationContext
): Promise<void> {
  // We store it in the answers JSONB as a special reserved entry
  const existing = await db
    .selectFrom('research_sessions' as any)
    .select('answers')
    .where('id', '=', sessionId)
    .executeTakeFirst();

  const existingAnswers = parseJsonb((existing as any)?.answers) ?? [];
  const merged = [
    ...existingAnswers.filter((a: any) => a.questionId !== '__conversation_context__'),
    { questionId: '__conversation_context__', answer: JSON.stringify(context) },
  ];

  await db
    .updateTable('research_sessions' as any)
    .set({ answers: JSON.stringify(merged), updated_at: new Date() })
    .where('id', '=', sessionId)
    .execute();
}

/**
 * Retrieves conversation context stored on a session, or null if this is
 * not a refinement session.
 */
export async function getConversationContext(
  sessionId: string
): Promise<ConversationContext | null> {
  const row = await db
    .selectFrom('research_sessions' as any)
    .select('answers')
    .where('id', '=', sessionId)
    .executeTakeFirst();

  const answers = parseJsonb((row as any)?.answers);
  if (!Array.isArray(answers)) return null;

  const contextEntry = answers.find((a: any) => a.questionId === '__conversation_context__');
  if (!contextEntry) return null;

  try {
    return JSON.parse(contextEntry.answer) as ConversationContext;
  } catch {
    return null;
  }
}

// --- Helpers ---

function parseJsonb(value: unknown): any {
  if (!value) return undefined;
  if (typeof value === 'string') return JSON.parse(value);
  return value; // pg driver already parsed JSONB to object
}

function mapRowToSession(row: any): ResearchSession {
  return {
    id: row.id,
    userId: row.user_id,
    query: row.query,
    status: row.status,
    clarifyingQuestions: parseJsonb(row.questions),
    answers: parseJsonb(row.answers),
    activityStream: [], // Activity is streamed in real-time, not persisted
    results: parseJsonb(row.results),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    error: row.error ?? undefined,
  };
}
