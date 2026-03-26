# PurpleMaia Olelo Research Agent

An AI-powered research tool for querying the CTAHR (College of Tropical Agriculture and Human Resources) document collection. Users submit natural language questions and the system searches 5,400+ local PDFs, synthesizes findings using a local LLM, and returns a narrative summary with tiered source citations.

---

## How It Works

1. User submits a research query via the web UI
2. The LLM analyzes the query and generates search terms
3. The system runs parallel searches across:
   - **CTAHR local document index** (primary) — 5,456 PDFs/DOCX indexed via SQLite FTS5
   - **Vector search** — semantic search over ingested document chunks (pgvector)
   - **Papakilo** (optional, disabled by default) — live Hawaiian newspaper scraper
4. Relevant documents are triaged into tiers (high / medium / peripheral)
5. A narrative summary is generated from the tier 1–2 findings
6. Results stream to the UI in real time via Server-Sent Events

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 / Node.js 20 |
| LLM | LM Studio (OpenAI-compatible) — Qwen 3.5 397B-A17B |
| Document Search | SQLite FTS5 via `better-sqlite3` |
| Vector Search | PostgreSQL + pgvector (Kysely ORM) |
| UI | Radix UI + Tailwind CSS + Shadcn |
| Auth | Custom session auth + Google OAuth |
| Package Manager | pnpm |
| Deployment | Dokku |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for PostgreSQL + pgvector)
- The `ctahr-pdfs/` document collection placed in `Agentic-Pdf-tool/pdf-console-agent-main/ctahr-pdfs/`

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy and fill in `.env`:

```bash
cp .env.example .env
```

Key variables:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
PASSWORD_HASH_SECRET=your-secret

# LM Studio (OpenAI-compatible endpoint)
DEEPSEEK_API_URL=https://your-lmstudio-host/v1
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_MODEL=your-model-name

# Papakilo scraper (disabled by default)
# PAPAKILO_SEARCH_ENABLED=true
```

### 3. Start the database

```bash
docker run -d \
  --name olelo-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg17
```

### 4. Create the database and run migrations

```bash
docker exec olelo-postgres psql -U postgres -c "CREATE DATABASE myapp;"
bash ./scripts/migrate/up.sh
```

### 5. Seed test accounts

```bash
pnpm init:seed
```

### 6. Build the CTAHR document index

```bash
cd Agentic-Pdf-tool/pdf-console-agent-main
npm install
node index-docs.js
```

This indexes ~5,560 files and takes 10–30 minutes depending on hardware. The app works without it — CTAHR search results will just be empty until indexing completes.

### 7. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Test Accounts

Run `pnpm init:seed` to create these accounts (safe to run once — errors if already seeded).

| Username | Email | Password | Role |
|----------|-------|----------|------|
| `jdoe` | john.doe@example.com | `password123!` | Guest |
| `jsmith` | jane.smith@example.com | `password123!` | Member |
| `ajohnson` | alice.johnson@example.com | `password123!` | Org Admin |

### Account Types

- **Guest** — Read-only. Can view research results but cannot initiate new research.
- **Member** — Standard internal user. Can run research queries, view history, and submit feedback. Belongs to an organization.
- **Org Admin** — Manages members and views all research sessions within their organization.
- **Sysadmin** — Platform-level administrator with access to all organizations. Created interactively via:
  ```bash
  pnpm tsx scripts/init/sysadmin.ts
  ```

---

## Repository Structure

```
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # Login, register, session, Google OAuth
│   │   │   └── research/      # Research pipeline API routes + SSE stream
│   │   ├── research/          # Research UI pages
│   │   └── dashboard/         # Role-based dashboards (guest/member/admin/sysadmin)
│   ├── components/
│   │   ├── research/          # ResearchQueryForm, ResearchResults, ActivityStream
│   │   ├── auth/              # Login/register forms
│   │   └── ui/                # Shadcn UI primitives
│   ├── services/
│   │   └── research/
│   │       ├── orchestrator.ts   # 7-step research pipeline
│   │       ├── claude.ts         # LLM calls (query analysis, triage, narrative)
│   │       ├── ctahr-search.ts   # CTAHR FTS5 document search
│   │       ├── papakilo.ts       # Hawaiian newspaper scraper (Playwright)
│   │       ├── vector-search.ts  # pgvector semantic search
│   │       ├── embedding.ts      # Query embedding generation
│   │       ├── session-store.ts  # DB session persistence
│   │       └── stream.ts         # SSE stream management
│   ├── lib/
│   │   ├── auth/              # Session validation, OAuth
│   │   └── config/
│   │       └── research.ts    # Research service configuration
│   ├── db/
│   │   ├── schema.ts          # Kysely database schema
│   │   └── migrations/        # SQL migration files
│   └── types/
│       └── research.ts        # Shared TypeScript types
├── Agentic-Pdf-tool/
│   └── pdf-console-agent-main/
│       ├── index-docs.js      # Build/update SQLite FTS5 index
│       ├── search-docs.js     # Query the index (CLI)
│       ├── view-doc.js        # Extract and display a single document
│       ├── ctahr-pdfs/        # Document collection (gitignored)
│       └── catalog.db         # Generated FTS5 index (gitignored)
├── scripts/
│   ├── init/                  # Seed and sysadmin creation scripts
│   ├── migrate/               # Database migration scripts
│   └── destroy/               # Cleanup scripts
└── .env                       # Environment variables (never commit)
```

---

## Research Pipeline

```
User Query
    ↓
