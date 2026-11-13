'use client';

import { MotionConfig } from 'motion/react';
import { ThemeProvider } from 'next-themes';
import { CookieNotice } from '@/components/shell/cookie-notice';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange nonce={nonce}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          {children}
          <CookieNotice />
          <Toaster position="bottom-right" closeButton />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
