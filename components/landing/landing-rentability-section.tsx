import {
  AlertTriangle,
  Clock3,
  LineChart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const AVAILABLE = [
  {
    label: "Marge prévue",
    hint: "Avant le démarrage du chantier",
    Icon: TrendingUp,
  },
  {
    label: "Heures prévues",
    hint: "Temps estimé sur le devis",
    Icon: Clock3,
  },
  {
    label: "Dépenses suivies",
    hint: "Coûts liés au chantier",
    Icon: Wallet,
  },
] as const;

const IN_PROGRESS = [
  {
    label: "Marge réelle",
    hint: "Comparaison prévu / réel",
  },
  {
    label: "Heures passées",
    hint: "Temps réellement consommé",
  },
  {
    label: "Dépassements",
    hint: "Alertes sur les écarts",
  },
  {
    label: "Chantiers les plus rentables",
    hint: "Classement par marge",
  },
  {
    label: "Types de travaux les plus rentables",
    hint: "Lecture par activité",
  },
] as const;

export function LandingRentabilitySection() {
  return (
    <section
      id="pilotage"
      className="lp-section"
      aria-labelledby="rentability-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Pilotage
            </span>
            <h2 id="rentability-title" className="lp-title mt-5 max-w-3xl">
              Ne découvrez plus votre marge à la fin du chantier.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Comparez le prévu au réel, suivez les coûts et visualisez la
              rentabilité de vos devis et de vos chantiers.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-pilotage">
          <LandingReveal delay={40}>
            <div className="lp-pilotage__panel">
              <h3 className="lp-pilotage__panel-title">Disponible aujourd’hui</h3>
              <ul className="lp-pilotage__list">
                {AVAILABLE.map(({ label, hint, Icon }) => (
                  <li key={label} className="lp-pilotage__item">
                    <span className="lp-pilotage__icon" aria-hidden>
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="lp-pilotage__label">{label}</p>
                      <p className="lp-pilotage__hint">{hint}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="lp-pilotage__demo" aria-hidden="true">
                <div className="lp-pilotage__bars">
                  <span style={{ height: "58%" }} />
                  <span style={{ height: "72%" }} />
                  <span style={{ height: "46%" }} />
                  <span style={{ height: "81%" }} />
                  <span style={{ height: "64%" }} />
                </div>
                <p className="lp-pilotage__demo-note">
                  Démonstration visuelle — sans données chiffrées
                </p>
              </div>
            </div>
          </LandingReveal>

          <LandingReveal delay={120}>
            <div className="lp-pilotage__panel lp-pilotage__panel--soon">
              <h3 className="lp-pilotage__panel-title">
                <AlertTriangle size={16} strokeWidth={1.75} aria-hidden />
                En cours de développement
              </h3>
              <ul className="lp-pilotage__list">
                {IN_PROGRESS.map(({ label, hint }) => (
                  <li key={label} className="lp-pilotage__item">
                    <span className="lp-pilotage__badge">En cours de développement</span>
                    <div>
                      <p className="lp-pilotage__label">{label}</p>
                      <p className="lp-pilotage__hint">{hint}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="lp-pilotage__footnote">
                Ces lectures avancées enrichissent le pilotage sans inventer de
                chiffres sur la landing.
              </p>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
