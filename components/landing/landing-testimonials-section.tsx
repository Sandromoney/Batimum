"use client";

import { useState } from "react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const CATEGORIES = [
  "Plombier",
  "Électricien",
  "Maçon",
  "Couvreur",
  "Plaquiste",
  "Paysagiste",
] as const;

const THEMES = [
  "Les devis sont plus rapides à préparer.",
  "Toute l’équipe retrouve les mêmes informations.",
  "Le suivi des chantiers est plus clair.",
  "La rentabilité devient plus facile à comprendre.",
] as const;

export function LandingTestimonialsSection() {
  const [active, setActive] = useState<(typeof CATEGORIES)[number] | "Tous">(
    "Tous",
  );

  return (
    <section
      id="temoignages"
      className="lp-section"
      aria-labelledby="testimonials-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Témoignages
            </span>
            <h2 id="testimonials-title" className="lp-title mt-5 max-w-3xl">
              Pensé avec les professionnels du bâtiment.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Ce que nos utilisateurs nous remontent pendant les tests — autour
              du gain de temps, de la simplicité, de l’organisation et du suivi
              chantier.
            </p>
          </div>
        </LandingReveal>

        <div
          className="lp-testimonial-filters"
          role="tablist"
          aria-label="Métiers"
        >
          <button
            type="button"
            className={active === "Tous" ? "is-active" : undefined}
            onClick={() => setActive("Tous")}
          >
            Tous
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={active === category ? "is-active" : undefined}
              onClick={() => setActive(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="lp-theme-grid">
          {THEMES.map((theme, index) => (
            <LandingReveal key={theme} delay={index * 60}>
              <article className="lp-theme-card">
                <p>{theme}</p>
                <span className="lp-theme-card__meta">
                  {active === "Tous" ? "Retours multi-métiers" : active}
                  {" · "}
                  Espace prévu pour une future vidéo
                </span>
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
