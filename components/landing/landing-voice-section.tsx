"use client";

import { Mic, Smartphone } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const BENEFITS = [
  "Moins de saisie",
  "Devis préparés après le rendez-vous",
  "Accès rapide aux informations",
  "Utilisation adaptée au terrain",
] as const;

export function LandingVoiceSection() {
  return (
    <section
      id="assistant-vocal"
      className="lp-section"
      aria-labelledby="voice-title"
    >
      <div className="lp-container">
        <div className="lp-split lp-split--voice">
          <LandingReveal>
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Bientôt sur mobile
            </span>
            <h2 id="voice-title" className="lp-title mt-5">
              Pilotez votre entreprise directement depuis le chantier.
            </h2>
            <p className="lp-subtitle mt-5 max-w-xl">
              Consultez votre planning, retrouvez les informations clients et
              préparez vos devis sans attendre le retour au bureau.
            </p>
            <ul className="lp-voice__benefits">
              {BENEFITS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="lp-soon-note">
              <Smartphone size={14} strokeWidth={1.75} aria-hidden />
              Fonctionnalité en préparation
            </p>
          </LandingReveal>

          <LandingReveal delay={100} direction="right">
            <div className="lp-voice-demo">
              <div className="lp-voice-demo__badge">
                <Mic size={14} strokeWidth={1.75} aria-hidden />
                Assistant vocal · démo
              </div>
              <blockquote className="lp-voice-demo__quote">
                « Fais un devis pour Monsieur Dupont : fourniture et pose de
                25 m² de carrelage. »
              </blockquote>
              <p className="lp-voice-demo__reply">
                MUM IA prépare le devis. Il ne reste plus qu’à le vérifier.
              </p>
              <p className="lp-voice-demo__note">
                Démonstration illustrative — assistant vocal non disponible
                aujourd’hui.
              </p>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
