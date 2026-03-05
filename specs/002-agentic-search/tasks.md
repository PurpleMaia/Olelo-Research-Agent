# Tasks: Agentic Papakilo Search Integration

**Input**: Design documents from `/specs/002-agentic-search/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in all descriptions

## Derived User Stories (no spec.md — derived from plan.md)

| Story | Priority | Goal |
|-------|----------|------|
| US1 | P1 🎯 MVP | Papakilo live newspaper search runs with every research query; results appear in findings |
| US2 | P2 | Pipeline degrades gracefully when Papakilo is unavailable; user sees clear feedback |
| US3 | P3 | Developer can configure or disable Papakilo search via environment variables |

---

## Phase 1: Setup

**Purpose**: Add Playwright dependency to the main app

- [x] T001 Install `playwright-core` package and add to `package.json` dependencies (`npm install playwright-core`)
- [x] T002 Install Chromium browser for Playwright (`npx playwright install chromium`) — only if Chrome not already available on system

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type and config changes that all user story phases depend on

**⚠️ CRITICAL**: Complete before any US1/US2/US3 work begins

- [x] T003 [P] Add `'papakilo-live'` to `Source.type` union in `src/types/research.ts`
- [x] T004 [P] Add `papakiloEnabled`, `papakiloMaxTerms`, `papakiloTimeoutMs` fields to config object in `src/lib/config/research.ts` with defaults (`true`, `3`, `30000`)
- [x] T005 [P] Document `PAPAKILO_SEARCH_ENABLED`, `PAPAKILO_MAX_TERMS`, `PAPAKILO_TIMEOUT_MS` env vars with defaults in `.env`

**Checkpoint**: Foundation ready — US1/US2/US3 can now be worked on

---

## Phase 3: User Story 1 — Papakilo Search Integration (Priority: P1) 🎯 MVP

**Goal**: When a user submits a research query, the pipeline searches Papakilo Database live using Claude's generated Hawaiian search terms, fetches top article content, and includes the articles as `papakilo-live` sources in the synthesized result.

**Independent Test**: Submit query "How was taro cultivated in ancient Hawaii?" via `/research` page. Verify `ResearchResult.sources` contains at least one source with `type: 'papakilo-live'` and a non-empty `url`. Verify findings mention content from Hawaiian newspapers.

### Implementation for User Story 1

- [x] T006 [P] [US1] Implement `searchPapakilo(term: string): Promise<PapakiloSearchResult>` in `src/services/research/papakilo.ts` — launches headless Chrome via playwright-core, navigates to `https://www.papakilodatabase.com/pdnupepa/cgi-bin/pdnupepa?a=p&p=home`, fills `#homepagesearchinputtxq`, waits for results, extracts article links using `a[href*="a=d&d="]` selector
- [x] T007 [P] [US1] Implement `fetchArticleContent(url: string): Promise<PapakiloArticleContent>` in `src/services/research/papakilo.ts` — navigates to article URL, extracts page text, returns `{ url, title, rawText, articleId }` where `articleId` is parsed from URL pattern
- [x] T008 [US1] Implement `researchWithPapakilo(searchTerms, options?): Promise<{ articles, sources, totalFound }>` in `src/services/research/papakilo.ts` — iterates top N terms (default 3), calls `searchPapakilo()` sequentially with 1s delay between terms, selects top N articles per term (default 3), calls `fetchArticleContent()` for each, maps results to `Source[]` with `type: 'papakilo-live'`, NEVER throws (wraps all in try/catch, returns empty arrays on error)
- [x] T009 [US1] Export papakilo functions from `src/services/research/index.ts`
- [x] T010 [US1] Modify `execute()` in `src/services/research/orchestrator.ts` — run `Promise.allSettled([vectorSearch.search(...), papakilo.researchWithPapakilo(analysis.searchTerms, ...)])` in parallel, extract fulfilled values, merge papakilo article content into `context` array before `claude.synthesize()` call
- [x] T011 [US1] Update `SYNTHESIS_PROMPT` in `src/services/research/claude.ts` — add instruction that `papakilo-live` sources are live-scraped historical Hawaiian newspaper OCR (may have noise), always include the source URL in attribution, apply lower confidence when OCR is unclear

**Checkpoint**: US1 complete — Papakilo results should appear in research findings for any Hawaiian-topic query

---

## Phase 4: User Story 2 — Graceful Degradation (Priority: P2)

**Goal**: When Papakilo is unreachable, times out, or returns errors, the research pipeline continues using vector search results only. The user sees a clear status message (not a broken experience).

**Independent Test**: Disconnect internet or temporarily set an invalid Papakilo URL in `papakilo.ts`. Submit a query. Verify research completes successfully with corpus-only results and the activity stream shows the degradation message (not an error/crash).

### Implementation for User Story 2

- [x] T012 [US2] Add stream activity message `"Searching Papakilo Database for Hawaiian newspapers..."` with `metadata.source: 'Papakilo Database'` to `execute()` in `src/services/research/orchestrator.ts` — emit before the parallel search block
- [x] T013 [US2] Add stream activity message `"Found N newspaper articles on Papakilo"` with `metadata.count` to `execute()` in `src/services/research/orchestrator.ts` — emit when papakilo search resolves successfully with results
- [x] T014 [US2] Add stream activity message `"Papakilo Database unavailable, using corpus only"` to `execute()` in `src/services/research/orchestrator.ts` — emit when `Promise.allSettled` papakilo result is `rejected` OR returns empty articles array
- [x] T015 [US2] Add per-article `"Reading: [title]"` stream activity messages with `metadata.source: 'Papakilo Database'` to `execute()` in `src/services/research/orchestrator.ts` — emit for each article fetched (up to 3)

