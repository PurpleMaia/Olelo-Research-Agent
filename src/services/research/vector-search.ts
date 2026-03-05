import { pool } from '@/db/kysely/client';
import { researchConfig } from '@/lib/config/research';

export interface DocumentChunkWithDoc {
  chunkId: string;
  chunkContent: string;
  chunkIndex: number;
  documentId: string;
  documentTitle: string;
  docType: string;
  publication: string | null;
  date: string | null;
  url: string | null;
  author: string | null;
  similarity: number;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  docType?: 'papa-kilo' | 'newspaper' | 'web' | 'other';
}

/**
 * Searches the document_chunks table for semantically similar content
 * using pgvector's cosine distance operator (<=>).
 *
 * Uses raw SQL via the pg pool since pgvector operators and the new research
 * tables aren't in the Kysely type system until kysely-codegen is re-run.
 */
export async function search(
  queryEmbedding: number[],
  options: VectorSearchOptions = {}
): Promise<DocumentChunkWithDoc[]> {
  const {
    limit = researchConfig.vectorSearchLimit,
    threshold = researchConfig.vectorSearchThreshold,
    docType,
  } = options;

  // Quick check: any embeddings exist?
  const check = await pool.query(
    `SELECT 1 FROM document_chunks WHERE embedding IS NOT NULL LIMIT 1`
  );
  if (check.rows.length === 0) {
    console.log('[vector-search] No embeddings found — returning empty results');
    return [];
  }

  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // pgvector cosine distance: <=> (0 = identical, 2 = opposite)
  // similarity = 1 - distance
  // author is stored in documents.metadata->>'author'
  const baseQuery = `
    SELECT
      c.id                        AS "chunkId",
      c.content                   AS "chunkContent",
      c.chunk_index               AS "chunkIndex",
      d.id                        AS "documentId",
      d.title                     AS "documentTitle",
      d.doc_type                  AS "docType",
      d.publication               AS "publication",
      d.date                      AS "date",
      d.url                       AS "url",
      d.metadata->>'author'       AS "author",
      1 - (c.embedding <=> $1::vector) AS "similarity"
    FROM document_chunks c
    INNER JOIN documents d ON c.document_id = d.id
    WHERE c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> $1::vector) >= $2
      ${docType ? `AND d.doc_type = $4` : ''}
    ORDER BY c.embedding <=> $1::vector ASC
    LIMIT $3
  `;

  const params: unknown[] = [vectorStr, threshold, limit];
  if (docType) params.push(docType);

  const result = await pool.query(baseQuery, params);
  return result.rows as DocumentChunkWithDoc[];
}
