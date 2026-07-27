import { AlertTriangle, Check, Clock, LineChart } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const AVAILABLE = [
  { label: "Marge par chantier", Icon: LineChart },
  { label: "Coûts réels", Icon: Check },
  { label: "Heures passées", Icon: Clock },
  { label: "Prévu contre réel", Icon: LineChart },
] as const;

const IN_PROGRESS = [
  { label: "Marge par devis (approfondie)", Icon: LineChart },
  { label: "Alertes de dépassement", Icon: AlertTriangle },
] as const;

export function LandingRentabilitySection() {
  return (
    <section
      id="rentabilite"
      className="lp-section lp-section--soft"
      aria-labelledby="rentability-title"
    >
      <div className="lp-container">
        <div className="lp-split">
          <LandingReveal>
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Pilotez votre rentabilité
            </span>
            <h2 id="rentability-title" className="lp-title mt-5">
              Ne découvrez plus votre marge à la fin du chantier.
            </h2>
            <p className="lp-subtitle mt-5 max-w-xl">
              Comparez vos coûts prévus, les heures réellement passées et vos
              dépenses pour mieux comprendre la rentabilité de chaque devis et
              de chaque chantier.
            </p>
          </LandingReveal>

          <LandingReveal delay={100}>
            <div className="lp-status-panels">
              <div className="lp-status-panel">
                <div className="lp-status-panel__badge lp-status-panel__badge--ok">
                  Déjà disponible
                </div>
                <ul>
                  {AVAILABLE.map(({ label, Icon }) => (
                    <li key={label}>
                      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lp-status-panel">
                <div className="lp-status-panel__badge lp-status-panel__badge--soon">
                  En cours de développement
                </div>
                <ul>
                  {IN_PROGRESS.map(({ label, Icon }) => (
                    <li key={label}>
                      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
