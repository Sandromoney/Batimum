"use client";

import { MousePointer2 } from "lucide-react";

/**
 * Curseur film — représente l’utilisateur de façon continue et lisible.
 */
export function FilmCursor({
  visible,
  className,
}: {
  visible: boolean;
  className?: string;
}) {
  if (!visible) return null;
  return (
    <span
      className={["lp-hubFilm__cursor", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <MousePointer2 size={16} strokeWidth={1.7} />
    </span>
  );
}
