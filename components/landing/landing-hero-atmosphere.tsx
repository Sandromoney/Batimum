"use client";

import type { CSSProperties } from "react";

export function LandingHeroAtmosphere() {
  return (
    <div className="landing-hero-atmosphere pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="landing-hero-atmosphere__grid" />
      <div className="landing-hero-atmosphere__glow" />
      <div className="landing-hero-atmosphere__particles">
        {Array.from({ length: 18 }, (_, index) => (
          <span
            key={index}
            className="landing-hero-atmosphere__particle"
            style={
              {
                "--particle-x": `${8 + ((index * 17) % 84)}%`,
                "--particle-y": `${12 + ((index * 23) % 76)}%`,
                "--particle-delay": `${index * 0.65}s`,
                "--particle-duration": `${14 + (index % 5) * 2}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
