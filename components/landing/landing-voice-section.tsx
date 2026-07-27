import { Check, Mic } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const HIGHLIGHTS = [
  "Moins de saisie",
  "Pas besoin d’attendre le retour au bureau",
  "Devis préparé immédiatement",
  "Gain de temps après les rendez-vous",
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
              Bientôt sur mobile
            </span>
            <h2 id="voice-title" className="lp-title mt-5">
              Dictez votre devis directement depuis le chantier.
            </h2>
            <p className="lp-subtitle mt-5 max-w-xl">
              L’assistant vocal Batimum est en préparation. Il permettra de
              dicter une demande sur le terrain et de préparer un devis à
              vérifier avant envoi.
            </p>
            <ul className="lp-benefit-list">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="lp-benefit-item">
                  <Check
                    className="lp-check mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="lp-soon-note">Fonctionnalité en préparation.</p>
          </LandingReveal>

          <LandingReveal delay={120}>
            <div className="lp-voice-bubble">
              <div className="lp-voice-bubble__badge">
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                Exemple de commande
              </div>
              <p className="lp-voice-quote">
                « Fais un devis pour Monsieur Dupont : fourniture et pose de
                25 m² de carrelage. »
              </p>
              <div className="lp-voice-reply">
                Le devis a été préparé. Il ne reste plus qu’à le vérifier et
                l’envoyer.
              </div>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
