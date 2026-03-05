# Contracts: Papakilo Search Service

**Branch**: `002-agentic-search` | **Date**: 2026-02-20

---

## No New API Endpoints

The Papakilo integration is internal to the research pipeline. It does not add any new HTTP endpoints. All client-facing API contracts remain unchanged:

```
POST /api/research/initiate      — unchanged
POST /api/research/clarify       — unchanged
GET  /api/research/stream/[id]   — unchanged (stream events extended, see below)
GET  /api/research/history       — unchanged
GET  /api/research/[sessionId]   — unchanged
```

---

## SSE Stream Event Changes

The SSE stream gains two new activity messages emitted during Papakilo search. These use the existing `ActivityMessage` shape — no protocol changes.

### New Activity Messages

**`searching` — Papakilo search started**
```json
{
  "id": "act_...",
  "type": "searching",
  "message": "Searching Papakilo Database for Hawaiian newspapers...",
  "timestamp": "...",
  "metadata": {
    "source": "Papakilo Database"
  }
}
```

**`found` — Papakilo articles found**
```json
{
  "id": "act_...",
  "type": "found",
  "message": "Found 8 newspaper articles on Papakilo",
  "timestamp": "...",
  "metadata": {
    "source": "Papakilo Database",
    "count": 8
  }
}
```

**`reading` — Reading individual Papakilo article**
```json
{
  "id": "act_...",
  "type": "reading",
  "message": "Reading: Ka Nupepa Kuokoa, April 21 1922",
  "timestamp": "...",
  "metadata": {
    "source": "Papakilo Database",
    "articleTitle": "Ka Nupepa Kuokoa, April 21 1922"
  }
}
```

**`searching` — Papakilo unavailable (graceful degradation)**
```json
{
  "id": "act_...",
  "type": "searching",
  "message": "Papakilo Database unavailable, using corpus only",
  "timestamp": "..."
}
```

---

## ResearchResult Source Shape (updated)

Sources in `ResearchResult.sources` now include `papakilo-live` type:

```typescript
interface Source {
  id: string;           // "src_0", "src_1", etc.
  title: string;        // Article title or document title
  publication?: string; // e.g., "Ka Nupepa Kuokoa"
  date?: string;        // e.g., "1922-04-21"
  url?: string;         // NEW: always present for papakilo-live sources
  type: 'papa-kilo' | 'papakilo-live' | 'newspaper' | 'web' | 'other';
  excerpt?: string;     // First 200 chars of content
}
```

**`papakilo-live` sources always include `url`** — a persistent link to the original article on papakilodatabase.com.

---

## Internal Service Interface

### `src/services/research/papakilo.ts`

```typescript
interface PapakiloOptions {
  maxTerms?: number;        // default: 3
  maxArticlesPerTerm?: number; // default: 3
  timeoutMs?: number;       // default: 30000
}

// Main entry point called by orchestrator
export async function researchWithPapakilo(
  searchTerms: string[],
  options?: PapakiloOptions
): Promise<{
  articles: PapakiloArticleContent[];
  sources: Source[];          // Ready-to-use Source[] for ResearchResult
  totalFound: number;         // Total article count across all terms
}>
```

Throws: Never — all errors are caught internally. Returns empty arrays on failure.
