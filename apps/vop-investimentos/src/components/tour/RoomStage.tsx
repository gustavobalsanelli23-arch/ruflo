import { m, type MotionValue } from 'framer-motion';
import { useState } from 'react';
import type { Room } from '../../data/properties';
import { EASE_CINEMA, EASE_OUT, SETTLE } from '../../lib/motion';
import { hotspotOnScreen, stageBox } from '../../lib/stage';
import { meta, Picture } from '../Picture';

/**
 * Passos de câmera entre ambientes. Para a frente, tudo cresce: o ambiente
 * atual passa "através" da tela (escala 1 → 1.4) e o próximo se aproxima
 * (0.9 → 1) — como atravessar uma porta. Para trás, o contrário.
 */
export const walk = {
  enter: ({ dir, reduce }: { dir: number; reduce: boolean }) =>
    reduce ? { opacity: 0, zIndex: 1 } : { opacity: 0, scale: dir > 0 ? 0.9 : 1.25, filter: 'blur(14px)', zIndex: 1 },
  center: ({ reduce }: { dir: number; reduce: boolean }) => ({
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    zIndex: 1,
    transition: { duration: reduce ? 0.3 : 1.35, ease: EASE_CINEMA },
    ...SETTLE,
  }),
  exit: ({ dir, reduce }: { dir: number; reduce: boolean }) =>
    reduce
      ? { opacity: 0, zIndex: 2, transition: { duration: 0.3 } }
      : { opacity: 0, scale: dir > 0 ? 1.4 : 0.85, filter: 'blur(10px)', zIndex: 2, transition: { duration: 1.05, ease: EASE_CINEMA } },
};

interface RoomStageProps {
  room: Room;
  custom: { dir: number; reduce: boolean };
  viewport: { width: number; height: number };
  /** Deslocamento de "olhar ao redor" (segue o ponteiro), em px. */
  lookX: MotionValue<number>;
  lookY: MotionValue<number>;
  /** Carrega com prioridade (primeiro ambiente). */
  priority?: boolean;
}

export function RoomStage({ room, custom, viewport, lookX, lookY, priority }: RoomStageProps) {
  const info = meta(room.photo);
  const box = stageBox(info?.width ?? 3, info?.height ?? 2, viewport.width, viewport.height, room.photo.focus);
  const reduce = custom.reduce;

  return (
    <m.div className="absolute inset-0" custom={custom} variants={walk} initial="enter" animate="center" exit="exit">
      {box.mode === 'contain' && (
        <Picture
          slot={room.photo}
          alt=""
          sizes="40vw"
          className="absolute inset-0 block scale-110 opacity-45 blur-[44px]"
          imgClassName="size-full object-cover"
        />
      )}
      {/* Respiro lento (CSS) e olhar ao redor (ponteiro) em camadas separadas. */}
      <div className={['absolute inset-0', reduce ? '' : 'tour-push'].join(' ')}>
        <m.div className="absolute inset-0" style={box.mode === 'cover' && !reduce ? { x: lookX, y: lookY, scale: 1.06 } : undefined}>
          <div className="absolute" style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
            <Picture
              slot={room.photo}
              sizes={box.mode === 'contain' ? `${Math.round((box.width / viewport.width) * 100)}vw` : '100vw'}
              priority={priority}
              className={['block size-full', box.mode === 'contain' ? 'overflow-hidden rounded-[4px] shadow-[0_40px_120px_rgb(0_0_0/0.55)]' : ''].join(' ')}
              imgClassName="size-full object-cover"
            />
            {room.hotspots?.map((h, i) => {
              const at = hotspotOnScreen(box, h.x, h.y, viewport.width, viewport.height);
              if (!at.visible) return null;
              return <Hotspot key={h.label} x={h.x} y={h.y} label={h.label} order={i} rightSide={at.left > viewport.width * 0.62} />;
            })}
          </div>
        </m.div>
      </div>
    </m.div>
  );
}

function Hotspot({ x, y, label, order, rightSide }: { x: number; y: number; label: string; order: number; rightSide: boolean }) {
  // No toque, o rótulo abre e fecha com um toque; com mouse e na tela larga, fica à vista.
  const [open, setOpen] = useState(false);
  return (
    <m.div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: 1 + order * 0.18 }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={['group/hs relative flex -translate-x-1/2 -translate-y-1/2 items-center gap-3', rightSide ? 'flex-row-reverse' : ''].join(' ')}
      >
        <span className="relative flex size-7 items-center justify-center">
          <span aria-hidden="true" className="hotspot-ring absolute inset-0 rounded-full border border-champagne/80" />
          <span aria-hidden="true" className="liquid-glass glass-veil absolute inset-0 rounded-full" />
          <span aria-hidden="true" className="relative size-2 rounded-full bg-champagne" />
        </span>
        <span
          className={[
            'liquid-glass-strong glass-veil whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.8125rem] text-linen transition-all duration-500',
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
