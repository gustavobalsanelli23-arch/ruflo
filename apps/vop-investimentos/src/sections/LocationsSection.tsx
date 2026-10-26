import { m, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { BlurText } from '../components/BlurText';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import { regions } from '../data/content';
import { landmarks, mapSize, pathFrom, project, roads, UNITS_PER_KM } from '../lib/geo';
import { EASE_CINEMA } from '../lib/motion';

const { width, height } = mapSize();

export function LocationsSection() {
  const [active, setActive] = useState<string | null>(null);
  return (
    <section id="regioes" aria-labelledby="regioes-titulo" className="section-y relative bg-night">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <BlurText as="h2" id="regioes-titulo" lines={regions.title} className="display display-lg lg:col-span-7" breakOnMobile={false} />
          <Reveal as="p" className="lede lg:col-span-5 lg:pb-3" delay={0.15}>
            {regions.text}
          </Reveal>
        </div>

        <div className="mt-14 grid gap-12 md:mt-20 lg:grid-cols-12 lg:gap-10">
          <RevealGroup as="ul" className="self-start border-b border-line lg:col-span-4" step={0.1}>
            {regions.items.map((r) => (
              <RevealItem
                as="li"
                key={r.name}
                className="border-t border-line py-6"
                onMouseEnter={() => setActive(r.name)}
                onMouseLeave={() => setActive(null)}
              >
                <h3 className="flex items-center gap-3 text-[1.0625rem] font-medium">
                  <span
                    aria-hidden="true"
                    className={['size-1.5 rounded-full transition-colors duration-300', active === r.name ? 'bg-champagne' : 'bg-linen/40'].join(' ')}
                  />
                  {r.name}
                </h3>
                <p className="mt-2 pl-[1.125rem] text-[0.9375rem] leading-relaxed text-mineral">{r.description}</p>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal className="lg:col-span-8">
            <RegionMap active={active} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Mapa esquemático em SVG: escala real, posições aproximadas. */
function RegionMap({ active }: { active: string | null }) {
  const reduce = useReducedMotion();
  const scaleKm = 5;
  return (
    <figure className="liquid-glass relative overflow-hidden rounded-[14px] bg-ebony/60">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full"
        role="img"
        aria-labelledby="mapa-titulo mapa-desc"
      >
        <title id="mapa-titulo">Mapa esquemático da região oeste da Grande São Paulo</title>
        <desc id="mapa-desc">
          Alphaville e Barueri a noroeste de Osasco, ao longo da Rodovia Castello Branco, que segue para o centro de São Paulo, a leste.
          A região oeste aparece como uma área entre Santana de Parnaíba, Cotia e Osasco.
        </desc>
        <defs>
          <pattern id="mapa-grade" width={UNITS_PER_KM * 5} height={UNITS_PER_KM * 5} patternUnits="userSpaceOnUse">
            <path d={`M ${UNITS_PER_KM * 5} 0 L 0 0 0 ${UNITS_PER_KM * 5}`} fill="none" stroke="rgb(244 241 235 / 0.05)" strokeWidth="0.6" />
          </pattern>
          <radialGradient id="mapa-area">
            <stop offset="0%" stopColor="#b8a17a" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#b8a17a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={width} height={height} fill="url(#mapa-grade)" />

        {/* Áreas (regiões com raio) */}
        {regions.items
          .filter((r) => r.radiusKm > 0)
          .map((r) => {
            const { x, y } = project(r.lat, r.lon);
            const on = active === null || active === r.name;
            return (
              <g key={r.name} style={{ opacity: on ? 1 : 0.35, transition: 'opacity 0.4s' }}>
                <circle cx={x} cy={y} r={r.radiusKm * UNITS_PER_KM} fill="url(#mapa-area)" />
                <circle cx={x} cy={y} r={r.radiusKm * UNITS_PER_KM} fill="none" stroke="#b8a17a" strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="2 5" />
                <text x={x} y={y + r.radiusKm * UNITS_PER_KM - 10} textAnchor="middle" fill="#b8a17a" className="map-label-lg" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>
                  {r.short}
                </text>
              </g>
            );
          })}

        {/* Rodovias */}
        {roads.map((road, i) => (
          <g key={road.name}>
            <m.path
              d={pathFrom(road.points)}
              fill="none"
              stroke="rgb(244 241 235 / 0.32)"
              strokeWidth="1.1"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 2.2, ease: EASE_CINEMA, delay: 0.2 + i * 0.25 }}
            />
            <RoadLabel road={road} />
          </g>
        ))}

        {/* Cidades de referência */}
        {landmarks.map((l) => {
          const { x, y } = project(l.lat, l.lon);
          const right = l.name === 'São Paulo';
          return (
            <g key={l.name} fill="rgb(244 241 235 / 0.5)">
              <rect x={x - 2.2} y={y - 2.2} width="4.4" height="4.4" transform={`rotate(45 ${x} ${y})`} />
              <text x={right ? x - 8 : x + 8} y={y + 4} textAnchor={right ? 'end' : 'start'} className="map-label" style={{ fontFamily: 'var(--font-sans)', letterSpacing: '0.02em' }}>
                {l.name}
              </text>
            </g>
          );
        })}

        {/* Regiões pontuais */}
        {regions.items
          .filter((r) => r.radiusKm === 0)
          .map((r, i) => {
            const { x, y } = project(r.lat, r.lon);
            const on = active === null || active === r.name;
            const labelLeft = r.name === 'Barueri';
            return (
              <g key={r.name} style={{ opacity: on ? 1 : 0.35, transition: 'opacity 0.4s' }}>
                {!reduce && (
                  <circle cx={x} cy={y} r="6" fill="none" stroke="#b8a17a" strokeWidth="0.8">
                    <animate attributeName="r" values="5;16" dur="2.8s" begin={`${i * 0.9}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="2.8s" begin={`${i * 0.9}s`} repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={x} cy={y} r="4.5" fill="#b8a17a" />
                <circle cx={x} cy={y} r="1.6" fill="#050505" />
                <text
                  x={labelLeft ? x - 12 : x + 12}
                  y={labelLeft ? y + 18 : y - 8}
                  textAnchor={labelLeft ? 'end' : 'start'}
                  className="map-label-lg fill-linen"
                  style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
                >
                  {r.short}
                </text>
              </g>
            );
          })}

        {/* Escala e norte */}
        <g transform={`translate(24 ${height - 26})`} fill="rgb(244 241 235 / 0.6)" stroke="rgb(244 241 235 / 0.6)">
          <line x1="0" y1="0" x2={scaleKm * UNITS_PER_KM} y2="0" strokeWidth="0.8" />
          <line x1="0" y1="-4" x2="0" y2="4" strokeWidth="0.8" />
          <line x1={scaleKm * UNITS_PER_KM} y1="-4" x2={scaleKm * UNITS_PER_KM} y2="4" strokeWidth="0.8" />
          <text x={scaleKm * UNITS_PER_KM + 8} y="4" stroke="none" className="map-label" style={{ fontFamily: 'var(--font-sans)' }}>
            {scaleKm} km
          </text>
        </g>
        <g transform={`translate(${width - 30} 34)`} fill="none" stroke="rgb(244 241 235 / 0.6)" strokeWidth="0.8">
          <path d="M0 -14 L5 4 L0 0 L-5 4 Z" fill="rgb(244 241 235 / 0.6)" />
          <text y="20" textAnchor="middle" stroke="none" fill="rgb(244 241 235 / 0.6)" className="map-label" style={{ fontFamily: 'var(--font-sans)' }}>
            N
          </text>
        </g>
      </svg>
      <figcaption className="border-t border-line px-5 py-3 text-[0.75rem] text-mineral">Mapa esquemático em escala; posições e traçados aproximados.</figcaption>
    </figure>
  );
}

function RoadLabel({ road }: { road: (typeof roads)[number] }) {
  // Rótulo num trecho livre (labelAt), alinhado à direção da estrada.
  const pts = road.points;
  const a = project(...pts[road.labelAt]);
  const b = project(...pts[road.labelAt + 1]);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const flip = Math.abs(angle) > 90;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return (
    <text
      transform={`translate(${mx} ${my}) rotate(${flip ? angle + 180 : angle})`}
      y={-6}
      textAnchor="middle"
      fill="rgb(244 241 235 / 0.45)"
      className="map-label-sm"
      style={{ fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}
    >
      {road.name}
    </text>
  );
}
