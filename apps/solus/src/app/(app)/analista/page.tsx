import type { Metadata } from 'next';
import { Suspense } from 'react';
import { z } from 'zod';
import { PageHeader } from '@/components/data/page-header';
import { Notice } from '@/components/data/states';
import { getAiConfig } from '@/lib/ai/config';
import { can } from '@/lib/auth/permissions';
import type { AnalystData } from '@/lib/data/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AnalystWorkspace } from '@/modules/analyst/analyst-workspace';
import { ModuleEmpty } from '@/modules/workspace/module-empty';
import { listThreads } from '@/services/ai';
import { getCoverage } from '@/services/analytics';
import { requireWorkspace } from '@/services/workspace';

export const metadata: Metadata = { title: 'Analista' };

const SUGGESTIONS: AnalystData['suggestions'] = [
  { id: 'vendas', theme: 'Vendas', question: 'Como foram as vendas nos últimos 30 dias em relação ao período anterior?' },
  { id: 'margem', theme: 'Margem', question: 'Quais produtos têm a menor margem bruta e quanto eles vendem?' },
  { id: 'estoque', theme: 'Estoque', question: 'Onde está o capital parado no estoque?' },
  { id: 'oportunidades', theme: 'Oportunidades', question: 'Quais oportunidades abertas devo atacar primeiro?' },
];

export default async function AnalystPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { active } = await requireWorkspace();
  const header = (
    <PageHeader title="Analista" description="Perguntas sobre os dados da empresa, respondidas com números, fontes e a distinção entre fato e hipótese." />
  );
  const wrap = (content: React.ReactNode) => (
    <>
      {header}
      <div className="mt-8">{content}</div>
    </>
  );

  if (!can(active.role, 'analyze')) {
    return wrap(
      <Notice title="O analista é usado por analistas, administradores e proprietários">
        Seu papel nesta organização é de leitura. Os números que o analista usa estão na Visão geral, em Lucratividade, em Estoque e na Central de Oportunidades.
      </Notice>,
    );
  }
  if (!getAiConfig()) {
    return wrap(
      <Notice tone="warning" title="O analista de IA ainda não está ativo neste servidor">
        Falta configurar a chave da API da Anthropic (ANTHROPIC_API_KEY) no servidor. Os números da empresa continuam nas telas de análise.
      </Notice>,
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return wrap(<ModuleEmpty module="analyst" />);
  const [coverage, threads] = await Promise.all([getCoverage(supabase, active.organizationId), listThreads(supabase, active.organizationId)]);
  if (!coverage.lastSale && !coverage.lastSnapshot && threads.length === 0) return wrap(<ModuleEmpty module="analyst" />);

  const requested = z.uuid().safeParse((await searchParams).oportunidade);
  let opportunity: { id: string; title: string } | null = null;
  if (requested.success) {
    const { data } = await supabase.from('opportunities').select('id, title').eq('id', requested.data).eq('organization_id', active.organizationId).maybeSingle();
    opportunity = data;
  }

  return wrap(
    <Suspense>
      <AnalystWorkspace data={{ threads, suggestions: SUGGESTIONS, scriptedAnswers: {} }} mode={{ kind: 'live', scope: 'tenant' }} opportunity={opportunity} />
    </Suspense>,
  );
}
