"use client";

import type { CSSProperties } from "react";

/** Positions déterministes — scintillement léger, réparti sur toute la page. */
const PAGE_STARS = [
  { x: 8, y: 12, delay: 0, duration: 11, tone: "emerald" as const },
  { x: 22, y: 28, delay: 2.4, duration: 14, tone: "white" as const },
  { x: 38, y: 8, delay: 1.1, duration: 12, tone: "emerald" as const },
  { x: 54, y: 22, delay: 3.8, duration: 16, tone: "white" as const },
  { x: 71, y: 14, delay: 0.6, duration: 13, tone: "emerald" as const },
  { x: 88, y: 32, delay: 4.2, duration: 15, tone: "white" as const },
  { x: 15, y: 52, delay: 2.9, duration: 17, tone: "white" as const },
  { x: 33, y: 68, delay: 1.7, duration: 11, tone: "emerald" as const },
  { x: 48, y: 48, delay: 5.1, duration: 14, tone: "white" as const },
  { x: 62, y: 72, delay: 0.3, duration: 18, tone: "emerald" as const },
  { x: 79, y: 58, delay: 3.2, duration: 12, tone: "white" as const },
  { x: 92, y: 78, delay: 1.9, duration: 16, tone: "emerald" as const },
  { x: 26, y: 88, delay: 4.6, duration: 13, tone: "white" as const },
  { x: 56, y: 92, delay: 2.2, duration: 15, tone: "emerald" as const },
] as const;

export function LandingPageAtmosphere() {
  return (
    <div
      className="landing-page-atmosphere pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="landing-page-atmosphere__veil" />
      {PAGE_STARS.map((star, index) => (
        <span
          key={index}
          className={`landing-page-atmosphere__star landing-page-atmosphere__star--${star.tone}`}
          style={
            {
              "--star-x": `${star.x}%`,
              "--star-y": `${star.y}%`,
              "--star-delay": `${star.delay}s`,
              "--star-duration": `${star.duration}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
