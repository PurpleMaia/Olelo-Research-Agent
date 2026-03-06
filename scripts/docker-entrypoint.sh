#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."

run_migration() {
  FILE=$1
  echo "[entrypoint] Applying $FILE..."
  npx tsx "$FILE" 2>&1 && echo "[entrypoint] OK: $FILE" || echo "[entrypoint] Skipped (already applied): $FILE"
}

run_migration scripts/migrate/run-sql.ts src/db/migrations/000001_create_initial_tables.up.sql
run_migration scripts/migrate/run-sql.ts src/db/migrations/000002_create_multi_tenant_tables.up.sql
run_migration scripts/migrate/run-sql.ts src/db/migrations/000003_create_research_tables.up.sql
run_migration scripts/migrate/run-sql.ts src/db/migrations/000004_create_feedback_table.up.sql

echo "[entrypoint] Migrations complete. Starting app..."
exec npm run start
