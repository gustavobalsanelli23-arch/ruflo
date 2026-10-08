/**
 * Estimativa de entrega a partir do prazo (em dias úteis) informado pelo
 * serviço de frete. Considera só fins de semana — feriados ficam para quando
 * o provedor real devolver a data prevista.
 *
 * Datas trafegam como 'AAAA-MM-DD' (sem fuso), evitando que 14/10 vire 13/10.
 */

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  return date;
}

export function estimateWindow(minDays: number, maxDays: number, handlingDays = 0, from: Date = new Date()): { from: string; to: string } {
  return {
    from: toDateKey(addBusinessDays(from, handlingDays + minDays)),
    to: toDateKey(addBusinessDays(from, handlingDays + Math.max(minDays, maxDays))),
  };
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "entre 14 e 18 de outubro" · "entre 30 de outubro e 3 de novembro" · "em 14 de outubro" */
export function formatDeliveryWindow(fromKey: string, toKey: string): string {
  const a = fromDateKey(fromKey);
  const b = fromDateKey(toKey);
  const day = (d: Date) => d.getDate();
  const month = (d: Date) => MONTHS[d.getMonth()];
  if (fromKey === toKey) return `em ${day(a)} de ${month(a)}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `entre ${day(a)} e ${day(b)} de ${month(b)}`;
  return `entre ${day(a)} de ${month(a)} e ${day(b)} de ${month(b)}`;
}

/** "6–9 dias úteis" · "1 dia útil" */
export function formatBusinessDays(minDays: number, maxDays: number): string {
  if (minDays === maxDays) return `${minDays} ${minDays === 1 ? 'dia útil' : 'dias úteis'}`;
  return `${minDays}–${maxDays} dias úteis`;
}

/** Data curta: "14/10" */
export function formatDateKey(key: string): string {
  const d = fromDateKey(key);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
