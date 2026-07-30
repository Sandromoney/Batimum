"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const MICRO_LINES = [
  "À chaque devis créé manuellement.",
  "À chaque chantier mal suivi.",
  "À chaque planning non centralisé.",
  "À chaque marge découverte trop tard.",
] as const;

/** Closing beats — culmination du post-hero. */
const CLOSING_LINES = [
  "Tout cela…",
  "finit par ralentir votre entreprise.",
] as const;

/** 0 = titre, 1–4 = micros, 5–6 = closings */
const LAST_STEP = MICRO_LINES.length + CLOSING_LINES.length;

const TRANSITION_S = 0.42;
const WHEEL_THRESHOLD = 40;
const TOUCH_THRESHOLD = 52;
const ENGAGE_GRACE_MS = 280;
const WHEEL_QUIET_MS = 200;
/** Wait for exit opacity → 0 before enter (mode="wait"). */
const VISUAL_LOCK_MS = Math.round(TRANSITION_S * 1000) + 160;
/** Breath after last line before cinematic fade. */
const HANDOFF_BREATH_MS = 520;
/** Soft fade + depth toward hub gate (~500–800 ms felt). */
const HANDOFF_FADE_MS = 680;

const STEP_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type StoryPhase = "playing" | "finishedPinned" | "compact";
type PinMode = "before" | "pin" | "after";

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
  const showLead = activeStep === 0;
  const microIndex =
    activeStep >= 1 && activeStep <= MICRO_LINES.length
      ? activeStep - 1
      : -1;
  const closingIndex =
    activeStep > MICRO_LINES.length
      ? activeStep - MICRO_LINES.length - 1
      : -1;

  let key = "lead";
  let className = "lp-story__headline";
  let content: ReactNode = (
    <>
      Votre entreprise perd{" "}
      <span className="lp-story__headlineEmphasis">du temps.</span>
    </>
  );

  if (microIndex >= 0) {
    key = `micro-${microIndex}`;
    className = "lp-story__micro lp-story__micro--solo";
    content = MICRO_LINES[microIndex];
  } else if (closingIndex >= 0 && closingIndex < CLOSING_LINES.length) {
    key = `closing-${closingIndex}`;
    if (closingIndex === 0) {
      className = "lp-story__lostLead lp-story__closing lp-story__closing--tout";
    } else {
      className =
        "lp-story__lostLine lp-story__closing lp-story__closing--finale";
    }
    content = CLOSING_LINES[closingIndex];
  }

  return (
    <div
      className="lp-story__stage"
      aria-hidden="true"
      data-active-step={activeStep}
    >
      <div className="lp-story__copySlot" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={key}
            className={className}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: TRANSITION_S * 0.85 } }}
            transition={t}
          >
            {content}
          </motion.p>
        </AnimatePresence>
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
      {MICRO_LINES.map((line) => (
        <p key={line} className="lp-story__micro">
          {line}
        </p>
      ))}
      <p className="lp-story__lostLead">Tout cela…</p>
      <p className="lp-story__lostLine">
        finit par ralentir votre entreprise.
      </p>
    </div>
  );
}

function StoryCompactHandoff({
  compactRef,
}: {
  compactRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={compactRef} className="lp-story__compact lp-story__compact--handoff">
      <div className="lp-story__compactInner" aria-hidden="true" />
    </div>
  );
}

