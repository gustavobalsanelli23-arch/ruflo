'use client';

import { useSyncExternalStore } from 'react';

function partOfDay(): string {
  const hour = Number(
    new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date()),
  );
  if (hour < 5) return 'Boa noite';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

const subscribe = () => () => {};

/** Greeting by local time, resolved on the client so server and browser never disagree. */
export function Greeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(subscribe, partOfDay, () => 'Olá');
  return (
    <>
      {greeting}, {name}
    </>
  );
}
