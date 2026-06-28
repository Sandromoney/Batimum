"use client";

import { Check } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import {
  LandingRevealItem,
  LandingRevealStagger,
} from "@/components/landing/landing-reveal";
import { Card } from "@/components/ui/card";

const DIFFERENTIATORS = [
  "IA intégrée qui génère vos devis",
  "Espace employé unique sur le marché BTP",
  "Planning terrain pour vos équipes",
  "Signature électronique intégrée",
  "Devis → facture sans ressaisie",
  "Compatible facture électronique 2026",
  "Conçu exclusivement pour les TPE du bâtiment",
] as const;

export function LandingDifferentiatorsSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-14 sm:px-8 lg:px-10">
      <LandingReveal variant="title">
        <header className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Différenciation
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Ça n&apos;existe nulle part ailleurs.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            Batimum réunit ce que les logiciels classiques dispersent — dans un
            seul outil pensé pour le terrain.
          </p>
        </header>
      </LandingReveal>

      <LandingRevealStagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DIFFERENTIATORS.map((item) => (
          <LandingRevealItem key={item}>
            <Card className="landing-card-interactive landing-diff-card h-full border-primary/20 bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary ring-1 ring-primary/30">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium leading-6 text-foreground/90">
                  {item}
                </p>
              </div>
            </Card>
          </LandingRevealItem>
        ))}
      </LandingRevealStagger>
    </section>
  );
}
