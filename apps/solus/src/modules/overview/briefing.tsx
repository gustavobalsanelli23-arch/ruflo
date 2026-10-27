import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { BriefingSegment } from '@/lib/data/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The analyst's note: the period explained in a few sentences with the
 * numbers in place. This is the one bold element of the overview.
 */
export function Briefing({ segments, dataThrough }: { segments: BriefingSegment[]; dataThrough: string }) {
  return (
    <section aria-label="Resumo do período" className="relative pl-5">
      <span aria-hidden="true" className="absolute top-1 bottom-1 left-0 w-0.5 rounded-full bg-brand" />
      <p className="max-w-[64ch] text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
        {segments.map((segment, index) =>
          segment.kind === 'text' ? (
            <span key={index}>{segment.text}</span>
          ) : (
            <strong
              key={index}
              className={cn(
                'font-semibold tabular text-foreground',
                segment.tone === 'positive' && 'text-positive-text',
                segment.tone === 'negative' && 'text-critical-text',
              )}
            >
              {segment.text}
            </strong>
          ),
        )}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle-foreground">
        <span>
          Escrito a partir dos dados até <time dateTime={dataThrough}>{formatDate(dataThrough)}</time>
        </span>
        <Link
          href="/analista"
          className="inline-flex items-center gap-1 font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline"
        >
          Aprofundar no analista
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </p>
    </section>
  );
}
