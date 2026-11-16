'use client';

import { MotionConfig } from 'motion/react';
import { ThemeProvider } from 'next-themes';
import { CookieNotice } from '@/components/shell/cookie-notice';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProductAnalytics } from '@/lib/tracking/product-analytics';

export function Providers({
  children,
  nonce,
  analyticsKey = null,
}: {
  children: React.ReactNode;
  nonce?: string;
  analyticsKey?: string | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange nonce={nonce}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          {children}
          <CookieNotice analytics={analyticsKey !== null} />
          <ProductAnalytics apiKey={analyticsKey} />
          <Toaster position="bottom-right" closeButton />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
