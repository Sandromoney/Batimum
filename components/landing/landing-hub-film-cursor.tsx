"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MousePointer2 } from "lucide-react";

/** Pointe active du pictogramme (px depuis le coin haut-gauche de l’icône 18×18). */
const TIP_OFFSET_X = 4;
const TIP_OFFSET_Y = 2;

type Pos = { x: number; y: number };

/**
 * Coordonnées localesa du centre de la cible, dans le référentiel
 * du containing block (padding edge), même si un ancêtre est scale/transformé.
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
 * Curseur film — pointe active sur le centre cliquable réel.
 * Invisible hors action ; première apparition sans vol depuis (0,0).
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

  useLayoutEffect(() => {
    if (!visible || !target) {
      setReady(false);
      if (!target) {
        setPos(null);
        hadPos.current = false;
        setAnimateMove(false);
      }
      return;
    }

    const cursor = cursorRef.current;
    const root =
      (cursor?.offsetParent as HTMLElement | null) ||
      (cursor?.parentElement as HTMLElement | null);
    if (!root) return;

    const apply = () => {
      const next = measureTargetLocal(root, target);
      if (!next) {
        setPos(null);
        setReady(false);
        return;
      }
      if (!hadPos.current) {
        setAnimateMove(false);
        setPos(next);
        hadPos.current = true;
        setReady(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setAnimateMove(true));
        });
      } else {
        setAnimateMove(true);
        setPos(next);
        setReady(true);
      }
    };

    apply();

    const el = root.querySelector(target) as HTMLElement | null;
    const ro = new ResizeObserver(() => apply());
    ro.observe(root);
    if (el) ro.observe(el);
    window.addEventListener("resize", apply);
    const id = window.setInterval(apply, 100);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      window.clearInterval(id);
    };
  }, [visible, target]);

  useEffect(() => {
    if (!visible) {
      const t = window.setTimeout(() => {
        setReady(false);
        hadPos.current = false;
        setAnimateMove(false);
      }, 280);
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
              left: pos.x,
              top: pos.y,
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
