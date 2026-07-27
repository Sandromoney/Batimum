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

/** Premières étapes présentées comme déjà franchies pour illustrer la progression. */
const DONE_COUNT = 3;

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
            <h2 id="steps-title" className="lp-title mt-5">
              Vos premiers résultats dès le premier jour.
            </h2>
            <p className="lp-subtitle mt-5 max-w-xl">
              Une mise en route progressive pour structurer votre activité sans
              friction et obtenir des résultats concrets rapidement.
            </p>
          </LandingReveal>

          <LandingReveal delay={80}>
            <ol className="lp-checklist">
              {STEPS.map((step, index) => {
                const done = index < DONE_COUNT;
                return (
                  <li
                    key={step}
                    className={done ? "lp-checklist__item is-done" : "lp-checklist__item"}
                  >
                    <span className="lp-checklist__mark" aria-hidden="true">
                      {done ? "✓" : index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                );
              })}
            </ol>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
