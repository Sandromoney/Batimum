"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownUp,
  Building2,
  Calendar,
  Camera,
  ClipboardList,
  FileText,
  HardHat,
  LineChart,
  MapPin,
  Receipt,
  Users,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const BUREAU = [
  { label: "Devis", Icon: FileText },
  { label: "Factures", Icon: Receipt },
  { label: "Clients", Icon: Users },
  { label: "Planning global", Icon: Calendar },
  { label: "Rentabilité", Icon: LineChart },
  { label: "Pilotage", Icon: Building2 },
] as const;

const TERRAIN = [
  { label: "Planning du jour", Icon: Calendar },
  { label: "Coordonnées du client", Icon: Users },
  { label: "Consignes", Icon: ClipboardList },
  { label: "Documents", Icon: FileText },
  { label: "Photos", Icon: Camera },
  { label: "Avancement", Icon: HardHat },
  { label: "Itinéraire", Icon: MapPin },
] as const;

const FLOW = [
  "Une information créée au bureau",
  "Disponible sur le terrain",
  "Une remontée revient au bureau",
] as const;

export function LandingTerrainSection() {
  const reduced = usePrefersReducedMotion();
  const [flowStep, setFlowStep] = useState(0);

  useEffect(() => {
    if (reduced) {
      setFlowStep(FLOW.length - 1);
      return;
    }
    const id = window.setInterval(() => {
      setFlowStep((current) => (current + 1) % FLOW.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <section
      id="bureau-terrain"
      className="lp-section"
      aria-labelledby="terrain-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <h2 id="terrain-title" className="lp-title max-w-3xl">
              Une seule solution, du bureau au chantier.
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Organisez votre entreprise depuis le bureau et retrouvez les
              informations essentielles directement sur le terrain.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-dual">
          <LandingReveal direction="left">
            <article className="lp-dual__panel">
              <h3 className="lp-dual__title">Bureau</h3>
              <ul className="lp-dual__list">
                {BUREAU.map(({ label, Icon }) => (
                  <li key={label}>
                    <Icon size={16} strokeWidth={1.75} aria-hidden />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </article>
          </LandingReveal>

          <LandingReveal delay={100}>
            <div className="lp-dual__flow" aria-live="polite">
              <ArrowDownUp
                className="lp-dual__flow-icon"
                size={18}
                strokeWidth={1.75}
                aria-hidden
              />
              {FLOW.map((label, index) => (
                <p
                  key={label}
                  className={cn(
                    "lp-dual__flow-step",
                    flowStep === index && "is-active",
                  )}
                >
                  {label}
                </p>
              ))}
            </div>
          </LandingReveal>

          <LandingReveal direction="right" delay={80}>
            <article className="lp-dual__panel lp-dual__panel--terrain">
              <h3 className="lp-dual__title">Terrain</h3>
              <ul className="lp-dual__list">
                {TERRAIN.map(({ label, Icon }) => (
                  <li key={label}>
                    <Icon size={16} strokeWidth={1.75} aria-hidden />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </article>
          </LandingReveal>
        </div>

        <LandingReveal delay={160}>
          <p className="lp-dual__closing">
            Tout le monde travaille avec les mêmes informations.
          </p>
        </LandingReveal>
      </div>
    </section>
  );
}
