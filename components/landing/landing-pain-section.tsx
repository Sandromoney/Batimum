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
import {
  useLandingExperience,
} from "@/components/landing/landing-experience";

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

const TRANSITION_S = 0.38;
const WHEEL_THRESHOLD = 48;
const TOUCH_THRESHOLD = 52;
/** Delta sous lequel on considère le geste « levé » (fin d’inertie). */
const LIFT_EPS = 6;
/** Soft fade + depth toward hub gate (hors rythme inter-phrases). */
const HANDOFF_FADE_MS = 680;

const STEP_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type StoryPhase = "playing" | "finishedPinned" | "compact";
type PinMode = "before" | "pin" | "after";
/** armed = prêt · locked = animation en cours · waitLift = attendre fin d’inertie */
type GesturePhase = "armed" | "locked" | "waitLift";

function stepTransition(reduced: boolean | null) {
  return {
    duration: reduced ? 0.01 : TRANSITION_S,
    ease: STEP_EASE,
  };
}

function StoryPinnedSteps({
  activeStep,
  reduced,
  onEnterComplete,
}: {
  activeStep: number;
  reduced: boolean | null;
  onEnterComplete: () => void;
}) {
  const t = stepTransition(reduced);
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
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: -10,
              transition: { duration: TRANSITION_S * 0.8 },
            }}
            transition={t}
            onAnimationComplete={(definition) => {
              // Ignorer la fin d’exit (opacity 0) — débloquer seulement après apparition.
              if (
                definition &&
                typeof definition === "object" &&
                "opacity" in definition &&
                Number((definition as { opacity?: number }).opacity) === 1
              ) {
                onEnterComplete();
              }
            }}
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
  const { pastIntro, ready } = useLandingExperience();
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

  const gesturePhaseRef = useRef<GesturePhase>("waitLift");
  const deltaAccumRef = useRef(0);
  const handoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchHandledRef = useRef(false);
  /** Empêche un double unlock si Framer fire plusieurs completes. */
  const unlockArmedRef = useRef(false);

  const narrativeActive = !reduced && !storyCompact;
  const playing = narrativeActive && !storyCompleted;

  const setStep = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(LAST_STEP, next));
    activeStepRef.current = clamped;
    setActiveStep(clamped);
  }, []);

  const lockForAnimation = useCallback(() => {
    gesturePhaseRef.current = "locked";
    deltaAccumRef.current = 0;
    unlockArmedRef.current = true;
  }, []);

  /** Appelé quand la phrase entrante a fini d’apparaître — aucun timer. */
  const onPhraseEnterComplete = useCallback(() => {
    if (!unlockArmedRef.current) return;
    if (gesturePhaseRef.current !== "locked") return;
    unlockArmedRef.current = false;
    // Attendre la fin d’inertie du geste courant avant le prochain.
    gesturePhaseRef.current = "waitLift";
    deltaAccumRef.current = 0;
  }, []);

  const noteWheelActivity = useCallback((deltaY: number) => {
    if (gesturePhaseRef.current !== "waitLift") return;
    // Geste « levé » : deltas quasi nuls → prêt pour le prochain geste.
    if (Math.abs(deltaY) <= LIFT_EPS) {
      gesturePhaseRef.current = "armed";
      deltaAccumRef.current = 0;
    }
  }, []);

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
    storyCompletedRef.current = true;
    setStoryCompleted(true);
    pinModeRef.current = "after";
    setPinMode("after");
    // Ne PAS marquer l’intro ici : sinon pastIntro saute la présentation hub.

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

  /** Retour navigateur : intro déjà vue — état compact sans rejouer. */
  useEffect(() => {
    if (!ready || !pastIntro) return;
    storyCompletedRef.current = true;
    setStoryCompleted(true);
    setStoryCompact(true);
    pinModeRef.current = "after";
    setPinMode("after");
    cinematicStartedRef.current = true;
    handoffRef.current = true;
  }, [ready, pastIntro]);

  /** Transition douce vers le hub — hold dernière phrase puis fade. */
  const beginCinematicHandoff = useCallback(() => {
    if (cinematicStartedRef.current || handoffRef.current) return;
    cinematicStartedRef.current = true;
    handoffRef.current = true;
    gesturePhaseRef.current = "locked";
    storyCompletedRef.current = true;
    setStoryCompleted(true);

    const LAST_PHRASE_HOLD_MS = 720;
    if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
    handoffTimerRef.current = setTimeout(() => {
      setCinematicOut(true);
      handoffTimerRef.current = setTimeout(() => {
        openHubGate(true);
        window.setTimeout(() => {
          exitToCompact();
        }, Math.round(HANDOFF_FADE_MS * 0.55));
      }, Math.round(HANDOFF_FADE_MS * 0.4));
    }, LAST_PHRASE_HOLD_MS);
  }, [openHubGate, exitToCompact]);

  useEffect(() => {
    const onHubOpen = () => {
      storyCompletedRef.current = true;
      setStoryCompleted(true);
      pinModeRef.current = "after";
      setPinMode("after");
      cinematicStartedRef.current = true;
      handoffRef.current = true;
      exitToCompact();
    };
    window.addEventListener("batimum:open-hub-gate", onHubOpen);
    return () => window.removeEventListener("batimum:open-hub-gate", onHubOpen);
  }, [exitToCompact]);

  const applyIntent = useCallback(
    (direction: 1 | -1): "handled" | "exit" | "pass" => {
      if (!playing) return "pass";
      if (pinModeRef.current !== "pin") return "pass";
      if (gesturePhaseRef.current === "locked") return "handled";
      if (gesturePhaseRef.current === "waitLift") return "handled";

      const step = activeStepRef.current;

      if (direction > 0) {
        if (step < LAST_STEP) {
          setStep(step + 1);
          lockForAnimation();
          return "handled";
        }
        lockForAnimation();
        beginCinematicHandoff();
        return "exit";
      }

      if (step > 0) {
        if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
        cinematicStartedRef.current = false;
        handoffRef.current = false;
        setCinematicOut(false);
        setStep(step - 1);
        lockForAnimation();
        return "handled";
      }

      return "pass";
    },
    [playing, setStep, lockForAnimation, beginCinematicHandoff],
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

      // Premier ancrage : absorber l’inertie Hero (waitLift, pas de timer).
      if (pinModeRef.current !== "pin") {
        gesturePhaseRef.current = "waitLift";
        deltaAccumRef.current = 0;
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
      event.preventDefault();

      const dy = event.deltaY;

      if (gesturePhaseRef.current === "locked") {
        deltaAccumRef.current = 0;
        return;
      }

      if (gesturePhaseRef.current === "waitLift") {
        noteWheelActivity(dy);
        deltaAccumRef.current = 0;
        return;
      }

      // armed
      if (activeStepRef.current === 0 && dy < 0) {
        deltaAccumRef.current = 0;
        return;
      }

      deltaAccumRef.current += dy;
      if (Math.abs(deltaAccumRef.current) < WHEEL_THRESHOLD) return;

      const direction: 1 | -1 = deltaAccumRef.current > 0 ? 1 : -1;
      deltaAccumRef.current = 0;
      applyIntent(direction);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [playing, applyIntent, noteWheelActivity]);

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

      // Clavier : pas d’inertie — waitLift → armed immédiatement.
      if (gesturePhaseRef.current === "waitLift") {
        gesturePhaseRef.current = "armed";
        deltaAccumRef.current = 0;
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
      if (gesturePhaseRef.current === "waitLift") {
        gesturePhaseRef.current = "armed";
        deltaAccumRef.current = 0;
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (pinModeRef.current !== "pin") return;
      if (touchStartYRef.current == null) return;

      if (
        activeStepRef.current > 0 ||
        gesturePhaseRef.current === "locked"
      ) {
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
      if (gesturePhaseRef.current === "locked") return;

      if (gesturePhaseRef.current === "waitLift") {
        gesturePhaseRef.current = "armed";
      }

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
      if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
    };
  }, []);

  // Première phrase déjà visible au montage → pas de lock.
  useEffect(() => {
    if (playing && activeStep === 0 && pinMode === "pin") {
      // Attendre lift de l’entrée Hero uniquement.
      if (gesturePhaseRef.current === "locked") return;
    }
  }, [playing, activeStep, pinMode]);

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
            <StoryPinnedSteps
              activeStep={activeStep}
              reduced={reduced}
              onEnterComplete={onPhraseEnterComplete}
            />
          </div>
        </div>
      )}
    </section>
  );
}
