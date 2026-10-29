import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client, type ClientBase } from 'pg';

const ROOT = join(import.meta.dirname, '..', '..', '..');
export const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const COMPAT_SQL = join(import.meta.dirname, 'supabase-compat.sql');

/** Replaces the database name in a connection string. */
export function withDatabase(url: string, database: string) {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

export async function connect(url: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

/**
 * Applies the Supabase compatibility layer (only when the database has no
 * `auth.users`, i.e. plain PostgreSQL) and every migration, in order.
 */
export async function applyMigrations(client: ClientBase) {
  const { rows } = await client.query<{ present: boolean }>(`select to_regclass('auth.users') is not null as present`);
  if (!rows[0]?.present) {
    await client.query(await readFile(COMPAT_SQL, 'utf8'));
  }
  const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files) {
    try {
      await client.query(await readFile(join(MIGRATIONS_DIR, file), 'utf8'));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  return files;
}
