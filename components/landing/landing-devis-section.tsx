"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Check } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

const BENEFITS = [
  "Moins de saisie",
  "Devis mieux structurés",
  "Vocabulaire adapté au BTP",
  "Création plus rapide",
  "Modification possible avant l’envoi",
] as const;

const LOTS = [
  "Lot plomberie",
  "Lot carrelage",
  "Lot électricité",
  "Lot peinture",
] as const;

const PRESTATIONS = [
  "Fourniture et pose",
  "Dépose existant",
  "Mise en conformité",
] as const;

type DemoStep = "demande" | "analyse" | "lots" | "prestations" | "pret";

const STEP_ORDER: DemoStep[] = [
  "demande",
  "analyse",
  "lots",
  "prestations",
  "pret",
];

export function LandingDevisSection() {
  const reduced = usePrefersReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEP_ORDER[stepIndex] ?? "demande";
  const signupHref = getPublicSignupHref();
  const ctaLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";

  useEffect(() => {
    if (reduced) {
      setStepIndex(STEP_ORDER.length - 1);
      return;
    }
    const id = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % STEP_ORDER.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <section
      id="devis-ia"
      className="lp-section lp-section--soft"
      aria-labelledby="devis-title"
    >
      <div className="lp-container">
        <div className="lp-split">
          <LandingReveal>
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              MUM IA
            </span>
            <h2 id="devis-title" className="lp-title mt-5">
              Passez de la demande client au devis en quelques minutes.
            </h2>
            <p className="lp-subtitle mt-5 max-w-xl">
              Décrivez les travaux à réaliser. MUM IA vous aide à organiser les
              lots, détailler les prestations et préparer un devis professionnel
              que vous pouvez vérifier avant l’envoi.
            </p>
            <ul className="lp-benefit-list">
              {BENEFITS.map((item) => (
                <li key={item} className="lp-benefit-item">
                  <Check
                    className="lp-check mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                href={signupHref}
                className="landing-btn-primary landing-btn-interactive group inline-flex items-center justify-center gap-2 no-underline"
              >
                {ctaLabel}
                <ArrowRight
                  className="landing-btn-arrow h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </LandingReveal>

          <LandingReveal delay={120} direction="right">
            <div className="lp-devis-demo" aria-live="polite">
              <div className="lp-devis-demo__head">
                <Bot size={16} strokeWidth={1.75} aria-hidden />
                <span>MUM IA · préparation du devis</span>
              </div>

              <div
                className={`lp-devis-demo__block${step === "demande" || stepIndex >= 0 ? " is-on" : ""}`}
              >
                <p className="lp-devis-demo__label">Demande client</p>
                <p className="lp-devis-demo__body">
                  Rénovation d’une salle de bain de 6 m²
                </p>
              </div>

              <div
                className={`lp-devis-demo__block${stepIndex >= 1 ? " is-on" : ""}`}
              >
                <p className="lp-devis-demo__label">Analyse</p>
                <p className="lp-devis-demo__body">
                  MUM IA structure les lots et les prestations.
                </p>
              </div>

              <div
                className={`lp-devis-demo__block${stepIndex >= 2 ? " is-on" : ""}`}
              >
                <p className="lp-devis-demo__label">Lots</p>
                <ul className="lp-devis-demo__lots">
                  {LOTS.map((lot, i) => (
                    <li
                      key={lot}
                      className={stepIndex >= 2 && (reduced || i <= stepIndex) ? "is-on" : undefined}
                      style={{ transitionDelay: `${i * 80}ms` }}
                    >
                      {lot}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className={`lp-devis-demo__block${stepIndex >= 3 ? " is-on" : ""}`}
              >
                <p className="lp-devis-demo__label">Prestations</p>
                <ul className="lp-devis-demo__lots lp-devis-demo__lots--soft">
                  {PRESTATIONS.map((item) => (
                    <li key={item} className={stepIndex >= 3 ? "is-on" : undefined}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className={`lp-devis-demo__ready${stepIndex >= 4 ? " is-on" : ""}`}
              >
                <Check size={16} strokeWidth={2} aria-hidden />
                Devis prêt à être vérifié
              </div>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
