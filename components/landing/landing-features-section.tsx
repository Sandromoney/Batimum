"use client";

import {
  CalendarDays,
  FileText,
  Receipt,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  LandingReveal,
  LandingRevealItem,
  LandingRevealStagger,
} from "@/components/landing/landing-reveal";

const benefits = [
  {
    icon: FileText,
    title: "Devis plus vite",
    text: "Créez, envoyez et faites signer sans perdre une demi-journée.",
  },
  {
    icon: Receipt,
    title: "Factures sans ressaisie",
    text: "Un devis signé devient facture. Vos chiffres restent justes.",
  },
  {
    icon: Users,
    title: "Équipes alignées",
    text: "Chaque employé voit son planning. Vous gardez les données sensibles.",
  },
  {
    icon: CalendarDays,
    title: "Planning clair",
    text: "Moins d’appels le matin. Plus d’interventions au bon endroit.",
  },
  {
    icon: TrendingUp,
    title: "Rentabilité visible",
    text: "Sachez quels chantiers rapportent vraiment — avant qu’il soit trop tard.",
  },
  {
    icon: Smartphone,
    title: "Bureau et terrain",
    text: "Pilotez depuis le chantier comme depuis le bureau.",
  },
] as const;

export function LandingFeaturesSection() {
  return (
    <section id="fonctionnalites" className="landing-section">
      <div className="landing-container">
        <LandingReveal variant="title">
          <header className="landing-section-header">
            <p className="landing-eyebrow">Ce que vous gagnez</p>
            <h2 className="landing-h2">
              Moins d’administratif.
              <br />
              Plus de <span className="landing-mark">chantiers rentables</span>.
            </h2>
            <p className="landing-lead">
              Batimum centralise devis, clients, équipes, factures et pilotage —
              pour les dirigeants de TPE et PME du BTP.
            </p>
          </header>
        </LandingReveal>

        <LandingRevealStagger className="landing-benefit-grid">
          {benefits.map((item) => (
            <LandingRevealItem key={item.title} className="landing-benefit-card">
              <span className="landing-benefit-card__icon" aria-hidden>
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="landing-benefit-card__title">{item.title}</h3>
              <p className="landing-benefit-card__text">{item.text}</p>
            </LandingRevealItem>
          ))}
        </LandingRevealStagger>
      </div>
    </section>
  );
}
