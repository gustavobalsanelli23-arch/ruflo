import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { getSiteUrl } from '@/lib/env';
import { formatCurrency, formatNumber, formatRatio, formatSignedPercent, relativeChange } from '@/lib/format';
import { logServerError } from '@/lib/log';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loadBase, loadOverview, type TenantOverview } from '@/services/dashboards';

/**
 * The weekly summary e-mail: last 7 days against the 7 before, open
 * opportunities, and a link to the overview. Sent on Monday mornings by the
 * Vercel cron (vercel.json → /api/cron/resumo-semanal) to the owners and
 * admins of every organization with data.
 *
 * Off until RESEND_API_KEY, DIGEST_FROM (an address on a verified domain)
 * and CRON_SECRET exist. Each person can switch it off in Configurações >
 * Privacidade; the choice lives in their auth metadata (weekly_digest).
 */

export function isDigestConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.DIGEST_FROM?.trim() && process.env.CRON_SECRET?.trim());
}

/** Vercel cron sends `Authorization: Bearer <CRON_SECRET>`. */
export function isCronRequest(header: string | null) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export interface DigestEmail {
  subject: string;
  text: string;
  html: string;
}

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

function changeText(value: number, previous: number) {
  const ratio = relativeChange(value, previous);
  return ratio === null ? 'sem comparação' : `${formatSignedPercent(ratio)} contra a semana anterior`;
}

export function buildDigestEmail(organization: string, data: TenantOverview, siteUrl: string): DigestEmail {
  const { current, previous, opportunities } = data;
  const margin = current.grossMargin;
  const lines: [string, string, string][] = [
    ['Receita líquida', formatCurrency(current.netRevenue, { whole: true }), changeText(current.netRevenue, previous.netRevenue)],
    ['Lucro bruto', formatCurrency(current.grossProfit, { whole: true }), changeText(current.grossProfit, previous.grossProfit)],
    ['Margem bruta', formatRatio(margin), margin === null ? 'sem custo conhecido' : `contra ${formatRatio(previous.grossMargin)}`],
    ['Vendas', current.orders > 0 ? formatNumber(current.orders) : '—', current.orders > 0 ? changeText(current.orders, previous.orders) : 'sem número de pedido'],
  ];
  const open = opportunities.summary.open;
  const opportunityLine =
    open === 0
      ? 'Nenhuma oportunidade aberta.'
      : `${formatNumber(open)} oportunidades abertas, ${formatNumber(opportunities.summary.highPriority)} de alta prioridade, com impacto estimado de ${formatCurrency(opportunities.summary.monthlyImpact, { whole: true })} por mês.`;
  const top = opportunities.top.slice(0, 3).map((item) => item.title);
  const link = `${siteUrl}/visao-geral?periodo=7d`;
  const settings = `${siteUrl}/configuracoes?secao=privacidade`;

  const subject = `${organization}: ${formatCurrency(current.netRevenue, { whole: true })} em vendas nos últimos 7 dias`;
  const text = [
    `Resumo da semana de ${organization}`,
    '',
    ...lines.map(([label, value, note]) => `${label}: ${value} (${note})`),
    '',
    opportunityLine,
    ...top.map((title) => `- ${title}`),
    '',
    `Abrir a visão executiva: ${link}`,
    '',
    `Para não receber mais este resumo: ${settings}`,
  ].join('\n');

  const rows = lines
    .map(
      ([label, value, note]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e5e5;color:#555">${escape(label)}</td><td style="padding:8px 0;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:700">${escape(value)}</td><td style="padding:8px 0 8px 12px;border-bottom:1px solid #e5e5e5;color:#777;font-size:13px">${escape(note)}</td></tr>`,
    )
    .join('');
  const topList = top.length ? `<ul style="margin:8px 0 0;padding-left:18px">${top.map((title) => `<li>${escape(title)}</li>`).join('')}</ul>` : '';
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#ffffff;color:#000;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="margin:0;font-weight:700;letter-spacing:-0.02em">SOLUS</p>
<h1 style="margin:8px 0 4px;font-size:24px;letter-spacing:-0.03em">Resumo da semana de ${escape(organization)}</h1>
<p style="margin:0 0 20px;color:#555;font-size:14px">Últimos 7 dias, comparados com os 7 anteriores.</p>
<table style="width:100%;border-collapse:collapse;font-size:15px">${rows}</table>
<p style="margin:24px 0 0;font-size:15px">${escape(opportunityLine)}</p>${topList}
<p style="margin:28px 0 0"><a href="${escape(link)}" style="display:inline-block;background:#000;color:#fff;padding:12px 18px;text-decoration:none;font-weight:600">Abrir a visão executiva</a></p>
<p style="margin:32px 0 0;color:#777;font-size:12px">Os números vêm das planilhas importadas no SOLUS. <a href="${escape(settings)}" style="color:#777">Não quero mais receber este resumo</a>.</p>
</div></body></html>`;
  return { subject, text, html };
}

async function sendEmail(to: string, email: DigestEmail) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.DIGEST_FROM!.trim(), to: [to], subject: email.subject, text: email.text, html: email.html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) logServerError('resumo semanal: enviar', { status: response.status });
  return response.ok;
}

export interface DigestRun {
  organizations: number;
  sent: number;
  skipped: number;
  failed: number;
}

/** Sends the week's summary to every owner and admin who did not opt out. */
export async function runWeeklyDigest(): Promise<DigestRun | null> {
  if (!isDigestConfigured()) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const run: DigestRun = { organizations: 0, sent: 0, skipped: 0, failed: 0 };

  const { data: organizations, error } = await admin.from('organizations').select('id, name');
  if (error) {
    logServerError('resumo semanal: organizações', error);
    return run;
  }
  const optedOut = new Map<string, boolean>();
  const siteUrl = getSiteUrl();

  for (const organization of organizations ?? []) {
    try {
      const base = await loadBase(admin, organization.id);
      if (!base?.coverage.lastSale) continue;
      const { data: members } = await admin
        .from('organization_members')
        .select('user_id, role, profiles(email)')
        .eq('organization_id', organization.id)
        .in('role', ['owner', 'admin']);
      if (!members?.length) continue;
      run.organizations++;
      const email = buildDigestEmail(organization.name, await loadOverview(admin, organization.id, base, '7d'), siteUrl);

      for (const member of members) {
        const address = (member.profiles as { email?: string } | null)?.email;
        if (!address) continue;
        if (!optedOut.has(member.user_id)) {
          const { data } = await admin.auth.admin.getUserById(member.user_id);
          optedOut.set(member.user_id, data.user?.user_metadata?.weekly_digest === false);
        }
        if (optedOut.get(member.user_id)) {
          run.skipped++;
          continue;
        }
        if (await sendEmail(address, email)) run.sent++;
        else run.failed++;
      }
    } catch (cause) {
      logServerError('resumo semanal: organização', cause);
      run.failed++;
    }
  }
  return run;
}
