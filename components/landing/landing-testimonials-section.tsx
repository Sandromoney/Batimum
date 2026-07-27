"use client";

import { useMemo, useState } from "react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const CATEGORIES = [
  "plombier",
  "électricien",
  "maçon",
  "couvreur",
  "plaquiste",
  "paysagiste",
] as const;

type Category = (typeof CATEGORIES)[number];

const TESTIMONIALS: Array<{
  category: Category;
  quote: string;
  author: string;
}> = [
  {
    category: "plombier",
    quote:
      "Je gagne du temps sur les devis et je retrouve plus facilement le suivi de chaque chantier.",
    author: "Retour plombier · phase de test",
  },
  {
    category: "électricien",
    quote:
      "Le planning est plus clair pour l’équipe, et la facturation suit sans ressaisie inutile.",
    author: "Retour électricien · phase de test",
  },
  {
    category: "maçon",
    quote:
      "On organise mieux les interventions et on voit plus vite ce qui avance vraiment sur le terrain.",
    author: "Retour maçon · phase de test",
  },
  {
    category: "couvreur",
    quote:
      "Les devis partent plus vite, et l’équipe retrouve ses consignes sans m’appeler tout le temps.",
    author: "Retour couvreur · phase de test",
  },
  {
    category: "plaquiste",
    quote:
      "Simple à prendre en main. Moins d’administratif, plus de temps pour les chantiers.",
    author: "Retour plaquiste · phase de test",
  },
  {
    category: "paysagiste",
    quote:
      "Clients, planning et suivi au même endroit : l’organisation de la semaine est plus fluide.",
    author: "Retour paysagiste · phase de test",
  },
];

export function LandingTestimonialsSection() {
  const [active, setActive] = useState<Category | "tous">("tous");

  const visible = useMemo(() => {
    if (active === "tous") return TESTIMONIALS;
    return TESTIMONIALS.filter((item) => item.category === active);
  }, [active]);

  return (
    <section
      id="temoignages"
      className="lp-section"
      aria-labelledby="testimonials-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <span className="lp-eyebrow">
            <span className="lp-eyebrow__dot" aria-hidden="true" />
            Témoignages
          </span>
          <h2
            id="testimonials-title"
            className="lp-title mt-4 max-w-3xl text-3xl sm:text-4xl"
          >
            Ce que nous disent les professionnels qui testent Batimum
          </h2>
          <p className="lp-subtitle mt-3 max-w-2xl">
            Des retours issus de la phase de test, par métier, autour du gain de
            temps, de la simplicité et du suivi chantier.
          </p>
        </LandingReveal>

        <div className="lp-testimonial-filters" role="tablist" aria-label="Métiers">
          <button
            type="button"
            className={active === "tous" ? "is-active" : undefined}
            onClick={() => setActive("tous")}
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
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <div className="lp-testimonial-grid">
          {visible.map((item) => (
            <article key={`${item.category}-${item.author}`} className="lp-testimonial">
              <div className="lp-testimonial__role">{item.category}</div>
              <p className="lp-testimonial__quote">« {item.quote} »</p>
              <p className="lp-testimonial__author">{item.author}</p>
              <p className="lp-note">Espace prévu pour une future vidéo.</p>
            </article>
          ))}
        </div>

        <p className="lp-note">
          Témoignages issus de retours recueillis pendant la phase de test.
        </p>
      </div>
    </section>
  );
}
