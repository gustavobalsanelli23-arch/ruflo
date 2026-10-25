import type { MouseEvent, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { booking, business } from '../config/site';
import { scrollToHash } from '../lib/motion';
import { InstagramIcon, WhatsappIcon } from './icons';

export const NAV = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#galeria', label: 'Galeria' },
  { href: '#contato', label: 'Contato' },
] as const;

/** Link interno que rola suavemente (com Lenis) e leva o foco junto. */
export function SectionLink({
  href,
  className,
  children,
  onNavigate,
  ...rest
}: {
  href: `#${string}`;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
  'data-intro'?: string;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate?.();
    scrollToHash(href);
  };
  return (
    <a href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}

interface BookingLinkProps {
  className?: string;
  /** Texto do botão; o padrão vem do canal ("Agendar pelo WhatsApp" etc.). */
  label?: string;
  message?: string;
  iconSize?: number;
  /** Mostra a seta no lugar do ícone do canal. */
  arrow?: boolean;
  'data-intro'?: string;
}

/** Botão de agendamento: abre o WhatsApp, a plataforma ou o Direct em nova aba. */
export function BookingLink({ className, label, message, iconSize = 18, arrow, ...rest }: BookingLinkProps) {
  const b = booking(message);
  const Icon = b.channel === 'whatsapp' ? WhatsappIcon : b.channel === 'instagram' ? InstagramIcon : null;
  return (
    <a href={b.href} target="_blank" rel="noopener noreferrer" className={className} data-booking={b.channel} {...rest}>
      {!arrow && Icon && <Icon size={iconSize} />}
      <span>{label ?? b.label}</span>
      {arrow && <ArrowRight size={iconSize} strokeWidth={1.5} aria-hidden="true" />}
      <span className="sr-only">(abre o {b.channelName} em nova aba)</span>
    </a>
  );
}

/** Link para o perfil oficial no Instagram. */
export function InstagramLink({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <a href={business.instagram.url} target="_blank" rel="noopener noreferrer" className={className}>
      {children ?? <>@{business.instagram.handle}</>}
      <span className="sr-only">(abre o Instagram em nova aba)</span>
    </a>
  );
}

/** Rótulo de seção: "N.º 02 — Sobre". */
export function SectionLabel({ n, children, className = '' }: { n: string; children: ReactNode; className?: string }) {
  return (
    <p data-reveal="fade" className={`label flex items-center gap-4 ${className}`}>
      <span className="tabular-nums">N.º {n}</span>
      <span aria-hidden="true" className="h-px w-10 bg-current opacity-40" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Escala: régua de traços finos (o pente, a medida do degradê). Elemento
 * gráfico da casa — divisórias e o detalhe do hero.
 */
export function Scale({ ticks = 48, className = '', intro }: { ticks?: number; className?: string; intro?: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-intro={intro ? 'tick' : undefined}
      className={`flex h-3 origin-left items-end justify-between ${className}`}
    >
      {Array.from({ length: ticks + 1 }, (_, i) => (
        <span
          key={i}
          className="w-px bg-current"
          style={{ height: i % 12 === 0 ? '100%' : i % 6 === 0 ? '66%' : '33%', opacity: i % 12 === 0 ? 0.9 : 0.45 }}
        />
      ))}
    </div>
  );
}
