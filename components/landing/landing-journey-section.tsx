"use client";

import {
  Bot,
  Calendar,
  HardHat,
  LineChart,
  MessageSquare,
  Receipt,
  Users,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { useInView } from "@/lib/hooks/use-in-view";
import { cn } from "@/lib/utils";

const JOURNEY_STEPS = [
  {
    id: "demande",
    short: "Demande client",
    label: "Une demande client arrive",
    detail: "Le besoin est capté clairement, sans perdre d’information.",
    Icon: MessageSquare,
  },
  {
    id: "devis",
    short: "Devis avec MUM IA",
    label: "MUM IA prépare le devis",
    detail: "Lots et prestations structurés, prêts à vérifier avant envoi.",
    Icon: Bot,
  },
  {
    id: "chantier",
    short: "Chantier",
    label: "Le chantier est créé",
    detail: "Le devis accepté devient le fil conducteur du chantier.",
    Icon: HardHat,
  },
  {
    id: "planning",
    short: "Planning",
    label: "L’équipe est planifiée",
    detail: "Chacun sait où aller — sans appels en chaîne.",
    Icon: Calendar,
  },
  {
    id: "suivi",
    short: "Suivi terrain",
    label: "Le chantier est suivi",
    detail: "Étapes, consignes et documents au même endroit.",
    Icon: Users,
  },
  {
    id: "facture",
    short: "Facturation",
    label: "La facture est générée",
    detail: "Du devis à la facture, sans tout ressaisir.",
    Icon: Receipt,
  },
  {
    id: "marge",
    short: "Pilotage",
    label: "La rentabilité est visible",
    detail: "Le dirigeant garde le contrôle avant qu’il ne soit trop tard.",
    Icon: LineChart,
  },
] as const;

function JourneyStep({
  step,
  index,
  total,
}: {
  step: (typeof JOURNEY_STEPS)[number];
  index: number;
  total: number;
}) {
  const { ref, inView } = useInView<HTMLLIElement>({
    once: true,
    threshold: 0.28,
  });
  const Icon = step.Icon;

  return (
    <li
      ref={ref}
      className={cn(
        "lp-journey__step",
        inView && "is-visible",
        index === total - 1 && "is-last",
      )}
      style={{ ["--journey-delay" as string]: `${index * 90}ms` }}
    >
      <div className="lp-journey__rail" aria-hidden="true">
        <span className="lp-journey__dot">
          <Icon size={16} strokeWidth={1.75} />
        </span>
        {index < total - 1 ? <span className="lp-journey__line" /> : null}
      </div>
      <article className="lp-journey__card">
        <p className="lp-journey__index">{step.short}</p>
        <h3 className="lp-journey__title">{step.label}</h3>
        <p className="lp-journey__text">{step.detail}</p>
      </article>
    </li>
  );
}

export function LandingJourneySection() {
  return (
    <section
      className="lp-section lp-section--journey"
      aria-labelledby="journey-title"
      id="parcours"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Comment Batimum transforme votre quotidien
            </span>
            <h2 id="journey-title" className="lp-title mt-5 max-w-3xl">
              Du premier contact à la rentabilité, tout reste connecté.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Chaque action alimente automatiquement la suivante, sans ressaisie
              inutile.
            </p>
          </div>
        </LandingReveal>

        <ol className="lp-journey" aria-label="Parcours Batimum">
          {JOURNEY_STEPS.map((step, index) => (
            <JourneyStep
              key={step.id}
              step={step}
              index={index}
              total={JOURNEY_STEPS.length}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}
