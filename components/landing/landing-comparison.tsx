"use client";

import { Check } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import {
  LandingRevealItem,
  LandingRevealStagger,
} from "@/components/landing/landing-reveal";

type ComparisonRow = {
  feature: string;
  classicLabel: string;
  batimumLabel: string;
};

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Espace employé totalement séparé",
    classicLabel: "Accès limités ou inexistants",
    batimumLabel: "Accès sécurisé par employé",
  },
  {
    feature: "Planning terrain connecté au bureau",
    classicLabel: "Double saisie fréquente",
    batimumLabel: "Synchronisation en temps réel",
  },
  {
    feature: "Devis → chantier → facture",
    classicLabel: "Ressaisie manuelle",
    batimumLabel: "Flux automatisé",
  },
  {
    feature: "Déboursés chantier et rentabilité",
    classicLabel: "Calculs sur Excel",
    batimumLabel: "Suivi en temps réel",
  },
  {
    feature: "Rentabilité par employé",
    classicLabel: "Rarement disponible",
    batimumLabel: "Analyse par collaborateur",
  },
  {
    feature: "IA devis intégrée",
    classicLabel: "Modules externes payants",
    batimumLabel: "Incluse nativement",
  },
  {
    feature: "Suivi d'avancement chantier",
    classicLabel: "Outils généralistes",
    batimumLabel: "Pensé pour le BTP",
  },
  {
    feature: "Signature électronique",
    classicLabel: "Souvent en option",
    batimumLabel: "Intégrée",
  },
  {
    feature: "Pilotage complet de l'entreprise",
    classicLabel: "Outils dispersés",
    batimumLabel: "Une seule plateforme",
  },
  {
    feature: "Basé et développé en France",
    classicLabel: "Hébergement international",
    batimumLabel: "🇫🇷 100 % français",
  },
];

function ClassicCell({ label }: { label: string }) {
  return (
    <div className="landing-comparison__classic flex items-center justify-center gap-2">
      <span
        className="landing-comparison__icon landing-comparison__icon--neutral inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        aria-hidden="true"
      />
      <span className="landing-comparison__classic-label text-center">
        {label}
      </span>
    </div>
  );
}

function BatimumCell({ label }: { label: string }) {
  return (
    <div className="landing-comparison__batimum flex items-center justify-center gap-2">
      <Check
        className="landing-comparison__icon landing-comparison__icon--yes h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
        strokeWidth={2.25}
      />
      <span className="landing-comparison__batimum-label text-center">
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
        <header className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Comparatif
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Un logiciel pensé pour piloter une entreprise du bâtiment
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Devis, chantiers, équipes, factures et pilotage : Batimum centralise
            l&apos;essentiel sans complexité.
          </p>
        </header>
      </LandingReveal>

      <div className="landing-comparison mx-auto max-w-[1000px]">
        <div className="landing-comparison__scroll overflow-x-auto">
          <table className="landing-comparison__table w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="landing-comparison__head">
                <th className="landing-comparison__th-feature px-5 py-[1.125rem] text-left">
                  Fonctionnalité
                </th>
                <th className="landing-comparison__th-classic px-5 py-[1.125rem] text-center">
                  Logiciels classiques
                </th>
                <th className="landing-comparison__th-batimum px-5 py-[1.125rem] text-center">
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
                  <td className="landing-comparison__feature px-5 py-[1.125rem]">
                    <span className="landing-comparison__feature-label">
                      {row.feature}
                    </span>
                  </td>
                  <td className="landing-comparison__cell-classic px-5 py-[1.125rem]">
                    <ClassicCell label={row.classicLabel} />
                  </td>
                  <td className="landing-comparison__cell-batimum px-5 py-[1.125rem]">
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
