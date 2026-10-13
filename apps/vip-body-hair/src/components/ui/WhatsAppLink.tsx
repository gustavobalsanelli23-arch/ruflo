import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { track } from '../../lib/analytics';
import { waLink } from '../../lib/whatsapp';

type Props = {
  href?: string;
  /** Rótulo enviado ao analytics (ex.: "hero", "servico:Coloração"). */
  source: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>;

/** Link para o WhatsApp do salão: abre em nova aba e registra a conversão. */
export function WhatsAppLink({ href = waLink(), source, children, onClick, ...rest }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        track('Contact', { channel: 'whatsapp', source });
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
