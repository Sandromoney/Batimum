"use client";

import type { CSSProperties } from "react";

const HERO_STARS = [
  { x: 14, y: 20, delay: 0.8, duration: 13, tone: "emerald" as const },
  { x: 28, y: 38, delay: 2.2, duration: 15, tone: "white" as const },
  { x: 44, y: 16, delay: 1.4, duration: 12, tone: "white" as const },
  { x: 58, y: 42, delay: 3.6, duration: 17, tone: "emerald" as const },
  { x: 72, y: 24, delay: 0.4, duration: 14, tone: "white" as const },
  { x: 86, y: 36, delay: 2.8, duration: 16, tone: "emerald" as const },
  { x: 20, y: 62, delay: 4.1, duration: 11, tone: "white" as const },
  { x: 50, y: 70, delay: 1.9, duration: 18, tone: "emerald" as const },
  { x: 78, y: 58, delay: 3.1, duration: 13, tone: "white" as const },
  { x: 92, y: 74, delay: 0.2, duration: 15, tone: "emerald" as const },
] as const;

export function LandingHeroAtmosphere() {
  return (
    <div
      className="landing-hero-atmosphere pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      <div className="landing-hero-atmosphere__grid" />
      <div className="landing-hero-atmosphere__glow" />
      <div className="landing-hero-atmosphere__particles">
        {HERO_STARS.map((star, index) => (
          <span
            key={index}
            className={`landing-hero-atmosphere__particle landing-hero-atmosphere__particle--${star.tone}`}
            style={
              {
                "--particle-x": `${star.x}%`,
                "--particle-y": `${star.y}%`,
                "--particle-delay": `${star.delay}s`,
                "--particle-duration": `${star.duration}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
