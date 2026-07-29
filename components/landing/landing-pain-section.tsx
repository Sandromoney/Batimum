"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { motion, useReducedMotion } from "framer-motion";

const MICRO_LINES = [
  "Chaque jour.",
  "À chaque devis.",
  "À chaque appel.",
  "À chaque oubli.",
  "À chaque chantier.",
] as const;

/** Index discret : 0 = titre, 1–5 = micros, 6 = perdu, 7 = pour toujours, 8 = final */
const LAST_STEP = 8;

const TRANSITION_S = 0.55;
/** Seuil d’une intention molette (un geste, une étape). */
const WHEEL_THRESHOLD = 40;
const TOUCH_THRESHOLD = 52;
const ENGAGE_GRACE_MS = 280;
/**
 * Réarmement uniquement après silence molette — jamais sur chronomètre.
 * Empêche l’inertie trackpad de compter comme un second geste.
 */
const WHEEL_QUIET_MS = 200;
/** Verrou visuel pendant la transition Framer (pas un auto-avance). */
const VISUAL_LOCK_MS = Math.round(TRANSITION_S * 1000) + 120;

const STEP_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * playing         → pin + étapes discrètes
 * finishedPinned  → dernière phrase verrouillée (transitoire avant compact)
 * compact         → section normale, plus de pin / hauteur artificielle
 */
type StoryPhase = "playing" | "finishedPinned" | "compact";

type PinMode = "before" | "pin" | "after";

function FinalCopy() {
  return (
    <p className="lp-story__final">
      Et si vous pouviez récupérer plusieurs heures…
      <br />
      chaque semaine&nbsp;?
    </p>
  );
}

function StoryFinalLocked() {
  return (
    <div className="lp-story__stage" aria-hidden="true">
      <div className="lp-story__layer">
        <FinalCopy />
      </div>
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
      <FinalCopy />
    </div>
  );
}

function stepTransition(reduced: boolean | null) {
  return {
    duration: reduced ? 0.01 : TRANSITION_S,
    ease: STEP_EASE,
  };
}

