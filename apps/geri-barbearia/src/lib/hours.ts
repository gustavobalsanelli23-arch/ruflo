import { openingHours, TIME_ZONE, type Range, type Weekday } from '../config/site';

export type OpenState = 'open' | 'break' | 'closed';

export interface OpenStatus {
  state: OpenState;
  /** Frase curta para o cliente, ex.: "Aberto agora, até as 20h". */
  label: string;
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const SHORT_TO_INDEX: Record<string, Weekday> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** 510 → "8h30", 720 → "12h". */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** Dia da semana e minutos desde a meia-noite no fuso da barbearia. */
export function localClock(date: Date, timeZone = TIME_ZONE): { day: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: SHORT_TO_INDEX[get('weekday')],
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

function rangesOf(day: number): readonly Range[] {
  return openingHours[(day % 7) as Weekday] ?? [];
}

export function getOpenStatus(date: Date = new Date()): OpenStatus {
  const { day, minutes } = localClock(date);
  const today = rangesOf(day);

  const current = today.find(([open, close]) => minutes >= open && minutes < close);
  if (current) return { state: 'open', label: `Aberto agora, até as ${formatTime(current[1])}` };

  const laterToday = today.find(([open]) => open > minutes);
  if (laterToday) {
    const hadMorning = today.some(([, close]) => close <= minutes);
    return hadMorning
      ? { state: 'break', label: `Pausa para o almoço, volta às ${formatTime(laterToday[0])}` }
      : { state: 'closed', label: `Fechado agora, abre às ${formatTime(laterToday[0])}` };
  }

  for (let offset = 1; offset <= 7; offset++) {
    const next = rangesOf(day + offset)[0];
    if (!next) continue;
    const when = offset === 1 ? 'amanhã' : WEEKDAYS[(day + offset) % 7];
    return { state: 'closed', label: `Fechado agora, abre ${when} às ${formatTime(next[0])}` };
  }
  return { state: 'closed', label: 'Fechado agora' };
}

/** Dia da semana de hoje no fuso da barbearia (para destacar a linha certa da tabela). */
export function todayIndex(date: Date = new Date()): Weekday {
  return localClock(date).day;
}
