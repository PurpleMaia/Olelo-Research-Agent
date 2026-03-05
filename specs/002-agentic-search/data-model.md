# Data Model: Agentic Papakilo Search

**Branch**: `002-agentic-search` | **Date**: 2026-02-20

---

## Database Changes

**None required.** Papakilo live-search results are stored as part of the existing `research_sessions.results` JSONB column, which already holds the `ResearchResult` object. No new tables needed.

---

## Type Changes

### `src/types/research.ts`

**Modified: `Source.type`**

```typescript
// Before
type: 'papa-kilo' | 'newspaper' | 'web' | 'other';

// After
type: 'papa-kilo' | 'papakilo-live' | 'newspaper' | 'web' | 'other';
```

`'papakilo-live'` = live-scraped from papakilodatabase.com during the research session.
`'papa-kilo'` = pre-ingested into the vector corpus.

---

## New Service: `src/services/research/papakilo.ts`

### Interfaces

```typescript
export interface PapakiloArticle {
  url: string;
  title: string;
  meta: string;           // Raw result metadata from search page
  resultIndex: number;    // Position in search results (1-based)
}

export interface PapakiloSearchResult {
  term: string;
  totalResults: number;
  articles: PapakiloArticle[];
}

export interface PapakiloArticleContent {
  url: string;
  title: string;
  rawText: string;        // OCR text from article page
  articleId: string;      // Extracted from URL (e.g., "KNK19030327-01.2.34")
}
```

### Functions

```typescript
// Search Papakilo for a term, returns top results (no content)
export async function searchPapakilo(term: string): Promise<PapakiloSearchResult>

// Fetch full text of a specific article URL
export async function fetchArticle(url: string): Promise<PapakiloArticleContent>

// High-level: search multiple terms + fetch top N articles' content
export async function researchWithPapakilo(
  searchTerms: string[],
  options?: { maxTerms?: number; maxArticlesPerTerm?: number }
): Promise<{ articles: PapakiloArticleContent[]; sources: Source[] }>
```

---

## Orchestrator Changes

### `src/services/research/orchestrator.ts`

The pipeline gains a parallel branch for Papakilo search:

```
Step 2a: Vector search (existing)    ──┐
Step 2b: Papakilo search (new)       ──┼─► Merge context ──► Step 5: Synthesize
```

Pipeline pseudocode:

```typescript
// Run vector search and Papakilo search in parallel
const [vectorResults, papakiloResults] = await Promise.allSettled([
  vectorSearch.search(queryEmbedding, { limit: 10 }),
  papakilo.researchWithPapakilo(analysis.searchTerms, { maxTerms: 3, maxArticlesPerTerm: 3 })
]);

// Merge into unified context for synthesis
const context = [
  ...vectorResultsContext,     // from vector search
  ...papakiloArticleContext,   // from papakilo search
];
```

---

## Config Changes

### `src/lib/config/research.ts`

Add:

```typescript
papakiloEnabled: process.env.PAPAKILO_SEARCH_ENABLED !== 'false',  // default on
papakiloMaxTerms: parseInt(process.env.PAPAKILO_MAX_TERMS ?? '3'),
papakiloTimeoutMs: parseInt(process.env.PAPAKILO_TIMEOUT_MS ?? '30000'),
```

### `.env`

Add (optional, defaults to enabled):
```
PAPAKILO_SEARCH_ENABLED=true
PAPAKILO_MAX_TERMS=3
PAPAKILO_TIMEOUT_MS=30000
```

---

## State Transitions

No changes to `ResearchStatus` enum or session state machine. Papakilo search is internal to the `execute()` pipeline — transparent to the client state machine.
