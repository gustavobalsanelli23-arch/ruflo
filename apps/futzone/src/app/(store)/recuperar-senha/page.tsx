import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';

export const metadata: Metadata = { title: 'Recuperar senha' };

export default function PasswordResetPage() {
  return (
    <AuthShell title="Recuperar senha" subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.">
      <PasswordResetForm />
    </AuthShell>
  );
}
