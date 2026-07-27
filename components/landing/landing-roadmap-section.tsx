import {
  MessageSquareText,
  Mic,
  Store,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const PROJECTS = [
  {
    id: "sms",
    title: "SMS automatiques",
    Icon: MessageSquareText,
    points: [
      "Confirmations de rendez-vous",
      "Rappels de chantier",
      "Relances de paiement",
      "Notifications de facture",
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace BTP",
    Icon: Store,
    points: [
      "Recherche de sous-traitants",
      "Artisans disponibles",
      "Intérimaires et salariés",
      "Filtres par métier et localisation",
    ],
  },
  {
    id: "voice",
    title: "Assistant vocal",
    Icon: Mic,
    points: [
      "Création de devis à la voix",
      "Recherche d’informations",
      "Actions depuis le chantier",
    ],
  },
] as const;

export function LandingRoadmapSection() {
  return (
    <section
      id="evolutions"
      className="lp-section lp-section--soft"
      aria-labelledby="roadmap-title"
    >
      {/* Ancres conservées pour la navigation existante */}
      <span id="sms" className="lp-anchor-target" aria-hidden="true" />
      <span id="marketplace" className="lp-anchor-target" aria-hidden="true" />

      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <h2 id="roadmap-title" className="lp-title mt-5 max-w-3xl">
              Batimum continue d’évoluer avec les besoins du terrain.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Une vision claire de ce qui arrive ensuite — sans présenter ces
              projets comme déjà disponibles.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-future">
          {PROJECTS.map((project, index) => {
            const Icon = project.Icon;
            return (
              <LandingReveal key={project.id} delay={index * 80}>
                <article className="lp-future__card">
                  <div className="lp-future__top">
                    <span className="lp-future__icon" aria-hidden>
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="lp-future__badge">En préparation</span>
                  </div>
                  <h3 className="lp-future__title">{project.title}</h3>
                  <ul className="lp-future__list">
                    {project.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              </LandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
