import { Check, Mic } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const HIGHLIGHTS = [
  "Moins de saisie sur le chantier",
  "Gain de temps au quotidien",
  "Devis préparé immédiatement",
  "Utilisation simple depuis le mobile",
] as const;

export function LandingVoiceSection() {
  return (
    <section
      id="assistant-vocal"
      className="lp-section"
      aria-labelledby="voice-title"
    >
      <div className="lp-container">
        <div className="lp-split">
          <LandingReveal>
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              À venir
            </span>
            <h2
              id="voice-title"
              className="lp-title mt-4 text-3xl sm:text-4xl"
            >
              Créez un devis directement depuis le chantier.
            </h2>
            <p className="lp-subtitle mt-3 max-w-xl">
              L’assistant vocal Batimum permettra de dicter une demande et de
              préparer un devis à vérifier avant envoi. Cette évolution est en
              cours de préparation.
            </p>
            <ul className="lp-benefit-list">
              {HIGHLIGHTS.map((item) => (
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

          <LandingReveal delay={120}>
            <div className="lp-voice-bubble">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#059669]">
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                Exemple de commande vocale
              </div>
              <p className="lp-voice-quote">
                « Fais un devis pour Monsieur Dupont. Fourniture et pose de
                25 m² de carrelage. »
              </p>
              <div className="lp-voice-reply">
                Le devis est prêt à être vérifié et envoyé.
              </div>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
