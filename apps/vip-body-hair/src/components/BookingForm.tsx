import { useEffect, useId, useState, type FormEvent } from 'react';
import { serviceOptions } from '../data/site';
import { track } from '../lib/analytics';
import { waBooking } from '../lib/whatsapp';
import { ArrowRight, WhatsApp } from './ui/Icons';

const periods = ['Manhã', 'Tarde', 'Fim de tarde'];

/**
 * Pedido de agendamento: os dados não são enviados a nenhum servidor — o
 * formulário monta a mensagem e abre o WhatsApp do salão para o visitante enviar.
 */
export function BookingForm() {
  const id = useId();
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [period, setPeriod] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ name?: string; service?: string; date?: string }>({});
  const [sent, setSent] = useState(false);
  // Calculado só no navegador para o HTML pré-renderizado não divergir na hidratação.
  const [today, setToday] = useState<string>();
  useEffect(() => {
    const d = new Date();
    setToday(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  }, []);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Informe seu nome.';
    if (!service) next.service = 'Escolha um serviço.';
    if (date) {
      const day = new Date(`${date}T12:00:00`).getDay();
      if (day === 0 || day === 1) next.date = 'O salão atende de terça a sábado.';
      else if (today && date < today) next.date = 'Escolha uma data a partir de hoje.';
    }
    setErrors(next);
    const firstError = (['name', 'service', 'date'] as const).find((k) => next[k]);
    if (firstError) {
      document.getElementById(`${id}-${firstError}`)?.focus();
      return;
    }
    track('Schedule', { channel: 'whatsapp', source: 'formulario', service });
    const url = waBooking({ name, service, date, period, notes });
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    else window.location.href = url;
    setSent(true);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-7" aria-describedby={`${id}-privacy`}>
      <div>
        <label htmlFor={`${id}-name`} className="eyebrow text-[0.6rem] text-stone">
          Nome
        </label>
        <input
          id={`${id}-name`}
          name="name"
          autoComplete="given-name"
          className="field"
          placeholder="Como podemos te chamar?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${id}-name-err` : undefined}
          maxLength={60}
        />
        {errors.name && (
          <p id={`${id}-name-err`} className="mt-2 text-xs text-[#a5432f]">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-service`} className="eyebrow text-[0.6rem] text-stone">
          Serviço
        </label>
        <select
          id={`${id}-service`}
          name="service"
          className="field"
          value={service}
          onChange={(e) => setService(e.target.value)}
          aria-invalid={errors.service ? true : undefined}
          aria-describedby={errors.service ? `${id}-service-err` : undefined}
        >
          <option value="" disabled>
            Selecione
          </option>
          {serviceOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {errors.service && (
          <p id={`${id}-service-err`} className="mt-2 text-xs text-[#a5432f]">
            {errors.service}
          </p>
        )}
      </div>

      <div className="grid gap-7 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-date`} className="eyebrow text-[0.6rem] text-stone">
            Data de preferência <span className="normal-case tracking-normal">(opcional)</span>
          </label>
          <input
            id={`${id}-date`}
            type="date"
            name="date"
            min={today}
            className="field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={`${id}-date-hint`}
          />
          <p id={`${id}-date-hint`} className={`mt-2 text-xs ${errors.date ? 'text-[#a5432f]' : 'text-stone'}`}>
            {errors.date ?? 'Atendimento de terça a sábado, das 10h às 20h.'}
          </p>
        </div>
        <fieldset>
          <legend className="eyebrow text-[0.6rem] text-stone">Período</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {periods.map((p) => (
              <label key={p} className="cursor-pointer">
                <input
                  type="radio"
                  name="period"
                  value={p}
                  checked={period === p}
                  onChange={() => setPeriod(p)}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-10 items-center border border-ink/20 px-3.5 text-sm transition-colors duration-300 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bone peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-honey">
                  {p}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div>
        <label htmlFor={`${id}-notes`} className="eyebrow text-[0.6rem] text-stone">
          Mensagem <span className="normal-case tracking-normal">(opcional)</span>
        </label>
        <textarea
          id={`${id}-notes`}
          name="notes"
          rows={3}
          className="field resize-none"
          placeholder="Conte um pouco sobre o que você deseja"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
        />
      </div>

      <div className="flex flex-col gap-4 pt-2">
        <button type="submit" className="btn btn-dark w-full px-5 text-center sm:w-auto sm:self-start sm:whitespace-nowrap sm:px-7">
          <WhatsApp width={18} height={18} />
          Enviar pelo WhatsApp
          <ArrowRight width={16} height={16} className="btn-arrow" />
        </button>
        <p id={`${id}-privacy`} className="max-w-sm text-xs leading-relaxed text-stone">
          Seus dados não ficam salvos no site: a mensagem é aberta no seu WhatsApp para você enviar.
        </p>
      </div>
      <p role="status" className="text-sm text-honey-deep">
        {sent ? 'Abrimos o WhatsApp com a sua mensagem. É só tocar em enviar.' : ''}
      </p>
    </form>
  );
}
