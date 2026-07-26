"use client";

import { useEffect, useState } from "react";
import { ArrowDown, Check } from "lucide-react";
import { LandingCtaLink } from "@/components/landing/landing-cta-link";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { Card } from "@/components/ui/card";
import { useInView } from "@/lib/hooks/use-in-view";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { getPublicSignupHref } from "@/lib/private-beta";
import { cn } from "@/lib/utils";

const STEP_DURATION_MS = 3000;
const FADE_MS = 500;

const IA_FLOW_STEPS = [
  {
    id: "description",
    label: "Description chantier",
    hint: "Décrivez simplement les travaux à réaliser.",
    description:
      "Décrivez simplement le projet du client. Batimum comprend le périmètre et prépare la suite.",
  },
  {
    id: "analyse",
    label: "Analyse IA",
    hint: "Batimum identifie automatiquement les postes nécessaires.",
    description:
      "L'IA détecte les corps de métier, les quantités et les contraintes du chantier.",
  },
  {
    id: "creation",
    label: "Création automatique",
    hint: "Le devis complet se construit sans ressaisie.",
    description:
      "Les lignes, quantités et structures du devis sont générées automatiquement.",
  },
  {
    id: "pdf",
    label: "PDF prêt",
    hint: "Le document est mis en forme avec votre entreprise.",
    description:
      "Le PDF est prêt avec votre identité visuelle, vos mentions et vos totaux.",
  },
  {
    id: "signature",
    label: "Signature électronique",
    hint: "Le client signe depuis son téléphone en quelques secondes.",
    description:
      "Envoi au client, signature en ligne, devis validé — le chantier peut démarrer.",
  },
] as const;

const STEP_NUMERALS = ["①", "②", "③", "④", "⑤"] as const;

function FlowArrow({
  lit,
  filling,
}: {
  lit: boolean;
  filling: boolean;
}) {
  return (
    <div
      className={cn(
        "landing-ia-flow__arrow flex justify-center py-0.5",
        lit && "landing-ia-flow__arrow--lit",
        filling && "landing-ia-flow__arrow--filling",
      )}
      aria-hidden="true"
    >
      <span className="landing-ia-flow__arrow-track" />
      <span className="landing-ia-flow__arrow-fill" />
      <ArrowDown
        className="landing-ia-flow__arrow-icon h-4 w-4"
        strokeWidth={2.25}
      />
    </div>
  );
}

export function LandingIaDemoSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [contentVisible, setContentVisible] = useState(true);
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.25,
    once: false,
  });
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const goToStep = (index: number) => {
    setContentVisible(true);
    setActiveStep(index);
  };

  useEffect(() => {
    if (!inView) {
      setActiveStep(0);
      setContentVisible(true);
    }
  }, [inView]);

  useEffect(() => {
    if (!inView || paused || reducedMotion) return;

    const fadeOutTimer = window.setTimeout(
      () => setContentVisible(false),
      STEP_DURATION_MS - FADE_MS,
    );

    const advanceTimer = window.setTimeout(() => {
      setActiveStep((current) => (current + 1) % IA_FLOW_STEPS.length);
      setContentVisible(true);
    }, STEP_DURATION_MS);

    return () => {
      window.clearTimeout(fadeOutTimer);
      window.clearTimeout(advanceTimer);
    };
  }, [activeStep, inView, paused, reducedMotion]);

  const current = IA_FLOW_STEPS[activeStep];

  return (
    <section
      id="mum-ia"
      className="landing-section-glow mx-auto w-full max-w-7xl px-6 py-16 sm:px-8 lg:px-10"
    >
      <div
        ref={ref}
        className="relative z-10 grid items-start gap-10 lg:grid-cols-2 lg:gap-14"
      >
        <LandingReveal className="lg:order-1">
          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <Card className="landing-card-interactive landing-ia-flow border-primary/30 bg-card-elevated/45 p-6 sm:p-8">
              <div className="landing-ia-flow__steps">
                {IA_FLOW_STEPS.map((step, index) => {
                  const isActive = index === activeStep;
                  const isDone = index < activeStep;

                  return (
                    <div key={step.id} className="landing-ia-flow__block">
                      <button
                        type="button"
                        className={cn(
                          "landing-ia-flow__step w-full rounded-xl border px-4 py-3.5 text-left",
                          isActive && "landing-ia-flow__step--active",
                          isDone && !isActive && "landing-ia-flow__step--done",
                          !isActive &&
                            !isDone &&
                            "landing-ia-flow__step--pending",
                        )}
                        onClick={() => goToStep(index)}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "landing-ia-flow__badge flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              isActive && "landing-ia-flow__badge--active",
                              isDone && !isActive && "landing-ia-flow__badge--done",
                              !isActive &&
                                !isDone &&
                                "landing-ia-flow__badge--idle",
                            )}
                          >
                            {isDone ? (
                              <Check
                                className="landing-ia-flow__badge-mark h-3.5 w-3.5"
                                aria-hidden="true"
                                strokeWidth={2.5}
                              />
                            ) : (
                              <span className="landing-ia-flow__badge-mark">
                                {index + 1}
                              </span>
                            )}
                          </span>
                          <span
                            className={cn(
                              "landing-ia-flow__step-label text-sm font-semibold",
                              isActive
                                ? "text-primary"
                                : isDone
                                  ? "text-foreground/90"
                                  : "text-foreground/75",
                            )}
                          >
                            <span
                              className="mr-1.5 text-muted-foreground/80"
                              aria-hidden="true"
                            >
                              {STEP_NUMERALS[index]}
                            </span>
                            {step.label}
                          </span>
                        </div>
                      </button>

                      {isActive ? (
                        <p
                          className={cn(
                            "landing-ia-flow__hint",
                            contentVisible
                              ? "landing-ia-flow__hint--in"
                              : "landing-ia-flow__hint--out",
                          )}
                        >
                          {step.hint}
                        </p>
                      ) : null}

                      {index < IA_FLOW_STEPS.length - 1 ? (
                        <FlowArrow
                          lit={index < activeStep - 1}
                          filling={
                            activeStep > 0 && index === activeStep - 1
                          }
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-center" aria-hidden="true">
                {IA_FLOW_STEPS.map((step, index) => (
                  <span
                    key={step.id}
                    className={cn(
                      "landing-ia-flow__progress-dot mx-1 h-1.5 rounded-full",
                      index === activeStep
                        ? "landing-ia-flow__progress-dot--active w-6 bg-primary"
                        : index < activeStep
                          ? "landing-ia-flow__progress-dot--done w-2 bg-primary/50"
                          : "w-1.5 bg-border",
                    )}
                  />
                ))}
              </div>
            </Card>
          </div>
        </LandingReveal>

        <LandingReveal variant="title" delay={80} className="lg:order-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            MUM IA intégrée
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Décrivez le chantier.
            <br />
            Le devis apparaît.
          </h2>

          <div
            className={cn(
              "landing-ia-flow__detail mt-6",
              contentVisible
                ? "landing-ia-flow__detail--in"
                : "landing-ia-flow__detail--out",
            )}
            aria-live="polite"
          >
            <p className="landing-ia-flow__detail-step text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Étape {activeStep + 1}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {current.label}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {current.description}
            </p>
          </div>

          <p className="mt-6 text-sm leading-7 text-muted-foreground/90">
            Je décris mon chantier. Batimum fait absolument tout le reste — du
            brief au PDF signé, sans ressaisie.
          </p>

          <div className="mt-8">
            <LandingCtaLink href={getPublicSignupHref()}>Voir un devis généré</LandingCtaLink>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
