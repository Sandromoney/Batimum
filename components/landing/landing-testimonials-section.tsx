"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import {
  LANDING_TESTIMONIALS,
  LANDING_TESTIMONIALS_ARE_PLACEHOLDERS,
  type LandingTestimonial,
} from "@/lib/landing-testimonials";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function Stars() {
  return (
    <p className="lp-voices__stars" aria-hidden="true">
      {"★★★★★"}
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
  const [paused, setPaused] = useState(false);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);

  // Boucle : contenu doublé pour un défilement continu sans saut.
  const loopItems = [...LANDING_TESTIMONIALS, ...LANDING_TESTIMONIALS];

  useEffect(() => {
    const el = trackRef.current;
    if (!el || reduced) return;

    let raf = 0;
    let last = performance.now();
    const speed = 0.28; // px / ms — très lent

    const tick = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      if (!paused && !dragging.current) {
        el.scrollLeft += speed * dt;
        const half = el.scrollWidth / 2;
        if (half > 0 && el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, reduced]);

  const nudge = useCallback((dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".lp-voices__card");
    const step = (card?.offsetWidth ?? 320) + 16;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    dragging.current = true;
    setPaused(true);
    dragStartX.current = e.clientX;
    dragStartScroll.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || !dragging.current) return;
    el.scrollLeft = dragStartScroll.current - (e.clientX - dragStartX.current);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    dragging.current = false;
    el?.releasePointerCapture(e.pointerId);
    window.setTimeout(() => setPaused(false), 900);
  };

  return (
    <section
      id="temoignages"
      className="lp-section lp-voices"
      aria-labelledby="testimonials-title"
      data-placeholders={
        LANDING_TESTIMONIALS_ARE_PLACEHOLDERS ? "true" : "false"
      }
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
            {LANDING_TESTIMONIALS_ARE_PLACEHOLDERS ? (
              <p className="lp-voices__disclaimer">
                Aperçu des retours utilisateurs
              </p>
            ) : null}
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
        <div
          ref={trackRef}
          className="lp-voices__rail"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ transitionTimingFunction: EASE }}
        >
          {loopItems.map((item, index) => (
            <VoiceCard key={`${item.id}-${index}`} item={item} />
          ))}
        </div>

        <div className="lp-voices__railControls" aria-hidden="false">
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
            <LandingTrialCta className="lp-voices__trial" />
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