function StoryPinnedSteps({
  activeStep,
  reduced,
}: {
  activeStep: number;
  reduced: boolean | null;
}) {
  const t = stepTransition(reduced);
  const mainActive = activeStep <= 5;
  const lostActive = activeStep === 6 || activeStep === 7;
  const finalActive = activeStep >= 8;
  const perduActive = activeStep === 6;
  const foreverActive = activeStep === 7;

  return (
    <div
      className="lp-story__stage"
      aria-hidden="true"
      data-active-step={activeStep}
    >
      <motion.div
        className="lp-story__layer lp-story__layer--main"
        initial={false}
        animate={{
          opacity: mainActive ? 1 : 0,
          y: mainActive ? 0 : -10,
        }}
        transition={t}
      >
        <p className="lp-story__headline">
          Votre entreprise perd{" "}
          <span className="lp-story__headlineEmphasis">du temps.</span>
        </p>
        <div className="lp-story__microSlot">
          {MICRO_LINES.map((line, i) => {
            const on = activeStep === i + 1;
            return (
              <motion.p
                key={line}
                className="lp-story__micro"
                initial={false}
                animate={{
                  opacity: on ? 1 : 0,
                  y: on ? 0 : 10,
                }}
                transition={t}
              >
                {line}
              </motion.p>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        className="lp-story__layer"
        initial={false}
        animate={{
          opacity: lostActive ? 1 : 0,
          y: lostActive ? 0 : 12,
        }}
        transition={t}
      >
        <p className="lp-story__lostLead">Ce temps…</p>
        <div className="lp-story__lostSwap">
          <motion.p
            className="lp-story__lostLine"
            initial={false}
            animate={{ opacity: perduActive ? 1 : 0 }}
            transition={t}
          >
            reste <span className="lp-story__lostWarm">perdu</span>.
          </motion.p>
          <motion.p
            className="lp-story__lostLine lp-story__lostLine--forever"
            initial={false}
            animate={{
              opacity: foreverActive ? 1 : 0,
              y: foreverActive ? 0 : 8,
            }}
            transition={t}
          >
            pour toujours.
          </motion.p>
        </div>
      </motion.div>

      <motion.div
        className="lp-story__layer"
        initial={false}
        animate={{
          opacity: finalActive ? 1 : 0,
          y: finalActive ? 0 : 14,
        }}
        transition={t}
      >
        <FinalCopy />
      </motion.div>
    </div>
  );
}

function StoryCompactFinal({
  compactRef,
}: {
  compactRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={compactRef} className="lp-story__compact">
      <div className="lp-story__compactInner" aria-hidden="true">
        <FinalCopy />
      </div>
    </div>
  );
}

export function LandingPainSection() {
  const reduced = useReducedMotion();
  const pinRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);
  const pendingCompactTop = useRef<number | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const activeStepRef = useRef(0);

  const [storyCompleted, setStoryCompleted] = useState(false);
  const storyCompletedRef = useRef(false);
  const [storyCompact, setStoryCompact] = useState(false);

  const [pinMode, setPinMode] = useState<PinMode>("before");
  const pinModeRef = useRef<PinMode>("before");

  const isTransitioningRef = useRef(false);
  const wheelArmedRef = useRef(true);
  const deltaAccumRef = useRef(0);
  const engageAtRef = useRef(0);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchHandledRef = useRef(false);

  const narrativeActive = !reduced && !storyCompact;
  const playing = narrativeActive && !storyCompleted;

  const setStep = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(LAST_STEP, next));
    activeStepRef.current = clamped;
    setActiveStep(clamped);
  }, []);

  /** Réarme la molette seulement après silence + fin de transition visuelle. */
  const scheduleWheelRearm = useCallback(() => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      if (isTransitioningRef.current) {
        scheduleWheelRearm();
        return;
      }
      wheelArmedRef.current = true;
      deltaAccumRef.current = 0;
      settleTimerRef.current = null;
    }, WHEEL_QUIET_MS);
  }, []);

  const startLock = useCallback(() => {
    isTransitioningRef.current = true;
    wheelArmedRef.current = false;
    deltaAccumRef.current = 0;
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      // Pas d’auto-réarmement temporel : attendre le silence du geste
      scheduleWheelRearm();
    }, VISUAL_LOCK_MS);
  }, [scheduleWheelRearm]);

  const exitToCompact = useCallback(() => {
    if (storyCompletedRef.current) return;
    storyCompletedRef.current = true;
    setStoryCompleted(true);

    const sticky = stickyRef.current;
    pendingCompactTop.current = sticky
      ? sticky.getBoundingClientRect().top
      : null;
    setStoryCompact(true);
  }, []);

  const applyIntent = useCallback(
    (direction: 1 | -1): "handled" | "exit" | "pass" => {
      if (!playing) return "pass";
      if (pinModeRef.current !== "pin") return "pass";
      if (Date.now() < engageAtRef.current) return "handled";
      if (isTransitioningRef.current) return "handled";

      const step = activeStepRef.current;

      if (direction > 0) {
        if (step < LAST_STEP) {
          setStep(step + 1);
          startLock();
          return "handled";
        }
        // Dernière phrase déjà affichée : une impulsion de plus quitte la narration
        startLock();
        exitToCompact();
        return "exit";
      }

      if (step > 0) {
        setStep(step - 1);
        startLock();
        return "handled";
      }

      // Étape 0 : laisser remonter vers le Hero
      return "pass";
    },
    [playing, setStep, startLock, exitToCompact],
  );

  /** Pin : verrouiller le scroll sur le début de piste tant que la narration joue */
  useEffect(() => {
    if (!playing) return;

    const syncPin = () => {
      const el = pinRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top > 1) {
        pinModeRef.current = "before";
        setPinMode("before");
        return;
      }

      const targetY = window.scrollY + rect.top;
      if (Math.abs(window.scrollY - targetY) > 1) {
        window.scrollTo(0, targetY);
      }

      if (pinModeRef.current !== "pin") {
        engageAtRef.current = Date.now() + ENGAGE_GRACE_MS;
        deltaAccumRef.current = 0;
        wheelArmedRef.current = true;
      }
      pinModeRef.current = "pin";
      setPinMode("pin");
    };

    syncPin();
    window.addEventListener("scroll", syncPin, { passive: true });
    window.addEventListener("resize", syncPin);
    return () => {
      window.removeEventListener("scroll", syncPin);
      window.removeEventListener("resize", syncPin);
    };
  }, [playing]);

  /** Molette / trackpad : une intention = une étape (jamais multi-saut). */
  useEffect(() => {
    if (!playing) return;

    const onWheel = (event: WheelEvent) => {
      if (pinModeRef.current !== "pin") return;

      if (Date.now() < engageAtRef.current) {
        event.preventDefault();
        deltaAccumRef.current = 0;
        return;
      }

      // Geste déjà consommé ou transition visuelle : absorber l’inertie
      if (isTransitioningRef.current || !wheelArmedRef.current) {
        event.preventDefault();
        deltaAccumRef.current = 0;
        scheduleWheelRearm();
        return;
      }

      // Sur étape 0 vers le haut : ne pas bloquer le retour Hero
      if (activeStepRef.current === 0 && event.deltaY < 0) {
        deltaAccumRef.current = 0;
        return;
      }

      event.preventDefault();
      deltaAccumRef.current += event.deltaY;

      if (Math.abs(deltaAccumRef.current) < WHEEL_THRESHOLD) return;

      const direction: 1 | -1 = deltaAccumRef.current > 0 ? 1 : -1;
      deltaAccumRef.current = 0;
      applyIntent(direction);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [playing, applyIntent, scheduleWheelRearm]);

  /** Clavier : une touche = une étape (ignorer les répétitions auto). */
  useEffect(() => {
    if (!playing) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (pinModeRef.current !== "pin") return;
      if (event.repeat) {
        event.preventDefault();
        return;
      }
      const key = event.key;
      let direction: 1 | -1 | null = null;

      if (
        key === "ArrowDown" ||
        key === "PageDown" ||
        key === " " ||
        key === "Spacebar"
      ) {
        direction = 1;
      } else if (key === "ArrowUp" || key === "PageUp") {
        direction = -1;
      }

      if (!direction) return;

      if (
        (key === " " || key === "Spacebar") &&
        event.target instanceof HTMLElement &&
        /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/i.test(event.target.tagName)
      ) {
        return;
      }

      const result = applyIntent(direction);
      if (result === "pass") return;
      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playing, applyIntent]);

  /** Touch : un swipe clair = une étape */
  useEffect(() => {
    if (!playing) return;
    const el = stickyRef.current;
    if (!el) return;

    const onTouchStart = (event: TouchEvent) => {
      if (pinModeRef.current !== "pin") return;
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
      touchHandledRef.current = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (pinModeRef.current !== "pin") return;
      if (touchStartYRef.current == null) return;

      // Bloquer le scroll natif pendant la narration épinglée
      if (activeStepRef.current > 0 || isTransitioningRef.current) {
        event.preventDefault();
      } else {
        const y = event.touches[0]?.clientY;
        if (y != null && y < touchStartYRef.current) {
          // Swipe vers le haut depuis étape 0 → avancer (bloquer le scroll page)
          event.preventDefault();
        }
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (pinModeRef.current !== "pin") return;
      if (touchHandledRef.current) return;
      const startY = touchStartYRef.current;
      touchStartYRef.current = null;
      if (startY == null) return;

      const endY = event.changedTouches[0]?.clientY;
      if (endY == null) return;
      const dy = startY - endY; // >0 = swipe up = étape suivante

      if (Math.abs(dy) < TOUCH_THRESHOLD) return;

      const direction: 1 | -1 = dy > 0 ? 1 : -1;
      const result = applyIntent(direction);
      if (result === "pass") return;
      touchHandledRef.current = true;
      event.preventDefault();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [playing, applyIntent]);

  useLayoutEffect(() => {
    if (!storyCompact) return;
    const keepTop = pendingCompactTop.current;
    pendingCompactTop.current = null;
    if (keepTop == null) return;

    const compact = compactRef.current;
    if (!compact) return;
    const newTop = compact.getBoundingClientRect().top;
    const delta = newTop - keepTop;
    if (Math.abs(delta) > 1) {
      window.scrollBy(0, delta);
    }
  }, [storyCompact]);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, []);

  const phase: StoryPhase = storyCompact
    ? "compact"
    : storyCompleted
      ? "finishedPinned"
      : "playing";

  return (
    <section
      className={[
        "lp-story",
        "lp-section--after-hero",
        phase === "compact" ? "lp-story--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="pain-title"
      id="quotidien"
      data-story-phase={phase}
      data-active-step={activeStep}
    >
      <h2 id="pain-title" className="sr-only">
        Votre entreprise perd du temps. Ce temps reste perdu pour toujours. Et
        si vous pouviez récupérer plusieurs heures chaque semaine ?
      </h2>

      {reduced ? (
        <div className="lp-story__staticWrap">
          <StoryStatic />
        </div>
      ) : storyCompact ? (
        <StoryCompactFinal compactRef={compactRef} />
      ) : (
        <div className="lp-story__pinTrack" ref={pinRef}>
          <div
            ref={stickyRef}
            className={[
              "lp-story__sticky",
              pinMode === "pin" ? "is-pinned" : "",
              pinMode === "after" ? "is-after" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {storyCompleted ? (
              <StoryFinalLocked />
            ) : (
              <StoryPinnedSteps activeStep={activeStep} reduced={reduced} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
