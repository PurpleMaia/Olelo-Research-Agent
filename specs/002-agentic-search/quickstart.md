# Quickstart: Agentic Papakilo Search

**Branch**: `002-agentic-search` | **Date**: 2026-02-20

---

## Prerequisites

1. Chrome/Chromium must be installed on the machine running Next.js dev server
2. Playwright package installed in the main app (see Setup)
3. App running with `npm run dev`

---

## Setup

### 1. Install Playwright in the main app

```bash
npm install playwright-core
npx playwright install chromium
```

Or if Chrome is already installed system-wide, no install needed — Playwright will use `channel: 'chrome'`.

### 2. Add environment variables (optional)

In `.env`:
```
PAPAKILO_SEARCH_ENABLED=true
PAPAKILO_MAX_TERMS=3
PAPAKILO_TIMEOUT_MS=30000
```

These all have defaults — only set them if you want to override.

---

## How it works

When a user submits a research query, the pipeline now:

1. **Analyzes** the query with Claude → extracts Hawaiian search terms
2. **Searches in parallel**:
   - Vector search over ingested corpus (fast, ~200ms)
   - Live Papakilo search for each term (slow, ~5-30s total)
3. **Merges** both result sets into unified context
4. **Synthesizes** with Claude → returns findings with sources

Papakilo sources appear in `ResearchResult.sources` with `type: 'papakilo-live'` and always include a `url` linking back to the original newspaper article.

---

## Stream activity during search

While Papakilo search runs, the user sees these activity messages in the research UI:

```
🔍 Searching Papakilo Database for Hawaiian newspapers...
📄 Found 8 newspaper articles on Papakilo
📖 Reading: Ka Nupepa Kuokoa, April 21 1922
📖 Reading: Ka Hoku o Hawaii, March 3 1935
📖 Reading: Ke Aloha Aina, January 10 1908
```

If Papakilo is unreachable, the user sees:
```
🔍 Papakilo Database unavailable, using corpus only
```

---

## Testing

```bash
# Test Papakilo search in isolation
npx tsx scripts/test-papakilo-search.ts "kanu kalo"

# Run the full app and submit a research query
npm run dev
# Open http://localhost:3000/research
# Try: "How was taro cultivated in ancient Hawaii?"
```

---

## Disabling Papakilo search

Set in `.env`:
```
PAPAKILO_SEARCH_ENABLED=false
```

This makes the pipeline fall back to vector-only search, identical to prior behavior.
