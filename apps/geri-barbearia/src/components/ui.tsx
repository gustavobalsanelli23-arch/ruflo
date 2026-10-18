import type { MouseEvent, ReactNode } from 'react';
import { business, whatsappUrl } from '../config/site';
import { useOpenStatus } from '../hooks/useOpenStatus';
import { scrollToHash } from '../lib/motion';
import { WhatsAppIcon } from './icons';

interface WhatsAppButtonProps {
  message?: string;
  children?: ReactNode;
  variant?: 'primary' | 'ghost';
  className?: string;
  /** Identifica de onde veio o clique (data-cta), útil para analytics. */
  source: string;
}

/** Botão que abre a conversa no WhatsApp com mensagem já escrita. */
export function WhatsAppButton({
  message,
  children = 'Chamar no WhatsApp',
  variant = 'primary',
  className = '',
  source,
}: WhatsAppButtonProps) {
  return (
    <a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn btn-${variant} ${className}`}
      data-cta={source}
    >
      <WhatsAppIcon size={19} />
      <span>{children}</span>
      <span className="sr-only">(abre o WhatsApp em nova aba)</span>
    </a>
  );
}

/** "Aberto agora, até as 20h" — calculado no navegador, no fuso de Brasília. */
export function OpenStatus({ className = '' }: { className?: string }) {
  const { status } = useOpenStatus();
  return (
    <p className={`flex items-center gap-3 text-sm ${className}`} aria-live="polite">
      <span className="status-dot" data-state={status?.state ?? 'idle'} aria-hidden="true" />
      <span>{status ? status.label : 'Terça a sábado, por ordem de chegada'}</span>
    </p>
  );
}

/** Link interno que rola suavemente até a seção. */
export function AnchorLink({
  href,
  className,
  children,
  onNavigate,
}: {
  href: `#${string}`;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onNavigate?.();
    scrollToHash(href);
  };
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

export const navItems = [
  { href: '#a-casa', label: 'A casa' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#trabalhos', label: 'Trabalhos' },
  { href: '#visite', label: 'Visite' },
] as const;

export const instagramLabel = `@${business.instagram.handle}`;
