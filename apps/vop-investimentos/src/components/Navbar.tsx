import { useCallback, useEffect, useRef, useState } from 'react';
import { business, resolveChannel } from '../config/site';
import { nav } from '../data/content';
import { DecodeText } from './Decode';
import { DotsIcon, PixelIcon } from './StratumIcons';
import { VopSymbol, VopWordmark } from './VopMark';

/** Evento que abre o percurso do primeiro imóvel (ouvido em PropertiesSection). */
export const ENTER_EVENT = 'vop:entrar';

/** Seção visível no meio da tela (para marcar o link ativo). */
function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const sections = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
          else setActive((a) => (a === e.target.id ? null : a));
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const ids = nav.map((n) => n.id);

/**
 * Cabeçalho fixo na estética de referência: marca à esquerda, alinhada à
 * moldura do hero; à direita os links, o pill de vidro ENTRAR (abre o
 * percurso 3D do primeiro imóvel) e o pill creme de contato. Abaixo de
 * 1040px os três viram um painel aberto pelo pill MENU. Fora do hero, uma
 * faixa escura com fio embaixo mantém a leitura sobre as seções.
 */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(ids);
  const channel = resolveChannel();
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById('inicio');
      const limit = (hero?.offsetHeight ?? window.innerHeight) - (header.current?.offsetHeight ?? 0);
      setScrolled(window.scrollY > Math.max(24, limit));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Painel aberto: Esc fecha (e devolve o foco ao MENU); clique fora também.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  // Volta à barra larga (rotação do tablet, por exemplo): o painel some.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1041px)');
    const onChange = () => mql.matches && setOpen(false);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const enter = () => {
    close();
    window.dispatchEvent(new CustomEvent(ENTER_EVENT));
  };

  return (
    <header ref={header} className={['st-header', scrolled && 'scrolled', open && 'nav-open'].filter(Boolean).join(' ')}>
      <div className="st-header-band" aria-hidden="true" />

      <a href="#inicio" className="st-logo" aria-label={`${business.fullName}, voltar ao início`}>
        <span className="st-logo-clip">
          <VopSymbol className="st-logo-symbol" />
        </span>
        <span className="st-logo-clip">
          <VopWordmark className="st-logo-word" />
        </span>
        <span className="st-logo-clip" aria-hidden="true">
          <span className="st-logo-sub">
            Investimentos
            <br />
            Imobiliários
          </span>
        </span>
      </a>

      <nav className="st-masthead" aria-label="Principal">
        <div className="navset" id="nav-painel">
          <div className="links lbl">
            {nav.map((item, i) => (
              <a key={item.id} href={`#${item.id}`} aria-current={active === item.id ? 'location' : undefined} onClick={close}>
                <DecodeText text={item.label.toUpperCase()} delay={340 + i * 30} />
              </a>
            ))}
          </div>
          <button type="button" className="pill enter lbl" onClick={enter} aria-label="Entrar: percorrer um imóvel em 3D">
            <PixelIcon />
            <DecodeText text="ENTRAR" delay={300} />
          </button>
          <a href={channel.href} target="_blank" rel="noopener noreferrer" className="pill menu menu-contact lbl" onClick={close}>
            <DotsIcon />
            <DecodeText text="FALE COM UM ESPECIALISTA" delay={360} />
          </a>
        </div>
        <button
          ref={toggle}
          type="button"
          className="pill menu menu-toggle lbl"
          aria-expanded={open}
          aria-controls="nav-painel"
          onClick={() => setOpen((v) => !v)}
        >
          <DotsIcon />
          <DecodeText text={open ? 'FECHAR' : 'MENU'} delay={360} />
        </button>
      </nav>
    </header>
  );
}
