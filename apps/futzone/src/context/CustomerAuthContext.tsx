'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Address, Customer } from '@/types/commerce';
import type { AuthResult, CustomerSession } from '@/services/auth/customerAuth.types';
import { customerAuthProvider } from '@/services/auth/localDemo.provider';
import { DEMO_CUSTOMER_ID } from '@/data/customers';
import { formatCPF, formatPhone, normalizeEmail } from '@/lib/validation';
import { useStoreData } from './StoreDataContext';

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string;
}

export type ProfilePatch = Pick<Customer, 'name' | 'email' | 'phone' | 'cpf'>;

interface CustomerAuthValue {
  status: 'loading' | 'authenticated' | 'anonymous';
  session: CustomerSession | null;
  customer: Customer | null;
  /** `demo` enquanto não houver autenticação de clientes no servidor. */
  mode: 'demo' | 'server';
  register(input: RegisterInput): Promise<AuthResult<CustomerSession>>;
  login(email: string, password: string): Promise<AuthResult<CustomerSession>>;
  loginDemo(): Promise<void>;
  logout(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  changePassword(current: string, next: string): Promise<AuthResult>;
  updateProfile(patch: ProfilePatch): Promise<AuthResult>;
  saveAddresses(addresses: Address[]): void;
}

const CustomerAuthContext = createContext<CustomerAuthValue | null>(null);

const provider = customerAuthProvider;

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const { customers, hydrated, upsertCustomer, claimGuestOrders } = useStoreData();
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    provider.getSession().then((s) => {
      setSession(s);
      setSessionLoaded(true);
    });
  }, []);

  const customer = useMemo(() => (session ? (customers.find((c) => c.id === session.customerId) ?? null) : null), [session, customers]);

  // Sessão de uma conta que não existe mais (ex.: dados restaurados) é encerrada.
  useEffect(() => {
    if (hydrated && session && !customer) {
      void provider.logout();
      setSession(null);
    }
  }, [hydrated, session, customer]);

  const status: CustomerAuthValue['status'] = !sessionLoaded || !hydrated ? 'loading' : customer ? 'authenticated' : 'anonymous';

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthResult<CustomerSession>> => {
      const email = normalizeEmail(input.email);
      if (customers.some((c) => normalizeEmail(c.email) === email)) {
        return { ok: false, code: 'email_em_uso', message: 'Este e-mail já tem uma conta. Faça login ou recupere a senha.', field: 'email' };
      }
      const id = `c-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      const result = await provider.register({ customerId: id, email, password: input.password });
      if (!result.ok) return result;
      const profile: Customer = {
        id,
        name: input.name.trim().replace(/\s+/g, ' '),
        email,
        phone: formatPhone(input.phone),
        cpf: formatCPF(input.cpf),
        city: '',
        state: '',
        createdAt: new Date().toISOString().slice(0, 10),
        addresses: [],
        origin: 'cadastro',
      };
      upsertCustomer(profile);
      claimGuestOrders(profile);
      setSession(result.value);
      return result;
    },
    [customers, upsertCustomer, claimGuestOrders],
  );

  const login = useCallback(async (email: string, password: string) => {
    const result = await provider.login(email, password);
    if (result.ok) setSession(result.value);
    return result;
  }, []);

  const loginDemo = useCallback(async () => {
    const demo = customers.find((c) => c.id === DEMO_CUSTOMER_ID);
    if (!demo || !provider.loginDemo) return;
    setSession(await provider.loginDemo(demo.id, demo.email));
  }, [customers]);

  const logout = useCallback(async () => {
    await provider.logout();
    setSession(null);
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string): Promise<AuthResult> => {
      if (!session) return { ok: false, code: 'sessao_expirada', message: 'Sua sessão expirou. Entre novamente.' };
      return provider.changePassword(session.customerId, current, next);
    },
    [session],
  );

  const updateProfile = useCallback(
    async (patch: ProfilePatch): Promise<AuthResult> => {
      if (!customer || !session) return { ok: false, code: 'sessao_expirada', message: 'Sua sessão expirou. Entre novamente.' };
      const email = normalizeEmail(patch.email);
      if (email !== normalizeEmail(customer.email)) {
        if (customers.some((c) => c.id !== customer.id && normalizeEmail(c.email) === email)) {
          return { ok: false, code: 'email_em_uso', message: 'Este e-mail já está em uso por outra conta.', field: 'email' };
        }
        const changed = await provider.changeEmail(customer.id, email);
        if (!changed.ok) return changed;
        setSession({ ...session, email });
      }
      upsertCustomer({ ...customer, name: patch.name.trim().replace(/\s+/g, ' '), email, phone: formatPhone(patch.phone), cpf: formatCPF(patch.cpf) });
      return { ok: true, value: undefined };
    },
    [customer, customers, session, upsertCustomer],
  );

  const saveAddresses = useCallback(
    (addresses: Address[]) => {
      if (!customer) return;
      const main = addresses.find((a) => a.isDefault) ?? addresses[0];
      upsertCustomer({ ...customer, addresses, city: main?.city ?? customer.city, state: main?.state ?? customer.state });
    },
    [customer, upsertCustomer],
  );

  const value = useMemo<CustomerAuthValue>(
    () => ({
      status,
      session,
      customer,
      mode: provider.mode,
      register,
      login,
      loginDemo,
      logout,
      requestPasswordReset: (email) => provider.requestPasswordReset(email),
      changePassword,
      updateProfile,
      saveAddresses,
    }),
    [status, session, customer, register, login, loginDemo, logout, changePassword, updateProfile, saveAddresses],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth(): CustomerAuthValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth precisa estar dentro de <CustomerAuthProvider>');
  return ctx;
}

/** Cliente logado — use apenas dentro de áreas protegidas por <AccountGuard>. */
export function useCurrentCustomer(): Customer {
  const { customer } = useCustomerAuth();
  if (!customer) throw new Error('Nenhum cliente logado.');
  return customer;
}
