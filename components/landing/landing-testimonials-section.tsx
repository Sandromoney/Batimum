"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Star } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { getPublicSignupHref } from "@/lib/private-beta";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    name: "Lucas S.",
    role: "Artisan maçon",
    quote:
      "Franchement très pratique, surtout pour les devis. Je gagne facilement une heure sur certaines demandes.",
  },
  {
    name: "Jean-Philippe D.",
    role: "Gérant d'entreprise",
    quote:
      "Au début j'étais pas forcément convaincu. Après quelques semaines je me suis rendu compte que je retrouvais tout beaucoup plus vite, surtout les infos clients et les chantiers en cours.",
  },
  {
    name: "Mathieu R.",
    role: "Plombier",
    quote:
      "MUM IA m'a surpris. Je balance les travaux en vrac et j'ai déjà une base de devis. Je corrige les prix derrière, mais sa m'évite de refaire les mêmes calculs à chaque fois.",
  },
  {
    name: "Sophie L.",
    role: "Dirigeante d'entreprise",
    quote:
      "Le pilotage m'a ouvert les yeux sur des chantiers où on perdait de l'argent sans le voir. Avant je regardais surtout le CA. Maintenant je vois aussi les heures, les achats et la marge par chantier.",
  },
  {
    name: "Antoine M.",
    role: "Artisan multi-services",
    quote: "Simple, propre et pas compliqué à comprendre.",
  },
  {
    name: "Nicolas B.",
    role: "Plaquiste",
    quote: "Le planning équipe c'est vraiment le point fort pour moi.",
  },
  {
    name: "Karim A.",
    role: "Carreleur",
    quote:
      "Les devis sont beaucoup plus rapide à faire. Quand c'est signé, la facture suit sans que je retape tout.",
  },
  {
    name: "Élodie P.",
    role: "Gestion administrative BTP",
    quote:
      "Côté organisation c'est beaucoup plus clair. Devis, factures, suivi chantier… tout est au même endroit. Moins de fichiers perdus, moins de stress en fin de mois.",
  },
] as const;

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 48;
const EXIT_MS = 450;
const FINAL_ENTER_DELAY_MS = 120;
const REPLAY_AUToplay_DELAY_MS = 600;
const LAST_INDEX = testimonials.length - 1;

