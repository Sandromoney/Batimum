import { MapPin, Search, Users, Wrench } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const TARGETS = [
  "Sous-traitants",
  "Intérimaires",
  "Salariés",
  "Artisans indépendants",
] as const;

const FILTERS = [
  { label: "Métier", Icon: Wrench },
  { label: "Localisation", Icon: MapPin },
  { label: "Disponibilité", Icon: Search },
  { label: "Compétences", Icon: Users },
] as const;

export function LandingMarketplaceSection() {
  return (
    <section
      id="marketplace"
      className="lp-section lp-section--soft"
      aria-labelledby="marketplace-title"
    >
      <div className="lp-container">
        <div className="lp-split">
          <LandingReveal>
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Roadmap
            </span>
            <h2 id="marketplace-title" className="lp-title mt-5">
              Bientôt : trouvez rapidement les bons professionnels.
            </h2>
            <p className="lp-subtitle mt-5 max-w-xl">
              Ne perdez plus plusieurs jours à chercher de la main-d’œuvre.
              Les entreprises pourront rechercher les bons profils selon leurs
              besoins.
            </p>
            <p className="lp-soon-note">Fonctionnalité en préparation.</p>
          </LandingReveal>

          <LandingReveal delay={100}>
            <div className="lp-market-panel">
              <div>
                <h3 className="lp-market-panel__title">Rechercher</h3>
                <div className="lp-market-tags">
                  {TARGETS.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="lp-market-panel__title">Filtres prévus</h3>
                <ul className="lp-market-filters">
                  {FILTERS.map(({ label, Icon }) => (
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
