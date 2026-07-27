import {
  Bot,
  Calendar,
  HardHat,
  LineChart,
  Receipt,
  Users,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const BENEFITS = [
  {
    id: "devis",
    anchor: "devis-rapides",
    title: "Répondez plus vite à vos clients.",
    text: "Préparez des devis structurés sans repartir de zéro à chaque demande.",
    eyebrow: "Devis plus rapides",
    Icon: Bot,
  },
  {
    id: "planning",
    anchor: "planning",
    title: "Chaque équipe sait où elle doit être.",
    text: "Planifiez les interventions et gardez une vision claire des disponibilités.",
    eyebrow: "Équipes organisées",
    Icon: Calendar,
  },
  {
    id: "chantiers",
    anchor: "chantiers",
    title: "Gardez le contrôle sur chaque chantier.",
    text: "Suivez les étapes, les documents et les informations essentielles.",
    eyebrow: "Chantiers maîtrisés",
    Icon: HardHat,
  },
  {
    id: "facturation",
    anchor: "facturation",
    title: "Facturez sans tout ressaisir.",
    text: "Transformez vos devis et suivez les paiements plus simplement.",
    eyebrow: "Facturation simplifiée",
    Icon: Receipt,
  },
  {
    id: "clients",
    anchor: "clients",
    title: "Retrouvez tout en quelques secondes.",
    text: "Coordonnées, devis, factures, documents et historique restent regroupés.",
    eyebrow: "Clients centralisés",
    Icon: Users,
  },
  {
    id: "rentabilite",
    anchor: "rentabilite-visible",
    title: "Sachez ce que vous rapporte vraiment un chantier.",
    text: "Comparez les coûts prévus et réels pour mieux protéger vos marges.",
    eyebrow: "Rentabilité visible",
    Icon: LineChart,
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
          <div className="lp-section-head">
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Bénéfices concrets
            </span>
            <h2 id="features-title" className="lp-title mt-5 max-w-3xl">
              Ce que Batimum change dans votre quotidien.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Moins d’outils dispersés, plus de clarté — pour répondre plus vite
              et garder le contrôle.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-benefits">
          {BENEFITS.map((item, index) => {
            const Icon = item.Icon;
            return (
              <LandingReveal key={item.id} delay={index * 60}>
                <article
                  id={item.anchor}
                  className="lp-benefit-card"
                >
                  <span className="lp-benefit-card__icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <p className="lp-benefit-card__eyebrow">{item.eyebrow}</p>
                  <h3 className="lp-benefit-card__title">{item.title}</h3>
                  <p className="lp-benefit-card__text">{item.text}</p>
                </article>
              </LandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
