import type { Metadata } from 'next';
import { demoRepository } from '@/demo/repository';
import { formatDateTime } from '@/lib/format';
import { parsePeriod } from '@/lib/period';
import { MonthlyReport } from '@/modules/report/monthly-report';
import { reportFromDemo } from '@/modules/report/report-data';

export const metadata: Metadata = { title: 'Relatório' };

/** The printable report, with the demonstration company. */
export default async function DemoReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const key = parsePeriod((await searchParams).periodo);
  const [workspace, data] = await Promise.all([demoRepository.getWorkspace(), demoRepository.getOverview(key)]);
  return <MonthlyReport data={reportFromDemo(workspace.organization.name, data)} generatedAt={formatDateTime(new Date().toISOString())} />;
}
