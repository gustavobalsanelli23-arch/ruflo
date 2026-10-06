'use client';

import { StoreDataProvider } from '@/context/StoreDataContext';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreDataProvider>
      <CartProvider>
        <ToastProvider>{children}</ToastProvider>
      </CartProvider>
    </StoreDataProvider>
  );
}
