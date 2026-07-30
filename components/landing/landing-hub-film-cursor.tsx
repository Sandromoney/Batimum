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
 * Curseur film — positionné sur le centre cliquable réel de la cible.
 * Invisible tant qu’aucune cible n’est fournie.
 */
export function FilmCursor({
  visible,
  target,
  clicking = false,
  className,
}: {
  /** Afficher le curseur (fondu). */
  visible: boolean;
  /**
   * Sélecteur CSS de la cible dans le conteneur parent `position: relative`.
   * Ex. `[data-cursor-target="mic"]`. Null = curseur masqué.
   */
  target: string | null;
  clicking?: boolean;
  className?: string;
}) {
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [ready, setReady] = useState(false);
  const lastTarget = useRef<string | null>(null);

  const measure = () => {
    const cursor = cursorRef.current;
    if (!cursor || !target) {
      setPos(null);
      setReady(false);
      return;
    }
    const root = cursor.offsetParent as HTMLElement | null;
    if (!root) return;
    const el = root.querySelector(target) as HTMLElement | null;
    if (!el) {
      setPos(null);
      setReady(false);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      setPos(null);
      setReady(false);
      return;
    }
    const cx = rect.left + rect.width / 2 - rootRect.left;
    const cy = rect.top + rect.height / 2 - rootRect.top;
    setPos({
      x: cx - TIP_OFFSET_X,
      y: cy - TIP_OFFSET_Y,
    });
    setReady(true);
  };

  useLayoutEffect(() => {
    if (!visible || !target) {
      setReady(false);
      if (!target) setPos(null);
      return;
    }
    // Nouveau trajet : partir de la position actuelle puis animer
    if (lastTarget.current !== target) {
      lastTarget.current = target;
    }
    measure();
    const cursor = cursorRef.current;
    const root = cursor?.offsetParent as HTMLElement | null;
    const el = root?.querySelector(target) as HTMLElement | null;

    const ro = new ResizeObserver(() => measure());
    if (root) ro.observe(root);
    if (el) ro.observe(el);
    window.addEventListener("resize", measure);
    const id = window.setInterval(measure, 120);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, target]);

  useEffect(() => {
    if (!visible) {
      const t = window.setTimeout(() => setReady(false), 280);
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
        clicking ? "is-click" : "",
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
      <MousePointer2 size={18} strokeWidth={1.7} />
    </span>
  );
}
