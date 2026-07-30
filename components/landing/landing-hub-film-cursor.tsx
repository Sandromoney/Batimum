"use client";

import { MousePointer2 } from "lucide-react";

/**
 * Curseur film — toujours monté pendant la démo pour animer le trajet
 * (évite le téléport à l’apparition).
 */
export function FilmCursor({
  visible,
  className,
  clicking = false,
}: {
  visible: boolean;
  className?: string;
  clicking?: boolean;
}) {
  return (
    <span
      className={[
        "lp-hubFilm__cursor",
        visible ? "is-on" : "is-off",
        clicking ? "is-click" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <MousePointer2 size={16} strokeWidth={1.7} />
    </span>
  );
}
