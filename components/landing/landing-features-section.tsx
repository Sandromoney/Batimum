import {
  BarChart3,
  CalendarDays,
  FileText,
  FolderKanban,
  Receipt,
  Users,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const FEATURES = [
  {
    title: "Devis avec IA",
    text: "Créez des devis structurés plus rapidement.",
    icon: FileText,
    accent: "#34D399",
  },
  {
    title: "Planning des équipes",
    text: "Gardez chaque équipe au bon endroit, au bon moment.",
    icon: CalendarDays,
    accent: "#C4B5FD",
  },
  {
    title: "Suivi des chantiers",
    text: "Retrouvez les étapes, documents et informations essentielles.",
    icon: FolderKanban,
    accent: "#93C5FD",
  },
  {
    title: "Facturation simplifiée",
    text: "Transformez vos devis et suivez vos paiements.",
    icon: Receipt,
    accent: "#FDBA74",
  },
  {
    title: "Gestion client",
    text: "Centralisez les coordonnées, documents et échanges.",
    icon: Users,
    accent: "#FCD34D",
  },
  {
    title: "Pilotage et rentabilité",
    text: "Comparez le prévu au réel et surveillez vos marges.",
    icon: BarChart3,
    accent: "#059669",
  },
] as const;

export function LandingFeaturesSection() {
  return (
    <section
      id="fonctionnalites"
      className="lp-section"
      aria-labelledby="features-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Fonctionnalités principales
            </span>
            <h2 id="features-title" className="lp-title mt-5 max-w-3xl">
              Un outil de pilotage pensé pour les dirigeants du BTP.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Devis, équipes, chantiers, facturation et rentabilité : tout est
              réuni pour simplifier votre quotidien.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-feature-grid mt-12">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <LandingReveal key={feature.title} delay={index * 60}>
                <article className="lp-feature">
                  <div
                    className="lp-feature__icon"
                    style={{ color: feature.accent }}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="lp-feature__title">{feature.title}</h3>
                  <p className="lp-feature__text">{feature.text}</p>
                </article>
              </LandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
