"use client";

import { useEffect, useRef, useState } from "react";
import { LandingAppScreen } from "@/components/landing/landing-app-screens";
import {
  LandingLaptop,
  LandingPhone,
} from "@/components/landing/landing-device-frames";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: "devis",
    label: "Devis",
    title: "Un devis structuré en quelques minutes",
    text: "Décrivez le chantier. Organisez vos lots. Envoyez. Faites signer.",
    device: "laptop" as const,
    screen: "devis" as const,
  },
  {
    id: "planning",
    label: "Planning",
    title: "Vos équipes savent où aller",
    text: "Affectations, horaires et consignes — visibles sur le téléphone du salarié.",
    device: "phone" as const,
    screen: "planning" as const,
  },
  {
    id: "pilotage",
    label: "Pilotage",
    title: "La marge, chantier par chantier",
    text: "Heures, achats, facturation : voyez ce qui rapporte vraiment.",
    device: "laptop" as const,
    screen: "pilotage" as const,
  },
] as const;

export function LandingIaDemoSection() {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.2, rootMargin: "80px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !inView) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % STEPS.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [reduced, inView]);

  const step = STEPS[active];

  return (
    <section
      id="mum-ia"
      ref={sectionRef}
      className="landing-section landing-section--muted"
    >
      <div className="landing-container landing-demo">
        <LandingReveal variant="title">
          <header className="landing-section-header landing-section-header--left">
            <p className="landing-eyebrow">Dans la pratique</p>
            <h2 className="landing-h2">
              Voyez Batimum
              <br />
              <span className="landing-mark">au travail</span>.
            </h2>
            <p className="landing-lead">
              Des écrans réalistes — pas des promesses abstraites.
            </p>
          </header>
        </LandingReveal>

        <div className="landing-demo__layout">
          <div className="landing-demo__tabs" role="tablist" aria-label="Démos produit">
            {STEPS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === active}
                className={cn(
                  "landing-demo__tab",
                  index === active && "landing-demo__tab--active",
                )}
                onClick={() => setActive(index)}
              >
                <span className="landing-demo__tab-index">0{index + 1}</span>
                <span className="landing-demo__tab-body">
                  <span className="landing-demo__tab-label">{item.label}</span>
                  <span className="landing-demo__tab-title">{item.title}</span>
                  <span className="landing-demo__tab-text">{item.text}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="landing-demo__stage">
            <div
              key={step.id}
              className={cn(
                "landing-device-swap landing-device-swap--enter",
                step.device === "phone" && "landing-demo__device--phone",
              )}
            >
              {step.device === "laptop" ? (
                <LandingLaptop alive={inView && !reduced} size="md">
                  <LandingAppScreen id={step.screen} density="desk" />
                </LandingLaptop>
              ) : (
                <LandingPhone alive={inView && !reduced}>
                  <LandingAppScreen id={step.screen} density="phone" />
                </LandingPhone>
              )}
            </div>
            <p className="landing-demo__caption">{step.title}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
