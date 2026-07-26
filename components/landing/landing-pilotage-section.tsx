"use client";

import {
  AlertCircle,
  BarChart3,
  Clock,
  PieChart,
  TrendingUp,
} from "lucide-react";
import {
  LandingReveal,
  LandingRevealStagger,
  LandingRevealItem,
} from "@/components/landing/landing-reveal";

const highlights = [
  {
    icon: TrendingUp,
    title: "Rentabilité réelle",
    badge: "+18 % de marge moyenne constatée",
    description:
      "Connaissez votre bénéfice réel chantier par chantier, matériaux et main-d'œuvre inclus.",
  },
  {
    icon: Clock,
    title: "Temps prévu vs réel",
    badge: "0 heure non expliquée",
    description:
      "Comparez instantanément vos estimations avec les heures réellement passées sur le terrain.",
  },
  {
    icon: PieChart,
    title: "Marges sous contrôle",
    badge: "Vision en temps réel",
    description:
      "Suivez vos marges prévues et réelles avant qu'un chantier ne devienne non rentable.",
  },
  {
    icon: AlertCircle,
    title: "Alertes intelligentes",
    badge: "Agir avant les pertes",
    description:
      "Batimum vous signale automatiquement les dépassements de temps, coûts ou matériaux.",
  },
  {
    icon: BarChart3,
    title: "Analyse métier",
    badge: "Les chantiers qui rapportent vraiment",
    description:
      "Identifiez les activités les plus rentables : dépannage, salle de bain, placo, carrelage ou rénovation complète.",
  },
] as const;

export function LandingPilotageSection() {
  return (
    <section id="pilotage" className="bg-[#050505] text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-8 lg:px-10">
        <LandingReveal variant="title">
          <header className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Pilotage
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Sachez chaque soir ce que vos chantiers vous rapportent
              réellement.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#9CA3AF]">
              Rentabilité, temps réel, marges et alertes intelligentes.
              Batimum vous aide à prendre les bonnes décisions avant
              qu&apos;il ne soit trop tard.
            </p>
          </header>
        </LandingReveal>

        <LandingRevealStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((item) => (
            <LandingRevealItem key={item.title}>
              <article className="rounded-2xl border border-white/[0.08] bg-[#0D0D0D] p-6">
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[0.6875rem] font-semibold tracking-wide text-primary">
                  {item.badge}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
                  {item.description}
                </p>
              </article>
            </LandingRevealItem>
          ))}
        </LandingRevealStagger>
      </div>
    </section>
  );
}
