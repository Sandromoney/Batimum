import { LandingReveal } from "@/components/landing/landing-reveal";

const FEEDBACK = [
  "Les devis sont plus rapides à préparer.",
  "Les informations sont plus simples à retrouver.",
  "Le planning est plus clair pour toute l’équipe.",
  "Le suivi des chantiers est mieux organisé.",
  "La rentabilité est plus facile à comprendre.",
] as const;

const FUTURE_VIDEOS = [
  "Plombier",
  "Électricien",
  "Maçon",
  "Couvreur",
  "Plaquiste",
  "Paysagiste",
] as const;

export function LandingTestimonialsSection() {
  return (
    <section
      id="temoignages"
      className="lp-section"
      aria-labelledby="testimonials-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <h2 id="testimonials-title" className="lp-title mt-5 max-w-3xl">
              Pensé avec les professionnels du bâtiment.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Les retours du terrain nous aident à construire une solution
              vraiment adaptée au quotidien des entreprises du BTP.
            </p>
          </div>
        </LandingReveal>

        <LandingReveal delay={60}>
          <p className="lp-themes__intro">
            Ce que nos utilisateurs nous remontent pendant les tests
          </p>
        </LandingReveal>

        <div className="lp-themes">
          {FEEDBACK.map((item, index) => (
            <LandingReveal key={item} delay={80 + index * 50}>
              <blockquote className="lp-theme-card">
                <p>« {item} »</p>
              </blockquote>
            </LandingReveal>
          ))}
        </div>

        <LandingReveal delay={120}>
          <p className="lp-themes__note">
            Retours recueillis pendant la phase de test. Aucun témoignage nommé
            n’est inventé.
          </p>
        </LandingReveal>

        <LandingReveal delay={160}>
          <div className="lp-themes__videos">
            <p className="lp-themes__videos-title">
              Prochaines vidéos métiers (à venir)
            </p>
            <ul className="lp-themes__video-slots">
              {FUTURE_VIDEOS.map((label) => (
                <li key={label}>
                  <span aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
