import Link from 'next/link';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <LogoMark className="size-10 text-brand" />
        <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">Esta página não existe</h1>
        <p className="mt-2 text-base text-muted-foreground">O endereço pode ter mudado. Volte para a visão executiva ou use a busca com Ctrl + K.</p>
        <Button asChild className="mt-6">
          <Link href="/visao-geral">Ir para a visão executiva</Link>
        </Button>
      </div>
    </main>
  );
}
