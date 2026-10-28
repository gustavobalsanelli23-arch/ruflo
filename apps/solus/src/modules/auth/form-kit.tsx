'use client';

import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useActionState, useEffect, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { fieldErrors } from '@/schemas/auth';
import type { FormState } from './form-state';

/**
 * Shared pieces for the authentication and organization forms: one field
 * layout, one error pattern and one submit button, so every form behaves the
 * same way (instant validation, server validation, pending state, focus on
 * the first problem).
 */

export function useValidatedAction(
  schema: z.ZodType,
  action: (state: FormState, formData: FormData) => Promise<FormState>,
  initial: FormState,
) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const [lastState, setLastState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  // A new server answer replaces any client-side messages.
  if (state !== lastState) {
    setLastState(state);
    setClientErrors(null);
  }
  const errors = clientErrors ?? state.fieldErrors ?? {};

  useEffect(() => {
    if (state.fieldErrors) focusFirstInvalid(formRef.current, state.fieldErrors);
  }, [state]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = schema.safeParse(values);
    if (!result.success) {
      event.preventDefault();
      const found = fieldErrors(result.error);
      setClientErrors(found);
      focusFirstInvalid(event.currentTarget, found);
    }
  };

  const clearError = (name: string) =>
    setClientErrors((current) => {
      const base = current ?? state.fieldErrors ?? {};
      if (!(name in base)) return current;
      const next = { ...base };
      delete next[name];
      return next;
    });

  return { state, formAction, pending, errors, onSubmit, clearError, formRef };
}

function focusFirstInvalid(form: HTMLFormElement | null, errors: Record<string, string>) {
  const first = Object.keys(errors)[0];
  if (!form || !first) return;
  const field = form.elements.namedItem(first);
  if (field instanceof HTMLElement) field.focus();
}

export function AuthHeading({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-[1.625rem] leading-8 font-semibold tracking-[-0.025em] text-foreground">{title}</h1>
      {description && <p className="mt-2 text-base text-muted-foreground">{description}</p>}
    </div>
  );
}

export function Field({
  name,
  label,
  error,
  hint,
  aside,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-5 items-end justify-between gap-3">
        <Label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-xs text-critical-text">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${name}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function describedBy(name: string, error?: string, hint?: string) {
  if (error) return `${name}-error`;
  return hint ? `${name}-hint` : undefined;
}

export function TextInput({
  name,
  error,
  hint,
  onClear,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { name: string; error?: string; hint?: string; onClear?: (name: string) => void }) {
  return (
    <Input
      id={name}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(name, error, hint)}
      onInput={() => onClear?.(name)}
      className={cn('h-10 bg-card px-3', className)}
      {...props}
    />
  );
}

export function PasswordInput(props: React.ComponentProps<typeof TextInput>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextInput {...props} type={visible ? 'text' : 'password'} spellCheck={false} className={cn('pr-11', props.className)} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-controls={props.name}
        className="absolute inset-y-0.5 right-1 grid w-9 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingLabel,
  disabled,
  variant = 'default',
  className,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'destructive';
  className?: string;
}) {
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      className={cn('h-10 w-full text-sm', className)}
    >
      {pending && <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
