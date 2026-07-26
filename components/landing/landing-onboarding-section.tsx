"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { ArrowRight, Check } from "lucide-react";
import { getPublicSignupHref } from "@/lib/private-beta";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const STEPS = [
  "Compléter l’entreprise",
  "Ajouter le logo",
  "Ajouter un client",
  "Créer le premier devis",
  "Créer un chantier",
  "Planifier une intervention",
  "Envoyer la première facture",
] as const;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
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

export function LandingOnboardingSection() {
  const reducedMotion = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useScrollProgress(trackRef);
  const [autoProgress, setAutoProgress] = useState(0);
  const [active, setActive] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const signupHref = getPublicSignupHref();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const node = stickyRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setActive(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || isDesktop || !active) return;

    let start = 0;
    let frame = 0;
    const duration = 4200;

    const tick = (now: number) => {
      if (!start) start = now;
      const t = clamp01((now - start) / duration);
      setAutoProgress(t);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion, isDesktop, active]);

  const progress = reducedMotion
    ? 1
    : isDesktop
      ? scrollProgress
      : autoProgress;

  const checkedCount = Math.min(
    STEPS.length,
    Math.floor(progress * STEPS.length + (progress >= 0.98 ? 1 : 0.001)),
  );
  const complete = checkedCount >= STEPS.length;
  const barPct = Math.round((checkedCount / STEPS.length) * 100);

  return (
    <section
      id="demarrage"
      className="landing-onboard"
      aria-label="Mise en route Batimum"
    >
      <div ref={trackRef} className="landing-onboard__track">
        <div ref={stickyRef} className="landing-onboard__sticky">
          <div className="landing-container">
            <header className="landing-onboard__header">
              <h2 className="landing-onboard__title">
                Opérationnel dès les premiers jours.
              </h2>
              <p className="landing-onboard__lead">
                Batimum vous guide pour mettre en place l’essentiel sans perdre
                de temps.
              </p>
            </header>

            <div className="landing-onboard__card">
              <div className="landing-onboard__progress">
                <div className="landing-onboard__progress-meta">
                  <span>Mise en place</span>
                  <strong>
                    {checkedCount}/{STEPS.length}
                  </strong>
                </div>
                <div
                  className="landing-onboard__bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={barPct}
                  aria-label="Progression de la mise en place"
                >
                  <span
                    className="landing-onboard__bar-fill"
                    style={
                      {
                        "--onboard-progress-ratio": String(barPct / 100),
                      } as CSSProperties
                    }
                  />
                </div>
              </div>

              <ol className="landing-onboard__list">
                {STEPS.map((step, index) => {
                  const checked = index < checkedCount;
                  const current =
                    index === checkedCount && checkedCount < STEPS.length;
                  return (
                    <li
                      key={step}
                      className={cn(
                        "landing-onboard__item",
                        checked && "landing-onboard__item--checked",
                        current && "landing-onboard__item--current",
                      )}
                    >
                      <span className="landing-onboard__check" aria-hidden>
                        {checked ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="landing-onboard__label">{step}</span>
                    </li>
                  );
                })}
              </ol>

              <div
                className={cn(
                  "landing-onboard__result",
                  complete && "landing-onboard__result--visible",
                )}
              >
                <p className="landing-onboard__ready">
                  Votre entreprise est prête dans Batimum.
                </p>
                <Link
                  href={signupHref}
                  className="landing-btn-primary group landing-onboard__cta"
                >
                  Commencer maintenant
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
