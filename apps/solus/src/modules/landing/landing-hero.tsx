'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LogoMark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { ParticleEclipse } from './particle-eclipse';
import styles from './landing-hero.module.css';

/**
 * Full-viewport hero of the public home, always black: a flat nav, the
 * headline in glass lettering, and the eclipse drawn as a cloud of white
 * particles. The pointer stirs the corona; a click opens the eclipse (the
 * moon slides away) and another closes it.
 */

const LINKS = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#o-que-voce-ve', label: 'O que você vê' },
  { href: '#para-quem', label: 'Para quem é' },
  { href: '/planos', label: 'Planos' },
];

export function LandingHero() {
  const [open, setOpen] = useState(false);
  const [eclipseOpen, setEclipseOpen] = useState(false);
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
      <div className={styles.nav}>
        <Link href="/" aria-label="SOLUS, início" className={styles.wordmark} translate="no">
          <LogoMark className={styles.mark} />
          SOLUS
        </Link>

        <nav aria-label="Principal" className={styles.links}>
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.end}>
          <Link href="/entrar" className={`${styles.btn} ${styles.btnOutline} ${styles.hideSmall}`}>
            Entrar
          </Link>
          <Link href="/cadastro" className={`${styles.btn} ${styles.btnSolid}`}>
            Criar conta
          </Link>
          <span className={styles.toggle}>
            <ThemeToggle />
          </span>
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
          </button>
        </div>
      </div>

      <div id="menu-celular" className={styles.mobileMenu} hidden={!open}>
        <nav aria-label="Principal no celular" className={styles.mobileLinks}>
          {[...LINKS, { href: '/entrar', label: 'Entrar' }].map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <button
        type="button"
        className={styles.cloud}
        aria-pressed={eclipseOpen}
        aria-label={eclipseOpen ? 'Fechar o eclipse' : 'Abrir o eclipse'}
        onClick={() => setEclipseOpen((value) => !value)}
      >
        <ParticleEclipse className={styles.canvas} open={eclipseOpen} />
        <span className={styles.cloudHint} aria-hidden="true">
          {eclipseOpen ? 'Clique para fechar' : 'Clique no eclipse'}
        </span>
      </button>

      <div className={styles.main}>
        <h1 className={styles.headline}>
          <span className={styles.line}>Veja onde</span>
          <span className={styles.line}>sua empresa</span>
          <span className={styles.line}>ganha e perde</span>
          <span className={styles.line}>dinheiro.</span>
        </h1>

        <div className={styles.below}>
          <p className={styles.lede}>
            O SOLUS lê as planilhas de vendas e estoque que você já tem e mostra lucro, estoque parado e oportunidades. Cada número vem
            dos seus dados.
          </p>
          <div className={styles.actions}>
            <Link href="/cadastro" className={`${styles.btn} ${styles.btnSolid} ${styles.btnLarge}`}>
              Criar conta grátis
            </Link>
            <Link href="/demo/visao-geral" className={`${styles.btn} ${styles.btnOutline} ${styles.btnLarge}`}>
              Ver a demonstração
            </Link>
          </div>
          <p className={styles.note}>O plano Free não pede cartão. A demonstração usa uma empresa fictícia.</p>
        </div>
      </div>
    </header>
  );
}
