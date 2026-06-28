"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const DEMO_STEPS = [
  {
    label: "Demande client",
    detail: "Rénovation salle de bain",
  },
  {
    label: "MUM IA",
    detail: "Devis prêt à vérifier",
  },
  {
    label: "Planning",
    detail: "Équipe affectée au chantier",
  },
  {
    label: "Facture",
    detail: "Facture prête après validation",
  },
] as const;

type LandingHeroDemoProps = {
  active: boolean;
};

export function LandingHeroDemo({ active }: LandingHeroDemoProps) {
  const [highlight, setHighlight] = useState(0);
  const [looping, setLooping] = useState(false);

  useEffect(() => {
    if (!active) return;

    const startLoop = window.setTimeout(() => setLooping(true), 1400);
    return () => window.clearTimeout(startLoop);
  }, [active]);

  useEffect(() => {
    if (!looping) return;

    const interval = window.setInterval(() => {
      setHighlight((current) => (current + 1) % DEMO_STEPS.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, [looping]);

  return (
    <div
      className={cn(
        "landing-hero-demo",
        active && "landing-hero-demo--visible",
      )}
      aria-hidden="true"
    >
      <div className="landing-hero-demo__card rounded-2xl border border-border/60 bg-card/80 p-5 shadow-card sm:p-6">
        <div className="landing-hero-demo__track relative">
          <div
            className="landing-hero-demo__line absolute left-[11px] top-3 bottom-3 w-px bg-border/80"
            aria-hidden="true"
          >
            <div
              className="landing-hero-demo__line-fill absolute inset-x-0 top-0 bg-primary/70"
              style={{
                height: `${((highlight + 1) / DEMO_STEPS.length) * 100}%`,
              }}
            />
          </div>

          <ol className="relative space-y-4">
            {DEMO_STEPS.map((step, index) => {
              const isActive = looping && highlight === index;
              const isLit = looping && index <= highlight;

              return (
                <li
                  key={step.label}
                  className={cn(
                    "landing-hero-demo__step flex gap-4",
                    active && "landing-hero-demo__step--enter",
                    isLit && "landing-hero-demo__step--lit",
                    isActive && "landing-hero-demo__step--active",
                  )}
                  style={
                    {
                      "--hero-demo-delay": `${900 + index * 120}ms`,
                    } as CSSProperties
                  }
                >
                  <span className="landing-hero-demo__dot relative z-10 mt-1 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-border/80 bg-background">
                    <span className="landing-hero-demo__dot-core h-2 w-2 rounded-full bg-primary/40" />
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl border border-transparent px-3 py-2.5 transition-colors duration-500">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {step.label}
                    </p>
                    <p className="mt-1 text-sm font-medium leading-5 text-foreground/90">
                      {step.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
