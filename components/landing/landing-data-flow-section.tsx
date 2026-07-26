"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  FileText,
  HardHat,
  Receipt,
  User,
  type LucideIcon,
} from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type FlowStep = {
  id: string;
  label: string;
  detail: string;
  icon: LucideIcon;
};

const STEPS: readonly FlowStep[] = [
  {
    id: "client",
    label: "Client",
    detail: "M. Dupont",
    icon: User,
  },
  {
    id: "devis",
    label: "Devis",
    detail: "Rénovation salle de bain — 8 450 € HT",
    icon: FileText,
  },
  {
    id: "facture",
    label: "Facture",
    detail: "Facture créée",
    icon: Receipt,
  },
  {
    id: "chantier",
    label: "Chantier",
    detail: "Travaux en cours",
    icon: HardHat,
  },
  {
    id: "planning",
    label: "Planning",
    detail: "Lucas affecté mardi",
    icon: CalendarDays,
  },
  {
    id: "pilotage",
    label: "Pilotage",
    detail: "Marge prévisionnelle visible",
    icon: BarChart3,
  },
] as const;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function useIsDesktop() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

function useScrollProgress(trackRef: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const travel = Math.max(1, track.offsetHeight - window.innerHeight);
      setProgress(clamp01(-rect.top / travel));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [trackRef]);

  return progress;
}

export function LandingDataFlowSection() {
  const reducedMotion = usePrefersReducedMotion();
  const isDesktop = useIsDesktop();
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useScrollProgress(trackRef);
  const [autoProgress, setAutoProgress] = useState(0);
  const [mobileActive, setMobileActive] = useState(false);

  useEffect(() => {
    const node = stickyRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setMobileActive(true);
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || isDesktop || !mobileActive) return;

    let start = 0;
    let frame = 0;
    const duration = 7000;

    const tick = (now: number) => {
      if (!start) start = now;
      const t = clamp01((now - start) / duration);
      setAutoProgress(t);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion, isDesktop, mobileActive]);

  const progress = reducedMotion
    ? 1
    : isDesktop
      ? scrollProgress
      : autoProgress;

  const maxIndex = STEPS.length - 1;
  const activeIndex = Math.min(
    maxIndex,
    Math.floor(progress * STEPS.length * 0.999),
  );

  return (
    <section
      id="donnees-reliees"
      className="landing-data-flow"
      aria-label="Parcours des données reliées dans Batimum"
    >
      <div ref={trackRef} className="landing-data-flow__track">
        <div ref={stickyRef} className="landing-data-flow__sticky">
          <div className="landing-container">
            <header className="landing-data-flow__header">
              <h2 className="landing-data-flow__title">
                Une seule saisie. Toute votre gestion avance.
              </h2>
              <p className="landing-data-flow__lead">
                Le client, le devis, la facture, le chantier et le planning
                restent liés dans un seul espace.
              </p>
            </header>

            <div
              className="landing-data-flow__board"
              style={
                {
                  "--flow-progress-ratio": String(progress),
                } as CSSProperties
              }
            >
              <div className="landing-data-flow__line" aria-hidden>
                <span className="landing-data-flow__line-track" />
                <span className="landing-data-flow__line-fill" />
              </div>

              <ol className="landing-data-flow__steps">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const done = index < activeIndex;
                  const active = index === activeIndex;
                  const upcoming = index > activeIndex;

                  return (
                    <li
                      key={step.id}
                      className={cn(
                        "landing-data-flow__step",
                        done && "landing-data-flow__step--done",
                        active && "landing-data-flow__step--active",
                        upcoming && "landing-data-flow__step--upcoming",
                      )}
                    >
                      <div className="landing-data-flow__card">
                        <div className="landing-data-flow__card-top">
                          <span className="landing-data-flow__icon" aria-hidden>
                            {done || active ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Icon className="h-4 w-4" />
                            )}
                          </span>
                          <span className="landing-data-flow__label">
                            {step.label}
                          </span>
                        </div>
                        <p className="landing-data-flow__detail">
                          {step.detail}
                        </p>
                      </div>
                      {index < STEPS.length - 1 ? (
                        <span
                          className="landing-data-flow__arrow"
                          aria-hidden
                        >
                          →
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>

            <p className="landing-data-flow__complement">
              Plus besoin de ressaisir les mêmes informations dans plusieurs
              outils.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
