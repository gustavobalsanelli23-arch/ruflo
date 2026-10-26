import { m, type MotionValue } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Room } from '../../data/properties';
import { EASE_OUT } from '../../lib/motion';
import { cameraAt, depthLook, laneSpread, panelSize, PERSPECTIVE, roomPose, SPACING } from '../../lib/stage';
import { drawFloor } from './floor';
import { DecodeText } from '../Decode';
import { meta, Picture } from '../Picture';

const pad = (n: number) => String(n).padStart(2, '0');
/** Ponto de fuga do palco (altura, fração da tela): o mesmo do CSS (.t3-world). */
const ORIGIN_Y = 0.46;

interface CorridorProps {
  rooms: readonly Room[];
  /** Posição da câmera (0 = 1º ambiente); animada pelo percurso. */
  cam: MotionValue<number>;
  /** Ambiente atual: só ele mostra os pontos de interesse. */
  current: number;
  hotspots: boolean;
  viewport: { width: number; height: number };
  reduce: boolean;
}

/**
 * O imóvel em 3D: os ambientes são painéis suspensos num corredor em
 * perspectiva, com piso quadriculado, reflexo e névoa na distância. A cada
 * quadro a câmera é recomposta: avanço (cam), giro para encarar o painel,
 * uma órbita lenta contínua e o olhar que segue o ponteiro. Dentro do painel
 * atual, moldura, rótulo e pontos de interesse flutuam em camadas à frente
 * da foto — eles se deslocam entre si quando a câmera gira.
 */
export function Corridor({ rooms, cam, current, hotspots, viewport, reduce }: CorridorProps) {
  const world = useRef<HTMLDivElement>(null);
  const floor = useRef<HTMLCanvasElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const fogs = useRef<(HTMLDivElement | null)[]>([]);
  const spread = laneSpread(viewport.width);
  const sizes = rooms.map((r) => {
    const info = meta(r.photo);
    return panelSize(info?.width ?? 3, info?.height ?? 2, viewport.width, viewport.height);
  });
  const floorY = Math.round(Math.max(...sizes.map((s) => s.height)) / 2 + 44);

  useEffect(() => {
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let px = 0;
    let py = 0;
    const t0 = performance.now();
    const canvas = floor.current;
    const ctx = canvas?.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const fit = () => {
      if (!canvas || !ctx) return;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener('resize', fit);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const frame = (now: number) => {
      px += (tx - px) * 0.045;
      py += (ty - py) * 0.045;
      const c = cam.get();
      const at = cameraAt(c, rooms.length, spread);
      const t = (now - t0) / 1000;
      // Órbita lenta (a câmera "respira") e olhar ao redor com o ponteiro.
      const ox = reduce ? 0 : Math.sin(t * 0.21) * 2.6 + px * 7;
      const oy = reduce ? 0 : Math.sin(t * 0.16 + 1.3) * 1.2 - py * 3.4;
      if (world.current) {
        world.current.style.transform = `rotateX(${oy.toFixed(3)}deg) rotateY(${(ox - at.yaw).toFixed(3)}deg) translate3d(${(-at.x).toFixed(1)}px, 0, ${at.z.toFixed(1)}px)`;
      }
      if (ctx) {
        const h = window.innerHeight;
        drawFloor(ctx, window.innerWidth, h, h * ORIGIN_Y, floorY, { x: at.x, z: at.z, turn: ox - at.yaw, pitch: oy });
      }
      for (let i = 0; i < rooms.length; i++) {
        const look = depthLook(i, c);
        const el = panels.current[i];
        if (el) {
          el.style.opacity = look.opacity.toFixed(3);
          el.style.visibility = look.hidden ? 'hidden' : '';
        }
        const fog = fogs.current[i];
        if (fog) fog.style.opacity = look.fog.toFixed(3);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', fit);
    };
  }, [cam, rooms.length, spread, floorY, reduce]);

  return (
    <div className="t3-stage" style={{ perspective: `${PERSPECTIVE}px` }} aria-hidden={!hotspots || undefined}>
      <canvas ref={floor} className="t3-floor" />
      <div ref={world} className="t3-world">
        <div className="t3-glow" style={{ transform: `translate3d(0, 0, ${-(rooms.length + 1) * SPACING}px) scale(4)` }} />
        {rooms.map((room, i) => {
          const pose = roomPose(i, spread);
          const size = sizes[i];
          const here = i === current;
          return (
            <div
              key={`${i}-${room.photo.id}`}
              ref={(el) => {
                panels.current[i] = el;
              }}
              className="t3-panel"
              style={{
                width: size.width,
                height: size.height,
                marginLeft: -size.width / 2,
                marginTop: -size.height / 2,
                transform: `translate3d(${pose.x}px, 0, ${pose.z}px) rotateY(${pose.yaw}deg)`,
              }}
            >
              <div className="t3-photo">
                <Picture
                  slot={room.photo}
                  alt={here ? room.photo.alt : ''}
                  sizes={`${Math.round((size.width / viewport.width) * 100)}vw`}
                  priority={i <= 1}
                  className="cut-frame block size-full"
                  imgClassName="size-full object-cover"
                />
                <div
                  ref={(el) => {
                    fogs.current[i] = el;
                  }}
                  className="t3-fog cut-frame"
                />
              </div>
              <span className="t3-edge" />
              <span className="t3-tag lbl">
                <DecodeText text={`${pad(i + 1)} · ${room.name.toUpperCase()}`} onMount={false} />
              </span>
              {here && hotspots && room.hotspots && (
                <div className="t3-spots">
                  {room.hotspots.map((h, k) => (
                    <Hotspot key={h.label} x={h.x} y={h.y} label={h.label} order={k} rightSide={h.x > 62} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Hotspot({ x, y, label, order, rightSide }: { x: number; y: number; label: string; order: number; rightSide: boolean }) {
  // No toque, o rótulo abre e fecha com um toque; com mouse e na tela larga, fica à vista.
  const [open, setOpen] = useState(false);
  return (
    <m.div
      className="t3-spot"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.9 + order * 0.18 }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={['group/hs relative flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5', rightSide ? 'flex-row-reverse' : ''].join(' ')}
      >
        <span className="relative flex size-6 items-center justify-center">
          <span aria-hidden="true" className="hotspot-ring absolute inset-0 border border-champagne/80" />
          <span aria-hidden="true" className="absolute inset-[3px] bg-night/60" />
          <span aria-hidden="true" className="relative size-1.5 bg-champagne" />
        </span>
        <span
          className={[
            't3-spot-label lbl transition-opacity duration-500',
            open ? 'opacity-100' : 'pointer-events-none opacity-0 md:opacity-100',
            'group-hover/hs:opacity-100 group-focus-visible/hs:opacity-100',
          ].join(' ')}
        >
          {label}
        </span>
      </button>
    </m.div>
  );
}
