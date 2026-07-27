"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { LandingHeroVisual } from "@/components/landing/landing-device-scene";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

const BENEFITS = [
  "Devis créés et envoyés plus rapidement",
  "Planning des équipes toujours à jour",
  "Suivi des chantiers en temps réel",
  "Facturation et rentabilité centralisées",
] as const;

export function LandingHero() {
  const signupHref = getPublicSignupHref();
  const primaryLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";

  return (
    <section className="lp-hero" aria-label="Présentation Batimum">
      <div className="lp-container">
        <div className="lp-hero__grid">
          <div>
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Pensé pour les entreprises du bâtiment
            </span>

            <h1 className="lp-title mt-5 text-[2rem] sm:text-4xl lg:text-[2.75rem]">
              La solution tout-en-un pour{" "}
              <span className="lp-title-accent">piloter votre entreprise</span>{" "}
              du BTP.
            </h1>

            <p className="lp-subtitle mt-4 max-w-xl text-base sm:text-lg">
              Créez vos devis en quelques minutes, planifiez vos équipes, suivez
              vos chantiers et gérez votre activité depuis le bureau comme sur le
              terrain.
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

            <p className="lp-hero__reassurance">
              Sans engagement · Mise en route rapide · Données sécurisées
            </p>
          </div>

          <LandingHeroVisual />
        </div>
      </div>
    </section>
  );
}
