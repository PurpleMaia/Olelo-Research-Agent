/**
 * Runs a SQL migration file directly against the database using the pg driver.
 * Usage: npx tsx scripts/migrate/run-sql.ts <path-to-sql-file>
 *
 * This is an alternative to golang-migrate for when the CLI isn't installed.
 * It does NOT track migration versions in schema_migrations — use for manual runs only.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error('Usage: npx tsx scripts/migrate/run-sql.ts <path-to-sql-file>');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL not set in environment or .env file');
    process.exit(1);
  }

  const fullPath = resolve(sqlPath);
  console.log(`Reading SQL from: ${fullPath}`);

  let sql: string;
  try {
    sql = readFileSync(fullPath, 'utf-8');
  } catch (err) {
    console.error(`Error reading file: ${fullPath}`, err);
    process.exit(1);
  }

  console.log(`Connecting to database...`);
  const pool = new Pool({ connectionString });

  try {
    console.log(`Executing migration SQL...`);
    await pool.query(sql);
    console.log('Migration completed successfully!');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
