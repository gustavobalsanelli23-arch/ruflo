import { LogoMark } from '@/components/brand/logo';
import { TextLink } from '@/components/data/text-link';
import type { BriefingSegment } from '@/lib/data/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The analyst's note: the period explained in a few sentences with the
 * numbers in place. It opens the overview, ahead of every chart, and is the
 * one typographic statement on the screen.
 */
export function Briefing({ segments, dataThrough }: { segments: BriefingSegment[]; dataThrough: string }) {
  return (
    <section aria-label="Nota do analista sobre o período">
      <p className="max-w-[72ch] text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-9">
        {segments.map((segment, index) =>
          segment.kind === 'text' ? (
            <span key={index}>{segment.text}</span>
          ) : (
            <strong
              key={index}
              className={cn(
                'font-semibold text-foreground',
                segment.tone === 'positive' && 'text-positive-text',
                segment.tone === 'negative' && 'text-critical-text',
              )}
            >
              {segment.text}
            </strong>
          ),
        )}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-subtle-foreground">
        <span className="inline-flex items-center gap-1.5">
          <LogoMark className="size-4 text-brand" />
          Nota do analista, escrita com os dados até <time dateTime={dataThrough}>{formatDate(dataThrough)}</time>
        </span>
        <TextLink href="/analista" className="text-xs">
          Aprofundar no analista
        </TextLink>
      </p>
    </section>
  );
}
