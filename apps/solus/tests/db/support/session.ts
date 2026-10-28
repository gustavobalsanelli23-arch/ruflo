import { inject } from 'vitest';
import { Pool } from 'pg';

export type ApiRole = 'anon' | 'authenticated' | 'service_role';

export interface DbError {
  code: string;
  message: string;
}

export type Outcome<T> = { ok: true; rows: T[]; count: number } | { ok: false; error: DbError };

export interface Session {
  /** Runs a statement and throws on error. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Runs a statement inside a savepoint and reports the outcome instead of throwing. */
  attempt<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<Outcome<T>>;
  /** Switches identity inside the same transaction (a user id, the secret key, or superuser). */
  become(identity: string | 'service_role' | 'system'): Promise<void>;
}

function claimsFor(identity: string) {
  if (identity === 'service_role') return { role: 'service_role' as ApiRole, claims: { role: 'service_role' } };
  return { role: 'authenticated' as ApiRole, claims: { sub: identity, role: 'authenticated', aud: 'authenticated' } };
}

let pool: Pool | undefined;

function getPool() {
  pool ??= new Pool({ connectionString: inject('databaseUrl'), max: 4 });
  return pool;
}

export async function closePool() {
  await pool?.end();
  pool = undefined;
}

async function run<T>(setup: { role: ApiRole; claims: Record<string, unknown> } | null, fn: (session: Session) => Promise<T>, commit: boolean) {
  const client = await getPool().connect();
  let savepoints = 0;
  const session: Session = {
    query: async (sql, params) => (await client.query(sql, params)).rows,
    attempt: async (sql, params) => {
      const name = `attempt_${++savepoints}`;
      await client.query(`savepoint ${name}`);
      try {
        const result = await client.query(sql, params);
        await client.query(`release savepoint ${name}`);
        return { ok: true, rows: result.rows, count: result.rowCount ?? 0 };
      } catch (error) {
        await client.query(`rollback to savepoint ${name}`);
        const { code, message } = error as { code?: string; message: string };
        return { ok: false, error: { code: code ?? 'unknown', message } };
      }
    },
    become: async (identity) => {
      if (identity === 'system') {
        await client.query(`select set_config('role', 'none', true), set_config('request.jwt.claims', '', true)`);
        return;
      }
      const { role, claims } = claimsFor(identity);
      await client.query(`select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)`, [role, JSON.stringify(claims)]);
    },
  };
  try {
    await client.query('begin');
    if (setup) {
      await client.query(`select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)`, [
        setup.role,
        JSON.stringify(setup.claims),
      ]);
    }
    const result = await fn(session);
    await client.query(commit ? 'commit' : 'rollback');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Runs `fn` the way PostgREST serves a request: inside a transaction, under
 * the API role, with the JWT claims of `userId`. Rolled back unless `commit`.
 */
export function asUser<T>(userId: string, fn: (session: Session) => Promise<T>, options: { commit?: boolean } = {}) {
  return run({ role: 'authenticated', claims: { sub: userId, role: 'authenticated', aud: 'authenticated' } }, fn, options.commit ?? false);
}

/** A request with only the public (publishable/anon) key: no user. */
export function asAnon<T>(fn: (session: Session) => Promise<T>) {
  return run({ role: 'anon', claims: { role: 'anon' } }, fn, false);
}

/** A request made by the server with the secret (service_role) key. */
export function asServiceRole<T>(fn: (session: Session) => Promise<T>) {
  return run({ role: 'service_role', claims: { role: 'service_role' } }, fn, false);
}

/** Superuser access, for arranging state no client could create. */
export function asSystem<T>(fn: (session: Session) => Promise<T>, options: { commit?: boolean } = {}) {
  return run(null, fn, options.commit ?? false);
}
