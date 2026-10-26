import { AnimatePresence, LayoutGroup, m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { BlurText } from '../components/BlurText';
import { ENTER_EVENT } from '../components/Navbar';
import { CloseIcon } from '../components/StratumIcons';
import { PropertyCard } from '../components/PropertyCard';
import { PropertyTour, type TourTarget } from '../components/tour/PropertyTour';
import { Reveal } from '../components/Reveal';
import { catalog, type Property } from '../data/properties';
import {
  defaultFilters,
  filterOptions,
  filterProperties,
  isFiltered,
  isWide,
  plural,
  purposeOptions,
  type Filters,
} from '../lib/catalog';
import { stagger, VIEWPORT } from '../lib/motion';

export function PropertiesSection() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [tour, setTour] = useState<TourTarget | null>(null);
  const options = useMemo(() => filterOptions(catalog.properties), []);
  const results = useMemo(() => filterProperties(catalog.properties, filters), [filters]);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const close = useCallback(() => setTour(null), []);
  const open = useCallback((property: Property, origin: DOMRect | null) => setTour({ property, origin }), []);

  // ENTRAR (cabeçalho): abre o percurso do primeiro imóvel, de onde estiver.
  useEffect(() => {
    const onEnter = () => setTour({ property: catalog.properties[0], origin: null });
    window.addEventListener(ENTER_EVENT, onEnter);
    return () => window.removeEventListener(ENTER_EVENT, onEnter);
  }, []);

  return (
    <section id="imoveis" aria-labelledby="imoveis-titulo" className="section-y relative bg-ebony">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <BlurText as="h2" id="imoveis-titulo" lines={['O próximo capítulo', 'começa aqui.']} className="display display-lg lg:col-span-7" />
          <Reveal className="lg:col-span-5 lg:pb-3" delay={0.15}>
            <p className="lede">Clique em um imóvel para entrar nele: percorra os ambientes, veja os detalhes de perto e abra a ficha completa.</p>
            {catalog.demo && (
              <p className="mt-5 border-l border-champagne/60 pl-4 text-[0.875rem] leading-relaxed text-mineral">
                Catálogo em preparação. Os imóveis abaixo são exemplos ilustrativos, com fotos de banco de imagens.
              </p>
            )}
          </Reveal>
        </div>

        <Reveal className="mt-12 md:mt-16" delay={0.1}>
          <FilterBar filters={filters} options={options} onChange={set} onReset={() => setFilters(defaultFilters)} count={results.length} />
        </Reveal>

        <LayoutGroup>
          <m.div
            className="mt-10 grid gap-x-6 gap-y-12 md:mt-12 md:grid-cols-2 md:gap-y-16"
            variants={stagger(0.12)}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <AnimatePresence mode="popLayout">
              {results.map((p, i) => (
                <PropertyCard key={p.id} property={p} wide={isWide(i, results.length)} onOpen={open} />
              ))}
            </AnimatePresence>
          </m.div>
        </LayoutGroup>

        {results.length === 0 && (
          <div className="cut-frame mt-6 flex flex-col items-start gap-5 bg-white/[0.02] px-6 py-10 shadow-[inset_0_0_0_1px_var(--color-line)] sm:px-10">
            <p className="display display-md">Nenhum imóvel com esses filtros.</p>
            <p className="text-mineral">Tente outra combinação ou conte para a VOP o que você procura.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-solid" onClick={() => setFilters(defaultFilters)}>
                Limpar filtros
              </button>
              <a href="#contato" className="btn btn-glass liquid-glass">
                <span>Falar com um especialista</span>
              </a>
            </div>
          </div>
        )}

        <Reveal className="mt-16 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between md:mt-24">
          <p className="text-[1.0625rem] text-linen/85">Procura algo específico? Conte o que você precisa e a VOP vai atrás.</p>
          <a href="#contato" className="link-quiet text-[0.9375rem] text-linen">
            Descrever o imóvel que procuro
          </a>
        </Reveal>
      </div>

      <PropertyTour target={tour} onClose={close} />
    </section>
  );
}

interface FilterBarProps {
  filters: Filters;
  options: ReturnType<typeof filterOptions>;
  onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onReset: () => void;
  count: number;
}

function FilterBar({ filters, options, onChange, onReset, count }: FilterBarProps) {
  const { show } = options;
  return (
    <div className="flex flex-col gap-4">
      <div role="search" aria-label="Filtrar imóveis" className="filter-bar flex flex-col lg:flex-row lg:items-stretch">
        {show.purpose && (
          <div role="radiogroup" aria-label="Finalidade" className="flex p-1.5 lg:border-r lg:border-line">
            {purposeOptions.map((opt) => {
              const checked = filters.purpose === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => onChange('purpose', opt.id)}
                  className={[
                    'lbl relative h-11 flex-1 px-5 transition-colors duration-300 lg:flex-none',
                    checked ? 'text-ink' : 'text-[rgb(232_238_250/0.6)] hover:text-linen',
                  ].join(' ')}
                >
                  {checked && (
                    <m.span
                      layoutId="finalidade-ativa"
                      className="cut-tr absolute inset-0 bg-champagne"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 border-t border-line xs:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-1 lg:border-t-0">
          {show.type && (
            <Select label="Tipo de imóvel" value={filters.type} onChange={(v) => onChange('type', v as Filters['type'])}>
              <option value="todos">Todos os tipos</option>
              {options.types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          )}
          {show.region && (
            <Select label="Localização" value={filters.region} onChange={(v) => onChange('region', v)}>
              <option value="todas">Todas as regiões</option>
              {options.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          )}
          {show.price && (
            <Select label="Faixa de preço" value={filters.price} onChange={(v) => onChange('price', v as Filters['price'])}>
              {options.prices.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <div className="flex min-h-9 items-center justify-between gap-4">
        <p className="lbl text-[rgb(232_238_250/0.55)]" role="status" aria-live="polite">
          {count === 0 ? 'Nenhum imóvel encontrado' : `${plural(count, 'imóvel', 'imóveis')}${isFiltered(filters) ? ' com esses filtros' : ''}`}
        </p>
        {isFiltered(filters) && (
          <button type="button" onClick={onReset} className="lbl inline-flex items-center gap-2 px-1 py-2 text-linen hover:text-champagne">
            <CloseIcon className="ico size-2.5" />
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  const id = useId();
  const active = !['todos', 'todas'].includes(value);
  return (
    <div className="relative flex-1 border-t border-line transition-colors first:border-t-0 hover:bg-white/[0.03] lg:border-l lg:border-t-0 lg:first:border-l-0">
      <label htmlFor={id} className="kicker pointer-events-none absolute left-5 top-2.5 flex items-center gap-1.5 !text-[0.625rem]">
        {label}
        {active && <span aria-hidden="true" className="size-1 bg-champagne" />}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[3.75rem] w-full cursor-pointer appearance-none bg-transparent pb-2 pl-5 pr-10 pt-6 text-[0.9375rem] text-linen outline-offset-[-2px] [&>option]:bg-graphite"
      >
        {children}
      </select>
      <ChevronDown size={15} strokeWidth={1.5} aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-mineral" />
    </div>
  );
}
