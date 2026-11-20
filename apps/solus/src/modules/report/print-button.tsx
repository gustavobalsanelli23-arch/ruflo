'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Opens the browser's print dialog, where "Salvar como PDF" is one of the printers. */
export function PrintButton() {
  return (
    <Button onClick={() => window.print()}>
      <Download aria-hidden="true" />
      Baixar PDF
    </Button>
  );
}
