"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const BADGES = [
  {
    label: "IA devis intégrée",
    detail:
      "Décrivez un chantier en quelques lignes. Batimum prépare une base de devis prête à vérifier.",
  },
  {
    label: "Espace employé distinct",
    detail:
      "Vos salariés voient leur planning, leurs chantiers et leurs consignes sans accéder à vos chiffres.",
  },
  {
    label: "Zéro ressaisie",
    detail:
      "Une fois signé, tout s'enchaîne automatiquement : chantier, planning, facture.",
  },
] as const;

type LandingHeroDiffBadgesProps = {
  visible: boolean;
  baseDelay?: number;
};

export function LandingHeroDiffBadges({
  visible,
  baseDelay = 800,
}: LandingHeroDiffBadgesProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = useCallback((index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  }, []);

  return (
    <ul
      className={cn(
        "landing-hero-pills mt-5 flex w-full max-w-4xl flex-col items-stretch gap-2 sm:mt-6 md:flex-row md:flex-wrap md:justify-center md:gap-2.5",
        visible && "landing-hero-pills--visible",
      )}
    >
      {BADGES.map((badge, index) => {
        const isOpen = openIndex === index;

        return (
          <li
            key={badge.label}
            className={cn(
              "landing-hero-pill md:min-w-[10.5rem] md:max-w-[14rem] md:flex-1",
              isOpen && "landing-hero-pill--open",
            )}
            style={
              {
                "--hero-pill-delay": `${baseDelay + index * 120}ms`,
              } as CSSProperties
            }
          >
            <button
              type="button"
              className="landing-hero-pill__trigger flex w-full items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3.5 py-2 text-left transition-colors md:justify-center md:px-4"
              aria-expanded={isOpen}
              onClick={() => handleToggle(index)}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/20">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-foreground/90">
                {badge.label}
              </span>
            </button>
            <p
              className={cn(
                "landing-hero-pill__detail mx-auto max-w-xl px-2 text-sm leading-6 text-muted-foreground",
                isOpen && "landing-hero-pill__detail--visible",
              )}
              aria-hidden={!isOpen}
            >
              {badge.detail}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