function getInitials(name: string) {
  return name
    .replace(/\./g, "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function useVisibleSlideCount() {
  const [count, setCount] = useState(3);

  useEffect(() => {
    const lg = window.matchMedia("(min-width: 1024px)");
    const md = window.matchMedia("(min-width: 768px)");

    const update = () => {
      if (lg.matches) setCount(3);
      else if (md.matches) setCount(2);
      else setCount(1);
    };

    update();
    lg.addEventListener("change", update);
    md.addEventListener("change", update);
    return () => {
      lg.removeEventListener("change", update);
      md.removeEventListener("change", update);
    };
  }, []);

  return count;
}

function slideFlexBasis(visibleCount: number) {
  if (visibleCount === 3) return "calc((100% - 2rem) / 3.12)";
  if (visibleCount === 2) return "calc((100% - 1rem) / 2.08)";
  return "100%";
}

function StarRating() {
  return (
    <div className="flex gap-0.5" role="img" aria-label="5 étoiles sur 5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className="h-4 w-4 fill-[#10b981] text-[#10b981]"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function TestimonialCard({
  name,
  role,
  quote,
}: {
  name: string;
  role: string;
  quote: string;
}) {
  return (
    <blockquote className="landing-testimonials-card flex h-full min-h-[260px] flex-col rounded-[18px] border border-[rgba(15,23,42,0.06)] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:min-h-[280px] sm:p-7">
      <StarRating />
      <p className="mt-4 flex-1 text-[15px] leading-7 text-[#111827] sm:text-base">
        &ldquo;{quote}&rdquo;
      </p>
      <footer className="mt-6 border-t border-[rgba(15,23,42,0.06)] pt-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(16,185,129,0.1)] text-sm font-semibold text-[#0f766e]"
            aria-hidden="true"
          >
            {getInitials(name)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111827]">{name}</p>
            <p className="mt-0.5 text-sm text-[#64748b]">{role}</p>
          </div>
        </div>
      </footer>
    </blockquote>
  );
}

const FINAL_BENEFITS = [
  "Devis plus rapides",
  "Chantiers mieux organisés",
  "Rentabilité maîtrisée",
] as const;

function FinalMessageBlock({
  visible,
  reducedMotion,
  onReplay,
}: {
  visible: boolean;
  reducedMotion: boolean;
  onReplay: () => void;
}) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "landing-testimonials-final w-full",
        visible && "landing-testimonials-final--visible",
        reducedMotion && "landing-testimonials-final--reduced",
      )}
      aria-live="polite"
    >
      <article
        className={cn(
          "landing-testimonials-conclusion mx-auto w-full max-w-[900px] text-center",
          visible && "landing-testimonials-conclusion--active",
        )}
        aria-label="Message Batimum"
      >
        <div
          className="landing-testimonials-conclusion__badge inline-flex flex-col items-center gap-1.5"
          style={{ "--line-delay": "0s" } as CSSProperties}
        >
          <span
            className="text-sm tracking-[0.2em] text-[#10b981]"
            aria-hidden="true"
          >
            ★★★★★
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#64748b]">
            Les artisans nous recommandent
          </span>
        </div>

        <h3
          className="landing-testimonials-conclusion__title mt-6 text-3xl font-semibold tracking-tight text-[#111827] sm:mt-7 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]"
          style={{ "--line-delay": "0.2s" } as CSSProperties}
        >
          Et ce n&apos;est que le début.
        </h3>

        <p
          className="landing-testimonials-conclusion__text mx-auto mt-5 max-w-[680px] text-[15px] leading-7 text-[#374151] sm:mt-6 sm:text-base sm:leading-8"
          style={{ "--line-delay": "0.4s" } as CSSProperties}
        >
          Chaque semaine de nouveaux artisans rejoignent Batimum pour gagner du
          temps, mieux organiser leurs chantiers et suivre la rentabilité de
          leur entreprise.
        </p>

        <ul className="landing-testimonials-conclusion__benefits mx-auto mt-6 flex max-w-[640px] flex-col flex-wrap items-center justify-center gap-x-6 gap-y-2.5 sm:mt-7 sm:flex-row sm:gap-x-8">
          {FINAL_BENEFITS.map((benefit, benefitIndex) => (
            <li
              key={benefit}
              className="landing-testimonials-conclusion__benefit flex items-center justify-center gap-2 text-sm font-medium text-[#111827] sm:text-[15px]"
              style={
                {
                  "--line-delay": `${0.6 + benefitIndex * 0.15}s`,
                } as CSSProperties
              }
            >
              <Check
                className="h-4 w-4 shrink-0 text-[#10b981]"
                aria-hidden="true"
              />
              {benefit}
            </li>
          ))}
        </ul>

        <p
          className="landing-testimonials-conclusion__impact mt-6 text-lg font-semibold text-[#111827] sm:mt-7 sm:text-xl"
          style={{ "--line-delay": "1.05s" } as CSSProperties}
        >
          Et si le prochain témoignage était le vôtre ?
        </p>

        <div
          className="landing-testimonials-conclusion__cta-wrap mx-auto mt-8 flex w-full justify-center sm:mt-9"
          style={{ "--line-delay": "1.25s" } as CSSProperties}
        >
          <Link
            href={getPublicSignupHref()}
            className="landing-testimonials-conclusion__cta-primary relative inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#10b981] px-8 py-3.5 text-base font-semibold text-white no-underline shadow-[0_10px_28px_rgba(16,185,129,0.28)] transition-all hover:bg-[#059669] hover:shadow-[0_14px_36px_rgba(16,185,129,0.34)] active:scale-[0.98] sm:min-h-[54px] sm:w-auto sm:min-w-[280px]"
          >
            <span
              className="landing-testimonials-conclusion__cta-glow pointer-events-none absolute inset-0 rounded-xl"
              aria-hidden="true"
            />
            Découvrir Batimum
            <ArrowRight className="relative h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>

        <button
          type="button"
          className="landing-testimonials-conclusion__replay mt-5 text-sm font-medium text-[#64748b] underline-offset-4 transition-colors hover:text-[#10b981] hover:underline sm:mt-6"
          style={{ "--line-delay": "1.45s" } as CSSProperties}
          onClick={onReplay}
        >
          Relire les témoignages
        </button>
      </article>
    </div>
  );
}

