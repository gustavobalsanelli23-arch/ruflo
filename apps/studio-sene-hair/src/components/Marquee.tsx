import { services } from '../data/site';

/** Faixa contínua com os serviços — movimento lento, decorativo (a lista real está em #servicos). */
export function Marquee() {
  const items = [...services.map((s) => s.name), 'Saúde', 'Beleza', 'Autoestima'];
  const row = () => (
    <ul className="flex shrink-0 items-center">
      {items.map((label) => (
        <li key={label} className="flex items-center">
          <span className="px-7 font-display text-[1.375rem] italic leading-none md:px-10 md:text-[1.75rem]">
            {label}
          </span>
          <span className="size-1 rotate-45 bg-gold/80" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="overflow-hidden bg-espresso py-5 text-ivory/90 md:py-6" aria-hidden="true">
      <div className="marquee-track flex w-max">
        {row()}
        {row()}
      </div>
    </div>
  );
}
