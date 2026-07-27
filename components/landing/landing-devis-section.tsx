"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

const BENEFITS = [
  "Moins de saisie",
  "Devis mieux structurés",
  "Vocabulaire adapté au BTP",
  "Création plus rapide",
  "Modification avant l’envoi",
] as const;

const LOTS = [
  "Lot plomberie",
  "Lot électricité",
  "Lot maçonnerie",
  "Lot peinture",
] as const;

const STEPS = [
  {
    label: "Demande",
    body: "Rénovation salle de bain — 12 m², carrelage, plomberie, peinture.",
  },
  {
    label: "Analyse IA",
    body: "Batimum structure les lots, prestations et quantités.",
  },
  {
    label: "Lots",
    body: null,
  },
  {
    label: "Devis prêt",
    body: "Devis clair à vérifier, ajuster, puis envoyer au client.",
  },
] as const;

export function LandingDevisSection() {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) {
      setStep(3);
      return;
    }
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % STEPS.length);
    }, 2200);
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
              Devis avec IA
            </span>
            <h2 id="devis-title" className="lp-title mt-5">
              Passez de la demande client au devis en quelques minutes.
            </h2>
            <p className="lp-subtitle mt-5 max-w-xl">
              Décrivez les travaux à réaliser. Batimum vous aide à structurer
              les lots, les prestations, les quantités et les prix pour créer un
              devis clair et professionnel.
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
          </LandingReveal>

          <LandingReveal delay={120}>
            <div className="lp-devis-demo" aria-live="polite">
              <div className="lp-devis-demo__header">
                <Sparkles className="h-4 w-4 text-[#3B82F6]" aria-hidden="true" />
                <span>Démonstration</span>
              </div>

              <div className="lp-devis-demo__steps">
                {STEPS.map((item, index) => {
                  const active = index === step;
                  const done = index < step;
                  return (
                    <div
                      key={item.label}
                      className={
                        active
                          ? "lp-devis-card is-active"
                          : done
                            ? "lp-devis-card is-done"
                            : "lp-devis-card"
                      }
                    >
                      <div className="lp-devis-card__label">
                        <span className="lp-devis-card__index">{index + 1}</span>
                        {item.label}
                      </div>
                      {item.body ? (
                        <p className="lp-devis-card__body">{item.body}</p>
                      ) : (
                        <div className="lp-lots">
                          {LOTS.map((lot) => (
                            <span key={lot} className="lp-lot">
                              {lot}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
