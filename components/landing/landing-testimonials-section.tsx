"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import {
  LANDING_TESTIMONIALS,
  type LandingTestimonial,
} from "@/lib/landing-testimonials";

function Stars() {
  return (
    <p className="lp-voices__stars" aria-label="5 étoiles">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className="lp-voices__star"
          size={14}
          strokeWidth={0}
          fill="currentColor"
          aria-hidden="true"
        />
      ))}
    </p>
  );
}

function VoiceCard({ item }: { item: LandingTestimonial }) {
  const detail = item.teamSize
    ? `${item.role} · ${item.companyType} · ${item.teamSize}`
    : `${item.role} · ${item.companyType}`;

  return (
    <article className="lp-voices__card">
      <Stars />
      <blockquote className="lp-voices__quote">« {item.quote} »</blockquote>
      <footer className="lp-voices__meta">
        <span className="lp-voices__avatar" aria-hidden="true">
          {item.initials}
        </span>
        <span className="lp-voices__who">
          <span className="lp-voices__name">{item.displayName}</span>
          <span className="lp-voices__detail">{detail}</span>
        </span>
      </footer>
    </article>
  );
}

export function LandingTestimonialsSection() {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const [paused, setPaused] = useState(false);

  // Triple pour un défilement horizontal infini sans trou visible.
  const loopItems = [
    ...LANDING_TESTIMONIALS,
    ...LANDING_TESTIMONIALS,
    ...LANDING_TESTIMONIALS,
  ];

  const applyOffset = useCallback((value: number) => {
    const el = trackRef.current;
    if (!el) return;
    const loopWidth = el.scrollWidth / 3;
    let next = value;
    if (loopWidth > 0) {
      while (next >= loopWidth) next -= loopWidth;
      while (next < 0) next += loopWidth;
    }
    offsetRef.current = next;
    el.style.transform = `translate3d(${-next}px, 0, 0)`;
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || reduced) return;

    let raf = 0;
    let last = performance.now();
    const speed = 0.038;

    const tick = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      if (!pausedRef.current && !dragging.current) {
        applyOffset(offsetRef.current + speed * dt);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, applyOffset]);

  const nudge = useCallback(
    (dir: -1 | 1) => {
      const el = trackRef.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>(".lp-voices__card");
      const step = (card?.offsetWidth ?? 320) + 16;
      applyOffset(offsetRef.current + dir * step);
    },
    [applyOffset],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    dragging.current = true;
    setPaused(true);
    dragStartX.current = e.clientX;
    dragStartOffset.current = offsetRef.current;
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    applyOffset(dragStartOffset.current - (e.clientX - dragStartX.current));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    dragging.current = false;
    el?.releasePointerCapture(e.pointerId);
    window.setTimeout(() => setPaused(false), 700);
  };

  return (
    <section
      id="temoignages"
      className="lp-section lp-voices"
      aria-labelledby="testimonials-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head lp-voices__head">
            <p className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Avis
            </p>
            <h2 id="testimonials-title" className="lp-title lp-voices__title">
              Ce que Batimum change réellement{" "}
              <span className="lp-title-accent">au quotidien.</span>
            </h2>
            <p className="lp-subtitle lp-voices__lead">
              Des retours de dirigeants et d’équipes qui veulent passer moins de
              temps à chercher les informations et davantage à avancer.
            </p>
          </div>
        </LandingReveal>
      </div>

      <div
        className={[
          "lp-voices__railWrap",
          paused ? "is-paused" : "",
          reduced ? "is-reduced" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          if (!dragging.current) setPaused(false);
        }}
      >
        <div className="lp-voices__railViewport">
          <div
            ref={trackRef}
            className="lp-voices__rail"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {loopItems.map((item, index) => (
              <VoiceCard key={`${item.id}-${index}`} item={item} />
            ))}
          </div>
        </div>

        <div className="lp-voices__railControls">
          <button
            type="button"
            className="lp-voices__railBtn"
            aria-label="Avis précédent"
            onClick={() => nudge(-1)}
          >
            <ChevronLeft size={16} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="lp-voices__railBtn"
            aria-label="Avis suivant"
            onClick={() => nudge(1)}
          >
            <ChevronRight size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="lp-container">
        <LandingReveal delay={140}>
          <div className="lp-voices__footer">
            <p className="lp-voices__closing">
              Et si votre entreprise était la prochaine à gagner plusieurs
              heures chaque semaine ?
            </p>
            <LandingTrialCta
              className="lp-voices__trial"
              label="Essayer Batimum"
            />
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
