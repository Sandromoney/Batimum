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
    featured: true,
  },
  {
    title: "Équipes mieux organisées",
    text: "Chacun sait où aller — planning partagé, sans appels en chaîne.",
    Icon: Calendar,
    featured: false,
  },
  {
    title: "Chantiers plus simples à suivre",
    text: "Étapes, consignes et documents au même endroit, bureau comme terrain.",
    Icon: HardHat,
    featured: false,
  },
  {
    title: "Rentabilité plus facile à comprendre",
    text: "Comparez le prévu au réel avant qu’un dépassement ne coûte cher.",
    Icon: LineChart,
    featured: false,
  },
] as const;

export function LandingProofsSection() {
  const featured = BENEFITS.find((b) => b.featured)!;
  const secondary = BENEFITS.filter((b) => !b.featured);
  const FeaturedIcon = featured.Icon;

  return (
    <section
      className="lp-section lp-section--proofs"
      aria-labelledby="proof-title"
      id="moins-administratif"
    >
      <div className="lp-container">
        <div className="lp-admin">
          <LandingReveal>
            <div className="lp-admin__head">
              <h2 id="proof-title" className="lp-title max-w-2xl">
                Moins d&apos;administratif.
                <br />
                <span className="lp-title-accent">
                  Plus de temps pour vos chantiers.
                </span>
              </h2>
              <p className="lp-subtitle mt-5 max-w-xl">
                Batimum centralise votre gestion pour vous permettre de vous
                concentrer sur votre métier et le développement de votre
                entreprise.
              </p>
            </div>
          </LandingReveal>

          <div className="lp-admin__grid">
            <LandingReveal delay={60}>
              <article className="lp-admin__feature">
                <span className="lp-admin__icon" aria-hidden="true">
                  <FeaturedIcon size={20} strokeWidth={1.75} />
                </span>
                <h3 className="lp-admin__feature-title">{featured.title}</h3>
                <p className="lp-admin__feature-text">{featured.text}</p>
              </article>
            </LandingReveal>

            <div className="lp-admin__side">
              {secondary.map((item, index) => {
                const Icon = item.Icon;
                return (
                  <LandingReveal key={item.title} delay={120 + index * 70}>
                    <article className="lp-admin__card">
                      <span className="lp-admin__icon" aria-hidden="true">
                        <Icon size={18} strokeWidth={1.75} />
                      </span>
                      <div>
                        <h3 className="lp-admin__card-title">{item.title}</h3>
                        <p className="lp-admin__card-text">{item.text}</p>
                      </div>
                    </article>
                  </LandingReveal>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
