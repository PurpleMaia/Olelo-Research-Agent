# Phase 0 Research: Agentic Papakilo Search Integration

**Branch**: `002-agentic-search` | **Date**: 2026-02-20

---

## 1. How to call Playwright from Next.js API routes

**Decision**: Adapt Playwright logic directly into a native TypeScript service (`src/services/research/papakilo.ts`) using the `playwright-core` or `playwright` package, rather than spawning child processes to call the existing scripts.

**Rationale**:
- Child process spawning (`child_process.spawn`) introduces latency, brittle IPC, and makes error handling harder
- The existing `.js` scripts are standalone CLI tools; their logic is simple enough to port directly to a TypeScript module
- Direct import keeps everything typed, observable, and composable with the stream system
- `playwright` is already a devDependency in the Research_agentic_tool's package.json; it should be added to the main app

**Alternatives considered**:
- `child_process.spawn` to call existing scripts — rejected: fragile, untyped, no streaming visibility
- HTTP microservice wrapping the Playwright tool — rejected: overkill, adds infra dependency

---

## 2. Playwright in Next.js server environment

**Decision**: Playwright runs fine in Next.js API routes (Node.js runtime, not Edge). Use `{ headless: true, channel: 'chrome' }` matching the existing scripts.

**Rationale**:
- Next.js API routes run in a Node.js process, not browser/edge; Playwright is a Node.js library
- Chrome must be installed on the server (same requirement the existing tool has)
- On dev machines this is already satisfied; document as env requirement
- For production, use `executablePath` env var override pattern

**Constraint**: Must NOT use `next.config.ts` `experimental.serverComponentsExternalPackages` for playwright — instead rely on standard server-side import. Add `playwright-core` as a regular dependency to main `package.json`.

---

## 3. Search term generation

**Decision**: Reuse Claude's existing `analyzeQuery()` output (`searchTerms` array) as input to the Papakilo search. No separate term-generation step needed.

**Rationale**:
- `analyzeQuery()` already generates 3-7 Hawaiian + English search terms (per existing prompt)
- These same terms are well-suited for Papakilo's keyword search
- Avoids a second Claude call

---

## 4. Rate limiting for external site scraping

**Decision**: Run Papakilo searches sequentially (not in parallel), with a 1-2 second delay between requests. Limit to top 3 search terms per session.

**Rationale**:
- papakilodatabase.com is a nonprofit cultural resource; respectful scraping is appropriate
- Existing tool already has rate-limiting notes in LESSONS_LEARNED.md
- 3 terms × ~5s per search = ~15s maximum added latency, acceptable for research feature

---

## 5. Where Papakilo fits in the pipeline

**Decision**: Papakilo search runs **in parallel** with vector search (step 2b), not sequentially after it. Both results are merged before synthesis.

**Rationale**:
- Reduces total latency vs. serial execution
- The existing vector search is fast (~200ms); Papakilo is slow (~5-10s per search)
- Running them concurrently hides vector search latency inside Papakilo search time
- Results are merged by type in the `synthesize()` call — already handles mixed sources

---

## 6. Article content extraction

**Decision**: For Papakilo, retrieve article **metadata + URLs only** in the first pass (from search results). Do NOT auto-fetch full article text for every result — only fetch text for the top 3 most promising articles (based on title relevance).

**Rationale**:
- Each `view-article.js` call takes ~3-5s and adds significant latency
- Fetching all 20 results would be too slow and too many requests
- Title-based relevance filtering (Claude quick-check) can select best candidates
- Full text of top 3 is sufficient context for synthesis

---

## 7. Failure handling

**Decision**: Papakilo search failures are **non-blocking** — if it times out or errors, the pipeline continues with vector search results only.

**Rationale**:
- External website availability is not guaranteed
- Research should degrade gracefully, not fail entirely
- Stream activity message informs user when Papakilo search is skipped

---

## 8. Source type

**Decision**: Papakilo live-search results use source type `'papakilo-live'` (new type added to the `Source` interface), distinct from `'papa-kilo'` (pre-ingested corpus docs).

**Rationale**:
- Distinguishes pre-indexed documents from live-scraped results in the UI
- Allows future UI to show "live search" badge vs. "corpus" badge
