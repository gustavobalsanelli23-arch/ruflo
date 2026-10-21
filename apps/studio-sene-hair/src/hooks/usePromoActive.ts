import { useEffect, useState } from 'react';

/**
 * true enquanto a campanha estiver válida. O HTML pré-renderizado inclui a
 * campanha; no navegador ela some assim que a data de validade passa.
 */
export function usePromoActive(validUntil: number) {
  const [active, setActive] = useState(true);
  useEffect(() => {
    setActive(Date.now() < validUntil);
  }, [validUntil]);
  return active;
}