**Checkpoint**: US2 complete — disconnect network, run a query, verify degradation message appears and research still completes

---

## Phase 5: User Story 3 — Feature Flag Control (Priority: P3)

**Goal**: A developer can set `PAPAKILO_SEARCH_ENABLED=false` to skip Papakilo search entirely (e.g., for local dev without Chrome, or for performance testing). Timeout is also configurable.

**Independent Test**: Set `PAPAKILO_SEARCH_ENABLED=false` in `.env`, restart dev server, submit a query. Verify no Playwright browser launches (no Papakilo activity messages), research completes normally with corpus-only results.

### Implementation for User Story 3

- [x] T016 [US3] Add `papakiloEnabled` gate at start of Papakilo branch in `execute()` in `src/services/research/orchestrator.ts` — if `researchConfig.papakiloEnabled === false`, skip Papakilo `Promise.allSettled` branch entirely, use only vector search results
- [x] T017 [US3] Wrap `researchWithPapakilo()` call with `Promise.race([papakiloSearch, timeoutPromise])` in `src/services/research/orchestrator.ts` using `researchConfig.papakiloTimeoutMs` — timeout resolves to empty result (not rejection)
- [x] T018 [US3] Pass `researchConfig.papakiloMaxTerms` and `researchConfig.papakiloTimeoutMs` as options to `researchWithPapakilo()` call in `src/services/research/orchestrator.ts`

**Checkpoint**: US3 complete — toggle `PAPAKILO_SEARCH_ENABLED=false`, verify Playwright never launches

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Test script, validation against quickstart, cleanup

- [x] T019 [P] Create `scripts/test-papakilo-search.ts` — standalone test script that calls `searchPapakilo("kanu kalo")` and `fetchArticleContent()` on a result URL, prints output to console; run with `npx tsx scripts/test-papakilo-search.ts`
- [x] T020 Validate against `specs/002-agentic-search/quickstart.md` test scenarios — run dev server, submit query "How was taro cultivated in ancient Hawaii?", confirm Papakilo sources appear in results with valid URLs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core integration must complete first
- **US2 (Phase 4)**: Depends on Phase 3 (T010 must exist to add activity messages around it)
- **US3 (Phase 5)**: Depends on Phase 3 (T010 must exist to add gate and timeout around it)
- **Polish (Phase 6)**: Depends on US1–US3

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependency on US2/US3
- **US2 (P2)**: Depends on US1 (modifies the same `execute()` block created in T010)
- **US3 (P3)**: Depends on US1 (modifies the same `execute()` block created in T010)
- US2 and US3 can be worked on in parallel once US1 is complete (different lines in orchestrator.ts)

### Within Each User Story

- T006 and T007 are independent and can be written in parallel (different functions in same file)
- T008 depends on T006 and T007
- T009 depends on T008
- T010 depends on T009 (needs the exported function)
- T011 is independent of T010 (different file)

### Parallel Opportunities

- T003, T004, T005 (Foundational) — all parallel
- T006, T007 (US1 papakilo.ts functions) — parallel
- T010, T011 (US1 orchestrator + claude prompt) — parallel (different files)
- T012–T015 (US2 activity messages) — can be done as one orchestrator edit
- T016–T018 (US3 config gates) — sequential edits to same orchestrator block

---

## Parallel Example: US1

```bash
# After Foundational is complete, launch US1 tasks in parallel:

Task: "Implement searchPapakilo() in src/services/research/papakilo.ts"     # T006
Task: "Implement fetchArticleContent() in src/services/research/papakilo.ts" # T007
Task: "Update SYNTHESIS_PROMPT in src/services/research/claude.ts"           # T011

# Then sequentially:
Task: "Implement researchWithPapakilo() in src/services/research/papakilo.ts"  # T008 (after T006, T007)
Task: "Export papakilo from src/services/research/index.ts"                    # T009 (after T008)
Task: "Modify execute() in src/services/research/orchestrator.ts"              # T010 (after T009)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Install playwright-core
2. Complete Phase 2: Type + config foundation
3. Complete Phase 3 (US1): Full Papakilo service + orchestrator integration
4. **STOP and VALIDATE**: Submit a query, verify Papakilo sources appear in results
5. Demo with US1 working

### Incremental Delivery

1. Setup + Foundational → types and config ready
2. US1 → Core Papakilo search works → Demo/validate
3. US2 → Stream activity + graceful degradation → Demo (toggle network off)
4. US3 → Feature flag control → Demo (`PAPAKILO_SEARCH_ENABLED=false`)
5. Polish → Test script + quickstart validation

---

## Notes

- [P] tasks = different files or independent functions, no blocking dependencies
- [Story] label maps each task to its user story for traceability
- `researchWithPapakilo()` (T008) must never throw — all errors caught internally (key contract from `contracts/papakilo-service.md`)
- Playwright browser config: `{ headless: true, channel: 'chrome' }` (matches existing Research_agentic_tool scripts)
- Sequential search requests with 1-2s delay (respectful scraping per `research.md` decision 4)
- Commit after each checkpoint (end of each phase)
