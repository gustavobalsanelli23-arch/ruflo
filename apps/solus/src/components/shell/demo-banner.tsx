import Link from 'next/link';
import { Button } from '@/components/ui/button';

/** Persistent label for the demonstration: fictitious data is never presented as real. */
export function DemoBanner({ signedIn }: { signedIn: boolean }) {
  return (
    <aside aria-label="Aviso de demonstração" className="border-b border-warning/25 bg-warning-soft">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
        <p className="min-w-0 flex-1 text-sm text-foreground">
          <span className="font-medium">Demonstração.</span>{' '}
          <span className="text-muted-foreground">Empresa, pessoas e números fictícios. Nada aqui vem de uma empresa real.</span>
        </p>
        <Button asChild size="sm" variant="outline" className="bg-card">
          {signedIn ? <Link href="/visao-geral">Ir para a minha organização</Link> : <Link href="/cadastro">Criar conta</Link>}
        </Button>
      </div>
    </aside>
  );
}