export function LandingTestimonialsSection() {
  const pathname = usePathname();
  const carouselId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const replayTimerRef = useRef<number | null>(null);
  const autoplayTimerRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const visibleCount = useVisibleSlideCount();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [isExitingCarousel, setIsExitingCarousel] = useState(false);
  const [autoplayStopped, setAutoplayStopped] = useState(false);
  const [paused, setPaused] = useState(false);
  const [slideStep, setSlideStep] = useState(0);
  const [finalAnimKey, setFinalAnimKey] = useState(0);

  const carouselHidden = showFinalMessage || isExitingCarousel;

  const clearAllTimers = useCallback(() => {
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (replayTimerRef.current) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    if (autoplayTimerRef.current) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    setAutoplayStopped(false);
    setPaused(false);
  }, []);

  const resetTestimonials = useCallback(() => {
    clearAllTimers();
    touchStartX.current = null;
    setCurrentIndex(0);
    setShowFinalMessage(false);
    setIsExitingCarousel(false);
    setFinalAnimKey((key) => key + 1);
    startAutoplay();
  }, [clearAllTimers, startAutoplay]);

  const stopAutoplay = useCallback(() => {
    if (autoplayTimerRef.current) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setAutoplayStopped(true);
    setPaused(true);
  }, []);

  const triggerFinalTransition = useCallback(() => {
    if (showFinalMessage || isExitingCarousel) return;

    stopAutoplay();
    setIsExitingCarousel(true);
    setFinalAnimKey((key) => key + 1);

    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
    }

    const delay = reducedMotion ? 0 : EXIT_MS + FINAL_ENTER_DELAY_MS;
    exitTimerRef.current = window.setTimeout(() => {
      setShowFinalMessage(true);
      exitTimerRef.current = null;
    }, delay);
  }, [isExitingCarousel, reducedMotion, showFinalMessage, stopAutoplay]);

  const goToNextSlide = useCallback(() => {
    if (showFinalMessage || isExitingCarousel) return;

    if (currentIndex < LAST_INDEX) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    triggerFinalTransition();
  }, [
    currentIndex,
    isExitingCarousel,
    showFinalMessage,
    triggerFinalTransition,
  ]);

  const goToPrevSlide = useCallback(() => {
    if (showFinalMessage || isExitingCarousel) return;
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, isExitingCarousel, showFinalMessage]);

  const replayTestimonials = useCallback(() => {
    resetTestimonials();
    replayTimerRef.current = window.setTimeout(() => {
      startAutoplay();
      replayTimerRef.current = null;
    }, REPLAY_AUToplay_DELAY_MS);
  }, [resetTestimonials, startAutoplay]);

  const measureStep = useCallback(() => {
    const track = trackRef.current;
    const firstSlide = track?.firstElementChild as HTMLElement | null;
    if (!firstSlide) return;

    const styles = track ? window.getComputedStyle(track) : null;
    const gap = styles
      ? Number.parseFloat(styles.columnGap || styles.gap || "0")
      : 0;
    setSlideStep(firstSlide.offsetWidth + gap);
  }, []);

  useEffect(() => {
    measureStep();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(measureStep);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measureStep, visibleCount]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  useEffect(() => {
    const isLandingPath = pathname === "/" || pathname === "/landing";
    if (!isLandingPath) {
      clearAllTimers();
      return;
    }

    resetTestimonials();
  }, [clearAllTimers, pathname, resetTestimonials]);

  const goToDot = useCallback(
    (dotIndex: number) => {
      if (showFinalMessage || isExitingCarousel) return;
      setCurrentIndex(dotIndex);
      setPaused(true);
    },
    [isExitingCarousel, showFinalMessage],
  );

  useEffect(() => {
    if (
      reducedMotion ||
      paused ||
      autoplayStopped ||
      showFinalMessage ||
      isExitingCarousel
    ) {
      return;
    }

    if (autoplayTimerRef.current) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }

    autoplayTimerRef.current = window.setTimeout(() => {
      goToNextSlide();
      autoplayTimerRef.current = null;
    }, AUTOPLAY_MS);

    return () => {
      if (autoplayTimerRef.current) {
        window.clearTimeout(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };
  }, [
    autoplayStopped,
    currentIndex,
    goToNextSlide,
    isExitingCarousel,
    paused,
    reducedMotion,
    showFinalMessage,
  ]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (showFinalMessage || isExitingCarousel) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPaused(true);
      goToPrevSlide();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setPaused(true);
      goToNextSlide();
    }
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (showFinalMessage || isExitingCarousel) return;
    touchStartX.current = event.touches[0]?.clientX ?? null;
    setPaused(true);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (showFinalMessage || isExitingCarousel) return;

    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start == null || end == null) return;

    const delta = start - end;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;

    if (delta > 0) goToNextSlide();
    else goToPrevSlide();
  };

  const canGoNext = !carouselHidden && currentIndex <= LAST_INDEX;
  const canGoPrev = !carouselHidden && currentIndex > 0;
  const gapClass = visibleCount === 1 ? "gap-0" : "gap-4";
  const flexBasis = slideFlexBasis(visibleCount);

  return (
    <section id="temoignages" className="bg-transparent text-[#111827]">
      <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-8 lg:px-10">
        <LandingReveal variant="title">
          <header className="relative z-10 mx-auto mb-12 max-w-3xl text-center sm:mb-14">
            <h2 className="text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">
              Ce que nos utilisateurs disent
            </h2>
            <p className="mt-4 text-base leading-7 text-[#64748b] sm:text-lg sm:leading-8">
              Découvrez pourquoi les artisans et entreprises du bâtiment
              choisissent Batimum pour piloter leur activité au quotidien.
            </p>
          </header>
        </LandingReveal>

        <div
          className={cn(
            "landing-testimonials-stage relative",
            isExitingCarousel && "landing-testimonials-stage--exiting",
            showFinalMessage && "landing-testimonials-stage--final",
          )}
          onMouseEnter={() => {
            if (!autoplayStopped) setPaused(true);
          }}
          onMouseLeave={() => {
            if (!autoplayStopped) setPaused(false);
          }}
        >
          <div className="landing-testimonials-stage__slot min-h-[320px] sm:min-h-[360px]">
            {showFinalMessage ? (
              <FinalMessageBlock
                key={finalAnimKey}
                visible={showFinalMessage}
                reducedMotion={reducedMotion}
                onReplay={replayTestimonials}
              />
            ) : (
              <div
                className={cn(
                  "landing-testimonials-carousel relative",
                  isExitingCarousel && "landing-testimonials-carousel--exiting",
                )}
                onFocusCapture={() => {
                  if (!autoplayStopped) setPaused(true);
                }}
                onBlurCapture={(event) => {
                  if (
                    !autoplayStopped &&
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  ) {
                    setPaused(false);
                  }
                }}
              >
              <div
                id={carouselId}
                ref={viewportRef}
                className="landing-testimonials-carousel__viewport outline-none"
                tabIndex={carouselHidden ? -1 : 0}
                role="region"
                aria-roledescription="carrousel"
                aria-label="Avis utilisateurs Batimum"
                aria-hidden={carouselHidden}
                onKeyDown={handleKeyDown}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  ref={trackRef}
                  className={cn(
                    "landing-testimonials-carousel__track flex",
                    gapClass,
                    !reducedMotion &&
                      "landing-testimonials-carousel__track--animated",
                  )}
                  style={{
                    transform:
                      slideStep > 0
                        ? `translate3d(-${currentIndex * slideStep}px, 0, 0)`
                        : undefined,
                  }}
                >
                  {testimonials.map((item) => (
                    <div
                      key={item.name}
                      className="landing-testimonials-carousel__slide shrink-0"
                      style={{ flexBasis }}
                    >
                      <TestimonialCard {...item} />
                    </div>
                  ))}
                </div>
              </div>

              {canGoPrev ? (
                <button
                  type="button"
                  className="landing-testimonials-carousel__nav landing-testimonials-carousel__nav--prev absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 md:inline-flex"
                  aria-label="Avis précédent"
                  aria-controls={carouselId}
                  onClick={() => {
                    setPaused(true);
                    goToPrevSlide();
                  }}
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : null}

              {canGoNext ? (
                <button
                  type="button"
                  className="landing-testimonials-carousel__nav landing-testimonials-carousel__nav--next absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 md:inline-flex"
                  aria-label={
                    currentIndex === LAST_INDEX
                      ? "Afficher le message final"
                      : "Avis suivant"
                  }
                  aria-controls={carouselId}
                  onClick={() => {
                    setPaused(true);
                    goToNextSlide();
                  }}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : null}

              {!carouselHidden ? (
                <>
                  <div
                    className="mt-6 flex items-center justify-center gap-2 md:hidden"
                    role="tablist"
                    aria-label="Pagination des avis"
                  >
                    {testimonials.map((item, dotIndex) => (
                      <button
                        key={item.name}
                        type="button"
                        role="tab"
                        aria-selected={currentIndex === dotIndex}
                        aria-label={`Avis ${dotIndex + 1} sur ${testimonials.length} — ${item.name}`}
                        className={cn(
                          "landing-testimonials-carousel__dot h-2 w-2 rounded-full transition-colors",
                          currentIndex === dotIndex
                            ? "bg-[#10b981]"
                            : "bg-[#cbd5e1] hover:bg-[#94a3b8]",
                        )}
                        onClick={() => goToDot(dotIndex)}
                      />
                    ))}
                  </div>

                  <div className="mt-4 flex justify-center gap-3 md:hidden">
                    {canGoPrev ? (
                      <button
                        type="button"
                        className="landing-testimonials-carousel__nav landing-testimonials-carousel__nav--mobile inline-flex"
                        aria-label="Avis précédent"
                        aria-controls={carouselId}
                        onClick={() => {
                          setPaused(true);
                          goToPrevSlide();
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="inline-flex h-10 w-10" aria-hidden="true" />
                    )}
                    {canGoNext ? (
                      <button
                        type="button"
                        className="landing-testimonials-carousel__nav landing-testimonials-carousel__nav--mobile inline-flex"
                        aria-label={
                          currentIndex === LAST_INDEX
                            ? "Afficher le message final"
                            : "Avis suivant"
                        }
                        aria-controls={carouselId}
                        onClick={() => {
                          setPaused(true);
                          goToNextSlide();
                        }}
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="inline-flex h-10 w-10" aria-hidden="true" />
                    )}
                  </div>
                </>
              ) : null}
              </div>
            )}
          </div>
        </div>

        <p className="landing-testimonials-disclaimer">
          Les témoignages présentés proviennent de retours d&apos;utilisateurs
          ayant testé Batimum avant son lancement commercial.
        </p>
      </div>
    </section>
  );
}
