"use client";

import { Check, X } from "lucide-react";
import {
  LandingReveal,
  LandingRevealItem,
  LandingRevealStagger,
} from "@/components/landing/landing-reveal";

const rows = [
  {
    label: "Devis + facture liés",
    classic: false,
    batimum: true,
  },
  {
    label: "Planning employé dédié",
    classic: false,
    batimum: true,
  },
  {
    label: "Pilotage de marge chantier",
    classic: false,
    batimum: true,
  },
  {
    label: "Tout accessible sur téléphone",
    classic: false,
    batimum: true,
  },
  {
    label: "Fichiers Excel / WhatsApp",
    classic: true,
    batimum: false,
  },
] as const;

export function LandingComparisonSection() {
  return (
    <section id="comparatif" className="landing-section">
      <div className="landing-container">
        <LandingReveal variant="title">
          <header className="landing-section-header">
            <p className="landing-eyebrow">Comparatif</p>
            <h2 className="landing-h2">
              Arrêtez de bricoler
              <br />
              avec <span className="landing-mark">cinq outils</span>.
            </h2>
            <p className="landing-lead">
              Excel, WhatsApp, boîte mail… Batimum remplace le patchwork.
            </p>
          </header>
        </LandingReveal>

        <LandingReveal delay={80}>
          <div className="landing-compare">
            <div className="landing-compare__head">
              <span />
              <span>Avant</span>
              <span className="landing-compare__batimum">Batimum</span>
            </div>
            <LandingRevealStagger className="landing-compare__body">
              {rows.map((row) => (
                <LandingRevealItem key={row.label} className="landing-compare__row">
                  <span>{row.label}</span>
                  <span className="landing-compare__cell">
                    {row.classic ? (
                      <Check className="h-4 w-4 text-neutral-400" aria-label="Oui" />
                    ) : (
                      <X className="h-4 w-4 text-neutral-300" aria-label="Non" />
                    )}
                  </span>
                  <span className="landing-compare__cell landing-compare__cell--ok">
                    {row.batimum ? (
                      <Check className="h-4 w-4 text-primary" aria-label="Oui" />
                    ) : (
                      <X className="h-4 w-4 text-neutral-300" aria-label="Non" />
                    )}
                  </span>
                </LandingRevealItem>
              ))}
            </LandingRevealStagger>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
