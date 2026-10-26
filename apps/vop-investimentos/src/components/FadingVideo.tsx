import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { REDUCED_MOTION, useMediaQuery } from '../hooks/useMediaQuery';

const FADE_IN_MS = 500;
const FADE_OUT_MS = 550;
/** Quanto antes do fim o fade-out começa (s). */
const FADE_OUT_LEAD = 0.55;

export interface FadingVideoProps {
  /** Um vídeo (repete) ou uma sequência (avança e volta ao primeiro). */
  src: string | readonly string[];
  className?: string;
  style?: CSSProperties;
  /** Só começa a baixar quando o vídeo chega perto da tela. */
  lazy?: boolean;
  /** Pausa pedida de fora (botão de pausa do hero, por exemplo). */
  paused?: boolean;
  /** Avisado quando o clipe da sequência muda (índice em `src`). */
  onIndexChange?: (index: number) => void;
  /** Avisado durante a reprodução: fração do clipe atual (0–1). */
  onProgress?: (fraction: number) => void;
  /** Avisado quando um clipe tem o primeiro quadro pronto (início do fade-in). */
  onReady?: (index: number) => void;
  /** Avisado quando nenhum vídeo pode tocar (erro em todas as fontes). */
  onUnavailable?: () => void;
}

function saveData(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(conn?.saveData);
}

/**
 * Vídeo de fundo com entradas e saídas em fade:
 *  1. começa invisível (opacidade 0);
 *  2. `loadeddata` → fade-in de 500ms;
 *  3. `timeupdate` a 0,55s do fim → fade-out de 550ms (uma vez por ciclo);
 *  4. `ended` → reinicia (uma fonte) ou avança para a próxima (lista) e o
 *     fade-in acontece de novo.
 * É decorativo (aria-hidden): o conteúdo equivalente está no pôster e no
 * texto da seção. Com "reduzir movimento" ou economia de dados, não carrega
 * nada e o pôster (renderizado por quem usa o componente, por baixo) fica.
 * Fora da tela ou com a aba escondida, pausa.
 */
export function FadingVideo({ src, className, style, lazy = false, paused = false, onIndexChange, onProgress, onReady, onUnavailable }: FadingVideoProps) {
  const sources = useMemo(() => (typeof src === 'string' ? [src] : [...src]), [src]);
  const key = sources.join('|');
  const reduce = useMediaQuery(REDUCED_MOTION, false);
  const [mounted, setMounted] = useState(false);
  const [near, setNear] = useState(!lazy);
  const [visible, setVisible] = useState(true);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onIndexChange, onProgress, onReady, onUnavailable });
  callbacks.current = { onIndexChange, onProgress, onReady, onUnavailable };
  const pausedRef = useRef(paused);
  pausedRef.current = paused || !visible;

  // O vídeo só existe no navegador: o HTML pré-renderizado traz o pôster.
  useEffect(() => {
    setMounted(true);
    setFailed(false);
  }, [key]);

  const enabled = mounted && !reduce && !failed && !saveData();

  // Carregamento preguiçoso e pausa fora da tela.
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
        setVisible(entry.isIntersecting);
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  // Ciclo de fade e troca de fonte.
  useEffect(() => {
    const video = ref.current;
    if (!enabled || !near || !video) return;

    let index = 0;
    let fadingOut = false;
    /** Trocando de fonte: ignora timeupdate/ended residuais da anterior. */
    let switching = false;
    let errors = 0;
    let alive = true;

    const fade = (to: 0 | 1, ms: number) => {
      video.style.transition = `opacity ${ms}ms ease`;
      video.style.opacity = String(to);
    };
    const play = () => {
      if (pausedRef.current) return;
      const attempt = video.play();
      // Autoplay bloqueado (modo de economia, política do navegador): o
      // primeiro quadro fica parado, que tem o mesmo efeito do pôster.
      attempt?.catch(() => {});
    };
    const load = (i: number) => {
      index = i;
      fadingOut = false;
      switching = true;
      video.style.transition = 'none';
      video.style.opacity = '0';
      video.src = sources[i];
      video.load();
      callbacks.current.onIndexChange?.(i);
      callbacks.current.onProgress?.(0);
    };

    const onLoadedData = () => {
      if (!alive) return;
      switching = false;
      errors = 0;
      fade(1, FADE_IN_MS);
      callbacks.current.onReady?.(index);
      play();
    };
    const onTimeUpdate = () => {
      if (switching || !video.duration) return;
      callbacks.current.onProgress?.(Math.min(1, video.currentTime / video.duration));
      if (!fadingOut && video.duration - video.currentTime <= FADE_OUT_LEAD) {
        fadingOut = true;
        fade(0, FADE_OUT_MS);
      }
    };
    const onEnded = () => {
      if (switching) return;
      if (sources.length === 1) {
        fadingOut = false;
        video.currentTime = 0;
        callbacks.current.onProgress?.(0);
        play();
        fade(1, FADE_IN_MS);
        return;
      }
      load((index + 1) % sources.length);
    };
    const onError = () => {
      if (!alive) return;
      errors += 1;
      if (errors >= sources.length) {
        video.removeAttribute('src');
        video.load();
        setFailed(true);
        callbacks.current.onUnavailable?.();
        return;
      }
      load((index + 1) % sources.length);
    };

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    load(0);

    return () => {
      alive = false;
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.pause();
    };
    // `sources` muda junto com `key`.
  }, [enabled, near, key]);

  // Pausa/retoma: botão do usuário, saída da tela e aba escondida.
  useEffect(() => {
    const video = ref.current;
    if (!enabled || !video) return;
    const sync = () => {
      const stop = paused || !visible || document.hidden;
      if (stop) video.pause();
      else if (video.readyState >= 2) video.play()?.catch(() => {});
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [enabled, paused, visible]);

  if (!enabled) return null;
  return (
    <video
      ref={ref}
      className={className}
      style={{ opacity: 0, ...style }}
      autoPlay
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
