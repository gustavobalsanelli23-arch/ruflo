const words = [
  'Coloração',
  'Luzes',
  'Corte com visagismo',
  'Tratamentos capilares',
  'Mega hair',
  'Make',
  'Penteado',
  'Manicure',
  'Pedicure',
  'Sobrancelha',
  'Lash lifting',
  'Micropigmentação',
  'Limpeza de pele',
  'Barba',
];

/** Faixa contínua com os serviços da casa (decorativa: a lista completa está em #servicos). */
export function ServicesMarquee() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {words.map((w) => (
        <li key={w} className="flex items-center">
          <span className="display whitespace-nowrap px-6 text-2xl italic text-bone/90 md:px-9 md:text-4xl">{w}</span>
          <span className="h-1 w-1 rounded-full bg-honey" aria-hidden />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee overflow-hidden border-y border-bone/10 bg-ink py-6 md:py-8">
      <p className="sr-only">Serviços: {words.join(', ')}.</p>
      <div className="marquee-track flex w-max" aria-hidden>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
