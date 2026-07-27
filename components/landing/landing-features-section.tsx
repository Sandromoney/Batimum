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
    title: "Devis",
    text: "Créez des devis clairs, structurés par lots et envoyez-les directement à vos clients.",
    icon: FileText,
    lots: ["Lot plomberie", "Lot électricité", "Lot peinture", "Lot maçonnerie"],
  },
  {
    title: "Planning des équipes",
    text: "Planifiez les interventions et attribuez chaque chantier aux bons collaborateurs.",
    icon: CalendarDays,
  },
  {
    title: "Suivi des chantiers",
    text: "Suivez les étapes, les photos, les documents et l’avancement de chaque chantier.",
    icon: FolderKanban,
  },
  {
    title: "Facturation",
    text: "Transformez vos devis en factures et gardez une vue claire sur vos paiements.",
    icon: Receipt,
  },
  {
    title: "Gestion client",
    text: "Centralisez les coordonnées, les documents, les devis et l’historique de vos clients.",
    icon: Users,
  },
  {
    title: "Pilotage et rentabilité",
    text: "Comparez le prévu au réel et suivez les marges par devis et par chantier.",
    icon: BarChart3,
  },
] as const;

export function LandingFeaturesSection() {
  return (
    <section
      id="fonctionnalites"
      className="lp-section lp-section--soft"
      aria-labelledby="features-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <span className="lp-eyebrow">
            <span className="lp-eyebrow__dot" aria-hidden="true" />
            Fonctionnalités
          </span>
          <h2
            id="features-title"
            className="lp-title mt-4 max-w-2xl text-3xl sm:text-4xl"
          >
            Tout ce qu’il vous faut pour gérer votre entreprise.
          </h2>
          <p className="lp-subtitle mt-3 max-w-2xl">
            Un outil unique pour le bureau et le terrain, pensé pour les TPE et
            PME du bâtiment.
          </p>
        </LandingReveal>

        <div className="lp-feature-grid mt-10">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <LandingReveal key={feature.title} delay={index * 60}>
                <article className="lp-feature">
                  <div className="lp-feature__icon">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="lp-feature__title">{feature.title}</h3>
                  <p className="lp-feature__text">{feature.text}</p>
                  {"lots" in feature && feature.lots ? (
                    <div className="lp-lots">
                      {feature.lots.map((lot) => (
                        <span key={lot} className="lp-lot">
                          {lot}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              </LandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
