'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/format';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose(): void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

const WIDTHS = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

export function Modal({ open, onClose, title, description, size = 'md', footer, children }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    const previous = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="animate-fade absolute inset-0 bg-black/75" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'animate-sheet sm:animate-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line-strong bg-surface shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] outline-none sm:rounded-2xl',
          WIDTHS[size],
        )}
      >
        <header className="flex items-start gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex-1">
            <h2 id={titleId} className="text-lg font-bold text-fg">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="size-5" />
          </Button>
        </header>
        {children && <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>}
        {footer && <footer className="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4 sm:px-6">{footer}</footer>}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirmar', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
