import type { TestProject } from 'vitest/node';
import { applyMigrations, connect, withDatabase } from './database';
import { buildWorld } from './world';

/**
 * Creates a throwaway database on the PostgreSQL given by
 * SOLUS_TEST_DATABASE_URL (a superuser connection), applies the migrations and
 * seeds two organizations. Dropped at the end unless SOLUS_TEST_KEEP_DB=1.
 */
export default async function setup(project: TestProject) {
  const adminUrl = process.env.SOLUS_TEST_DATABASE_URL;
  if (!adminUrl) {
    throw new Error(
      'Defina SOLUS_TEST_DATABASE_URL com uma conexão de superusuário a um PostgreSQL descartável ' +
        '(por exemplo, postgresql://postgres:postgres@127.0.0.1:54322/postgres do `supabase start`).',
    );
  }

  const name = `solus_test_${Date.now()}_${process.pid}`;
  const admin = await connect(adminUrl);
  await admin.query(`create database ${name}`);

  const url = withDatabase(adminUrl, name);
  const client = await connect(url);
  try {
    await applyMigrations(client);
    project.provide('world', await buildWorld(client));
  } finally {
    await client.end();
  }
  project.provide('databaseUrl', url);

  return async () => {
    if (process.env.SOLUS_TEST_KEEP_DB !== '1') {
      await admin.query(`drop database if exists ${name} with (force)`);
    }
    await admin.end();
  };
}
