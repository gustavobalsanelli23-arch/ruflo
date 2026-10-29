import { afterAll, describe, expect, inject, it } from 'vitest';
import { asUser, closePool, type Session } from './support/session';

/**
 * Analyst conversations, AI usage limits and summaries, through RLS as the
 * application does (each test rolled back).
 */

const { users, orgs } = inject('world');
afterAll(closePool);

const newThread = async (s: Session, org = orgs.a, title = 'Como foram as vendas?') => {
  const [row] = await s.query<{ id: string }>('insert into public.analyst_threads (organization_id, title) values ($1, $2) returning id', [org, title]);
  return row!.id;
};

const ask = (s: Session, thread: string, org = orgs.a) =>
  s.attempt(`insert into public.analyst_messages (organization_id, thread_id, role, question) values ($1, $2, 'user', 'Pergunta')`, [org, thread]);

const errorOf = async (s: Session, sql: string, params: unknown[]) => {
  const outcome = await s.attempt(sql, params);
  return outcome.ok ? null : outcome.error.message;
};

describe('conversas', () => {
  it('cada pessoa vê e altera só as próprias conversas, mesmo dentro da organização', async () => {
    await asUser(users.analystA, async (s) => {
      const thread = await newThread(s);
      expect((await ask(s, thread)).ok).toBe(true);
      await s.query(
        `insert into public.analyst_messages (organization_id, thread_id, role, answer, answer_text, status, tool_calls, grounding)
         values ($1, $2, 'analyst', '[{"kind":"summary","text":"ok"}]', 'ok', 'answered', '[{"name":"resumo_periodo"}]', '{"corrected":false}')`,
        [orgs.a, thread],
      );
      expect(await s.query('select count(*)::int as n from public.analyst_messages where thread_id = $1', [thread])).toEqual([{ n: 2 }]);

      for (const other of [users.ownerA, users.adminA, users.analystB]) {
        await s.become(other);
        expect(await s.query('select id from public.analyst_threads where id = $1', [thread])).toEqual([]);
        expect(await s.query('select id from public.analyst_messages where thread_id = $1', [thread])).toEqual([]);
        expect((await ask(s, thread)).ok).toBe(false);
        const renamed = await s.attempt(`update public.analyst_threads set title = 'x' where id = $1`, [thread]);
        expect(renamed.ok && renamed.count).toBe(0);
        const removed = await s.attempt('delete from public.analyst_threads where id = $1', [thread]);
        expect(removed.ok && removed.count).toBe(0);
      }
    });
  });

  it('leitor não usa o analista; conversa em organização de que não é membro não é criada', async () => {
    await asUser(users.viewerA, async (s) => {
      expect((await s.attempt('insert into public.analyst_threads (organization_id, title) values ($1, $2)', [orgs.a, 'Oi'])).ok).toBe(false);
    });
    await asUser(users.analystA, async (s) => {
      expect((await s.attempt('insert into public.analyst_threads (organization_id, title) values ($1, $2)', [orgs.b, 'Oi'])).ok).toBe(false);
    });
  });

  it('não se cria conversa em nome de outra pessoa nem se mudam o dono ou a data', async () => {
    await asUser(users.analystA, async (s) => {
      expect((await s.attempt('insert into public.analyst_threads (organization_id, user_id, title) values ($1, $2, $3)', [orgs.a, users.adminA, 'Oi'])).ok).toBe(false);
      const thread = await newThread(s);
      expect((await s.attempt('update public.analyst_threads set user_id = $1 where id = $2', [users.adminA, thread])).ok).toBe(false);
      expect((await s.attempt(`update public.analyst_threads set updated_at = now() - interval '1 year' where id = $1`, [thread])).ok).toBe(false);
    });
  });

  it('uma mensagem não aponta para a conversa de outra organização (chave composta)', async () => {
    await asUser(users.multi, async (s) => {
      // multi é admin em B: cria uma conversa em B e tenta gravar a mensagem dizendo que é de A.
      const thread = await newThread(s, orgs.b);
      expect((await ask(s, thread, orgs.a)).ok).toBe(false);
      expect((await ask(s, thread, orgs.b)).ok).toBe(true);
    });
  });

  it('nova mensagem atualiza a data da conversa; apagar a conversa apaga as mensagens', async () => {
    await asUser(users.analystA, async (s) => {
      const thread = await newThread(s);
      const [before] = await s.query<{ updated_at: Date }>('select updated_at from public.analyst_threads where id = $1', [thread]);
      await s.become('system');
      await s.query(`update public.analyst_threads set updated_at = now() - interval '1 day' where id = $1`, [thread]);
      await s.become(users.analystA);
      await ask(s, thread);
      const [after] = await s.query<{ updated_at: Date }>('select updated_at from public.analyst_threads where id = $1', [thread]);
      expect(after!.updated_at.getTime()).toBeGreaterThanOrEqual(before!.updated_at.getTime());
      await s.query('delete from public.analyst_threads where id = $1', [thread]);
      await s.become('system');
      expect(await s.query('select id from public.analyst_messages where thread_id = $1', [thread])).toEqual([]);
    });
  });
});

