import { LegalShell } from '@/modules/legal/legal-shell';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <LegalShell>{children}</LegalShell>;
}
