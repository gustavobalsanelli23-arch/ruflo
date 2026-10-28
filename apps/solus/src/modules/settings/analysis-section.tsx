'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import type { z } from 'zod';
import { Notice } from '@/components/data/states';
import { redirectIfSignedOut } from '@/components/shell/session-watch';
import { can } from '@/lib/auth/permissions';
import type { Role } from '@/lib/data/types';
import { SubmitButton, TextInput, useValidatedAction } from '@/modules/auth/form-kit';
import { IDLE } from '@/modules/auth/form-state';
import { saveAnalysisSettingsAction } from '@/modules/opportunities/actions';
import { analysisSettingsSchema } from '@/schemas/imports';
import { SettingsField } from './settings-frame';

/** The organization's analysis parameters, as read by public.analysis_parameters (ratios as 0–1). */
export interface AnalysisSettings {
  minMargin: number;
  maxDiscountRate: number;
  stalledDays: number;
  velocityWindowDays: number;
  defaultLeadTimeDays: number;
  highTurnoverDays: number;
  lowTurnoverDays: number;
  excessCoverageDays: number;
  targetCoverageDays: number;
  dropThreshold: number;
  customized: boolean;
}

type FieldName = keyof z.output<typeof analysisSettingsSchema>;

interface FieldSpec {
  name: FieldName;
  label: string;
  hint: string;
  unit: '%' | 'dias';
  value: (s: AnalysisSettings) => number;
}

// Percentages are shown as 0–100; the action divides by 100 before saving.
const pct = (ratio: number) => Math.round(ratio * 1000) / 10;

const GROUPS: { title: string; description: string; fields: FieldSpec[] }[] = [
  {
    title: 'Margem e preço',
    description: 'Base das oportunidades de margem baixa, descontos e queda de desempenho.',
    fields: [
      { name: 'min_margin', label: 'Margem bruta mínima', unit: '%', hint: 'Produtos abaixo dela geram oportunidade de margem baixa.', value: (s) => pct(s.minMargin) },
      {
        name: 'max_discount_rate',
        label: 'Desconto máximo',
        unit: '%',
        hint: 'Descontos acima dessa parcela da receita bruta do produto são sinalizados.',
        value: (s) => pct(s.maxDiscountRate),
      },
      {
        name: 'drop_threshold',
        label: 'Queda de desempenho',
        unit: '%',
        hint: 'Queda de receita líquida nos últimos 30 dias, contra os 30 anteriores, que gera alerta.',
        value: (s) => pct(s.dropThreshold),
      },
    ],
  },
  {
    title: 'Estoque',
    description: 'Classificação de giro, estoque parado, capital imobilizado e risco de ruptura.',
    fields: [
      {
        name: 'velocity_window_days',
        label: 'Janela de vendas',
        unit: 'dias',
        hint: 'Dias de vendas usados para a venda média diária, o giro e a cobertura.',
        value: (s) => s.velocityWindowDays,
      },
      { name: 'stalled_days', label: 'Estoque parado após', unit: 'dias', hint: 'Dias sem nenhuma venda para um item com saldo ser considerado parado.', value: (s) => s.stalledDays },
      {
        name: 'high_turnover_days',
        label: 'Giro alto até',
        unit: 'dias',
        hint: 'Cobertura até esse limite conta como giro alto.',
        value: (s) => s.highTurnoverDays,
      },
      {
        name: 'low_turnover_days',
        label: 'Giro baixo acima de',
        unit: 'dias',
        hint: 'Cobertura acima desse limite conta como giro baixo; entre os dois, giro médio.',
        value: (s) => s.lowTurnoverDays,
      },
      {
        name: 'target_coverage_days',
        label: 'Cobertura-alvo',
        unit: 'dias',
        hint: 'Estoque desejado em dias de venda; base do capital excedente e da sugestão de reposição.',
        value: (s) => s.targetCoverageDays,
      },
      {
        name: 'excess_coverage_days',
        label: 'Cobertura excessiva acima de',
        unit: 'dias',
        hint: 'A partir daqui o capital acima da cobertura-alvo vira oportunidade.',
        value: (s) => s.excessCoverageDays,
      },
      {
        name: 'default_lead_time_days',
        label: 'Prazo de reposição padrão',
        unit: 'dias',
        hint: 'Usado no risco de ruptura quando o produto e o fornecedor não informam prazo.',
        value: (s) => s.defaultLeadTimeDays,
      },
    ],
  },
];

export function AnalysisSection({ settings, role }: { settings: AnalysisSettings; role: Role }) {
  const canEdit = can(role, 'configureAnalysis');
  const { state, formAction, pending, errors, onSubmit, clearError, formRef } = useValidatedAction(
    analysisSettingsSchema,
    saveAnalysisSettingsAction,
    IDLE,
  );

  useEffect(() => {
    if (redirectIfSignedOut(state)) return;
    if (state.status === 'success') toast.success(state.message ?? 'Parâmetros salvos');
  }, [state]);

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <Notice title={settings.customized ? 'Parâmetros definidos pela organização' : 'Parâmetros padrão da SOLUS'}>
        Eles mudam o que vira oportunidade e como o estoque é classificado; os números de receita, custo e margem não mudam.
        {canEdit ? ' Ao salvar, as oportunidades são recalculadas.' : ' Somente proprietários e administradores alteram.'}
      </Notice>
      {state.status === 'error' && state.message && (
        <Notice tone="error" title="Não foi possível salvar">
          {state.message}
        </Notice>
      )}
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="flex flex-col gap-5">
          <legend className="mb-1">
            <span className="block text-sm font-semibold text-foreground">{group.title}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{group.description}</span>
          </legend>
          {group.fields.map((field) => (
            <SettingsField key={field.name} id={field.name} label={field.label} hint={field.hint} error={errors[field.name]}>
              <div className="flex items-center gap-2">
                <TextInput
                  name={field.name}
                  inputMode={field.unit === '%' ? 'decimal' : 'numeric'}
                  defaultValue={state.values?.[field.name] ?? String(field.value(settings)).replace('.', ',')}
                  readOnly={!canEdit}
                  maxLength={6}
                  error={errors[field.name]}
                  hint={field.hint}
                  onClear={clearError}
                  className="h-9 w-28 tabular-nums"
                />
                <span className="text-sm text-muted-foreground">{field.unit}</span>
              </div>
            </SettingsField>
          ))}
        </fieldset>
      ))}
      {canEdit && (
        <div className="flex justify-end border-t pt-5">
          <SubmitButton pending={pending} pendingLabel="Salvando e recalculando…" className="w-auto px-4">
            Salvar parâmetros
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
