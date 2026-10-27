'use client';

import { Building2, KeyRound, Palette, ShieldCheck, SlidersHorizontal, UserRound, Users, type LucideIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Notice } from '@/components/data/states';
import { Segmented } from '@/components/data/segmented';
import { THEMES, useMounted } from '@/components/shell/theme-toggle';
import type { SettingsData } from '@/lib/data/types';
import { cn } from '@/lib/utils';
import { MembersSection, PermissionsSection, ROLE_LABEL } from './members';

const SECTIONS: { id: string; label: string; icon: LucideIcon; description: string }[] = [
  { id: 'organizacao', label: 'Organização', icon: Building2, description: 'Dados cadastrais usados em relatórios e notas.' },
  { id: 'perfil', label: 'Perfil', icon: UserRound, description: 'Como você aparece para a equipe.' },
  { id: 'preferencias', label: 'Preferências', icon: Palette, description: 'Aparência e comportamento da interface neste dispositivo.' },
  { id: 'membros', label: 'Membros', icon: Users, description: 'Quem tem acesso e com qual papel.' },
  { id: 'permissoes', label: 'Permissões', icon: KeyRound, description: 'O que cada papel pode fazer.' },
  { id: 'geral', label: 'Geral', icon: SlidersHorizontal, description: 'Retenção, exportação e privacidade dos dados.' },
];

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-6">
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="max-w-md">{children}</div>
    </div>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t pt-5">
      <span className="text-xs text-subtle-foreground">Demonstração: alterações não são gravadas.</span>
      <Button onClick={onSave}>Salvar alterações</Button>
    </div>
  );
}

const saved = () => toast.success('Alterações salvas', { description: 'Ambiente de demonstração: nada foi gravado.' });

