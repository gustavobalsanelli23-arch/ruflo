'use server';

import { z } from 'zod';
import type { AnalystMessage } from '@/lib/data/types';
import { threadMessages } from '@/services/ai';
import { authorize } from '@/services/workspace';

/** Messages of one of the person's own conversations (RLS: only the author reads them). */
export async function loadThreadAction(threadId: unknown): Promise<{ ok: true; messages: AnalystMessage[] } | { ok: false; message: string }> {
  const id = z.uuid().safeParse(threadId);
  if (!id.success) return { ok: false, message: 'Conversa inválida.' };
  const auth = await authorize('analyst');
  if (!auth.ok) return { ok: false, message: auth.error.message };
  const messages = await threadMessages(auth.supabase, auth.workspace.active.organizationId, id.data);
  return messages ? { ok: true, messages } : { ok: false, message: 'Conversa não encontrada.' };
}
