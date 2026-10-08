'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStoreData } from '@/context/StoreDataContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { deriveNotifications, notificationReadStore } from '@/services/notifications/notifications';

/** Pedidos do cliente logado (mais recentes primeiro). */
export function useCustomerOrders() {
  const { orders } = useStoreData();
  const { customer } = useCustomerAuth();
  return useMemo(
    () => (customer ? orders.filter((o) => o.customerId === customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []),
    [orders, customer],
  );
}

/** Notificações da conta, derivadas do histórico dos pedidos. */
export function useCustomerNotifications() {
  const { customer } = useCustomerAuth();
  const orders = useCustomerOrders();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (customer) setReadIds(notificationReadStore.get(customer.id));
  }, [customer]);

  const list = useMemo(() => deriveNotifications(orders, readIds), [orders, readIds]);

  const markRead = useCallback(
    (ids: string[]) => {
      if (!customer || !ids.length) return;
      notificationReadStore.markRead(customer.id, ids);
      setReadIds(notificationReadStore.get(customer.id));
    },
    [customer],
  );

  return { list, unread: list.filter((n) => !n.read).length, markRead, markAllRead: () => markRead(list.filter((n) => !n.read).map((n) => n.id)) };
}
