import type { MouseEvent, ReactNode } from 'react';
import { booking } from '../config/site';
import { scrollToHash } from '../lib/motion';
import { InstagramIcon, WhatsappIcon } from './icons';

export const NAV = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#especialidades', label: 'Especialidades' },
  { href: '#trabalhos', label: 'Trabalhos' },
  { href: '#instagram', label: 'Instagram' },
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
  /** Texto do botão; o padrão é "Agendar pelo WhatsApp" (ou Instagram). */
  label?: string;
  message?: string;
  iconSize?: number;
  /** Esconde o ícone do canal. */
  bare?: boolean;
}

/** Botão de agendamento: abre o WhatsApp (ou o Direct, sem número) em nova aba. */
export function BookingLink({ className, label, message, iconSize = 19, bare }: BookingLinkProps) {
  const b = booking(message);
  const Icon = b.channel === 'whatsapp' ? WhatsappIcon : InstagramIcon;
  return (
    <a
      href={b.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      data-booking={b.channel}
    >
      {!bare && <Icon size={iconSize} />}
      <span>{label ?? b.label}</span>
      <span className="sr-only">(abre o {b.channelName} em nova aba)</span>
    </a>
  );
}
