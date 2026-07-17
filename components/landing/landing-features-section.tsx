"use client";

import {
  Bot,
  Calendar,
  FileText,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  LandingReveal,
  LandingRevealItem,
  LandingRevealStagger,
} from "@/components/landing/landing-reveal";

const features = [
  {
    icon: FileText,
    title: "Devis",
    badge: "-70 % de temps administratif",
    description:
      "Créez un devis complet en moins de 5 minutes et transformez-le automatiquement en facture sans aucune ressaisie.",
  },
  {
    icon: Receipt,
    title: "Factures",
    badge: "100 % synchronisées",
    description:
      "Un devis signé devient une facture en un clic. Plus aucune double saisie ni erreur de suivi.",
  },
  {
    icon: Calendar,
    title: "Planning terrain",
    badge: "0 appel inutile le matin",
    description:
      "Vos équipes savent où aller, à quelle heure et avec quels documents, directement depuis leur espace dédié.",
  },
  {
    icon: Users,
    title: "Espace employé séparé",
    badge: "Confidentiel",
    description:
      "Chaque salarié possède son propre espace sans accès aux finances ou aux données sensibles de l'entreprise.",
  },
  {
    icon: Bot,
    title: "MUM IA",
    badge: "100 devis IA / mois inclus",
    description:
      "Décrivez simplement le chantier. L'IA construit automatiquement votre devis, les quantités et la structure métier.",
  },
  {
    icon: TrendingUp,
    title: "Pilotage rentabilité",
    badge: "Votre deuxième cerveau",
    description:
      "Sachez chaque soir combien vous avez réellement gagné sur chaque chantier et où concentrer vos efforts.",
  },
] as const;

export function LandingFeaturesSection() {
  return (
    <section id="fonctionnalites" className="bg-[#050505] text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-8 lg:px-10">
        <LandingReveal variant="title">
          <header className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Fonctionnalités
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Travaillez moins sur l&apos;administratif.
              <br />
              Gagnez plus sur vos chantiers.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#9CA3AF]">
              Devis, équipes, IA et rentabilité : Batimum centralise tout pour
              les TPE du bâtiment.
            </p>
          </header>
        </LandingReveal>

        <LandingRevealStagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <LandingRevealItem key={feature.title}>
              <article className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#0D0D0D] p-6 transition-colors hover:border-white/[0.12]">
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-[0.6875rem] font-semibold tracking-wide text-primary">
                  {feature.badge}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                  {feature.description}
                </p>
              </article>
            </LandingRevealItem>
          ))}
        </LandingRevealStagger>
      </div>
    </section>
  );
}
