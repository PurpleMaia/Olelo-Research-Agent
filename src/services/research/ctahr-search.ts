import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_DB_PATH = path.join(
  process.cwd(),
  'Agentic-Pdf-tool',
  'pdf-console-agent-main',
  'catalog.db'
);

const DEFAULT_TEXT_DIR = path.join(
  process.cwd(),
  'Agentic-Pdf-tool',
  'pdf-console-agent-main',
  'extracted-text'
);

export interface CtahrDocument {
  id: string;
  filename: string;
  path: string;
  collection: string;
  fileType: string;
  pages: number | null;
  snippet: string;
  textLength: number;
  content: string; // snippet or extracted-text file content (up to 3000 chars)
}

export interface CtahrSearchData {
  documents: CtahrDocument[];
  totalFound: number;
}

let _db: Database.Database | null = null;

function getDb(): Database.Database | null {
  if (_db) return _db;
  const dbPath = process.env.CTAHR_CATALOG_DB_PATH ?? DEFAULT_DB_PATH;
  if (!fs.existsSync(dbPath)) {
    console.warn(`[ctahr-search] Catalog DB not found at ${dbPath}. Run index-docs.js first.`);
    return null;
  }
  try {
    _db = new Database(dbPath, { readonly: true });
    return _db;
  } catch (err) {
    console.warn('[ctahr-search] Failed to open catalog DB:', err);
    return null;
  }
}

/** Try to read the saved extracted-text file for richer content than the DB snippet. */
function tryReadExtractedText(docId: string): string | undefined {
  const textDir = process.env.CTAHR_TEXT_DIR ?? DEFAULT_TEXT_DIR;
  if (!fs.existsSync(textDir)) return undefined;
  const safeId = docId.replace(/\//g, '_');
  try {
    const files = fs.readdirSync(textDir).filter((f) => f.startsWith(safeId + '_'));
    if (files.length === 0) return undefined;
    files.sort().reverse(); // most recent first
    return fs.readFileSync(path.join(textDir, files[0]), 'utf-8').slice(0, 3000);
  } catch {
    return undefined;
  }
}

interface DbRow {
  id: string;
  filename: string;
  path: string;
  collection: string;
  file_type: string;
  pages: number | null;
  snippet: string | null;
  text_length: number;
}

/**
 * Searches the CTAHR document catalog for each of the given terms using
 * SQLite FTS5 (BM25 ranking). Results are deduplicated across terms.
 */
export async function searchCtahr(
  terms: string[],
  options: { maxTerms?: number; maxResultsPerTerm?: number } = {}
): Promise<CtahrSearchData> {
  const db = getDb();
  if (!db) return { documents: [], totalFound: 0 };

  const { maxTerms = 3, maxResultsPerTerm = 5 } = options;
  const termsToSearch = terms.slice(0, maxTerms);

  const seen = new Set<string>();
  const documents: CtahrDocument[] = [];

  for (const term of termsToSearch) {
    try {
      const ftsQuery = term
        .split(/\s+/)
        .filter((t) => t.length > 0)
        .map((t) => `"${t.replace(/"/g, '""')}"`)
        .join(' ');

      const rows = db
        .prepare(
          `SELECT d.id, d.filename, d.path, d.collection, d.file_type, d.pages, d.snippet, d.text_length
           FROM documents_fts f
           JOIN documents d ON d.id = f.id
           WHERE documents_fts MATCH ?
           ORDER BY rank
           LIMIT ?`
        )
        .all(ftsQuery, maxResultsPerTerm) as DbRow[];

      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);

        const extractedText = tryReadExtractedText(row.id);
        const content = extractedText ?? row.snippet ?? '';

        documents.push({
          id: row.id,
          filename: row.filename,
          path: row.path,
          collection: row.collection,
          fileType: row.file_type,
          pages: row.pages,
          snippet: row.snippet ?? '',
          textLength: row.text_length,
          content,
        });
      }
    } catch (err) {
      console.warn(`[ctahr-search] Search failed for term "${term}":`, err);
    }
  }

  return { documents, totalFound: documents.length };
}
