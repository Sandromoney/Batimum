"use client";

import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";

/** Shell haut de page : navigation + hero refondu. */
export function LandingTop() {
  return (
    <div className="landing-top landing-top--ready">
      <LandingHeader />
      <LandingHero />
    </div>
  );
}
