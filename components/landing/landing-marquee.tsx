"use client";

import { cn } from "@/lib/utils";

const MARQUEE_ITEMS = [
  { label: "LE SEUL LOGICIEL BTP AVEC ESPACE EMPLOYÉ DÉDIÉ", highlight: true },
  { label: "IA QUI GÉNÈRE VOS DEVIS EN QUELQUES LIGNES", highlight: true },
  { label: "ZÉRO DOUBLE SAISIE" },
  { label: "VOS EMPLOYÉS SAVENT OÙ ALLER SANS VOUS APPELER", highlight: true },
  { label: "DEVIS → CHANTIER → FACTURE AUTOMATIQUEMENT" },
  { label: "PENSÉ POUR LES TPE, PAS POUR LES COMPTABLES", highlight: true },
] as const;

function MarqueeTrack() {
  const sequence = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="landing-marquee__track landing-marquee__track--slow-premium flex w-max items-center gap-8">
      {sequence.map((item, index) => (
        <span
          key={`${item.label}-${index}`}
          className="inline-flex shrink-0 items-center gap-8"
        >
          <span
            className={cn(
              "text-[0.65rem] font-medium uppercase tracking-[0.2em] sm:text-xs",
              "highlight" in item && item.highlight
                ? "text-primary/85"
                : "text-muted-foreground/50",
            )}
          >
            {item.label}
          </span>
          <span className="text-border/30" aria-hidden="true">
            ·
          </span>
        </span>
      ))}
    </div>
  );
}

type LandingMarqueeProps = {
  className?: string;
};

export function LandingMarquee({ className }: LandingMarqueeProps) {
  return (
    <div
      className={cn(
        "landing-marquee landing-marquee--subtle relative overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <div className="landing-marquee__fade landing-marquee__fade--left" />
      <div className="landing-marquee__fade landing-marquee__fade--right" />
      <MarqueeTrack />
    </div>
  );
}
