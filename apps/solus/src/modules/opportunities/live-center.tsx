'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Opportunity, OpportunityStatus } from '@/lib/data/types';
import { runAnalysisAction, setOpportunityStatusAction } from './actions';
import { OpportunityCenter } from './opportunity-center';

/** The Opportunity Center bound to the server: status changes are saved, then the page refreshes. */
export function LiveOpportunityCenter({
  opportunities,
  productNames,
  canEdit,
  explainWithAi,
}: {
  opportunities: Opportunity[];
  productNames: Record<string, string>;
  canEdit: boolean;
  explainWithAi: boolean;
}) {
  const router = useRouter();
  const change = async (id: string, status: OpportunityStatus) => {
    const result = await setOpportunityStatusAction({ opportunityId: id, status, note: null });
    if (!result.ok) return { ok: false as const, message: result.error.message };
    router.refresh();
    return { ok: true as const };
  };
  return <OpportunityCenter opportunities={opportunities} productNames={productNames} onStatusChange={change} canEdit={canEdit} explainWithAi={explainWithAi} />;
}

/** Runs the Intelligence Engine again (analyst or above). */
export function RunAnalysisButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await runAnalysisAction();
          if (result.ok) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error('A análise não foi executada', { description: result.error.message });
          }
        })
      }
    >
      <RefreshCw aria-hidden="true" className={pending ? 'animate-spin' : undefined} />
      {pending ? 'Analisando…' : 'Analisar de novo'}
    </Button>
  );
}
