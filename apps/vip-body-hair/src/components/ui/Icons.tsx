import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  width: 20,
  height: 20,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  ...props,
});

export const ArrowRight = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <path d="M4 12h15M14 6.5 19.5 12 14 17.5" />
  </svg>
);

export const ArrowUpRight = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <path d="M7 17 17 7M8.5 7H17v8.5" />
  </svg>
);

export const WhatsApp = (p: P) => (
  <svg viewBox="0 0 24 24" {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
    <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01Zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.68 8.23-8.22 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28Z" />
  </svg>
);

export const Instagram = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r=".6" fill="currentColor" stroke="none" />
  </svg>
);

export const Facebook = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.87.25-1.46 1.5-1.46h1.6V4.46A21 21 0 0 0 15.3 4.3c-2.3 0-3.86 1.4-3.86 3.97v2.23H8.8v3h2.64V21" />
  </svg>
);

export const Phone = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <path d="M5.2 3.5h3l1.5 4.2-2 1.3a11.5 11.5 0 0 0 5.3 5.3l1.3-2 4.2 1.5v3a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 3.2 5.6a2 2 0 0 1 2-2.1Z" />
  </svg>
);

export const Mail = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="m3.5 6 8.5 7 8.5-7" />
  </svg>
);

export const MapPin = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <path d="M12 21s-6.5-6.1-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.9 12 21 12 21Z" />
    <circle cx="12" cy="9.8" r="2.3" />
  </svg>
);

export const Clock = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const Star = (p: P) => (
  <svg viewBox="0 0 24 24" {...base({ ...p, fill: 'currentColor', stroke: 'none' })}>
    <path d="m12 3.2 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7L12 3.2Z" />
  </svg>
);

export const StarHalf = (p: P) => (
  <svg viewBox="0 0 24 24" {...base({ ...p, stroke: 'none' })}>
    <defs>
      <linearGradient id="half-star">
        <stop offset="50%" stopColor="currentColor" />
        <stop offset="50%" stopColor="currentColor" stopOpacity=".25" />
      </linearGradient>
    </defs>
    <path fill="url(#half-star)" d="m12 3.2 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7L12 3.2Z" />
  </svg>
);

export const Plus = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Close = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Chevron = ({ dir = 'right', ...p }: P & { dir?: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <path d={dir === 'right' ? 'm9.5 5.5 6.5 6.5-6.5 6.5' : 'm14.5 5.5-6.5 6.5 6.5 6.5'} />
  </svg>
);

export const Navigation = (p: P) => (
  <svg viewBox="0 0 24 24" {...base(p)}>
    <path d="m3.5 10.8 17-7.3-7.3 17-1.9-7.8-7.8-1.9Z" />
  </svg>
);
