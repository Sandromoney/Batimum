"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const STEPS = [
  "Compléter son entreprise",
  "Ajouter son logo",
  "Ajouter un client",
  "Créer son premier devis",
  "Créer un chantier",
  "Planifier une intervention",
  "Envoyer sa première facture",
] as const;

export function LandingStepsSection() {
  const reduced = usePrefersReducedMotion();
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    if (reduced) {
      setDoneCount(3);
      return;
    }
    let current = 0;
    const id = window.setInterval(() => {
      current = (current + 1) % (STEPS.length + 1);
      setDoneCount(current);
    }, 1600);
    return () => window.clearInterval(id);
  }, [reduced]);

  const progress = Math.round((doneCount / STEPS.length) * 100);

  return (
    <section
      id="premiers-pas"
      className="lp-section lp-section--soft"
      aria-labelledby="steps-title"
    >
      <div className="lp-container">
        <div className="lp-split">
          <LandingReveal>
            <h2 id="steps-title" className="lp-title">
              Vos premiers résultats dès le premier jour.
            </h2>
            <p className="lp-subtitle mt-5 max-w-xl">
              Batimum vous guide étape par étape pour mettre votre entreprise en
              place rapidement.
            </p>
            <p className="lp-steps__disclaimer">
              Démonstration marketing — cette checklist n’est pas connectée à
              votre compte.
            </p>
          </LandingReveal>

          <LandingReveal delay={100} direction="right">
            <div className="lp-checklist" aria-live="polite">
              <div className="lp-checklist__progress">
                <div className="lp-checklist__progress-top">
                  <span>Progression</span>
                  <span>{progress}%</span>
                </div>
                <div
                  className="lp-checklist__bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label="Progression de démonstration"
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
              <ul className="lp-checklist__list">
                {STEPS.map((label, index) => {
                  const done = index < doneCount;
                  return (
                    <li
                      key={label}
                      className={cn(
                        "lp-checklist__item",
                        done && "is-done",
                      )}
                    >
                      <span
                        className="lp-checklist__mark"
                        aria-hidden="true"
                      >
                        {done ? <Check size={12} strokeWidth={2.5} /> : null}
                      </span>
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
