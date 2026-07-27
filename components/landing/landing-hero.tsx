"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Check } from "lucide-react";
import { LandingHeroOrbit } from "@/components/landing/landing-hero-orbit";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

const BENEFITS = [
  "Devis IA en quelques minutes",
  "Planning toujours synchronisé",
  "Rentabilité visible instantanément",
] as const;

export function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const signupHref = getPublicSignupHref();
  const primaryLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";

  return (
    <section
      ref={sectionRef}
      className="lp-hero"
      aria-label="Présentation Batimum"
    >
      <div className="lp-hero__container">
        <div className="lp-hero__grid">
          <div className="lp-hero__copy">
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Pensé uniquement pour les entreprises du BTP
            </span>

            <h1 className="lp-hero__title">
              Votre entreprise du BTP.
              <span className="lp-hero__title-accent">Enfin sous contrôle.</span>
            </h1>

            <p className="lp-hero__subtitle">
              Batimum centralise vos devis, vos équipes, vos chantiers, vos
              factures et votre rentabilité dans une seule plateforme simple et
              intelligente.
            </p>

            <ul className="lp-hero__benefits">
              {BENEFITS.map((item) => (
                <li key={item} className="lp-hero__benefit">
                  <Check
                    className="lp-check mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="lp-hero__ctas">
              <Link
                href={signupHref}
                className="landing-btn-primary landing-btn-interactive group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold no-underline"
              >
                {primaryLabel}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/landing#fonctionnalites"
                className="landing-btn-secondary landing-btn-interactive inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold no-underline"
              >
                Découvrir Batimum
              </Link>
            </div>
          </div>

          <div className="lp-hero__visual">
            <LandingHeroOrbit sectionRef={sectionRef} />
          </div>
        </div>
      </div>
    </section>
  );
}
