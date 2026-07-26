"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

const points = [
  "Hébergement en Europe",
  "Accès séparés dirigeant / employé",
  "Vous restez propriétaire de vos données",
  "Support en français",
] as const;

/** Trust strip — pas de faux témoignages nominatifs. */
export function LandingTestimonialsSection() {
  const href = getPublicSignupHref();

  return (
    <section id="temoignages" className="landing-section landing-section--muted">
      <div className="landing-container">
        <LandingReveal variant="title">
          <header className="landing-section-header">
            <p className="landing-eyebrow">Confiance</p>
            <h2 className="landing-h2">
              Une solution sérieuse
              <br />
              pour des <span className="landing-mark">entreprises réelles</span>.
            </h2>
            <p className="landing-lead">
              Pensée pour les artisans et dirigeants du BTP qui veulent avancer
              sans se noyer dans l’outil.
            </p>
          </header>
        </LandingReveal>

        <LandingReveal delay={60}>
          <ul className="landing-trust-grid">
            {points.map((point) => (
              <li key={point} className="landing-trust-item">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </LandingReveal>

        <LandingReveal delay={120} className="mt-10 flex justify-center">
          <Link href={href} className="landing-btn-primary group">
            {isPrivateBetaEnabled() ? "Se connecter" : "Commencer l’essai"}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </LandingReveal>
      </div>
    </section>
  );
}
