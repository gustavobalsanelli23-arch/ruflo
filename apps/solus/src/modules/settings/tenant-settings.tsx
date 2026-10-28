'use client';

import { Building2, KeyRound, Palette, ShieldCheck, SlidersHorizontal, UserRound, Users } from 'lucide-react';
import { Notice } from '@/components/data/states';
import { PERMISSION_MATRIX } from '@/lib/auth/permissions';
import type { Role } from '@/lib/data/types';
import type { InvitationRow, MemberRow } from '@/services/organization-data';
import { ProfileSection, SecuritySection } from './account-sections';
import { AnalysisSection, type AnalysisSettings } from './analysis-section';
import { PermissionsSection } from './members';
import { OrganizationSection, type OrganizationInfo } from './organization-section';
import { SettingsFrame, ThemePreference, type SettingsSection } from './settings-frame';
import { TeamSection } from './team-section';

const SECTIONS: SettingsSection[] = [
  { id: 'organizacao', label: 'Organização', icon: Building2, description: 'Nome, identificador e permanência na organização.' },
  { id: 'perfil', label: 'Perfil', icon: UserRound, description: 'Como você aparece para a equipe.' },
  { id: 'seguranca', label: 'Segurança', icon: ShieldCheck, description: 'Senha e sessões abertas da sua conta.' },
  { id: 'preferencias', label: 'Preferências', icon: Palette, description: 'Aparência da interface neste dispositivo.' },
  { id: 'membros', label: 'Membros', icon: Users, description: 'Quem tem acesso, com qual papel, e os convites pendentes.' },
  { id: 'permissoes', label: 'Permissões', icon: KeyRound, description: 'O que cada papel pode fazer.' },
  { id: 'analises', label: 'Análises', icon: SlidersHorizontal, description: 'Limites que definem oportunidades e a classificação do estoque.' },
];

export interface TenantSettingsData {
  organization: OrganizationInfo;
  role: Role;
  user: { id: string; email: string; fullName: string | null };
  members: MemberRow[];
  invitations: InvitationRow[];
  /** Null when the parameters could not be read. */
  analysis: AnalysisSettings | null;
}

/** Settings of a real organization. Every change goes through a Server Action and RLS. */
export function TenantSettings({ data }: { data: TenantSettingsData }) {
  return (
    <SettingsFrame sections={SECTIONS}>
      {(section) => (
        <>
          {section === 'organizacao' && <OrganizationSection organization={data.organization} role={data.role} />}
          {section === 'perfil' && <ProfileSection fullName={data.user.fullName} email={data.user.email} />}
          {section === 'seguranca' && <SecuritySection />}
          {section === 'preferencias' && (
            <div className="flex flex-col gap-6">
              <ThemePreference />
              <Notice title="Movimento reduzido">A SOLUS segue a configuração de movimento do seu sistema.</Notice>
            </div>
          )}
          {section === 'membros' && (
            <TeamSection members={data.members} invitations={data.invitations} role={data.role} currentUserId={data.user.id} />
          )}
          {section === 'permissoes' && <PermissionsSection permissions={PERMISSION_MATRIX} />}
          {section === 'analises' &&
            (data.analysis ? (
              <AnalysisSection settings={data.analysis} role={data.role} />
            ) : (
              <Notice tone="error" title="Não foi possível carregar os parâmetros">
                Tente recarregar a página.
              </Notice>
            ))}
        </>
      )}
    </SettingsFrame>
  );
}
