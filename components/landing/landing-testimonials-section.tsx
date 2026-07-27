"use client";

import { LandingReveal } from "@/components/landing/landing-reveal";

const FEEDBACK = [
  "Les devis sont plus rapides à préparer.",
  "Les informations sont plus simples à retrouver.",
  "Le planning est plus clair pour toute l’équipe.",
  "Le suivi des chantiers est mieux organisé.",
  "La rentabilité est plus facile à comprendre.",
] as const;

/**
 * Retours qualitatifs de phase de test uniquement.
 * Structure prête pour de vraies preuves chiffrées plus tard — aucun faux chiffre.
 */
export function LandingTestimonialsSection() {
  return (
    <section
      id="temoignages"
      className="lp-section lp-section--dark"
      aria-labelledby="testimonials-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Phase de test
            </span>
            <h2 id="testimonials-title" className="lp-title mt-5 max-w-3xl">
              Ce que nos utilisateurs nous remontent pendant les tests
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Des retours concrets sur le gain de temps, l’organisation et le
              suivi — sans chiffres inventés.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-theme-grid">
          {FEEDBACK.map((theme, index) => (
            <LandingReveal key={theme} delay={index * 60}>
              <article className="lp-theme-card">
                <p>{theme}</p>
                <span className="lp-theme-card__meta">Retour de test</span>
              </article>
            </LandingReveal>
          ))}
        </div>

        <p className="lp-note">
          Retours recueillis pendant la phase de test.
        </p>
      </div>
    </section>
  );
}