export function LandingPainSection() {
  const prefersReduced = useReducedMotion();
  const [motionReady, setMotionReady] = useState(false);
  useEffect(() => setMotionReady(true), []);
  const reduced = motionReady ? prefersReduced : false;
  const pinRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);
  const pendingCompactTop = useRef<number | null>(null);

  const [activeStep, setActiveStep] = useState(0);
  const activeStepRef = useRef(0);

  const [storyCompleted, setStoryCompleted] = useState(false);
  const storyCompletedRef = useRef(false);
  const [storyCompact, setStoryCompact] = useState(false);
  const [cinematicOut, setCinematicOut] = useState(false);
  const handoffRef = useRef(false);
  const cinematicStartedRef = useRef(false);

  const [pinMode, setPinMode] = useState<PinMode>("before");
  const pinModeRef = useRef<PinMode>("before");

  const isTransitioningRef = useRef(false);
  const wheelArmedRef = useRef(true);
  const deltaAccumRef = useRef(0);
  const engageAtRef = useRef(0);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchHandledRef = useRef(false);

  const narrativeActive = !reduced && !storyCompact;
  const playing = narrativeActive && !storyCompleted;

  const setStep = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(LAST_STEP, next));
    activeStepRef.current = clamped;
    setActiveStep(clamped);
  }, []);

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
      scheduleWheelRearm();
    }, VISUAL_LOCK_MS);
  }, [scheduleWheelRearm]);

  const exitToCompact = useCallback(() => {
    storyCompletedRef.current = true;
    setStoryCompleted(true);
    setStoryCompact((prev) => {
      if (prev) return prev;
      const sticky = stickyRef.current;
      pendingCompactTop.current = sticky
        ? sticky.getBoundingClientRect().top
        : null;
      return true;
    });
  }, []);

  const openHubGate = useCallback((cinematic = true) => {
    // Libérer immédiatement le pin post-hero pour ne pas combattre le hub
    storyCompletedRef.current = true;
    setStoryCompleted(true);
    pinModeRef.current = "after";
    setPinMode("after");

    window.dispatchEvent(
      new CustomEvent("batimum:open-hub-gate", {
        detail: { cinematic },
      }),
    );
    const hub = document.getElementById("ecosysteme");
    if (hub) {
      const top = hub.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top - 4), behavior: "auto" });
    }
  }, []);

  /** Breath → fade texte → gate soft enter → compact. */
  const beginCinematicHandoff = useCallback(() => {
    if (cinematicStartedRef.current || handoffRef.current) return;
    cinematicStartedRef.current = true;
    handoffRef.current = true;
    isTransitioningRef.current = true;
    wheelArmedRef.current = false;
    // Couper les listeners wheel/pin tout de suite
    storyCompletedRef.current = true;
    setStoryCompleted(true);

    if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
    handoffTimerRef.current = setTimeout(() => {
      setCinematicOut(true);
      // Mid-fade : ouvrir le gate pendant que le texte disparaît
      window.setTimeout(() => {
        openHubGate(true);
      }, Math.round(HANDOFF_FADE_MS * 0.35));
      window.setTimeout(() => {
        exitToCompact();
      }, HANDOFF_FADE_MS);
    }, HANDOFF_BREATH_MS);
  }, [openHubGate, exitToCompact]);

  // Si le hub s’ouvre depuis l’extérieur, ne plus capturer le scroll
  useEffect(() => {
    const onHubOpen = () => {
      storyCompletedRef.current = true;
      setStoryCompleted(true);
      pinModeRef.current = "after";
      setPinMode("after");
      cinematicStartedRef.current = true;
      handoffRef.current = true;
      window.setTimeout(() => exitToCompact(), 80);
    };
    window.addEventListener("batimum:open-hub-gate", onHubOpen);
    return () => window.removeEventListener("batimum:open-hub-gate", onHubOpen);
  }, [exitToCompact]);

  const scheduleHandoff = useCallback(() => {
    beginCinematicHandoff();
  }, [beginCinematicHandoff]);

  const applyIntent = useCallback(
    (direction: 1 | -1): "handled" | "exit" | "pass" => {
      if (!playing) return "pass";
      if (pinModeRef.current !== "pin") return "pass";
      if (Date.now() < engageAtRef.current) return "handled";
      if (isTransitioningRef.current) return "handled";

      const step = activeStepRef.current;

      if (direction > 0) {
        if (step < LAST_STEP) {
          const next = step + 1;
          setStep(next);
          startLock();
          if (next >= LAST_STEP) {
            // Last line shown — auto gate after settle (no extra scroll)
            if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
            handoffTimerRef.current = setTimeout(() => {
              scheduleHandoff();
            }, VISUAL_LOCK_MS);
          }
          return "handled";
        }
        // Already on last line: any further intent → cinematic handoff
        startLock();
        beginCinematicHandoff();
        return "exit";
      }

      if (step > 0) {
        if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
        cinematicStartedRef.current = false;
        handoffRef.current = false;
        setCinematicOut(false);
        setStep(step - 1);
        startLock();
        return "handled";
      }

      return "pass";
    },
    [playing, setStep, startLock, beginCinematicHandoff, scheduleHandoff],
  );

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

  useEffect(() => {
    if (!playing) return;

    const onWheel = (event: WheelEvent) => {
      if (pinModeRef.current !== "pin") return;

      if (Date.now() < engageAtRef.current) {
        event.preventDefault();
        deltaAccumRef.current = 0;
        return;
      }

      if (isTransitioningRef.current || !wheelArmedRef.current) {
        event.preventDefault();
        deltaAccumRef.current = 0;
        scheduleWheelRearm();
        return;
      }

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

      if (activeStepRef.current > 0 || isTransitioningRef.current) {
        event.preventDefault();
      } else {
        const y = event.touches[0]?.clientY;
        if (y != null && y < touchStartYRef.current) {
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
      const dy = startY - endY;

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
      if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
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
        phase === "compact" ? "is-handoff" : "",
        cinematicOut ? "is-cinematic-out" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="pain-title"
      id="quotidien"
      data-story-phase={phase}
      data-active-step={activeStep}
    >
      <h2 id="pain-title" className="sr-only">
        Votre entreprise perd du temps. À chaque devis créé manuellement. À
        chaque chantier mal suivi. À chaque planning non centralisé. À chaque
        marge découverte trop tard. Tout cela finit par ralentir votre
        entreprise.
      </h2>

      {reduced ? (
        <div className="lp-story__staticWrap">
          <StoryStatic />
        </div>
      ) : storyCompact ? (
        <StoryCompactHandoff compactRef={compactRef} />
      ) : (
        <div className="lp-story__pinTrack" ref={pinRef}>
          <div
            ref={stickyRef}
            className={[
              "lp-story__sticky",
              pinMode === "pin" ? "is-pinned" : "",
              pinMode === "after" ? "is-after" : "",
              cinematicOut ? "is-cinematic-out" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <StoryPinnedSteps activeStep={activeStep} reduced={reduced} />
          </div>
        </div>
      )}
    </section>
  );
}
