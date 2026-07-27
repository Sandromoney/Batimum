import {
  Bot,
  Calendar,
  HardHat,
  LineChart,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const BENEFITS = [
  {
    title: "Devis préparés plus rapidement",
    text: "Passez de la demande client à un devis clair, structuré et prêt à envoyer.",
    Icon: Bot,
  },
  {
    title: "Équipes mieux organisées",
    text: "Chacun sait où aller — planning partagé, sans appels en chaîne.",
    Icon: Calendar,
  },
  {
    title: "Chantiers plus simples à suivre",
    text: "Étapes, consignes et documents au même endroit, bureau comme terrain.",
    Icon: HardHat,
  },
  {
    title: "Rentabilité plus facile à comprendre",
    text: "Comparez le prévu au réel avant qu’un dépassement ne coûte cher.",
    Icon: LineChart,
  },
] as const;

export function LandingProofsSection() {
  return (
    <section className="lp-section lp-section--proofs" aria-labelledby="proof-title">
      <div className="lp-container">
        <div className="lp-proof-layout">
          <LandingReveal>
            <div className="lp-proof-head">
              <h2 id="proof-title" className="lp-title">
                Moins d&apos;administratif.
                <br />
                <span className="lp-title-accent">
                  Plus de temps pour vos chantiers.
                </span>
              </h2>
              <p className="lp-subtitle lp-proof-head__sub">
                Batimum centralise votre gestion pour vous permettre de vous
                concentrer sur votre métier et le développement de votre
                entreprise.
              </p>
            </div>
          </LandingReveal>

          <div className="lp-proofs lp-proofs--editorial">
            {BENEFITS.map((item, index) => {
              const Icon = item.Icon;
              return (
                <LandingReveal key={item.title} delay={index * 80}>
                  <article className="lp-proof lp-proof--editorial">
                    <span className="lp-proof__index" aria-hidden="true">
                      0{index + 1}
                    </span>
                    <span className="lp-proof__icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <div className="lp-proof__body">
                      <h3 className="lp-proof__title">{item.title}</h3>
                      <p className="lp-proof__text">{item.text}</p>
                    </div>
                  </article>
                </LandingReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
