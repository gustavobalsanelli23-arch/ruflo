'use client';

import { KeyRound, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Unlocks the AI analyst of the demonstration with the access code. */
export function DemoUnlock() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/demo/acesso', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? 'Não foi possível ativar agora.');
        return;
      }
      router.refresh();
    } catch {
      setError('Sem conexão com o servidor.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 flex max-w-xl flex-col gap-2 rounded-xl border p-4">
      <label htmlFor="codigo-ia" className="flex items-center gap-2 text-sm font-medium text-foreground">
        <KeyRound aria-hidden="true" className="size-4 text-brand" />
        Ativar a IA nesta demonstração
      </label>
      <p className="text-xs text-muted-foreground">Com o código de acesso, o analista responde a perguntas livres sobre os dados fictícios usando o Claude, da Anthropic.</p>
      <div className="flex gap-2">
        <Input
          id="codigo-ia"
          type="password"
          autoComplete="off"
          value={code}
          maxLength={200}
          onChange={(event) => setCode(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'codigo-ia-erro' : undefined}
          className="h-9"
        />
        <Button type="submit" disabled={!code.trim() || pending}>
          {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
          Ativar
        </Button>
      </div>
      {error && (
        <p id="codigo-ia-erro" role="alert" className="text-xs text-critical-text">
          {error}
        </p>
      )}
    </form>
  );
}
