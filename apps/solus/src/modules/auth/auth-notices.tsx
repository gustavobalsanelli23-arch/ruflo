import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Notice } from '@/components/data/states';
import { Button } from '@/components/ui/button';

const REASONS: Record<string, { tone: 'info' | 'success' | 'warning' | 'error'; title: string; body: string }> = {
  'sessao-expirada': { tone: 'warning', title: 'Sua sessão expirou', body: 'Entre novamente para continuar de onde parou.' },
  'sessao-encerrada': { tone: 'info', title: 'Você saiu da conta', body: 'A sessão foi encerrada em outra aba ou dispositivo.' },
  saiu: { tone: 'success', title: 'Você saiu da SOLUS', body: 'Até a próxima.' },
  'link-invalido': { tone: 'error', title: 'Link inválido', body: 'O link expirou ou já foi usado. Peça um novo.' },
  'senha-redefinida': { tone: 'success', title: 'Senha redefinida', body: 'Entre com a nova senha. As outras sessões foram encerradas.' },
  'link-expirado': { tone: 'warning', title: 'O link expirou', body: 'Links de recuperação valem por 1 hora e funcionam uma vez. Peça um novo.' },
};

export function ReasonNotice({ reason }: { reason?: string }) {
  const content = reason ? REASONS[reason] : undefined;
  if (!content) return null;
  return (
    <Notice tone={content.tone} title={content.title} className="mb-6">
      {content.body}
    </Notice>
  );
}

/** Shown when the environment has no Supabase settings: honest, with a way forward. */
export function NotConfiguredNotice() {
  return (
    <Notice tone="warning" title="Acesso ainda não configurado" className="mb-6">
      Este ambiente ainda não está conectado ao Supabase, então não é possível entrar nem criar contas. Enquanto isso, conheça a SOLUS com dados
      fictícios.
    </Notice>
  );
}

export function DemoLink() {
  return (
    <div className="mt-8 border-t pt-6">
      <Button asChild variant="outline" className="h-10 w-full">
        <Link href="/demo/visao-geral">
          Explorar a demonstração
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </Button>
      <p className="mt-2 text-center text-xs text-subtle-foreground">Empresa e números fictícios, sem precisar de conta.</p>
    </div>
  );
}
