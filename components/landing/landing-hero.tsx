"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { useReducedMotion, useScroll, useSpring } from "framer-motion";
import { LandingDeviceScene } from "@/components/landing/landing-device-scene";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

export function LandingHero() {
  const trackRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const signupHref = getPublicSignupHref();
  const primaryLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 48,
    damping: 28,
    mass: 0.65,
  });

  return (
    <section
      ref={trackRef}
      className="lp-hero"
      aria-label="Présentation Batimum"
    >
      <div className="lp-hero__track">
        <div className="lp-hero__sticky">
          <div className="lp-container lp-hero__inner">
            <div className="lp-hero__copy">
              <p className="lp-hero__eyebrow">Pensé uniquement pour le BTP</p>
              <h1 className="lp-hero__title">
                Toute votre entreprise.
                <span className="lp-hero__title-accent">Enfin synchronisée.</span>
              </h1>
              <p className="lp-hero__subtitle">
                Batimum réunit vos devis, vos équipes, vos chantiers, votre
                facturation et votre rentabilité dans une seule solution.
              </p>
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

            <LandingDeviceScene
              progress={reducedMotion ? undefined : progress}
              reducedMotion={Boolean(reducedMotion)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
