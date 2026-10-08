'use client';

import { StoreDataProvider } from '@/context/StoreDataContext';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreDataProvider>
      <CustomerAuthProvider>
        <FavoritesProvider>
          <CartProvider>
            <ToastProvider>{children}</ToastProvider>
          </CartProvider>
        </FavoritesProvider>
      </CustomerAuthProvider>
    </StoreDataProvider>
  );
}
