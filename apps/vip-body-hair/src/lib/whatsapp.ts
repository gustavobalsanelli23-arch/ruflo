import { whatsapp } from '../data/site';

const GREETING = 'Olá, VIP body & hair!';

/** Link wa.me com mensagem pré-preenchida. */
export function waLink(message?: string) {
  const text = message ?? `${GREETING} Gostaria de agendar um horário.`;
  return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(text)}`;
}

/** Mensagem para consultar/agendar um serviço específico. */
export function waService(service: string) {
  return waLink(`${GREETING} Gostaria de saber mais e agendar: ${service}.`);
}

export type BookingRequest = {
  name: string;
  service: string;
  period: string;
  date: string;
  notes: string;
};

/** Monta a mensagem do formulário de agendamento (enviada pelo próprio visitante no WhatsApp). */
export function waBooking({ name, service, period, date, notes }: BookingRequest) {
  const lines = [
    GREETING,
    '',
    `Meu nome é ${name.trim()}.`,
    `Serviço: ${service}`,
    date ? `Data de preferência: ${formatDate(date)}` : '',
    period ? `Período: ${period}` : '',
    notes.trim() ? `Observações: ${notes.trim()}` : '',
  ].filter((l, i) => l !== '' || i === 1);
  return waLink(lines.join('\n'));
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}
