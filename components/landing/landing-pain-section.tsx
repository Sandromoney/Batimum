"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  FileCheck2,
  Users,
  CalendarDays,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { LandingReveal } from "@/components/landing/landing-reveal";

type SolutionCard = {
  id: string;
  title: string;
  text: string;
  Icon: LucideIcon;
};

const SOLUTION_CARDS: SolutionCard[] = [
  {
    id: "devis",
    title: "Vos devis sont prêts en quelques minutes.",
    text: "Décrivez simplement les travaux et obtenez une première version de votre devis prête à être ajustée.",
    Icon: FileCheck2,
  },
  {
    id: "equipe",
    title: "Toute votre équipe retrouve les informations immédiatement.",
    text: "Clients, documents, photos, devis, planning et historique sont réunis dans une seule application.",
    Icon: Users,
  },
  {
    id: "planning",
    title: "Votre planning reste toujours à jour.",
    text: "Chaque intervention est centralisée et vos équipes savent immédiatement où aller.",
    Icon: CalendarDays,
  },
  {
    id: "rentabilite",
    title: "Vous pilotez enfin votre rentabilité.",
    text: "Visualisez vos marges, vos coûts et vos performances en temps réel pour prendre de meilleures décisions.",
    Icon: LineChart,
  },
];

const MICRO_LINES = [
  "Chaque jour.",
  "À chaque devis.",
  "À chaque appel.",
  "À chaque oubli.",
  "À chaque chantier.",
] as const;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Soft opacity envelope via function (avoids WAAPI keyframe offset issues). */
function useEnvelope(
  progress: MotionValue<number>,
  fadeIn: number,
  holdStart: number,
  holdEnd: number,
  fadeOut: number,
) {
  return useTransform(progress, (raw) => {
    const p = clamp01(raw);
    if (p <= fadeIn) return 0;
    if (p < holdStart) {
      const span = holdStart - fadeIn;
      return span <= 0 ? 1 : (p - fadeIn) / span;
    }
    if (p <= holdEnd) return 1;
    if (p < fadeOut) {
      const span = fadeOut - holdEnd;
      return span <= 0 ? 0 : 1 - (p - holdEnd) / span;
    }
    return 0;
  });
}

function useSoftY(
  progress: MotionValue<number>,
  fadeIn: number,
  holdStart: number,
  holdEnd: number,
  fadeOut: number,
  from = 14,
  to = -8,
) {
  return useTransform(progress, (raw) => {
    const p = clamp01(raw);
    if (p <= fadeIn) return from;
    if (p < holdStart) {
      const t = holdStart - fadeIn <= 0 ? 1 : (p - fadeIn) / (holdStart - fadeIn);
      return from + (0 - from) * t;
    }
    if (p <= holdEnd) return 0;
    if (p < fadeOut) {
      const t = fadeOut - holdEnd <= 0 ? 1 : (p - holdEnd) / (fadeOut - holdEnd);
      return 0 + (to - 0) * t;
    }
    return to;
  });
}

