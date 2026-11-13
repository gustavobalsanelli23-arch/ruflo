import Link from 'next/link';
import { LogoMark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { LEGAL, LEGAL_PAGES } from '@/config/legal';

const linkClass = 'relative -my-1.5 inline-block rounded-sm py-1.5 underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring';

/** Public pages (plans and legal documents): readable without an account. */
export function LegalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="fixed top-2 left-2 z-[60] -translate-y-16 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/entrar" className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="SOLUS, ir para entrar">
            <LogoMark className="size-6 text-brand" />
            <span className="text-[12px] font-semibold tracking-[0.22em]" translate="no">
              SOLUS
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/entrar" className={`font-medium text-foreground ${linkClass}`}>
              Entrar
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="border-t border-border">
      <nav aria-label="Planos e documentos legais" className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {LEGAL_PAGES.map((page) => (
            <li key={page.href}>
              <Link href={page.href} className={linkClass}>
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}

/** Long-form text with readable measure, headings and lists. */
export function LegalDocument({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Versão de {LEGAL.updatedAt}.</p>
      {intro && <div className="mt-6 text-base leading-7 text-foreground">{intro}</div>}
      <div className="mt-8 flex flex-col gap-8 text-[15px] leading-7 text-foreground [&_a]:font-medium [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4 [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** Contact as a mailto link once filled in; the placeholder text until then. */
export function Contact({ email }: { email: string }) {
  return email.includes('@') && !email.includes('[') ? <a href={`mailto:${email}`}>{email}</a> : <strong>{email}</strong>;
}
