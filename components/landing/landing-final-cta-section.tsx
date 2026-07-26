"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  LandingLaptop,
  LandingPhone,
} from "@/components/landing/landing-device-frames";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export function LandingFinalCtaSection() {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const signupHref = getPublicSignupHref();
  const primaryLabel = isPrivateBetaEnabled()
    ? "Se connecter à Batimum"
    : "Essayer Batimum gratuitement";

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { threshold: 0.22 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="commencer"
      ref={ref}
      className={cn(
        "landing-final-cta",
        visible && "landing-final-cta--visible",
        reducedMotion && "landing-final-cta--reduced",
      )}
      aria-label="Essayer Batimum"
    >
      <div className="landing-container">
        <header className="landing-final-cta__header">
          <h2 className="landing-final-cta__title">
            Moins d’administratif.{" "}
            <span className="landing-final-cta__mark">Plus de temps</span> pour
            vos chantiers.
          </h2>
          <p className="landing-final-cta__lead">
            Réunissez vos devis, vos clients, vos équipes, vos chantiers et
            votre pilotage dans une seule solution.
          </p>

          <div className="landing-final-cta__actions">
            <Link
              href={signupHref}
              className="landing-btn-primary group landing-final-cta__primary"
            >
              {primaryLabel}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
            <Link
              href="/landing#fonctionnalites"
              className="landing-btn-secondary"
            >
              Voir les fonctionnalités
            </Link>
          </div>

          <p className="landing-final-cta__reassurance">
            Une solution conçue pour les entreprises du BTP.
          </p>
        </header>

        <div className="landing-final-cta__stage" aria-hidden>
          <div className="landing-final-cta__orbit">
            <div className="landing-final-cta__float landing-final-cta__float--devis">
              <span>Devis</span>
              <strong>SDB Dupont</strong>
              <em>8 450 € HT</em>
            </div>

            <div className="landing-final-cta__float landing-final-cta__float--planning">
              <span>Planning</span>
              <strong>Lucas · Mardi</strong>
              <em>08:00 – 17:00</em>
            </div>

            <div className="landing-final-cta__tablet">
              <LandingLaptop size="md" alive={!reducedMotion && visible}>
                <div className="final-dash-ui">
                  <div className="final-dash-ui__top">
                    <strong>Pilotage</strong>
                    <span>Mars</span>
                  </div>
                  <div className="final-dash-ui__hero">
                    <p>Chiffre d’affaires</p>
                    <strong>48 200 €</strong>
                  </div>
                  <div className="final-dash-ui__grid">
                    <div>
                      <p>Encaissé</p>
                      <strong>31 450 €</strong>
                    </div>
                    <div>
                      <p>Marge</p>
                      <strong>24 %</strong>
                    </div>
                    <div>
                      <p>Chantiers</p>
                      <strong>12</strong>
                    </div>
                  </div>
                </div>
              </LandingLaptop>
            </div>

            <div className="landing-final-cta__phone">
              <LandingPhone statusLabel="9:41" alive={!reducedMotion && visible}>
                <div className="final-phone-ui">
                  <p className="final-phone-ui__hello">Bonjour Lucas</p>
                  <div className="final-phone-ui__card">
                    <p>Intervention du jour</p>
                    <strong>Client Dupont</strong>
                    <span>8 h 00 – 17 h 00</span>
                    <em>Rénovation salle de bain</em>
                  </div>
                </div>
              </LandingPhone>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
