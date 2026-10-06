import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container-fz grid min-h-dvh place-items-center py-20 text-center">
      <div>
        <p className="eyebrow mb-4">Erro 404</p>
        <h1 className="heading-display text-7xl sm:text-9xl">Fora de jogo</h1>
        <p className="mx-auto mt-4 max-w-md text-fg-2">A página que você procura não existe ou foi movida.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-brand-400">Voltar ao início</Link>
          <Link href="/camisas" className="rounded-xl border border-line-strong px-6 py-3 text-sm font-bold uppercase tracking-wider hover:border-brand-500">Ver camisas</Link>
        </div>
      </div>
    </main>
  );
}
