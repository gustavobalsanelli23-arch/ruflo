'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { EclipseArt } from '@/components/brand/eclipse';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import styles from './landing-hero.module.css';

/**
 * Full-viewport hero of the public home: glass nav, badge, two-line headline
 * whose accent is painted in two passes, two calls to action and a lede at
 * the bottom, over the SOLUS eclipse. Always dark, in both themes.
 */

const LINKS = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#para-quem', label: 'Para quem é' },
  { href: '/planos', label: 'Planos' },
  { href: '/entrar', label: 'Entrar' },
];

type Delay = React.CSSProperties & { '--d': string };
const delay = (seconds: number): Delay => ({ '--d': `${seconds}s` });

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10h10.2M10.4 5.6 15.2 10l-4.8 4.4" />
    </svg>
  );
}

function SignUpButton({ variant, style }: { variant: 'nav' | 'light'; style?: React.CSSProperties }) {
  const tone = variant === 'nav' ? styles.btnNav : `${styles.btnLight} ${styles.wipe}`;
  return (
    <Link href="/cadastro" className={`${styles.btn} ${tone}`} style={style}>
      <span className={styles.btnLabel}>Criar conta grátis</span>
      <span className={styles.btnIcon}>
        <Arrow />
      </span>
    </Link>
  );
}

export function LandingHero() {
  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      burger.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={styles.hero}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.eclipse} aria-hidden="true">
        <div className={styles.corona} />
        <div className={styles.rays} />
        <EclipseArt className={styles.eclipseArt} />
        <div className={styles.flow} />
        <div className={`${styles.flow} ${styles.flowSlow}`} />
      </div>
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.nav}>
        <nav aria-label="Principal" className={styles.links}>
          {LINKS.map((link, index) => (
            <Link key={link.href} href={link.href} className={styles.link} style={delay(0.02 + index * 0.06)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/" aria-label="SOLUS, início" className={styles.logo}>
          <Logo />
        </Link>

        <div className={styles.end}>
          <span className={styles.endFade}>
            <ThemeToggle />
          </span>
          <SignUpButton variant="nav" />
          <button
            ref={burger}
            type="button"
            className={styles.burger}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            aria-controls="menu-celular"
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div id="menu-celular" className={styles.mobileMenu} hidden={!open}>
        <nav aria-label="Principal no celular" className={styles.mobileLinks}>
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className={styles.main}>
        <p className={`${styles.badge} ${styles.wipe}`} style={delay(0.18)}>
          <span className={styles.badgeMark} aria-hidden="true" />
          Lucro e estoque a partir das suas planilhas
        </p>

        <h1 className={styles.headline}>
          <span className={styles.mask}>
            <span className={styles.rise} style={delay(0.26)}>
              Veja onde sua empresa ganha{' '}
            </span>
          </span>
          <span className={styles.mask}>
            <span className={styles.rise} style={delay(0.4)}>
              <span className={styles.muted}>e onde </span>
              <span className={styles.accent} data-text="perde dinheiro.">
                perde dinheiro.
              </span>
            </span>
          </span>
        </h1>

        <div className={styles.actions}>
          <SignUpButton variant="light" style={delay(0.56)} />
          <Link href="/demo/visao-geral" className={`${styles.btn} ${styles.btnGhost} ${styles.wipe}`} style={delay(0.66)}>
            <span className={styles.btnLabel}>Ver a demonstração</span>
          </Link>
        </div>
        <p className={`${styles.note} ${styles.wipe}`} style={delay(0.72)}>
          O plano Free não pede cartão. A demonstração usa uma empresa fictícia.
        </p>
      </div>

      <p className={styles.lede}>
        <span className={styles.rise} style={delay(0.78)}>
          O SOLUS lê as planilhas de vendas e estoque que você já tem e mostra lucro, estoque parado e oportunidades. Cada número vem
          dos seus dados, nada é estimado.
        </span>
      </p>
    </header>
  );
}
