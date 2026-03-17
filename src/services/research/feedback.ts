/* eslint-disable @typescript-eslint/no-explicit-any */
import { pool } from '@/db/kysely/client';
import { researchConfig } from '@/lib/config/research';

export interface FeedbackPayload {
  sessionId: string;
  rating: 1 | -1;          // 1 = thumbs up, -1 = thumbs down
  accuracy?: number;        // 1–5
  completeness?: number;    // 1–5
  comment?: string;
}

export interface FeedbackRecord extends FeedbackPayload {
  id: string;
  modelUsed: string;
  createdAt: Date;
}

/**
 * Saves feedback for a completed research session.
 * Associates the active Claude model so feedback can be correlated to model versions.
 */
export async function saveFeedback(payload: FeedbackPayload): Promise<FeedbackRecord> {
  const result = await pool.query(
    `INSERT INTO research_feedback
       (session_id, rating, accuracy, completeness, comment, model_used)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, session_id, rating, accuracy, completeness, comment, model_used, created_at`,
    [
      payload.sessionId,
      payload.rating,
      payload.accuracy ?? null,
      payload.completeness ?? null,
      payload.comment?.trim() || null,
      researchConfig.llmModel,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    sessionId: row.session_id,
    rating: row.rating,
    accuracy: row.accuracy ?? undefined,
    completeness: row.completeness ?? undefined,
    comment: row.comment ?? undefined,
    modelUsed: row.model_used,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Returns the feedback for a session, or null if none exists.
 */
export async function getFeedbackForSession(sessionId: string): Promise<FeedbackRecord | null> {
  const result = await pool.query(
    `SELECT id, session_id, rating, accuracy, completeness, comment, model_used, created_at
     FROM research_feedback
     WHERE session_id = $1
     LIMIT 1`,
    [sessionId]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  return {
    id: row.id,
    sessionId: row.session_id,
    rating: row.rating,
    accuracy: row.accuracy ?? undefined,
    completeness: row.completeness ?? undefined,
    comment: row.comment ?? undefined,
    modelUsed: row.model_used,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Returns session IDs that have associated feedback for a given user.
 * Used by the sidebar to display feedback indicators.
 */
export async function getFeedbackSessionIds(userId: string): Promise<Set<string>> {
  const result = await pool.query(
    `SELECT rf.session_id
     FROM research_feedback rf
     INNER JOIN research_sessions rs ON rf.session_id = rs.id
     WHERE rs.user_id = $1`,
    [userId]
  );

  return new Set(result.rows.map((r: any) => r.session_id as string));
}
