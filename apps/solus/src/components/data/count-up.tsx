'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A formatted figure ("R$ 12.345,67", "23,4%", "1.204") that counts up from
 * zero the first time it scrolls into view. The text and its format never
 * change, only the number inside it. Assistive tech reads the final value
 * once; the moving copy is hidden from it. Reduced motion shows the value.
 */

const NUMBER = /-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/;
const DURATION = 1100;

function parse(text: string) {
  const match = NUMBER.exec(text);
  if (!match) return null;
  const raw = match[0];
  const decimals = raw.split(',')[1]?.length ?? 0;
  const value = Number(raw.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(value) || value === 0) return null;
  const format = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: raw.includes('.') || Math.abs(value) < 1000,
  });
  return { before: text.slice(0, match.index), after: text.slice(match.index + raw.length), value, format };
}

const easeOutQuint = (t: number) => 1 - (1 - t) ** 5;

export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const parts = parse(value);
    const el = ref.current;
    if (!parts || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    setShown(`${parts.before}${parts.format.format(0)}${parts.after}`);
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        setShown(t >= 1 ? value : `${parts.before}${parts.format.format(parts.value * easeOutQuint(t))}${parts.after}`);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        run();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
