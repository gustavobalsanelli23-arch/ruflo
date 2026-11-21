import { isCronRequest, isDigestConfigured, runWeeklyDigest } from '@/services/weekly-digest';

/**
 * Weekly summary e-mail, called by the Vercel cron on Monday mornings
 * (vercel.json). Only the cron's own secret is accepted. While e-mail is not
 * configured it answers that it is off and sends nothing.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronRequest(request.headers.get('authorization'))) return new Response('Não autorizado.', { status: 401 });
  if (!isDigestConfigured()) return Response.json({ status: 'off' });
  const run = await runWeeklyDigest();
  return Response.json({ status: 'done', ...run });
}
