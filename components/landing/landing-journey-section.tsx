"use client";

import {
  Bot,
  Calendar,
  FileSignature,
  HardHat,
  LineChart,
  MessageSquare,
  Receipt,
  UserPlus,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { useInView } from "@/lib/hooks/use-in-view";
import { cn } from "@/lib/utils";

const JOURNEY_STEPS = [
  {
    id: "demande",
    short: "Demande client",
    detail: "Les premières informations sont enregistrées.",
    Icon: MessageSquare,
  },
  {
    id: "client",
    short: "Création du client",
    detail: "Le dossier client est créé et prêt à être suivi.",
    Icon: UserPlus,
  },
  {
    id: "devis",
    short: "Devis avec MUM IA",
    detail: "Les travaux sont structurés en lots et prestations.",
    Icon: Bot,
  },
  {
    id: "signature",
    short: "Signature du devis",
    detail: "Le devis accepté devient le point de départ du chantier.",
    Icon: FileSignature,
  },
  {
    id: "chantier",
    short: "Création du chantier",
    detail: "Les étapes, documents et consignes restent accessibles.",
    Icon: HardHat,
  },
  {
    id: "planning",
    short: "Planning de l’équipe",
    detail: "Les bonnes équipes sont affectées au bon moment.",
    Icon: Calendar,
  },
  {
    id: "suivi",
    short: "Suivi du chantier",
    detail: "L’avancement et les informations restent partagés.",
    Icon: ClipboardList,
  },
  {
    id: "facture",
    short: "Facturation",
    detail: "Le devis accepté devient une facture sans ressaisie.",
    Icon: Receipt,
  },
  {
    id: "paiement",
    short: "Paiement",
    detail: "Les règlements sont suivis jusqu’à l’encaissement.",
    Icon: Wallet,
  },
  {
    id: "marge",
    short: "Analyse de la rentabilité",
    detail: "Le prévu et le réel sont comparés.",
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
      style={{ ["--journey-delay" as string]: `${index * 70}ms` }}
    >
      <div className="lp-journey__rail" aria-hidden="true">
        <span className="lp-journey__dot">
          <Icon size={15} strokeWidth={1.75} />
        </span>
        {index < total - 1 ? <span className="lp-journey__line" /> : null}
      </div>
      <article className="lp-journey__card">
        <p className="lp-journey__index">{step.short}</p>
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
              Parcours complet
            </span>
            <h2 id="journey-title" className="lp-title mt-5 max-w-3xl">
              Du premier appel au paiement, tout reste connecté.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Chaque action alimente automatiquement la suivante, sans
              multiplier les outils ni les ressaisies.
            </p>
          </div>
        </LandingReveal>

        <ol className="lp-journey" aria-label="Parcours d’un chantier">
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
