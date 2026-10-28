'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext } from 'react';

/**
 * The same screens render the real workspace (`/visao-geral`) and the
 * demonstration (`/demo/visao-geral`). Module links are written once, as app
 * paths, and resolved against the base path of the shell they render in, so
 * a link inside the demo never leads out of it by accident.
 */
const BasePathContext = createContext('');

export function BasePathProvider({ value, children }: { value: string; children: React.ReactNode }) {
  return <BasePathContext.Provider value={value}>{children}</BasePathContext.Provider>;
}

export function useBasePath() {
  return useContext(BasePathContext);
}

export function useAppHref() {
  const base = useBasePath();
  return useCallback((href: string) => (base && href.startsWith('/') && !href.startsWith('//') ? `${base}${href}` : href), [base]);
}

/** Path without the base, for matching navigation items. */
export function useAppPathname(pathname: string) {
  const base = useBasePath();
  return base && (pathname === base || pathname.startsWith(`${base}/`)) ? pathname.slice(base.length) || '/' : pathname;
}

export function AppLink({ href, ...props }: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const toHref = useAppHref();
  return <Link href={toHref(href)} {...props} />;
}
