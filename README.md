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

### 2. Start the database

The database runs in Docker. **This must be done on every machine** — it is not included in the repo.

```bash
docker run -d \
  --name olelo-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg17
```

If the container already exists but is stopped (e.g. after a reboot):

```bash
docker start olelo-postgres
```

### 3. Configure environment

The `.env` file is **gitignored** and must be created manually on each machine. Create it at the project root:

```env
# Database — matches the Docker container above
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp

# Required for password hashing (any random string, keep consistent)
PASSWORD_HASH_SECRET=dev-secret-key-change-in-production

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# LM Studio — OpenAI-compatible LLM endpoint (contact team for values)
DEEPSEEK_API_URL=your-url
DEEPSEEK_API_KEY=your-key
DEEPSEEK_MODEL=cloud-qwen3.5-397b-A17b

# Voyage AI — used for vector embeddings (https://dash.voyageai.com)
VOYAGE_API_KEY=your-voyage-api-key
EMBEDDING_MODEL=voyage-3
EMBEDDING_DIMENSION=1024

# Optional: enable Papakilo newspaper scraper (off by default)
# PAPAKILO_SEARCH_ENABLED=true
```

> **Note:** The LM Studio URL, API key, and model name are shared internally — ask a team member if you don't have them.
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

### 6. Place the CTAHR documents

Unzip the CTAHR document archive **directly into** the following folder:

```
Agentic-Pdf-tool/pdf-console-agent-main/ctahr-pdfs/
```

The contents of the zip should land flat inside `ctahr-pdfs/` — not nested inside a subfolder. The expected structure is:

```
Agentic-Pdf-tool/pdf-console-agent-main/ctahr-pdfs/
├── SomePaper.pdf
├── AnotherDoc.docx
├── SMARTS2/
│   └── ...
├── Forestry/
│   └── ...
└── ...
```

> This folder is gitignored. You must place the documents manually on each machine.

### 7. Build the CTAHR document index

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

## Writing Good Research Queries

The collection is focused on Hawaiian agriculture, ecology, and rural extension services. Questions that are specific and Hawaii-grounded return the best results.

### Query Tips

- Be specific about **what you want to know** — cultivation, disease management, business planning, ecology
- Mention **Hawaii** when relevant — the collection is heavily Hawaii-specific
- Name the **crop, pest, or topic** directly rather than asking broadly
- The more specific the question, the more precisely the triage agent can rank results

### Example Queries by Topic

**Crop & cultivation**
- "What are the best practices for growing taro in Hawaii?"
- "How do I manage coffee berry borer on my farm?"
- "What cover crops work well in Hawaiian soil?"

**Pest & disease**
- "What are treatment options for Rapid Ohia Death?"
- "How do I control invasive species in Hawaiian forests?"
- "What integrated pest management strategies work for tomatoes?"

**Soil & water**
- "How do I improve soil health and composting on a small farm?"
- "What irrigation methods are recommended for dry land farming in Hawaii?"

**Business & farming**
- "What resources are available for new farmers in Hawaii?"
- "How do I start an aquaponics operation in Hawaii?"

### High-Signal Search Topics

These topics map strongly to specific collections in the index:

| Topic | Strong Collections |
|-------|--------------------|
| Taro cultivation | CROP WEBSITE, Ext_Pub, SMARTS2 |
| Soil health & composting | MasterGardener, Soil Health Workshop, SMARTS2 |
| Integrated pest management | EPP, Past Events, Ext_Pub |
| Coffee berry borer | CBB, Ext_Pub |
| Aquaponics & hydroponics | CTAHR, Ext_Pub |
| Native plant restoration | Forestry, NREM |
| Small farm business planning | New_Farmer, CES, Ext_Pub |
| Water & irrigation management | NREM, SMARTS2, CROP WEBSITE |
| Invasive species | ROD, Forestry, EPP |
| Food safety & postharvest | Ext_Pub, CROP WEBSITE |

> **Note:** The ROD (Rapid Ohia Death), CBB (Coffee Berry Borer), and YFB (Yellow-Faced Bee) collections contain highly specialized research not widely available elsewhere. Queries on those topics will surface unique documents.

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