describe('uso do modelo', () => {
  it('só analyst ou superior inicia; ninguém escreve direto na tabela de uso', async () => {
    await asUser(users.viewerA, async (s) => {
      expect(await errorOf(s, 'select public.begin_ai_request($1, $2)', [orgs.a, 'chat'])).toContain('solus:forbidden');
    });
    await asUser(users.analystB, async (s) => {
      expect(await errorOf(s, 'select public.begin_ai_request($1, $2)', [orgs.a, 'chat'])).toContain('solus:forbidden');
    });
    await asUser(users.analystA, async (s) => {
      expect(await errorOf(s, 'select public.begin_ai_request($1, $2)', [orgs.a, 'outra'])).toContain('solus:invalid_ai_request');
      expect((await s.attempt(`insert into public.ai_requests (organization_id, kind) values ($1, 'chat')`, [orgs.a])).ok).toBe(false);
      const [row] = await s.query<{ id: string }>('select public.begin_ai_request($1, $2) as id', [orgs.a, 'chat']);
      expect((await s.attempt(`update public.ai_requests set input_tokens = 0 where id = $1`, [row!.id])).ok).toBe(false);
      expect((await s.attempt(`delete from public.ai_requests where id = $1`, [row!.id])).ok).toBe(false);
    });
  });

  it('fecha só a própria chamada em andamento, uma vez, com valores dentro dos limites', async () => {
    await asUser(users.analystA, async (s) => {
      const [row] = await s.query<{ id: string }>('select public.begin_ai_request($1, $2) as id', [orgs.a, 'chat']);
      await s.become(users.adminA);
      expect(await errorOf(s, 'select public.finish_ai_request($1, $2, $3, 1, 1, 1, 0, 0)', [row!.id, 'answered', 'claude-opus-5-5'])).toContain('solus:ai_request_not_found');
      await s.become(users.analystA);
      await s.query('select public.finish_ai_request($1, $2, $3, 99, 1200, 300, -5, 0)', [row!.id, 'answered', 'claude-opus-5-5']);
      expect(await s.query('select status, model, requests, input_tokens, output_tokens, cache_read_tokens from public.ai_requests where id = $1', [row!.id])).toEqual([
        { status: 'answered', model: 'claude-opus-5-5', requests: 50, input_tokens: 1200, output_tokens: 300, cache_read_tokens: 0 },
      ]);
      expect(await errorOf(s, 'select public.finish_ai_request($1, $2, $3, 1, 1, 1, 0, 0)', [row!.id, 'answered', 'x'])).toContain('solus:ai_request_not_found');
    });
  });

  it('cada pessoa vê o próprio uso; owner e admin veem o da organização', async () => {
    await asUser(users.analystA, async (s) => {
      const [mine] = await s.query<{ id: string }>('select public.begin_ai_request($1, $2) as id', [orgs.a, 'chat']);
      await s.become(users.adminA);
      const [admin] = await s.query<{ id: string }>('select public.begin_ai_request($1, $2) as id', [orgs.a, 'summary']);
      expect((await s.query<{ id: string }>('select id from public.ai_requests')).map((r) => r.id).sort()).toEqual([mine!.id, admin!.id].sort());
      await s.become(users.analystA);
      expect((await s.query<{ id: string }>('select id from public.ai_requests')).map((r) => r.id)).toEqual([mine!.id]);
      await s.become(users.ownerB);
      expect(await s.query('select id from public.ai_requests')).toEqual([]);
    });
  });

  it('limite por pessoa (30 por hora) e por organização (300 por dia)', async () => {
    await asUser(users.analystA, async (s) => {
      for (let i = 0; i < 30; i++) await s.query('select public.begin_ai_request($1, $2)', [orgs.a, 'chat']);
      expect(await errorOf(s, 'select public.begin_ai_request($1, $2)', [orgs.a, 'chat'])).toContain('solus:rate_limited');

      // Outra pessoa da mesma organização ainda pode, até o teto diário da organização.
      await s.become('system');
      await s.query(`insert into public.ai_requests (organization_id, user_id, kind) select $1, $2, 'chat' from generate_series(1, 270)`, [orgs.a, users.ownerA]);
      await s.become(users.adminA);
      expect(await errorOf(s, 'select public.begin_ai_request($1, $2)', [orgs.a, 'chat'])).toContain('solus:ai_daily_limit');
      await s.become(users.ownerB);
      expect(await errorOf(s, 'select public.begin_ai_request($1, $2)', [orgs.b, 'chat'])).toBeNull();
    });
  });
});

describe('resumos', () => {
  it('analyst grava; toda a organização lê; leitor e outras organizações não gravam', async () => {
    const content = JSON.stringify([{ kind: 'summary', text: 'Receita estável.' }]);
    await asUser(users.analystA, async (s) => {
      await s.query('select public.save_ai_summary($1, $2, $3, $4, $5)', [orgs.a, '30d', 'sig-1', content, 'claude-opus-5-5']);
      await s.query('select public.save_ai_summary($1, $2, $3, $4, $5)', [orgs.a, '30d', 'sig-2', content, 'claude-opus-5-5']);
      await s.become(users.viewerA);
      expect(await s.query('select period_key, data_signature from public.ai_summaries')).toEqual([{ period_key: '30d', data_signature: 'sig-2' }]);
      expect(await errorOf(s, 'select public.save_ai_summary($1, $2, $3, $4, $5)', [orgs.a, '30d', 'sig-3', content, null])).toContain('solus:forbidden');
      await s.become(users.ownerB);
      expect(await s.query('select period_key from public.ai_summaries')).toEqual([]);
      expect(await errorOf(s, 'select public.save_ai_summary($1, $2, $3, $4, $5)', [orgs.a, '30d', 'sig-3', content, null])).toContain('solus:forbidden');
      await s.become(users.analystA);
      expect(await errorOf(s, 'select public.save_ai_summary($1, $2, $3, $4, $5)', [orgs.a, 'sempre', 'sig', content, null])).toContain('ai_summaries_period');
      expect(await errorOf(s, 'select public.save_ai_summary($1, $2, $3, $4, $5)', [orgs.a, '7d', 'sig', '{"x":1}', null])).toContain('ai_summaries_content');
    });
  });
});
