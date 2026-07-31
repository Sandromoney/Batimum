"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MousePointer2 } from "lucide-react";

/**
 * Pointe active du pictogramme Lucide MousePointer2 (viewBox 24×24),
 * ramenée à une icône 18×18 : tip ≈ (8, 4) en unités 24 → (6, 3) en 18.
 */
const TIP_OFFSET_X = 6;
const TIP_OFFSET_Y = 3;

/** Approche depuis un point logique (bas-droite) avant de verrouiller la cible. */
const APPROACH_DX = 36;
const APPROACH_DY = 28;

type Pos = { x: number; y: number };

/**
 * Centre cliquable réel de la cible, dans le référentiel local du root
 * (padding edge), même si un ancêtre est scale/transformé.
 */
function measureTargetLocal(
  root: HTMLElement,
  selector: string,
): Pos | null {
  const el = root.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const rootRect = root.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;

  const scaleX =
    root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1;
  const scaleY =
    root.offsetHeight > 0 ? rootRect.height / root.offsetHeight : 1;

  const originX = rootRect.left + root.clientLeft * scaleX;
  const originY = rootRect.top + root.clientTop * scaleY;
  const cx = (rect.left + rect.width / 2 - originX) / (scaleX || 1);
  const cy = (rect.top + rect.height / 2 - originY) / (scaleY || 1);

  return {
    x: cx - TIP_OFFSET_X,
    y: cy - TIP_OFFSET_Y,
  };
}

/**
 * Curseur film — pointe exacte sur le centre cliquable.
 * Visible uniquement pendant une action ; disparaît ensuite.
 */
export function FilmCursor({
  visible,
  target,
  clicking = false,
  className,
}: {
  visible: boolean;
  target: string | null;
  clicking?: boolean;
  className?: string;
}) {
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [ready, setReady] = useState(false);
  const [animateMove, setAnimateMove] = useState(false);
  const hadPos = useRef(false);
  const lastTarget = useRef<string | null>(null);
  const approaching = useRef(false);

  useLayoutEffect(() => {
    if (!visible || !target) {
      setReady(false);
      if (!target) {
        setPos(null);
        hadPos.current = false;
        setAnimateMove(false);
        lastTarget.current = null;
        approaching.current = false;
      }
      return;
    }

    const cursor = cursorRef.current;
    const root =
      (cursor?.offsetParent as HTMLElement | null) ||
      (cursor?.parentElement as HTMLElement | null);
    if (!root) return;

    let frames = 0;
    let raf = 0;
    const targetChanged = lastTarget.current !== target;
    if (targetChanged) {
      hadPos.current = false;
      approaching.current = false;
      lastTarget.current = target;
    }

    const apply = () => {
      const next = measureTargetLocal(root, target);
      if (!next) {
        setPos(null);
        setReady(false);
        return;
      }
      if (!hadPos.current) {
        // Snap hors cible, puis glisse jusqu’à la pointe active.
        approaching.current = true;
        setAnimateMove(false);
        setPos({
          x: next.x + APPROACH_DX,
          y: next.y + APPROACH_DY,
        });
        hadPos.current = true;
        setReady(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimateMove(true);
            setPos(next);
            approaching.current = false;
          });
        });
        return;
      }
      if (approaching.current) return;
      setAnimateMove(true);
      setPos(next);
      setReady(true);
    };

    const tick = () => {
      frames += 1;
      // Recalcule dense au démarrage (layout film), puis plus rare.
      if (frames <= 12 || frames % 3 === 0) apply();
      raf = requestAnimationFrame(tick);
    };

    apply();
    raf = requestAnimationFrame(tick);

    const el = root.querySelector(target) as HTMLElement | null;
    const ro = new ResizeObserver(() => apply());
    ro.observe(root);
    if (el) ro.observe(el);
    window.addEventListener("resize", apply);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [visible, target]);

  useEffect(() => {
    if (!visible) {
      const t = window.setTimeout(() => {
        setReady(false);
        hadPos.current = false;
        setAnimateMove(false);
        setPos(null);
        lastTarget.current = null;
      }, 220);
      return () => window.clearTimeout(t);
    }
  }, [visible]);

  const on = Boolean(visible && target && ready && pos);

  return (
    <span
      ref={cursorRef}
      className={[
        "lp-hubFilm__cursor",
        on ? "is-on" : "is-off",
        animateMove ? "is-animated" : "is-snap",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        pos
          ? {
              transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
            }
          : undefined
      }
      aria-hidden="true"
    >
      <span
        className={[
          "lp-hubFilm__cursorGlyph",
          clicking ? "is-click" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <MousePointer2 size={18} strokeWidth={1.7} />
      </span>
    </span>
  );
}
