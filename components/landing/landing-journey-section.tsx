"use client";

import {
  Bot,
  Calendar,
  FileCheck2,
  HardHat,
  LineChart,
  Receipt,
  Sparkles,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { useInView } from "@/lib/hooks/use-in-view";
import { cn } from "@/lib/utils";

const JOURNEY_STEPS = [
  {
    id: "demande",
    label: "Une demande client arrive",
    detail: "Le besoin est capturé clairement, sans perdre d’information.",
    Icon: Sparkles,
  },
  {
    id: "devis",
    label: "MUM IA structure le devis",
    detail: "Lots, prestations et détail prêts à vérifier avant envoi.",
    Icon: Bot,
  },
  {
    id: "chantier",
    label: "Le chantier est prêt à être organisé",
    detail: "Le devis accepté devient le fil conducteur du chantier.",
    Icon: HardHat,
  },
  {
    id: "planning",
    label: "L’équipe reçoit son planning",
    detail: "Chacun sait où aller, sans appels en chaîne.",
    Icon: Calendar,
  },
  {
    id: "suivi",
    label: "L’avancement est suivi en temps réel",
    detail: "Consignes, documents et étapes au même endroit.",
    Icon: FileCheck2,
  },
  {
    id: "facture",
    label: "La facture est générée",
    detail: "Du devis à la facture, sans tout ressaisir.",
    Icon: Receipt,
  },
  {
    id: "marge",
    label: "La marge reste visible",
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
    threshold: 0.35,
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
      style={{ ["--journey-delay" as string]: `${index * 70}ms` }}
    >
      <div className="lp-journey__rail" aria-hidden="true">
        <span className="lp-journey__dot">
          <Icon size={16} strokeWidth={1.75} />
        </span>
        {index < total - 1 ? <span className="lp-journey__line" /> : null}
      </div>
      <article className="lp-journey__card">
        <p className="lp-journey__index">Étape {index + 1}</p>
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
              Comment Batimum travaille avec vous
            </span>
            <h2 id="journey-title" className="lp-title mt-5 max-w-3xl">
              Du premier devis à la rentabilité, tout s’enchaîne.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Une demande client, un devis préparé, un chantier organisé, une
              équipe synchronisée, une facture claire — et une marge visible.
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
