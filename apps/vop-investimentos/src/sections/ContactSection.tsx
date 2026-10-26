import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { BlurText } from '../components/BlurText';
import { InstagramIcon, WhatsappIcon } from '../components/Icons';
import { Reveal } from '../components/Reveal';
import { business, formatPhone, fullAddress, hasWhatsapp, mapsUrl, resolveChannel } from '../config/site';
import { interests } from '../data/content';
import {
  composeMessage,
  copyText,
  emptyContact,
  maskPhone,
  MESSAGE_MAX,
  postContact,
  resolveDelivery,
  validateContact,
  whatsappFor,
  type ContactInput,
  type FieldErrors,
} from '../lib/contact';
import { EASE_OUT, SETTLE } from '../lib/motion';

type Status =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'sent'; kind: 'endpoint' | 'whatsapp' | 'instagram'; copied?: boolean; text?: string; href?: string }
  | { state: 'error' };

export function ContactSection() {
  const delivery = resolveDelivery();
  const channel = resolveChannel();
  return (
    <section id="contato" aria-labelledby="contato-titulo" className="section-y relative bg-night">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <BlurText as="h2" id="contato-titulo" lines={['Conte o que', 'você procura.']} className="display display-lg" />
          <Reveal as="p" className="lede mt-8" delay={0.15}>
            {delivery.kind === 'endpoint'
              ? 'Preencha os campos e um especialista da VOP responde pelo canal que você indicar.'
              : `Preencha os campos e a sua mensagem chega pronta à VOP pelo ${delivery.kind === 'whatsapp' ? 'WhatsApp' : 'Direct do Instagram'}.`}
          </Reveal>

          <Reveal as="ul" className="mt-12 border-b border-line" delay={0.2}>
            <ContactRow label="Instagram" icon={<InstagramIcon size={16} />}>
              <a href={business.instagram.url} target="_blank" rel="noopener noreferrer" className="link-quiet">
                @{business.instagram.handle}
              </a>
            </ContactRow>
            {hasWhatsapp && (
              <ContactRow label="WhatsApp" icon={<WhatsappIcon size={16} />}>
                <a href={channel.href} target="_blank" rel="noopener noreferrer" className="link-quiet">
                  {formatPhone(business.whatsapp.number)}
                </a>
              </ContactRow>
            )}
            {business.email && (
              <ContactRow label="E-mail">
                <a href={`mailto:${business.email}`} className="link-quiet">
                  {business.email}
                </a>
              </ContactRow>
            )}
            {business.address && (
              <ContactRow label="Endereço">
                <a href={mapsUrl(business.address)} target="_blank" rel="noopener noreferrer" className="link-quiet">
                  {fullAddress(business.address)}
                </a>
              </ContactRow>
            )}
          </Reveal>
        </div>

        <Reveal className="lg:col-span-7" delay={0.1}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}

function ContactRow({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-6 border-t border-line py-4 text-[0.9375rem]">
      <span className="flex items-center gap-2.5 text-mineral">
        {icon}
        {label}
      </span>
      <span className="text-right text-linen">{children}</span>
    </li>
  );
}

function ContactForm() {
  const delivery = resolveDelivery();
  const reduce = useReducedMotion();
  const [values, setValues] = useState<ContactInput>(emptyContact);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const form = useRef<HTMLFormElement>(null);

  const update = <K extends keyof ContactInput>(key: K, value: ContactInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateContact(values);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (delivery.kind === 'endpoint') {
      setStatus({ state: 'sending' });
      try {
        await postContact(delivery.url, values);
        setStatus({ state: 'sent', kind: 'endpoint' });
      } catch {
        setStatus({ state: 'error' });
      }
      return;
    }
    if (delivery.kind === 'whatsapp') {
      const href = whatsappFor(values);
      window.open(href, '_blank', 'noopener,noreferrer');
      setStatus({ state: 'sent', kind: 'whatsapp', href });
      return;
    }
    const text = composeMessage(values);
    const copied = await copyText(text);
    window.open(delivery.href, '_blank', 'noopener,noreferrer');
    setStatus({ state: 'sent', kind: 'instagram', copied, text, href: delivery.href });
  }

  const reset = () => {
    setValues(emptyContact);
    setStatus({ state: 'idle' });
  };

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-line bg-graphite/40">
      <AnimatePresence mode="wait" initial={false}>
        {status.state === 'sent' ? (
          <m.div
            key="sent"
            role="status"
            className="flex min-h-[34rem] flex-col justify-center p-6 sm:p-10"
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0, ...SETTLE }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.7, ease: EASE_OUT }}
          >
            <span className="flex size-12 items-center justify-center rounded-full ring-1 ring-champagne/60">
              <Check size={20} strokeWidth={1.5} className="text-champagne" aria-hidden="true" />
            </span>
            <SentMessage status={status} />
            <button type="button" onClick={reset} className="link-quiet mt-10 self-start text-[0.9375rem]">
              Escrever outra mensagem
            </button>
          </m.div>
        ) : (
          <m.form
            key="form"
            ref={form}
            noValidate
            onSubmit={onSubmit}
            className="grid gap-x-6 gap-y-5 p-6 sm:grid-cols-2 sm:p-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.4 }}
            aria-describedby="contato-ajuda"
          >
            <Field label="Nome" error={errors.name} className="sm:col-span-2">
              {(props) => (
                <input {...props} name="name" autoComplete="name" value={values.name} onChange={(e) => update('name', e.target.value)} />
              )}
            </Field>
            <Field label="Telefone ou WhatsApp" error={errors.phone}>
              {(props) => (
                <input
                  {...props}
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(11) 99999-8888"
                  value={values.phone}
                  onChange={(e) => update('phone', maskPhone(e.target.value))}
                />
              )}
            </Field>
            <Field label="E-mail" error={errors.email}>
              {(props) => (
                <input
                  {...props}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nome@email.com"
                  value={values.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              )}
            </Field>
            <Field label="Assunto" error={errors.interest} className="sm:col-span-2">
              {(props) => (
                <div className="relative">
                  <select
                    {...props}
                    name="interest"
                    value={values.interest}
                    onChange={(e) => update('interest', e.target.value)}
                    className={`${props.className} cursor-pointer appearance-none pr-10 [&>option]:bg-graphite`}
                  >
                    <option value="" disabled>
                      Escolha uma opção
                    </option>
                    {interests.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-mineral" />
                </div>
              )}
            </Field>
            <Field label="Mensagem (opcional)" error={errors.message} className="sm:col-span-2" hint={`${values.message.length}/${MESSAGE_MAX}`}>
              {(props) => (
                <textarea
                  {...props}
                  name="message"
                  rows={4}
                  maxLength={MESSAGE_MAX + 50}
                  placeholder="Região, tipo de imóvel, faixa de valor, prazo…"
                  value={values.message}
                  onChange={(e) => update('message', e.target.value)}
                  className={`${props.className} resize-none`}
                />
              )}
            </Field>

            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3 text-[0.875rem] leading-relaxed text-linen/80">
                <input
                  type="checkbox"
                  name="consent"
                  checked={values.consent}
                  onChange={(e) => update('consent', e.target.checked)}
                  aria-invalid={Boolean(errors.consent) || undefined}
                  aria-describedby={errors.consent ? 'erro-consent' : undefined}
                  className="mt-1 size-4 shrink-0 cursor-pointer accent-[#b8a17a]"
                />
                Autorizo a VOP a entrar em contato comigo sobre este assunto.
              </label>
              {errors.consent && (
                <p id="erro-consent" className="mt-2 text-[0.8125rem] text-[#e4b4a4]">
                  {errors.consent}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4 pt-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p id="contato-ajuda" className="text-[0.8125rem] leading-relaxed text-mineral sm:max-w-xs">
                {delivery.kind === 'endpoint' && 'Seus dados são usados só para este atendimento.'}
                {delivery.kind === 'whatsapp' && 'O WhatsApp abre com a mensagem pronta; é só enviar.'}
                {delivery.kind === 'instagram' && 'A mensagem é copiada e o Direct do Instagram abre para você colar e enviar.'}
              </p>
              <button type="submit" disabled={status.state === 'sending'} className="btn btn-solid disabled:opacity-60">
                {status.state === 'sending' ? 'Enviando…' : delivery.label}
                <ArrowUpRight className="btn-icon" size={18} strokeWidth={1.6} aria-hidden="true" />
              </button>
            </div>
            {status.state === 'error' && (
              <p role="alert" className="text-[0.875rem] text-[#e4b4a4] sm:col-span-2">
                Não foi possível enviar agora. Tente de novo em instantes ou fale pelo{' '}
                <a href={business.instagram.direct} target="_blank" rel="noopener noreferrer" className="link-quiet text-linen">
                  Direct do Instagram
                </a>
                .
              </p>
            )}
          </m.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function SentMessage({ status }: { status: Extract<Status, { state: 'sent' }> }) {
  if (status.kind === 'endpoint') {
    return (
      <>
        <p className="display display-md mt-8">Mensagem enviada.</p>
        <p className="mt-4 max-w-md text-mineral">Um especialista da VOP vai responder pelo telefone ou e-mail que você informou.</p>
      </>
    );
  }
  if (status.kind === 'whatsapp') {
    return (
      <>
        <p className="display display-md mt-8">Sua mensagem está pronta no WhatsApp.</p>
        <p className="mt-4 max-w-md text-mineral">Confira e toque em enviar. Se a conversa não abriu, use o botão abaixo.</p>
        <a href={status.href} target="_blank" rel="noopener noreferrer" className="btn btn-solid mt-8 self-start">
          Abrir o WhatsApp
          <ArrowUpRight className="btn-icon" size={18} strokeWidth={1.6} aria-hidden="true" />
        </a>
      </>
    );
  }
  return (
    <>
      <p className="display display-md mt-8">{status.copied ? 'Mensagem copiada.' : 'Sua mensagem está pronta.'}</p>
      <p className="mt-4 max-w-md text-mineral">
        {status.copied
          ? 'No Direct da VOP, que abriu em outra aba, cole a mensagem e envie.'
          : 'Copie o texto abaixo e cole no Direct da VOP.'}
      </p>
      <label className="mt-6 block">
        <span className="sr-only">Texto da mensagem</span>
        <textarea
          readOnly
          value={status.text}
          rows={5}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full resize-none rounded-[8px] border border-line bg-night/50 p-4 text-[0.875rem] leading-relaxed text-linen/85"
        />
      </label>
      <a href={status.href} target="_blank" rel="noopener noreferrer" className="btn btn-solid mt-6 self-start">
        Abrir o Direct
        <ArrowUpRight className="btn-icon" size={18} strokeWidth={1.6} aria-hidden="true" />
      </a>
    </>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (props: { id: string; className: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
}

function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-erro`;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[0.8125rem] text-mineral">
          {label}
        </label>
        {hint && <span className="text-[0.75rem] tabular-nums text-mute">{hint}</span>}
      </div>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
        className: [
          'mt-1.5 block w-full border-b bg-transparent py-3 text-[1rem] text-linen placeholder:text-linen/30 transition-colors duration-300 focus:outline-none',
          error ? 'border-[#e4b4a4]' : 'border-line focus:border-champagne',
        ].join(' '),
      })}
      {error && (
        <p id={errorId} className="mt-2 text-[0.8125rem] text-[#e4b4a4]">
          {error}
        </p>
      )}
    </div>
  );
}
