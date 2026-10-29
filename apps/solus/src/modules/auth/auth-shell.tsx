import Link from 'next/link';
import { EclipseArt } from '@/components/brand/eclipse';
import { Logo, LogoMark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/shell/theme-toggle';

/**
 * Sign-in, sign-up and onboarding screens. The navy panel is the app's
 * sidebar grown wide (the same structure people find after signing in); the
 * form sits on the theme's own plane.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside
        aria-label="Sobre a SOLUS"
        className="relative isolate hidden overflow-hidden border-r border-sidebar-border bg-[#101923] text-sidebar-foreground lg:flex lg:flex-col"
      >
        <div className="relative z-10 flex flex-1 flex-col px-10 pt-9 pb-10 xl:px-14">
          <Link href="/entrar" className="w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/70" aria-label="SOLUS, entrar">
            <Logo />
          </Link>
          <div className="mt-[15vh] max-w-[25rem]">
            <p lang="en" className="text-[2.75rem] leading-[1.05] font-medium tracking-[-0.035em] text-sidebar-accent-foreground">
              See beyond
              <br />
              the numbers.
            </p>
            <p className="mt-6 max-w-[22rem] text-lg leading-7 text-sidebar-foreground">
              Lucro, estoque e oportunidades da sua empresa, lidos a partir dos seus próprios dados.
            </p>
          </div>
        </div>
        <EclipseArt className="absolute -right-[30%] -bottom-[24%] z-0 w-[125%] max-w-[780px] text-sidebar-primary" />
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex h-16 items-center justify-between px-5 sm:px-8">
          <Link
            href="/entrar"
            className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring lg:invisible"
            aria-label="SOLUS, entrar"
          >
            <LogoMark className="size-6 text-brand" />
            <span className="text-[12px] font-semibold tracking-[0.22em]" translate="no">
              SOLUS
            </span>
          </Link>
          <ThemeToggle />
        </header>
        <main id="conteudo" className="flex flex-1 items-start px-5 pt-6 pb-16 sm:px-8 sm:pt-[8vh] lg:items-center lg:pt-0">
          <div className="mx-auto w-full max-w-[23.5rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
