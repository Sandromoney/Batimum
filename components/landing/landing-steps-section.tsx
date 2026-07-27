import { LandingReveal } from "@/components/landing/landing-reveal";

const STEPS = [
  "Compléter son entreprise",
  "Ajouter son logo",
  "Ajouter un client",
  "Créer son premier devis",
  "Créer un chantier",
  "Planifier une intervention",
  "Envoyer sa première facture",
] as const;

export function LandingStepsSection() {
  return (
    <section
      id="premiers-pas"
      className="lp-section lp-section--soft"
      aria-labelledby="steps-title"
    >
      <div className="lp-container">
        <div className="lp-split">
          <LandingReveal>
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Premiers pas
            </span>
            <h2 id="steps-title" className="lp-title mt-4 text-3xl sm:text-4xl">
              Opérationnel en quelques étapes.
            </h2>
            <p className="lp-subtitle mt-3 max-w-xl">
              Une mise en route progressive, rassurante, pour démarrer sans
              friction et structurer votre activité dès les premiers jours.
            </p>
          </LandingReveal>

          <LandingReveal delay={80}>
            <ol className="lp-steps">
              {STEPS.map((step, index) => (
                <li key={step} className="lp-step">
                  <span className="lp-step__index">{index + 1}</span>
                  <span className="font-medium text-[#101828]">{step}</span>
                </li>
              ))}
            </ol>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
