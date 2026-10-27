'use client';

import { motion } from 'motion/react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Accessible name when the label is only an icon or an abbreviation. */
  ariaLabel?: string;
  count?: number;
}

/**
 * The one control for "pick one of a few": periods, chart/table views, table
 * filters. The selection pill slides to the chosen option, showing what changed.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const layoutId = useId();
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
      aria-label={label}
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border bg-muted p-0.5 no-scrollbar',
        size === 'sm' ? 'h-8' : 'h-9',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <ToggleGroupPrimitive.Item
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel}
            className={cn(
              'relative inline-flex h-full shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap outline-none',
              'text-muted-foreground transition-colors duration-150 hover:text-foreground',
              'focus-visible:ring-2 focus-visible:ring-ring/60 [&_svg]:size-4 [&_svg]:shrink-0',
              active && 'text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden="true"
                className="absolute inset-0 rounded-md border border-border-strong bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08)] dark:bg-white/[0.08]"
                transition={{ type: 'spring', stiffness: 560, damping: 44 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {option.label}
              {option.count !== undefined && (
                <span className={cn('tabular text-xs', active ? 'text-muted-foreground' : 'text-subtle-foreground')}>
                  {option.count}
                </span>
              )}
            </span>
          </ToggleGroupPrimitive.Item>
        );
      })}
    </ToggleGroupPrimitive.Root>
  );
}
