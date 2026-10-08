'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, LoaderCircle } from 'lucide-react';
import type { Address } from '@/types/commerce';
import { useStoreData } from '@/context/StoreDataContext';
import { BR_STATES, LocalCepProvider, stateFromCep } from '@/services/address/cep.service';
import { formatCEP, isValidCEP, onlyDigits } from '@/lib/validation';
import { cn } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Form';

type Form = Omit<Address, 'id'>;
type Errors = Partial<Record<keyof Form, string>>;

const LABELS = ['Casa', 'Trabalho', 'Outro'];

const EMPTY: Form = { label: 'Casa', recipient: '', street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', reference: '', isDefault: false };

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!isValidCEP(f.zip)) e.zip = 'CEP inválido (8 dígitos).';
  if (!f.street.trim()) e.street = 'Informe a rua.';
  if (!f.number.trim()) e.number = 'Informe o número (ou S/N).';
  if (!f.district.trim()) e.district = 'Informe o bairro.';
  if (!f.city.trim()) e.city = 'Informe a cidade.';
  if (!f.state) e.state = 'Selecione o estado.';
  else {
    const fromCep = stateFromCep(f.zip);
    if (fromCep && fromCep !== f.state) e.state = `Este CEP é de ${fromCep}.`;
  }
  if (!f.recipient.trim()) e.recipient = 'Informe quem vai receber.';
  if (!f.label.trim()) e.label = 'Dê um nome ao endereço.';
  return e;
}

interface AddressFormProps {
  initial?: Partial<Address>;
  defaultRecipient?: string;
  submitLabel?: string;
  onSubmit(address: Address): void;
  onCancel?(): void;
  /** Mostra "Usar como endereço principal". */
  showDefaultToggle?: boolean;
  /** Permite submeter por um botão externo (ex.: rodapé de modal). */
  formId?: string;
  hideActions?: boolean;
}