export function SettingsView({ data }: { data: SettingsData }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get('secao');
  const section = SECTIONS.some((s) => s.id === requested) ? (requested as string) : 'organizacao';
  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]!;
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const { organization: org, user } = data;

  const go = (id: string) => router.replace(`${pathname}?secao=${id}`, { scroll: false });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Seções de configuração" className="hidden lg:block">
        <ul className="sticky top-20 flex flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(s.id)}
                aria-current={s.id === section ? 'page' : undefined}
                className={cn(
                  'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60',
                  s.id === section ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                <s.icon aria-hidden="true" className="size-4" />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        <div className="mb-6 lg:hidden">
          <Segmented value={section} onChange={go} label="Seções de configuração" options={SECTIONS.map((s) => ({ value: s.id, label: s.label }))} />
        </div>

        <section aria-labelledby="secao-titulo" className="surface rounded-xl p-5 sm:p-6">
          <header className="mb-6">
            <h2 id="secao-titulo" className="text-lg font-semibold tracking-[-0.01em]">
              {current.label}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{current.description}</p>
          </header>

          {section === 'organizacao' && (
            <div className="flex flex-col gap-5">
              {org.isDemo && <Notice tone="warning" title="Organização de demonstração">Os dados abaixo são fictícios e servem apenas para avaliar a interface.</Notice>}
              <Field id="org-name" label="Nome fantasia">
                <Input id="org-name" name="organization" autoComplete="organization" defaultValue={org.name} />
              </Field>
              <Field id="org-legal" label="Razão social">
                <Input id="org-legal" name="legal-name" autoComplete="off" defaultValue={org.legalName} />
              </Field>
              <Field id="org-tax" label="CNPJ" hint="Somente números ou com pontuação.">
                <Input id="org-tax" name="cnpj" inputMode="numeric" autoComplete="off" spellCheck={false} defaultValue={org.taxId} />
              </Field>
              <Field id="org-segment" label="Segmento">
                <Select defaultValue="emporio">
                  <SelectTrigger id="org-segment" className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emporio">Empório e mercearia fina</SelectItem>
                    <SelectItem value="supermercado">Supermercado</SelectItem>
                    <SelectItem value="moda">Moda e acessórios</SelectItem>
                    <SelectItem value="farmacia">Farmácia</SelectItem>
                    <SelectItem value="materiais">Materiais de construção</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="org-city" label="Cidade e UF">
                <div className="grid grid-cols-[1fr_5rem] gap-2">
                  <Input id="org-city" name="city" autoComplete="address-level2" defaultValue={org.city} />
                  <Input aria-label="UF" name="state" autoComplete="address-level1" maxLength={2} defaultValue={org.state} />
                </div>
              </Field>
              <Field id="org-tz" label="Fuso horário" hint="Define o fechamento do dia nas análises.">
                <Select defaultValue={org.timezone}>
                  <SelectTrigger id="org-tz" className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Sao_Paulo">Brasília (GMT−3)</SelectItem>
                    <SelectItem value="America/Manaus">Manaus (GMT−4)</SelectItem>
                    <SelectItem value="America/Rio_Branco">Rio Branco (GMT−5)</SelectItem>
                    <SelectItem value="America/Noronha">Fernando de Noronha (GMT−2)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <SaveBar onSave={saved} />
            </div>
          )}

          {section === 'perfil' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-xl bg-brand-soft text-lg font-semibold text-brand">{user.initials}</span>
                <div>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.jobTitle}, {ROLE_LABEL[user.role].toLowerCase()}
                  </p>
                </div>
              </div>
              <Field id="user-name" label="Nome">
                <Input id="user-name" name="name" autoComplete="name" defaultValue={user.name} />
              </Field>
              <Field id="user-email" label="E-mail" hint="Usado para entrar e receber alertas.">
                <Input id="user-email" name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} defaultValue={user.email} />
              </Field>
              <Field id="user-title" label="Cargo">
                <Input id="user-title" name="job-title" autoComplete="organization-title" defaultValue={user.jobTitle} />
              </Field>
              <SaveBar onSave={saved} />
            </div>
          )}

          {section === 'preferencias' && (
            <div className="flex flex-col gap-6">
              <fieldset>
                <legend className="text-sm font-medium text-foreground">Tema</legend>
                <p className="mt-0.5 text-xs text-muted-foreground">Aplicado na hora, neste dispositivo.</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Tema">
                  {THEMES.map((option) => {
                    const checked = mounted && theme === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => setTheme(option.id)}
                        className={cn(
                          'rounded-xl border p-3 text-left outline-none transition-[border-color,box-shadow] hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/60',
                          checked && 'border-brand ring-1 ring-brand',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex h-16 overflow-hidden rounded-lg border',
                            option.id === 'light' && 'bg-[#f5f7f8]',
                            option.id === 'dark' && 'bg-[#0c131b]',
                            option.id === 'system' && 'bg-[linear-gradient(90deg,#0c131b_50%,#f5f7f8_50%)]',
                          )}
                        >
                          <span className="w-1/4 bg-[#101923]" />
                          <span className="flex flex-1 flex-col gap-1.5 p-2">
                            <span className={cn('h-1.5 w-2/3 rounded-full', option.id === 'light' ? 'bg-[#17212b]/30' : 'bg-white/25')} />
                            <span className={cn('h-5 rounded', option.id === 'light' ? 'bg-white shadow-sm' : 'bg-white/8')} />
                          </span>
                        </span>
                        <span className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                          <option.icon aria-hidden="true" className="size-4 text-muted-foreground" />
                          {option.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <Notice title="Movimento reduzido">
                A SOLUS segue a configuração de movimento do seu sistema. Período padrão e alertas por e-mail chegam com as preferências por usuário no servidor.
              </Notice>
            </div>
          )}

          {section === 'membros' && <MembersSection initial={data.members} />}
          {section === 'permissoes' && <PermissionsSection permissions={data.permissions} />}

          {section === 'geral' && (
            <div className="flex flex-col gap-6">
              <Field id="retention" label="Retenção de dados" hint="Por quanto tempo o histórico importado fica disponível.">
                <Select defaultValue="36">
                  <SelectTrigger id="retention" className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="24">24 meses</SelectItem>
                    <SelectItem value="36">36 meses</SelectItem>
                    <SelectItem value="60">60 meses</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-start gap-3 rounded-lg border px-4 py-3">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-positive-text" />
                <div>
                  <p className="text-sm font-medium text-foreground">Privacidade e LGPD</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Os dados de cada organização ficam isolados das demais. Pedidos de acesso, correção ou exclusão de dados pessoais são atendidos pelo responsável da organização.
                  </p>
                </div>
              </div>
              <SaveBar onSave={saved} />
              <div className="rounded-xl border border-critical/30 p-4">
                <p className="text-sm font-semibold text-foreground">Excluir organização</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Remove a organização, os membros e todos os dados importados. Não pode ser desfeito.</p>
                <Button variant="destructive" className="mt-3" onClick={() => setDeleteOpen(true)}>
                  Excluir organização
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setConfirmName('');
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Excluir {org.name}?</DialogTitle>
            <DialogDescription>Todos os dados e acessos serão apagados de forma permanente. Para confirmar, digite o nome da organização.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-org">Nome da organização</Label>
            <Input id="confirm-org" name="confirm" autoComplete="off" spellCheck={false} value={confirmName} onChange={(event) => setConfirmName(event.target.value)} placeholder={`${org.name}…`} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={confirmName.trim() !== org.name}
              onClick={() => {
                setDeleteOpen(false);
                setConfirmName('');
                toast.info('Exclusão não realizada', { description: 'Organização de demonstração: a exclusão real chega com a autenticação.' });
              }}
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
