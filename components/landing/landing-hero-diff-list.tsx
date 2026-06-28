"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const DIFF_ITEMS = [
  {
    label: "IA qui génère vos devis",
    detail:
      "Décrivez le chantier en quelques lignes, Batimum prépare une base de devis prête à vérifier.",
  },
  {
    label: "Le seul espace employé distinct du marché",
    detail:
      "Vos employés voient leur planning, leurs chantiers et leurs consignes, sans accéder à vos chiffres.",
  },
  {
    label: "Zéro ressaisie du devis à la facture",
    detail:
      "Une fois le devis validé, les informations suivent automatiquement jusqu'au chantier et à la facture.",
  },
  {
    label: "Planning terrain pensé pour les équipes BTP",
    detail:
      "Chaque salarié sait où aller, quand intervenir et quelles consignes respecter.",
  },
  {
    label: "Signature électronique intégrée",
    detail:
      "Le client signe depuis son téléphone ou son ordinateur, sans impression ni aller-retour inutile.",
  },
  {
    label: "Compatible facture électronique 2026",
    detail:
      "Le logiciel est préparé pour intégrer les évolutions liées à la facturation électronique.",
  },
] as const;

type LandingHeroDiffListProps = {
  visible: boolean;
  baseDelay?: number;
};

export function LandingHeroDiffList({
  visible,
  baseDelay = 980,
}: LandingHeroDiffListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = useCallback((index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  }, []);

  return (
    <ul
      className={cn(
        "landing-hero-diff mt-8 w-full max-w-2xl space-y-2.5 text-left",
        visible && "landing-hero-diff--ready",
      )}
    >
      {DIFF_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <li
            key={item.label}
            className={cn(
              "landing-hero-diff__item rounded-xl border border-border/60 bg-card/70 px-4 py-3 shadow-card backdrop-blur-sm transition-colors",
              isOpen && "landing-hero-diff__item--open",
            )}
            style={
              {
                "--hero-diff-delay": `${baseDelay + index * 150}ms`,
              } as CSSProperties
            }
          >
            <button
              type="button"
              className="landing-hero-diff__trigger flex w-full items-start gap-3 text-left"
              aria-expanded={isOpen}
              onClick={() => handleToggle(index)}
            >
              <span className="landing-hero-diff__check mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-6 text-foreground sm:text-[0.9375rem]">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "landing-hero-diff__detail block text-sm leading-6 text-muted-foreground",
                    isOpen && "landing-hero-diff__detail--visible",
                  )}
                  aria-hidden={!isOpen}
                >
                  {item.detail}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