/** Formulário de endereço com preenchimento pelo CEP (busca local por enquanto). */
export function AddressForm({ initial, defaultRecipient = '', submitLabel = 'Salvar endereço', onSubmit, onCancel, showDefaultToggle = true, formId, hideActions }: AddressFormProps) {
  const { customers } = useStoreData();
  const [form, setForm] = useState<Form>({ ...EMPTY, recipient: defaultRecipient, ...initial, complement: initial?.complement ?? '', reference: initial?.reference ?? '' });
  const [errors, setErrors] = useState<Errors>({});
  const [cep, setCep] = useState<'idle' | 'loading' | 'complete' | 'partial' | 'unknown'>('idle');
  const lastLookup = useRef(onlyDigits(initial?.zip ?? ''));
  const numberRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);

  const provider = useMemo(() => new LocalCepProvider(() => customers.flatMap((c) => c.addresses)), [customers]);

  useEffect(() => {
    const digits = onlyDigits(form.zip);
    if (digits.length !== 8 || digits === lastLookup.current) return;
    lastLookup.current = digits;
    setCep('loading');
    const t = window.setTimeout(async () => {
      const result = await provider.lookup(digits);
      if (!result) {
        setCep('unknown');
        return;
      }
      setForm((f) => ({
        ...f,
        state: result.state ?? f.state,
        street: result.street ?? f.street,
        district: result.district ?? f.district,
        city: result.city ?? f.city,
      }));
      setErrors((e) => ({ ...e, zip: undefined, state: undefined }));
      setCep(result.complete ? 'complete' : 'partial');
      (result.complete ? numberRef : streetRef).current?.focus();
    }, 250);
    return () => window.clearTimeout(t);
  }, [form.zip, provider]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.querySelector<HTMLElement>(`[data-address-field="${Object.keys(found)[0]}"]`)?.focus();
      return;
    }
    onSubmit({
      ...form,
      id: initial?.id ?? `a-${Date.now().toString(36)}`,
      zip: formatCEP(form.zip),
      street: form.street.trim(),
      number: form.number.trim(),
      complement: form.complement?.trim() || undefined,
      district: form.district.trim(),
      city: form.city.trim(),
      recipient: form.recipient.trim(),
      reference: form.reference?.trim() || undefined,
      label: form.label.trim(),
    });
  };

  const text = (key: keyof Form, label: string, opts: { className?: string; placeholder?: string; required?: boolean; autoComplete?: string; ref?: React.Ref<HTMLInputElement>; inputMode?: 'numeric' | 'text' } = {}) => (
    <Field label={label} required={opts.required} error={errors[key]} className={opts.className}>
      {(id, d) => (
        <Input
          ref={opts.ref}
          id={id}
          data-address-field={key}
          aria-describedby={d}
          aria-invalid={!!errors[key]}
          aria-required={opts.required}
          placeholder={opts.placeholder}
          autoComplete={opts.autoComplete}
          inputMode={opts.inputMode}
          value={String(form[key] ?? '')}
          onChange={(e) => set(key, e.target.value as never)}
        />
      )}
    </Field>
  );

  return (
    <form id={formId} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-6">
      <div className="sm:col-span-2">
        <Field label="CEP" required error={errors.zip}>
          {(id, d) => (
            <div className="relative">
              <Input
                id={id}
                data-address-field="zip"
                aria-describedby={[d, `${id}-cep`].filter(Boolean).join(' ')}
                aria-invalid={!!errors.zip}
                aria-required
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                value={form.zip}
                onChange={(e) => set('zip', formatCEP(e.target.value))}
                className="pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
                {cep === 'loading' && <LoaderCircle className="size-4 animate-spin text-muted" />}
                {cep === 'complete' && <CheckCircle2 className="animate-pop size-4 text-success" />}
              </span>
              <p id={`${id}-cep`} className="mt-1.5 text-[0.72rem] text-muted" aria-live="polite">
                {cep === 'complete' && 'Endereço encontrado nos endereços salvos.'}
                {cep === 'partial' && 'Estado identificado pelo CEP. Complete o restante.'}
                {cep === 'unknown' && 'CEP não reconhecido. Confira os números.'}
                {cep === 'idle' && (
                  <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:underline">
                    Não sei meu CEP
                  </a>
                )}
              </p>
            </div>
          )}
        </Field>
      </div>
      {text('street', 'Rua / Avenida', { className: 'sm:col-span-4', required: true, autoComplete: 'address-line1', ref: streetRef })}
      {text('number', 'Número', { className: 'sm:col-span-2', required: true, placeholder: 'Ex.: 120 ou S/N', ref: numberRef })}
      {text('complement', 'Complemento', { className: 'sm:col-span-4', placeholder: 'Apto, bloco, casa (opcional)', autoComplete: 'address-line2' })}
      {text('district', 'Bairro', { className: 'sm:col-span-2', required: true })}
      {text('city', 'Cidade', { className: 'sm:col-span-3', required: true, autoComplete: 'address-level2' })}
      <Field label="UF" required error={errors.state} className="sm:col-span-1">
        {(id, d) => (
          <Select id={id} data-address-field="state" aria-describedby={d} aria-invalid={!!errors.state} value={form.state} onChange={(e) => set('state', e.target.value)} className="px-3 pr-8">
            <option value="">UF</option>
            {BR_STATES.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.uf}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {text('recipient', 'Nome do destinatário', { className: 'sm:col-span-3', required: true, autoComplete: 'name' })}
      {text('reference', 'Ponto de referência', { className: 'sm:col-span-3', placeholder: 'Opcional — ajuda o entregador' })}
      <div className="sm:col-span-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-2">Identificação</p>
        <div className="flex flex-wrap items-center gap-2">
          {LABELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={form.label === l || (l === 'Outro' && !LABELS.slice(0, 2).includes(form.label))}
              onClick={() => set('label', l === 'Outro' ? '' : l)}
              className={cn(
                'h-9 rounded-full border px-4 text-xs font-semibold transition-colors',
                form.label === l || (l === 'Outro' && !LABELS.slice(0, 2).includes(form.label)) ? 'border-brand-500 bg-brand-500 text-white' : 'border-line text-fg-2 hover:text-fg',
              )}
            >
              {l}
            </button>
          ))}
          {!LABELS.slice(0, 2).includes(form.label) && (
            <Input aria-label="Nome do endereço" data-address-field="label" value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Ex.: Casa da praia" className="h-9 max-w-52" aria-invalid={!!errors.label} />
          )}
        </div>
        {errors.label && <p className="mt-1.5 text-xs text-danger">{errors.label}</p>}
      </div>
      {showDefaultToggle && (
        <label className="flex items-center gap-2 text-sm text-fg-2 sm:col-span-6">
          <input type="checkbox" className="size-4 accent-[var(--color-brand-500)]" checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
          Usar como endereço principal
        </label>
      )}
      <p className="flex items-start gap-2 text-[0.72rem] text-subtle sm:col-span-6">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> A busca automática completa de endereço pelo CEP será ativada quando o serviço de CEP for integrado.
      </p>
      {!hideActions && (
        <div className="flex flex-wrap justify-end gap-3 sm:col-span-6">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit">{submitLabel}</Button>
        </div>
      )}
    </form>
  );
}
