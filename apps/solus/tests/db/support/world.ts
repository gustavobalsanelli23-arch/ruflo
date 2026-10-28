import { randomUUID } from 'node:crypto';
import type { ClientBase } from 'pg';

/**
 * Two organizations and the people around them, committed once per run:
 *
 *   Org A "Empório Aurora": ownerA, adminA, analystA, viewerA, multi (viewer)
 *   Org B "Mercado Boreal": ownerB, analystB, multi (admin)
 *   outsider: account without any organization
 */
export const PEOPLE = ['ownerA', 'adminA', 'analystA', 'viewerA', 'ownerB', 'analystB', 'multi', 'outsider'] as const;
export type Person = (typeof PEOPLE)[number];

export interface World {
  users: Record<Person, string>;
  emails: Record<Person, string>;
  orgs: { a: string; b: string };
  /** Membership row ids, keyed `<person>@<org>`. */
  memberships: Record<string, string>;
  imports: { a: string; b: string };
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    world: World;
  }
}

export async function insertAuthUser(
  client: ClientBase,
  email: string,
  options: { confirmed?: boolean; fullName?: string } = {},
) {
  const id = randomUUID();
  await client.query(
    `insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role)
     values ($1, $2, $3, $4, 'authenticated', 'authenticated')`,
    [id, email, options.confirmed === false ? null : new Date(), { full_name: options.fullName ?? email.split('@')[0] }],
  );
  return id;
}

async function asUserOnce<T extends Record<string, unknown>>(client: ClientBase, userId: string, sql: string, params: unknown[]) {
  await client.query('begin');
  try {
    await client.query(`select set_config('role', 'authenticated', true), set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    const { rows } = await client.query<T>(sql, params);
    await client.query('commit');
    return rows;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

export async function buildWorld(client: ClientBase): Promise<World> {
  const users = {} as Record<Person, string>;
  const emails = {} as Record<Person, string>;
  for (const person of PEOPLE) {
    emails[person] = `${person.toLowerCase()}@exemplo.test`;
    users[person] = await insertAuthUser(client, emails[person], { fullName: `Pessoa ${person}` });
  }

  // Organizations are created through the public RPC, as their owners.
  const [a] = await asUserOnce<{ id: string }>(client, users.ownerA, 'select public.create_organization($1) as id', ['Empório Aurora']);
  const [b] = await asUserOnce<{ id: string }>(client, users.ownerB, 'select public.create_organization($1) as id', ['Mercado Boreal']);
  const orgs = { a: a!.id, b: b!.id };

  // Other memberships are arranged directly (system context).
  const seats: [Person, keyof typeof orgs, string][] = [
    ['adminA', 'a', 'admin'],
    ['analystA', 'a', 'analyst'],
    ['viewerA', 'a', 'viewer'],
    ['multi', 'a', 'viewer'],
    ['analystB', 'b', 'analyst'],
    ['multi', 'b', 'admin'],
  ];
  for (const [person, org, role] of seats) {
    await client.query('insert into public.organization_members (organization_id, user_id, role) values ($1, $2, $3)', [
      orgs[org],
      users[person],
      role,
    ]);
  }

  const memberships: Record<string, string> = {};
  const { rows } = await client.query<{ id: string; user_id: string; organization_id: string }>(
    'select id, user_id, organization_id from public.organization_members',
  );
  for (const row of rows) {
    const person = PEOPLE.find((p) => users[p] === row.user_id)!;
    memberships[`${person}@${row.organization_id === orgs.a ? 'a' : 'b'}`] = row.id;
  }

  // One canceled import per organization: a history row with no data behind
  // it (the analytics tests create their own imports through the RPCs).
  const imports = { a: '', b: '' };
  for (const org of ['a', 'b'] as const) {
    const { rows: inserted } = await client.query<{ id: string }>(
      `insert into public.data_imports (organization_id, dataset, file_name, status)
       values ($1, 'sales', $2, 'canceled') returning id`,
      [orgs[org], `vendas_${org}.csv`],
    );
    imports[org] = inserted[0]!.id;
  }

  return { users, emails, orgs, memberships, imports };
}
