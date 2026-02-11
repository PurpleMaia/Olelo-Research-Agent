-- Migration 3: Research tables + pgvector for RAG pipeline

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Source document types
CREATE TYPE doc_type AS ENUM ('papa-kilo', 'newspaper', 'web', 'other');

-- Stores the Hawaiian document corpus for RAG
CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  doc_type    doc_type NOT NULL DEFAULT 'other',
  publication TEXT,
  date        TEXT,
  url         TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Vector embeddings for document chunks
CREATE TABLE document_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(1024),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);

-- Persisted research sessions
CREATE TABLE research_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'idle',
  questions    JSONB,
  answers      JSONB,
  results      JSONB,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_research_sessions_user ON research_sessions(user_id);
CREATE INDEX idx_research_sessions_status ON research_sessions(status);