[INITIATE]  Analyze query with LLM → generate search terms
    ↓
[CLARIFY]   Optional clarifying questions (if query is ambiguous)
    ↓
[EXECUTE]
  ├── CTAHR FTS5 search (primary)
  ├── Vector search via pgvector
  └── Papakilo scraper (optional, off by default)
    ↓
[TRIAGE]    LLM triage agent assigns tier 1/2/3 to each document
    ↓
[NARRATIVE] LLM generates prose summary from tier 1+2 findings
    ↓
[PERSIST]   Save results to PostgreSQL
    ↓
[STREAM]    SSE delivers results to UI in real time
```

---

## CTAHR Document Index

The index covers 5,456 documents across collections including:

| Collection | Description |
|-----------|-------------|
| CV | Faculty CVs |
| FacultySites | Faculty research sites |
| HANA AI / Hanai Ai | Newsletter archive |
| Ext_Pub | Extension publications |
| Forestry | Forestry research |
| MasterGardener | Master Gardener program |
| CROP WEBSITE | Crop production resources |
| ROD | Rapid Ohia Death research |
| CBB | Coffee Berry Borer research |
| SMARTS2 | Sustainable ag research |
| New_Farmer | New farmer resources |
| YFB | Yellow-Faced Bee research |
| 4H | 4-H program materials |

To rebuild the index from scratch:

```bash
cd Agentic-Pdf-tool/pdf-console-agent-main
node index-docs.js --rebuild
```

To search the index directly from the CLI:

```bash
node search-docs.js "soil conservation" --limit 20
node search-docs.js "taro cultivation" --type pdf
node search-docs.js --stats
```

---

## Database Migrations

Create a new migration:
```bash
pnpm migrate:create <migration_name>
```

Run all pending migrations:
```bash
bash ./scripts/migrate/up.sh
```

---

## Configuration Reference

All research service settings are in `src/lib/config/research.ts` and controlled via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_API_URL` / `DEEPSEEK_API_URL` | — | OpenAI-compatible LLM endpoint |
| `LLM_API_KEY` / `DEEPSEEK_API_KEY` | — | API key for LLM |
| `LLM_MODEL` / `DEEPSEEK_MODEL` | `deepseek-chat` | Model name |
| `VOYAGE_API_KEY` | — | Voyage AI key for embeddings |
| `PAPAKILO_SEARCH_ENABLED` | `false` | Enable Papakilo newspaper scraper |
| `CTAHR_SEARCH_ENABLED` | `true` | Enable CTAHR document search |
| `CTAHR_MAX_TERMS` | `3` | Max search terms sent to FTS5 |
| `CTAHR_MAX_RESULTS_PER_TERM` | `5` | Max results per search term |

---

## Deployment

Push to the Dokku remote to deploy:

```bash
# Dev environment
git push dokku-dev main:master

# Production
git push dokku main:master
```

Migrations run automatically via the predeploy hook in `app.json`.
