/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/db/kysely/client';
import type {
  ResearchSession,
  ResearchStatus,
  ResearchResult,
  ClarifyingQuestion,
  QuestionAnswer,
} from '@/types/research';

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
