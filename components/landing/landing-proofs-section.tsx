import {
  CalendarDays,
  FileText,
  FolderKanban,
  TrendingUp,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const BENEFITS = [
  {
    title: "Devis plus rapides",
    text: "Passez de la demande à un devis clair, structuré par lots.",
    Icon: FileText,
    accent: "#34D399",
  },
  {
    title: "Planning toujours à jour",
    text: "Vos équipes savent où aller, sans appels en chaîne.",
    Icon: CalendarDays,
    accent: "#C4B5FD",
  },
  {
    title: "Chantiers mieux suivis",
    text: "Avancement, documents et consignes au même endroit.",
    Icon: FolderKanban,
    accent: "#93C5FD",
  },
  {
    title: "Rentabilité plus claire",
    text: "Visualisez le prévu et le réalisé avant la fin du chantier.",
    Icon: TrendingUp,
    accent: "#FDBA74",
  },
] as const;

export function LandingProofsSection() {
  return (
    <section className="lp-section" aria-labelledby="proof-title">
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-proof-head">
            <h2 id="proof-title" className="lp-title">
              Moins d&apos;administratif.
              <br />
              <span className="lp-title-accent">Plus de temps pour vos chantiers.</span>
            </h2>
            <p className="lp-subtitle lp-proof-head__sub">
              Batimum centralise toute votre gestion pour vous permettre de vous
              concentrer sur votre métier.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-proofs">
          {BENEFITS.map((item, index) => {
            const Icon = item.Icon;
            return (
              <LandingReveal key={item.title} delay={index * 70}>
                <article className="lp-proof">
                  <span
                    className="lp-proof__icon"
                    style={{ color: item.accent }}
                    aria-hidden="true"
                  >
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <h3 className="lp-proof__title">{item.title}</h3>
                  <p className="lp-proof__text">{item.text}</p>
                </article>
              </LandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
