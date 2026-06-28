"use client";

import { Check, X } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import {
  LandingRevealItem,
  LandingRevealStagger,
} from "@/components/landing/landing-reveal";

type ClassicIcon = "neutral" | "no";

type ComparisonRow = {
  feature: string;
  classicLabel: string;
  classicIcon: ClassicIcon;
  batimumLabel: string;
};

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Espace employé confidentiel et séparé",
    classicLabel: "Inédit",
    classicIcon: "neutral",
    batimumLabel: "Inclus",
  },
  {
    feature: "Zéro ressaisie devis → chantier → facture",
    classicLabel: "Manuel",
    classicIcon: "no",
    batimumLabel: "Automatique",
  },
  {
    feature: "Planning conçu pour le terrain",
    classicLabel: "Généraliste",
    classicIcon: "no",
    batimumLabel: "Pensé BTP",
  },
  {
    feature: "IA devis intégrée",
    classicLabel: "Module payant ou externe",
    classicIcon: "no",
    batimumLabel: "Incluse",
  },
  {
    feature: "Support français spécialisé BTP",
    classicLabel: "Support généraliste",
    classicIcon: "no",
    batimumLabel: "Équipe métier",
  },
  {
    feature: "Conçu exclusivement pour les TPE bâtiment",
    classicLabel: "Multi-secteurs",
    classicIcon: "no",
    batimumLabel: "100 % BTP",
  },
  {
    feature: "Signature électronique intégrée",
    classicLabel: "Souvent en option",
    classicIcon: "no",
    batimumLabel: "Incluse",
  },
];

function ClassicIconMark({ type }: { type: ClassicIcon }) {
  if (type === "neutral") {
    return (
      <span
        className="landing-comparison__icon landing-comparison__icon--neutral inline-block h-2 w-2 shrink-0 rounded-full"
        aria-hidden="true"
      />
    );
  }

  return (
    <X
      className="landing-comparison__icon landing-comparison__icon--no h-3 w-3 shrink-0"
      aria-hidden="true"
      strokeWidth={2.25}
    />
  );
}

function ClassicCell({
  label,
  icon,
}: {
  label: string;
  icon: ClassicIcon;
}) {
  return (
    <div className="landing-comparison__classic flex items-center justify-center gap-1.5">
      <ClassicIconMark type={icon} />
      <span className="text-center text-[0.75rem] leading-4 text-muted-foreground/90">
        {label}
      </span>
    </div>
  );
}

function BatimumCell({ label }: { label: string }) {
  return (
    <div className="landing-comparison__batimum flex items-center justify-center gap-1.5">
      <Check
        className="landing-comparison__icon landing-comparison__icon--yes h-3 w-3 shrink-0"
        aria-hidden="true"
        strokeWidth={2.5}
      />
      <span className="text-center text-[0.75rem] font-medium leading-4 text-white/95">
        {label}
      </span>
    </div>
  );
}

export function LandingComparisonSection() {
  return (
    <section
      id="comparatif"
      className="mx-auto w-full max-w-7xl px-6 py-14 sm:px-8 lg:px-10"
    >
      <LandingReveal variant="title">
        <header className="mx-auto mb-7 max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Comparatif
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pourquoi Batimum ne ressemble pas aux logiciels BTP classiques
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Moins de complexité. Plus d&apos;automatisation. Une vraie séparation
            entre le dirigeant et les équipes.
          </p>
        </header>
      </LandingReveal>

      <div className="landing-comparison mx-auto max-w-[1000px] overflow-hidden rounded-xl border border-border/45 shadow-card">
        <div className="overflow-x-auto">
          <table className="landing-comparison__table w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="landing-comparison__head border-b border-border/45">
                <th className="landing-comparison__th-feature px-4 py-2.5 text-left text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-5">
                  Fonctionnalité
                </th>
                <th className="landing-comparison__th-classic px-5 py-2.5 text-center text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 sm:px-7">
                  Logiciels classiques
                </th>
                <th className="landing-comparison__th-batimum px-5 py-2.5 text-center text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-primary sm:px-7">
                  Batimum
                </th>
              </tr>
            </thead>
            <LandingRevealStagger as="tbody">
              {COMPARISON_ROWS.map((row) => (
                <LandingRevealItem
                  key={row.feature}
                  as="tr"
                  className="landing-comparison__row group"
                >
                  <td className="landing-comparison__feature px-4 py-2.5 sm:px-5">
                    <span className="text-[0.75rem] font-medium uppercase leading-4 tracking-[0.03em] text-foreground/90">
                      {row.feature}
                    </span>
                  </td>
                  <td className="landing-comparison__cell-classic px-5 py-2.5 sm:px-7">
                    <ClassicCell
                      label={row.classicLabel}
                      icon={row.classicIcon}
                    />
                  </td>
                  <td className="landing-comparison__cell-batimum px-5 py-2.5 sm:px-7">
                    <BatimumCell label={row.batimumLabel} />
                  </td>
                </LandingRevealItem>
              ))}
            </LandingRevealStagger>
          </table>
        </div>
      </div>
    </section>
  );
}
