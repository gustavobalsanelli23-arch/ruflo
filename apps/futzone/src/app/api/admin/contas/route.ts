import { requireAdminApi } from '@/lib/auth/session';
import { describeAdminSlots } from '@/lib/auth/config';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Situação das contas de administrador (e-mail cadastrado e se o hash é válido). Nunca devolve o hash. */
export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  return json({ slots: describeAdminSlots() });
}
