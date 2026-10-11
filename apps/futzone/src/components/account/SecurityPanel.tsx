'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useToast } from '@/context/ToastContext';
import { customerPasswordProblems } from '@/lib/validation';
import { formatDateTime } from '@/lib/format';
import { DEMO_CUSTOMER_ID } from '@/data/customers';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Form';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { PasswordStrength } from '@/components/forms/PasswordStrength';
import { AccountHeading, ShelfTitle } from './AccountUI';

export function SecurityPanel() {
  const { session, changePassword, logout, mode } = useCustomerAuth();
  const { notify } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [saving, setSaving] = useState(false);
  const isDemoAccount = session?.customerId === DEMO_CUSTOMER_ID;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Partial<typeof form> = {};
    if (!form.current) er.current = 'Informe a senha atual.';
    const problems = customerPasswordProblems(form.next);
    if (problems.length) er.next = `A nova senha precisa de: ${problems.join(', ')}.`;
    else if (form.next === form.current) er.next = 'A nova senha deve ser diferente da atual.';
    if (form.confirm !== form.next) er.confirm = 'As senhas não são iguais.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    const result = await changePassword(form.current, form.next);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.field === 'current' ? { current: result.message } : {});
      if (result.field !== 'current') notify(result.message, 'warning');
      return;
    }
    setForm({ current: '', next: '', confirm: '' });
    notify('Senha alterada com sucesso.');
  };

  const signOut = async () => {
    await logout();
    notify('Você saiu da sua conta.', 'info');
    router.replace('/');
  };

  return (
    <div>
      <AccountHeading title="Segurança" description="Senha, sessão deste navegador e como seus dados são guardados." />

      <div className="space-y-14">
        <section>
          <ShelfTitle title="Alterar senha" />
          {isDemoAccount ? (
            <p className="max-w-[62ch] text-sm leading-relaxed text-muted">A conta de demonstração entra sem senha. Crie sua própria conta para testar a troca de senha.</p>
          ) : (
            <form onSubmit={submit} noValidate className="locker grid max-w-xl gap-5 rounded-[var(--radius-card)] p-5 sm:p-6">
              <Field label="Senha atual" required error={errors.current}>
                {(id, d) => (
                  <PasswordInput id={id} aria-describedby={d} aria-invalid={!!errors.current} autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
                )}
              </Field>
              <Field label="Nova senha" required error={errors.next}>
                {(id, d) => (
                  <PasswordInput
                    id={id}
                    aria-describedby={[d, 'sec-strength'].filter(Boolean).join(' ')}
                    aria-invalid={!!errors.next}
                    autoComplete="new-password"
                    value={form.next}
                    onChange={(e) => setForm({ ...form, next: e.target.value })}
                  />
                )}
              </Field>
              <PasswordStrength id="sec-strength" password={form.next} />
              <Field label="Confirmar nova senha" required error={errors.confirm}>
                {(id, d) => (
                  <PasswordInput id={id} aria-describedby={d} aria-invalid={!!errors.confirm} autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
                )}
              </Field>
              <div>
                <Button type="submit" loading={saving}>
                  Salvar nova senha
                </Button>
              </div>
            </form>
          )}
        </section>

        <section>
          <ShelfTitle title="Sessão atual" />
          {session && (
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">Entrou em</dt>
                <dd className="mt-1 tabular-nums text-fg">{formatDateTime(session.issuedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Expira em</dt>
                <dd className="mt-1 tabular-nums text-fg">{formatDateTime(session.expiresAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Tipo</dt>
                <dd className="mt-1 text-fg">{mode === 'demo' ? 'Demonstração (este navegador)' : 'Servidor'}</dd>
              </div>
            </dl>
          )}
          <Button variant="outline" className="mt-6" onClick={signOut}>
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden /> Sair da conta
          </Button>
        </section>

        <section>
          <ShelfTitle title="Privacidade dos seus dados" />
          <ul className="max-w-[68ch] list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg-2 marker:text-muted">
            <li>Sua senha nunca é guardada em texto: armazenamos apenas um hash criptográfico.</li>
            <li>Nesta demonstração, seus dados ficam somente neste navegador: nada é enviado a servidores.</li>
            <li>Com o banco de dados, o acesso passará a exigir sessão segura no servidor e seguirá a LGPD.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
