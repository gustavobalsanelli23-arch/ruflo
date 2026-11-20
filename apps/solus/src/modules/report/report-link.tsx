'use client';

import { FileText } from 'lucide-react';
import { AppLink } from '@/components/shell/base-path';
import { Button } from '@/components/ui/button';
import type { PeriodKey } from '@/lib/data/types';

/** Opens the printable report for the period on screen (works in the demo too). */
export function ReportLink({ period }: { period: PeriodKey }) {
  return (
    <Button asChild variant="outline">
      <AppLink href={`/relatorio?periodo=${period}`}>
        <FileText aria-hidden="true" />
        Relatório em PDF
      </AppLink>
    </Button>
  );
}
