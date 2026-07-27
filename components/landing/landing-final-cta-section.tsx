"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

export function LandingFinalCtaSection() {
  const href = getPublicSignupHref();
  const label = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";

  return (
    <section
      className="lp-section lp-section--final"
      aria-labelledby="final-cta-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-final">
            <h2 id="final-cta-title" className="lp-title lp-final__title">
              Votre prochain devis pourrait être prêt dans quelques minutes.
            </h2>
            <p className="lp-subtitle lp-final__sub">
              Créez vos devis, organisez vos équipes et gardez le contrôle sur
              vos chantiers avec une seule solution conçue pour le BTP.
            </p>
            <div className="lp-final__cta">
              <Link
                href={href}
                className="landing-btn-primary landing-btn-interactive group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold no-underline"
              >
                {label}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/landing#fonctionnalites"
                className="landing-btn-secondary landing-btn-interactive inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold no-underline"
              >
                Découvrir les fonctionnalités
              </Link>
            </div>
            <p className="lp-final__trust">
              Sans engagement · Mise en route rapide
            </p>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
