import { useEffect, useState } from 'react';
import { getOpenStatus, todayIndex, type OpenStatus } from '../lib/hours';
import type { Weekday } from '../config/site';

/**
 * Status "aberto/fechado" calculado no navegador (fuso de Brasília) e
 * atualizado a cada minuto. No HTML pré-renderizado fica nulo, para não
 * gravar no build um status que estaria errado na hora da visita.
 */
export function useOpenStatus(): { status: OpenStatus | null; today: Weekday | null } {
  const [state, setState] = useState<{ status: OpenStatus | null; today: Weekday | null }>({
    status: null,
    today: null,
  });

  useEffect(() => {
    const update = () => setState({ status: getOpenStatus(), today: todayIndex() });
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return state;
}
