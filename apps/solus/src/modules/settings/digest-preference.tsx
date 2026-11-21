'use client';

import { useEffect, useId, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { getDigestPreferenceAction, setDigestPreferenceAction } from './digest-actions';

/** On/off for the weekly summary e-mail (owners and admins receive it). */
export function DigestPreference() {
  const id = useId();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void getDigestPreferenceAction().then((value) => active && setEnabled(value));
    return () => {
      active = false;
    };
  }, []);

  const change = async (value: boolean) => {
    const before = enabled;
    setEnabled(value);
    setFailed(false);
    const result = await setDigestPreferenceAction(value);
    if (!result.ok) {
      setEnabled(before);
      setFailed(true);
    }
  };

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="text-sm">
        <label htmlFor={id} className="font-semibold text-foreground">
          Resumo semanal por e-mail
        </label>
        <p className="mt-1 text-muted-foreground">
          Toda segunda de manhã: receita, lucro, margem e oportunidades da semana, para proprietários e administradores.
        </p>
        {failed && <p className="mt-1 text-critical-text">Não foi possível salvar. Tente de novo.</p>}
      </div>
      <Switch id={id} checked={enabled ?? true} disabled={enabled === null} onCheckedChange={(value) => void change(value)} />
    </div>
  );
}
