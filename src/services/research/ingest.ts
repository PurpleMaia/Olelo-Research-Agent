import { db } from '@/db/kysely/client';
import { researchConfig } from '@/lib/config/research';
import { embed, embedBatch } from './embedding';

export interface IngestDocumentInput {
  title: string;
  content: string;
  docType: 'papa-kilo' | 'newspaper' | 'web' | 'other';
  publication?: string;
  date?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Ingests a single document: stores it, chunks the content, generates
 * embeddings, and inserts chunks into the vector store.
 *
 * TODO: Replace embedding stub to enable real vector search.
 */
export async function ingestDocument(doc: IngestDocumentInput): Promise<string> {
  // 1. Insert the document record
  const result = await db
    .insertInto('documents' as any)
    .values({
      title: doc.title,
      content: doc.content,
      doc_type: doc.docType,
      publication: doc.publication ?? null,
      date: doc.date ?? null,
      url: doc.url ?? null,
      metadata: JSON.stringify(doc.metadata ?? {}),
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  const documentId = (result as any).id;

  // 2. Chunk the content
  const chunks = chunkText(doc.content, researchConfig.maxChunkTokens, researchConfig.chunkOverlapTokens);

  // 3. Generate embeddings for each chunk
  const embeddings = await embedBatch(chunks);

  // 4. Insert chunks with embeddings
  for (let i = 0; i < chunks.length; i++) {
    await db
      .insertInto('document_chunks' as any)
      .values({
        document_id: documentId,
        chunk_index: i,
        content: chunks[i],
        // NOTE: embedding is null when using stub — pgvector column accepts null
        embedding: embeddings[i].every((v) => v === 0) ? null : `[${embeddings[i].join(',')}]`,
      })
      .execute();
  }

  console.log(`[ingest] Ingested document "${doc.title}" with ${chunks.length} chunks`);
  return documentId;
}

/**
 * Bulk ingest documents from a JSON array.
 */
export async function ingestBatch(
  documents: IngestDocumentInput[]
): Promise<{ ingested: number; errors: number }> {
  let ingested = 0;
  let errors = 0;

  for (const doc of documents) {
    try {
      await ingestDocument(doc);
      ingested++;
    } catch (err) {
      console.error(`[ingest] Failed to ingest "${doc.title}":`, err);
      errors++;
    }
  }

  return { ingested, errors };
}

// --- Text Chunking ---

/**
 * Splits text into overlapping chunks of approximately `maxTokens` words.
 * Uses a simple word-based approach (not true tokenization).
 */
function chunkText(text: string, maxTokens: number, overlapTokens: number): string[] {
  const words = text.split(/\s+/);
  if (words.length <= maxTokens) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxTokens, words.length);
    chunks.push(words.slice(start, end).join(' '));
    start += maxTokens - overlapTokens;
  }

  return chunks;
}
