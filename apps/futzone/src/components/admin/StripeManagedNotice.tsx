import { AdminCard, AdminPageHeader } from './AdminUI';

/**
 * Fretes e cupons agora ficam na Stripe (links de pagamento). A página antiga
 * continua no endereço para quem tiver salvo, explicando onde configurar.
 */
export function StripeManagedNotice({ title, steps }: { title: string; steps: string[] }) {
  return (
    <>
      <AdminPageHeader title={title} description="Configurado na Stripe, junto com os links de pagamento." />
      <AdminCard title="Onde configurar">
        <ol className="list-decimal space-y-1.5 p-5 pl-10 text-sm text-fg-2">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </AdminCard>
    </>
  );
}