function StoryPinned({
  progress,
}: {
  progress: MotionValue<number>;
}) {
  /* Étape 1 — titre immersif (visible dès le pin) */
  const titleOpacity = useTransform(progress, (raw) => {
    const p = clamp01(raw);
    if (p <= 0.54) return 1;
    if (p >= 0.6) return 0;
    return 1 - (p - 0.54) / 0.06;
  });
  const titleY = useTransform(progress, (raw) => {
    const p = clamp01(raw);
    if (p <= 0.54) return 0;
    if (p >= 0.6) return -10;
    return ((p - 0.54) / 0.06) * -10;
  });

  /* Étapes 2–6 — micro lignes qui se remplacent */
  const microWindows = useMemo(
    () =>
      MICRO_LINES.map((_, i) => {
        const start = 0.12 + i * 0.085;
        const end = start + 0.085;
        return {
          fadeIn: start,
          holdStart: start + 0.018,
          holdEnd: end - 0.018,
          fadeOut: end,
        };
      }),
    [],
  );

  const micro0O = useEnvelope(
    progress,
    microWindows[0].fadeIn,
    microWindows[0].holdStart,
    microWindows[0].holdEnd,
    microWindows[0].fadeOut,
  );
  const micro0Y = useSoftY(
    progress,
    microWindows[0].fadeIn,
    microWindows[0].holdStart,
    microWindows[0].holdEnd,
    microWindows[0].fadeOut,
    10,
    -6,
  );
  const micro1O = useEnvelope(
    progress,
    microWindows[1].fadeIn,
    microWindows[1].holdStart,
    microWindows[1].holdEnd,
    microWindows[1].fadeOut,
  );
  const micro1Y = useSoftY(
    progress,
    microWindows[1].fadeIn,
    microWindows[1].holdStart,
    microWindows[1].holdEnd,
    microWindows[1].fadeOut,
    10,
    -6,
  );
  const micro2O = useEnvelope(
    progress,
    microWindows[2].fadeIn,
    microWindows[2].holdStart,
    microWindows[2].holdEnd,
    microWindows[2].fadeOut,
  );
  const micro2Y = useSoftY(
    progress,
    microWindows[2].fadeIn,
    microWindows[2].holdStart,
    microWindows[2].holdEnd,
    microWindows[2].fadeOut,
    10,
    -6,
  );
  const micro3O = useEnvelope(
    progress,
    microWindows[3].fadeIn,
    microWindows[3].holdStart,
    microWindows[3].holdEnd,
    microWindows[3].fadeOut,
  );
  const micro3Y = useSoftY(
    progress,
    microWindows[3].fadeIn,
    microWindows[3].holdStart,
    microWindows[3].holdEnd,
    microWindows[3].fadeOut,
    10,
    -6,
  );
  const micro4O = useEnvelope(
    progress,
    microWindows[4].fadeIn,
    microWindows[4].holdStart,
    microWindows[4].holdEnd,
    microWindows[4].fadeOut,
  );
  const micro4Y = useSoftY(
    progress,
    microWindows[4].fadeIn,
    microWindows[4].holdStart,
    microWindows[4].holdEnd,
    microWindows[4].fadeOut,
    10,
    -6,
  );

  const microOps = [micro0O, micro1O, micro2O, micro3O, micro4O];
  const microYs = [micro0Y, micro1Y, micro2Y, micro3Y, micro4Y];

  /* Étape 7–8 — « Ce temps… reste perdu. » → « pour toujours. » */
  const lostOpacity = useEnvelope(progress, 0.62, 0.66, 0.86, 0.9);
  const lostY = useSoftY(progress, 0.62, 0.66, 0.86, 0.9, 16, -8);

  const perduOpacity = useEnvelope(progress, 0.62, 0.66, 0.73, 0.77);
  const foreverOpacity = useEnvelope(progress, 0.75, 0.79, 0.86, 0.9);
  const foreverY = useSoftY(progress, 0.75, 0.79, 0.86, 0.9, 8, -6);

  /* Étape 9 — question finale */
  const finalOpacity = useEnvelope(progress, 0.88, 0.92, 0.995, 1.001);
  const finalY = useSoftY(progress, 0.88, 0.92, 0.995, 1.001, 20, 0);

  return (
    <div className="lp-story__stage" aria-hidden="true">
      <motion.div
        className="lp-story__layer lp-story__layer--main"
        style={{ opacity: titleOpacity, y: titleY }}
      >
        <p className="lp-story__headline">
          Votre entreprise perd{" "}
          <span className="lp-story__headlineEmphasis">du temps.</span>
        </p>
        <div className="lp-story__microSlot">
          {MICRO_LINES.map((line, i) => (
            <motion.p
              key={line}
              className="lp-story__micro"
              style={{ opacity: microOps[i], y: microYs[i] }}
            >
              {line}
            </motion.p>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="lp-story__layer"
        style={{ opacity: lostOpacity, y: lostY }}
      >
        <p className="lp-story__lostLead">Ce temps…</p>
        <div className="lp-story__lostSwap">
          <motion.p
            className="lp-story__lostLine"
            style={{ opacity: perduOpacity }}
          >
            reste <span className="lp-story__lostWarm">perdu</span>.
          </motion.p>
          <motion.p
            className="lp-story__lostLine lp-story__lostLine--forever"
            style={{ opacity: foreverOpacity, y: foreverY }}
          >
            pour toujours.
          </motion.p>
        </div>
      </motion.div>

      <motion.div
        className="lp-story__layer"
        style={{ opacity: finalOpacity, y: finalY }}
      >
        <p className="lp-story__final">
          Et si vous pouviez récupérer{" "}
          <span className="lp-story__finalAccent">plusieurs heures</span>
          …
          <br />
          chaque semaine&nbsp;?
        </p>
      </motion.div>
    </div>
  );
}

function StoryStatic() {
  return (
    <div className="lp-story__stage lp-story__stage--static">
      <p className="lp-story__headline">
        Votre entreprise perd{" "}
        <span className="lp-story__headlineEmphasis">du temps.</span>
      </p>
      <p className="lp-story__lostLead">Ce temps… pour toujours.</p>
      <p className="lp-story__final">
        Et si vous pouviez récupérer{" "}
        <span className="lp-story__finalAccent">plusieurs heures</span>
        …
        <br />
        chaque semaine&nbsp;?
      </p>
    </div>
  );
}

function SolutionsGrid() {
  return (
    <div className="lp-story__solutions">
      <div className="lp-container lp-story__solutionsInner">
        <ul className="lp-story__grid" role="list">
          {SOLUTION_CARDS.map((card, index) => {
            const Icon = card.Icon;
            return (
              <LandingReveal
                key={card.id}
                as="li"
                className="lp-story__cardReveal"
                delay={index * 150}
              >
                <article className="lp-story__card">
                  <span className="lp-story__icon" aria-hidden="true">
                    <Icon size={22} strokeWidth={1.7} />
                  </span>
                  <h3 className="lp-story__cardTitle">{card.title}</h3>
                  <p className="lp-story__cardText">{card.text}</p>
                </article>
              </LandingReveal>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type PinMode = "before" | "pin" | "after";

function usePinMode(trackRef: RefObject<HTMLDivElement | null>): PinMode {
  const [mode, setMode] = useState<PinMode>("before");

  useEffect(() => {
    const update = () => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.top > 0) {
        setMode("before");
      } else if (rect.bottom <= vh) {
        setMode("after");
      } else {
        setMode("pin");
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [trackRef]);

  return mode;
}

export function LandingPainSection() {
  const reduced = useReducedMotion();
  const pinRef = useRef<HTMLDivElement>(null);
  const pinMode = usePinMode(pinRef);
  const { scrollYProgress } = useScroll({
    target: pinRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      className="lp-story lp-section--after-hero"
      aria-labelledby="pain-title"
      id="quotidien"
    >
      <h2 id="pain-title" className="sr-only">
        Votre entreprise perd du temps. Ce temps reste perdu pour toujours. Et
        si vous pouviez récupérer plusieurs heures chaque semaine ?
      </h2>

      {reduced ? (
        <div className="lp-story__staticWrap">
          <StoryStatic />
        </div>
      ) : (
        <div className="lp-story__pinTrack" ref={pinRef}>
          <div
            className={[
              "lp-story__sticky",
              pinMode === "pin" ? "is-pinned" : "",
              pinMode === "after" ? "is-after" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <StoryPinned progress={scrollYProgress} />
          </div>
        </div>
      )}

      <SolutionsGrid />
    </section>
  );
}
