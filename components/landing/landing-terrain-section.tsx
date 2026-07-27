import { Check } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LandingMobileScreen } from "@/components/landing/landing-device-screens";

const BENEFITS = [
  "Consulter le planning",
  "Accéder à l’adresse",
  "Ajouter des photos",
  "Suivre les étapes",
  "Retrouver les consignes",
  "Communiquer avec l’équipe",
] as const;

export function LandingTerrainSection() {
  return (
    <section
      id="pour-les-equipes"
      className="lp-section lp-section--soft"
      aria-labelledby="terrain-title"
    >
      <div className="lp-container">
        <div className="lp-split">
          <LandingReveal>
            <div className="lp-terrain-visual">
              <div className="lp-terrain-visual__caption">
                <div className="text-sm font-semibold">Chantier en cours</div>
                <div className="mt-1 text-sm text-white/80">
                  Interface mobile Batimum, pensée pour le terrain.
                </div>
              </div>
              <div className="lp-terrain-visual__phone">
                <div className="lp-iphone__body">
                  <div className="lp-iphone__screen">
                    <div className="lp-iphone__island" />
                    <LandingMobileScreen />
                  </div>
                </div>
              </div>
            </div>
          </LandingReveal>

          <LandingReveal delay={100}>
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Terrain
            </span>
            <h2
              id="terrain-title"
              className="lp-title mt-4 text-3xl sm:text-4xl"
            >
              Votre entreprise, toujours dans votre poche.
            </h2>
            <p className="lp-subtitle mt-3">
              Depuis un chantier, retrouvez votre planning, vos clients, vos
              documents et l’avancement de vos travaux.
            </p>
            <ul className="lp-benefit-list">
              {BENEFITS.map((item) => (
                <li key={item} className="lp-hero__benefit">
                  <Check
                    className="lp-check mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
