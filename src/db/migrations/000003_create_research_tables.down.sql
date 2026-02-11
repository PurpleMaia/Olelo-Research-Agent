-- Rollback migration 3: Drop research tables + pgvector

DROP TABLE IF EXISTS document_chunks;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS research_sessions;
DROP TYPE IF EXISTS doc_type;
DROP EXTENSION IF EXISTS vector;
