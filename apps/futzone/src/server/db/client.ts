import 'server-only';
import { Pool, type PoolClient } from 'pg';

/**
 * Conexão com o banco da FutZone (Postgres: Neon na Vercel, Postgres local em
 * desenvolvimento). Só existe no servidor. Sem `DATABASE_URL` a loja continua
 * no modo local (catálogo do arquivo + localStorage), como antes da integração.
 */

let pool: Pool | null = null;

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

export function isDbConfigured(): boolean {
  return !!databaseUrl();
}

export function getPool(): Pool {
  const url = databaseUrl();
  if (!url) throw new Error('Banco de dados não configurado (DATABASE_URL).');
  if (!pool) {
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes('host=/');
    pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl: local ? undefined : { rejectUnauthorized: true },
    });
  }
  return pool;
}

export type Db = Pick<PoolClient, 'query'>;

/** Executa `fn` numa transação: tudo é gravado junto ou nada é gravado. */
export async function withTransaction<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
