import { requireAdminApi } from '@/lib/auth/session';
import { isDbConfigured } from '@/server/db/client';
import { listOrders } from '@/server/orders/orders.service';
import { adminChecks, json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Pedidos gravados no banco (os mais recentes primeiro). Sem banco: `source: local`. */
export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  if (!isDbConfigured()) return json({ source: 'local' });
  const denied = await adminChecks();
  if (denied) return denied;
  return json({ source: 'db', orders: await listOrders() });
}
