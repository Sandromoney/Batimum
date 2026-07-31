"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Bot,
  Calendar,
  HardHat,
  LineChart,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  MumFilmPanel,
  MumFilmShell,
  MUM_DEMO_SAFETY_MS,
  MUM_ENTER_MS,
  MUM_RETURN_MS,
  type MumFilmPhase,
} from "@/components/landing/landing-hub-mum-film";
import {
  ModuleFilmShell,
  PlanningFilmPanel,
  PLAN_DEMO_SAFETY_MS,
  PLAN_ENTER_MS,
  PLAN_RETURN_MS,
} from "@/components/landing/landing-hub-planning-film";
import {
  ClientsFilmPanel,
  CLIENTS_DEMO_SAFETY_MS,
  CLIENTS_ENTER_MS,
  CLIENTS_RETURN_MS,
} from "@/components/landing/landing-hub-clients-film";
import {
  ChantiersFilmPanel,
  CHANTIER_DEMO_SAFETY_MS,
  CHANTIER_ENTER_MS,
  CHANTIER_RETURN_MS,
} from "@/components/landing/landing-hub-chantiers-film";
import {
  FinanceFilmPanel,
  FinanceFilmShell,
  FIN_DEMO_SAFETY_MS,
  FIN_ENTER_MS,
  FIN_RETURN_MS,
} from "@/components/landing/landing-hub-finance-film";
import {
  PilotageFilmPanel,
  PilotageFilmShell,
  PILOTAGE_DEMO_SAFETY_MS,
  PILOTAGE_ENTER_MS,
  PILOTAGE_RETURN_MS,
} from "@/components/landing/landing-hub-pilotage-film";
import {
  HubAtmosphere,
  HubAtmosphereFallback,
  HubOrbitRings,
} from "@/components/landing/landing-hub-atmosphere";
import { LandingSafeBoundary } from "@/components/landing/landing-safe-boundary";
import {
  HubSignaturePanel,
} from "@/components/landing/landing-hub-signature";
import {
  HubExperienceGate,
  HubFilmControls,
  HubReplayLink,
  HubScrollHint,
  HubSkipControl,
  HubTourProgress,
  clearHubSkippedSession,
  hubChapterFromScene,
  readHubSkippedSession,
  useHubControlsVisibility,
  writeHubSkippedSession,
} from "@/components/landing/landing-hub-experience-ui";
import { FilmClock } from "@/lib/landing-hub-film-clock";
import {
  AUTO_BREATH_MS,
  AUTO_PLAN_BREATH_MS,
  FIN_CONVERGE_MS,
  HOLD_MS,
  HUB_FILM_TOTAL_MS,
  INTRO_MS,
  MODULE_LOCK_MS,
  SIG_DEMO_SAFETY_MS,
  SIG_DISMISS_EACH_MS,
  SIG_HOLD_MS,
  hitPhaseKey,
  hitSegmentKey,
  nextAnchorAfterDemo,
  resolveTimeline,
  type HubFilmModule,
  type TimelineHit,
} from "@/lib/landing-hub-timeline";

const BM_SRC = "/logo-batimum.png";
const BM_SRC_W = 829;
const BM_SRC_H = 210;

type HubModule = {
  id: string;
  title: string;
  Icon: LucideIcon;
  x: number;
  y: number;
  floatDelay: number;
  floatDuration: number;
};

/** Ordre circulaire horaire — index 0 verrouille en haut. */
const MODULE_RING_ORDER = [
  "mum",
  "clients",
  "chantiers",
  "planning",
  "facturation",
  "pilotage",
] as const;

const HUB_MODULES: HubModule[] = [
  {
    id: "mum",
    title: "MUM IA",
    Icon: Bot,
    x: 0,
    y: -34,
    floatDelay: 0,
    floatDuration: 5.4,
  },
  {
    id: "clients",
    title: "Clients",
    Icon: Users,
    x: 29.4,
    y: -17,
    floatDelay: 0.35,
    floatDuration: 5.8,
  },
  {
    id: "chantiers",
    title: "Chantiers",
    Icon: HardHat,
    x: 29.4,
    y: 17,
    floatDelay: 0.7,
    floatDuration: 5.6,
  },
  {
    id: "planning",
    title: "Planning",
    Icon: Calendar,
    x: 0,
    y: 34,
    floatDelay: 0.2,
    floatDuration: 5.9,
  },
  {
    id: "facturation",
    title: "Facturation",
    Icon: Receipt,
    x: -29.4,
    y: 17,
    floatDelay: 0.95,
    floatDuration: 6.0,
  },
  {
    id: "pilotage",
    title: "Pilotage",
    Icon: LineChart,
    x: -29.4,
    y: -17,
    floatDelay: 0.55,
    floatDuration: 5.5,
  },
];

function polarModulePos(index: number, ringRotDeg: number, radius = 34) {
  // Index croissant = sens antihoraire depuis le haut,
  // pour qu’une rotation horaire positive amène le suivant en haut.
  const angle = ((-90 - index * 60 + ringRotDeg) * Math.PI) / 180;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function ringRotationForModule(moduleId: string): number {
  const id = moduleId === "finance" ? "facturation" : moduleId;
  const idx = MODULE_RING_ORDER.indexOf(
    id as (typeof MODULE_RING_ORDER)[number],
  );
  if (idx < 0) return 0;
  // Rotation horaire cumulative (0 → 60 → 120…)
  return idx * 60;
}

/** Pause lecture adaptée à la longueur du sous-titre. */
function moduleReadMs(focus: string): number {
  const copyLen: Record<string, number> = {
    mum: 56,
    clients: 62,
    chantiers: 58,
    planning: 62,
    finance: 58,
    pilotage: 62,
  };
  const len = copyLen[focus] ?? 40;
  return Math.round(Math.min(1100, Math.max(750, 520 + len * 8)));
}

/**
 * 0 breath → 1 logo → 2 ecosystem
 * → 3 mum → 4 mumReturn
 * → 5 clients → 6 clientsReturn
 * → 7 chantiers → 8 chantiersReturn
 * → 9 plan → 10 planReturn
 * → 11 finance → 12 financeReturn
 * → 13 pilotage → 14 pilotageReturn
 * → 15 converge → 16 signature → exit
 */
const LAST_SCENE = 16;
/** Plans MUM internes (dictée → … → signature). */
const MUM_PLAN_COUNT = 6;
const INTRO_TO_MUM_MS = INTRO_MS;
/** Marge sécurité = verrouillage + zoom + lecture max + démo. */
const PRE_DEMO_MS = MODULE_LOCK_MS + 2100;
const SCENE_LOCK_MS = [
  500,
  700,
  1100,
  PRE_DEMO_MS + MUM_DEMO_SAFETY_MS,
  MUM_RETURN_MS,
  PRE_DEMO_MS + CLIENTS_DEMO_SAFETY_MS,
  CLIENTS_RETURN_MS,
  PRE_DEMO_MS + CHANTIER_DEMO_SAFETY_MS,
  CHANTIER_RETURN_MS,
  PRE_DEMO_MS + PLAN_DEMO_SAFETY_MS,
  PLAN_RETURN_MS,
  PRE_DEMO_MS + FIN_DEMO_SAFETY_MS,
  FIN_RETURN_MS,
  PRE_DEMO_MS + PILOTAGE_DEMO_SAFETY_MS,
  PILOTAGE_RETURN_MS,
  FIN_CONVERGE_MS,
  SIG_DEMO_SAFETY_MS,
] as const;

const WHEEL_THRESHOLD = 44;
const TOUCH_THRESHOLD = 54;
/** Réarmement uniquement après silence molette (anti multi-saut inertie). */
const WHEEL_QUIET_MS = 200;
const ENGAGE_GRACE_MS = 280;

type PinMode = "before" | "pin";
type FocusId =
  | "mum"
  | "clients"
  | "planning"
  | "chantiers"
  | "finance"
  | "pilotage"
  | null;
type ActiveFilm =
  | "mum"
  | "clients"
  | "planning"
  | "chantiers"
  | "finance"
  | "pilotage"
  | null;

const FILM_ENTRY_SCENES = new Set([3, 5, 7, 9, 11, 13]);

/** idle → gate (choix) → tour (scroll) → finished */
type ExperiencePhase = "idle" | "gate" | "tour" | "finished";

const NEXT_SECTION_ID = "diagnostic";

function BmMark({ className }: { className?: string }) {
  return (
    <div
      className={["lp-hub__bm", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BM_SRC}
        alt=""
        className="lp-hub__bmImg"
        width={BM_SRC_W}
        height={BM_SRC_H}
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

function HubStage({
  scene,
  filmPhase,
  focusId,
  reduced,
  ringRotation,
  moduleLocked,
  signatureMode = false,
  sigDismissCount = 0,
}: {
  scene: number;
  filmPhase: MumFilmPhase;
  focusId: FocusId;
  reduced: boolean | null;
  ringRotation: number;
  moduleLocked: boolean;
  /** Scène signature : disparition horaire des modules autour du BM fixe. */
  signatureMode?: boolean;
  /** Nombre de modules déjà éteints (sens horaire), 0–6. */
  sigDismissCount?: number;
}) {
  const sealed =
    signatureMode && (filmPhase === "sealed" || filmPhase === "idle");
  const dismissing =
    signatureMode &&
    filmPhase === "signature" &&
    sigDismissCount < MODULE_RING_ORDER.length;
  const postDismiss =
    signatureMode &&
    filmPhase === "signature" &&
    sigDismissCount >= MODULE_RING_ORDER.length;
  const showLogo = scene >= 1 && !sealed && !postDismiss;
  const showModules = scene >= 2 && !sealed && !postDismiss;
  const converging =
    !signatureMode && (filmPhase === "converge" || scene === 15);
  const highlight =
    filmPhase === "highlight" ||
    (FILM_ENTRY_SCENES.has(scene) && filmPhase === "idle");
  const deep =
    filmPhase === "enter" ||
    filmPhase === "demo" ||
    filmPhase === "hold";
  const returning = filmPhase === "returning";

  const floatOn =
    showModules &&
    !reduced &&
    !converging &&
    !dismissing &&
    !highlight &&
    (scene === 2 || filmPhase === "idle" || (returning && !deep));

  const logoAwake = scene >= 2;
  const hubVisible = !deep && !sealed && !postDismiss;
  const hierarchy = Boolean(focusId) && (highlight || deep || returning);
  const showRings = showModules && !deep && !dismissing;

  const isModActive = (id: string) => {
    if (!hierarchy || !focusId) return false;
    if (focusId === "finance") return id === "facturation";
    return focusId === id;
  };

  const focusStageClass =
    focusId === "mum"
      ? "Mum"
      : focusId === "clients"
        ? "Clients"
        : focusId === "planning"
          ? "Plan"
          : focusId === "chantiers"
            ? "Chantiers"
            : focusId === "finance"
              ? "Fin"
              : focusId === "pilotage"
                ? "Pilotage"
                : "";

  return (
    <div
      className={[
        "lp-hub__stage",
        "lp-hub__stage--mechanism",
        highlight && focusStageClass
          ? `lp-hub__stage--highlight${focusStageClass}`
          : "",
        deep && focusStageClass ? `lp-hub__stage--deep${focusStageClass}` : "",
        moduleLocked && highlight ? "lp-hub__stage--locked" : "",
        returning && !deep ? "lp-hub__stage--return" : "",
        converging ? "lp-hub__stage--converge" : "",
        dismissing ? "lp-hub__stage--sigDismiss" : "",
        floatOn ? "lp-hub__stage--float" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-hub-scene={scene}
      data-film-phase={filmPhase}
      data-focus={focusId ?? ""}
      data-sig-dismiss={signatureMode ? String(sigDismissCount) : ""}
      style={{ "--hub-ring-rot": `${ringRotation}deg` } as CSSProperties}
    >
      <div
        className={[
          "lp-hub__world",
          hubVisible ? "is-visible" : "is-faded",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <HubOrbitRings visible={showRings} reduced={reduced} />

        <div className="lp-hub__core">
          <motion.div
            className={[
              "lp-hub__logoWrap",
              logoAwake ? "lp-hub__logoWrap--awake" : "",
              dismissing || converging ? "lp-hub__logoWrap--fixed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            initial={false}
            animate={
              showLogo
                ? {
                    /* BM fixe pendant conclusion — ni fade ni scale agressif */
                    opacity: hierarchy && !dismissing && !converging ? 0.72 : 1,
                    scale:
                      dismissing || converging
                        ? 1
                        : logoAwake
                          ? highlight
                            ? 1.04
                            : 1.06
                          : 1,
                  }
                : { opacity: 0, scale: 0.95 }
            }
            transition={{
              duration: reduced
                ? 0.01
                : dismissing
                  ? 0.5
                  : showLogo && scene === 1
                    ? 0.75
                    : 0.6,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <BmMark />
          </motion.div>
        </div>

        <ul
          className="lp-hub__orbit lp-hub__orbit--ring"
          role="list"
          aria-hidden={showModules ? undefined : true}
        >
          {HUB_MODULES.map((mod, index) => {
            const Icon = mod.Icon;
            const active = isModActive(mod.id);
            const dimmed = hierarchy && !active;
            const pos = polarModulePos(index, ringRotation);
            const locked = active && moduleLocked && highlight;
            const ringIdx = MODULE_RING_ORDER.indexOf(
              mod.id as (typeof MODULE_RING_ORDER)[number],
            );
            const sigDismissed =
              dismissing && ringIdx >= 0 && ringIdx < sigDismissCount;

            return (
              <li
                key={mod.id}
                className={[
                  "lp-hub__mod",
                  `lp-hub__mod--${mod.id}`,
                  active ? "is-active" : "",
                  dimmed ? "is-dimmed" : "",
                  locked ? "is-locked" : "",
                  sigDismissed ? "is-sig-dismissed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  {
                    "--hub-x": pos.x,
                    "--hub-y": pos.y,
                  } as CSSProperties
                }
              >
                <motion.div
                  className="lp-hub__modMotion"
                  initial={false}
                  animate={
                    showModules
                      ? {
                          opacity: sigDismissed
                            ? 0
                            : dimmed
                              ? 0.55
                              : converging
                                ? 0.92
                                : 1,
                          scale: sigDismissed
                            ? 0.82
                            : locked
                              ? 1.08
                              : active
                                ? 1.04
                                : converging
                                  ? 0.96
                                  : dimmed
                                    ? 0.94
                                    : 1,
                          z: sigDismissed ? -24 : 0,
                        }
                      : { opacity: 0, scale: 0.92 }
                  }
                  transition={{
                    duration: reduced
                      ? 0.01
                      : sigDismissed
                        ? 0.72
                        : highlight
                          ? 1.05
                          : 0.7,
                    delay: 0,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div
                    className={[
                      "lp-hub__modFloat",
                      floatOn ? "is-floating" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      {
                        "--hub-float-delay": `${mod.floatDelay}s`,
                        "--hub-float-dur": `${mod.floatDuration}s`,
                      } as CSSProperties
                    }
                  >
                    <article className="lp-hub__chip" data-module={mod.id}>
                      <span className="lp-hub__chipFace" aria-hidden="true">
                        <span className="lp-hub__chipGlow" />
                        <Icon size={15} strokeWidth={1.7} />
                      </span>
                      <h3 className="lp-hub__chipLabel">{mod.title}</h3>
                    </article>
                  </div>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function HubStatic() {
  const staticRef = useRef<HTMLDivElement>(null);
  return (
    <div className="lp-hub__static" ref={staticRef}>
      <LandingSafeBoundary name="hub-atmosphere-static" fallback={<HubAtmosphereFallback />}>
        <HubAtmosphere
          containerRef={staticRef}
          scene={2}
          filmPhase="idle"
          focusId={null}
          reduced
          enabled={false}
        />
      </LandingSafeBoundary>
      <div className="lp-hub__stage lp-hub__stage--static">
        <div className="lp-hub__world is-visible">
          <HubOrbitRings visible reduced />
          <div className="lp-hub__core">
            <div className="lp-hub__logoWrap lp-hub__logoWrap--awake">
              <BmMark />
            </div>
          </div>
          <ul className="lp-hub__orbit lp-hub__orbit--ring" role="list">
            {HUB_MODULES.map((mod, index) => {
              const Icon = mod.Icon;
              const pos = polarModulePos(index, 0);
              return (
                <li
                  key={mod.id}
                  className="lp-hub__mod"
                  style={
                    {
                      "--hub-x": pos.x,
                      "--hub-y": pos.y,
                    } as CSSProperties
                  }
                >
                  <article className="lp-hub__chip" data-module={mod.id}>
                    <span className="lp-hub__chipFace" aria-hidden="true">
                      <span className="lp-hub__chipGlow" />
                      <Icon size={15} strokeWidth={1.7} />
                    </span>
                    <h3 className="lp-hub__chipLabel">{mod.title}</h3>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function LandingHubSection() {
  const prefersReduced = useReducedMotion();
  const [motionReady, setMotionReady] = useState(false);
  useEffect(() => setMotionReady(true), []);
  const reduced = motionReady ? prefersReduced : false;
  const pinRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  const [scene, setScene] = useState(0);
  const sceneRef = useRef(0);
  /** Plans MUM internes (dictée → analyse → devis → envoi → signature). */
  const [mumPlan, setMumPlan] = useState(0);
  const mumPlanRef = useRef(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  const [experience, setExperience] = useState<ExperiencePhase>("idle");
  const experienceRef = useRef<ExperiencePhase>("idle");
  const [awaitingGesture, setAwaitingGesture] = useState(false);
  const [hintMode, setHintMode] = useState<"start" | "continue">("start");
  const [sessionSkipped, setSessionSkipped] = useState(false);

  const [filmPhase, setFilmPhase] = useState<MumFilmPhase>("idle");
  const filmPhaseRef = useRef<MumFilmPhase>("idle");
  const [focusId, setFocusId] = useState<FocusId>(null);
  const focusIdRef = useRef<FocusId>(null);
  const [activeFilm, setActiveFilm] = useState<ActiveFilm>(null);
  const activeFilmRef = useRef<ActiveFilm>(null);
  const clockRef = useRef(new FilmClock());
  const lockJobRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [filmPaused, setFilmPaused] = useState(false);
  const filmPausedRef = useRef(false);
  const [demoSeekMs, setDemoSeekMs] = useState(0);
  const [seekKey, setSeekKey] = useState(0);
  /** Signature jouée une seule fois par chargement de page. */
  const signaturePlayedRef = useRef(false);
  const [signatureSealed, setSignatureSealed] = useState(false);

  const [pinMode, setPinMode] = useState<PinMode>("before");
  const pinModeRef = useRef<PinMode>("before");

  const isPlayingRef = useRef(false);
  const wheelArmedRef = useRef(true);
  const deltaAccumRef = useRef(0);
  const engageAtRef = useRef(0);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchArmedRef = useRef(true);
  /** Film automatique après le premier geste. */
  const autoPlayRef = useRef(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const advanceFilmRef = useRef<() => void>(() => {});
  const startMumFilmRef = useRef<() => void>(() => {});
  const [ringRotation, setRingRotation] = useState(0);
  const [moduleLocked, setModuleLocked] = useState(false);
  /** Clés de sync déterministe — la narration suit currentTime, pas les jobs. */
  const lastSegKeyRef = useRef("");
  const lastPhaseKeyRef = useRef("");
  const exitArmedRef = useRef(false);
  const syncFromTimeRef = useRef<(t: number, force?: boolean) => void>(
    () => {},
  );

  useEffect(() => {
    const unsub = clockRef.current.subscribe((t) => {
      setElapsedMs(t);
      syncFromTimeRef.current(t, false);
    });
    return () => {
      unsub();
    };
  }, []);

  /** Parcours scroll interactif (hors gate / finished / reduced simplifié). */
  const active = !reduced && !done && experience === "tour";
  /** Pin + écouteurs : gate (tous) ou tour (motion OK). */
  const pinListeners =
    !done &&
    !sessionSkipped &&
    (experience === "gate" ||
      experience === "tour" ||
      experience === "idle");

  useEffect(() => {
    if (!readHubSkippedSession()) return;
    setSessionSkipped(true);
    doneRef.current = true;
    setDone(true);
    experienceRef.current = "finished";
    setExperience("finished");
  }, []);

  const setExperiencePhase = useCallback((phase: ExperiencePhase) => {
    experienceRef.current = phase;
    setExperience(phase);
  }, []);

  const clearLockJob = useCallback(() => {
    if (lockJobRef.current != null) {
      clockRef.current.clear(lockJobRef.current);
      lockJobRef.current = null;
    }
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const clearFilmTimers = useCallback(() => {
    clockRef.current.clear();
    lockJobRef.current = null;
  }, []);

  const filmLater = useCallback((fn: () => void, ms: number) => {
    clockRef.current.later(fn, ms);
  }, []);

  const resetFilmClock = useCallback(() => {
    clockRef.current.reset();
    filmPausedRef.current = false;
    setFilmPaused(false);
    setElapsedMs(0);
    setDemoSeekMs(0);
  }, []);

  const setFilm = useCallback((phase: MumFilmPhase) => {
    filmPhaseRef.current = phase;
    setFilmPhase(phase);
  }, []);

  const setFocus = useCallback((id: FocusId) => {
    focusIdRef.current = id;
    setFocusId(id);
  }, []);

  const setFilmKind = useCallback((kind: ActiveFilm) => {
    activeFilmRef.current = kind;
    setActiveFilm(kind);
  }, []);

  const scheduleWheelRearm = useCallback(() => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      if (isPlayingRef.current) {
        scheduleWheelRearm();
        return;
      }
      wheelArmedRef.current = true;
      touchArmedRef.current = true;
      deltaAccumRef.current = 0;
      settleTimerRef.current = null;
    }, WHEEL_QUIET_MS);
  }, []);

  const continueAuto = useCallback(
    (delay = AUTO_BREATH_MS) => {
      if (!autoPlayRef.current || doneRef.current) return;
      filmLater(() => {
        if (!autoPlayRef.current || doneRef.current) return;
        advanceFilmRef.current();
      }, delay);
    },
    [filmLater],
  );

  const unlockScroll = useCallback(() => {
    clearLockJob();
    // Autoplay time-driven : ne jamais enchaîner via continueAuto (casse après seek).
    if (autoPlayRef.current && !doneRef.current) {
      isPlayingRef.current = true;
      scheduleWheelRearm();
      return;
    }
    isPlayingRef.current = false;
    if (
      experienceRef.current === "tour" &&
      !doneRef.current &&
      !autoPlayRef.current
    ) {
      setAwaitingGesture(true);
      setHintMode("start");
    }
    scheduleWheelRearm();
  }, [scheduleWheelRearm, clearLockJob]);

  const startSceneLock = useCallback(
    (sceneIndex: number, overrideMs?: number) => {
      isPlayingRef.current = true;
      wheelArmedRef.current = false;
      touchArmedRef.current = false;
      deltaAccumRef.current = 0;
      setAwaitingGesture(false);
      clearLockJob();
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      const ms = overrideMs ?? SCENE_LOCK_MS[sceneIndex] ?? 1200;
      lockJobRef.current = clockRef.current.later(() => {
        lockJobRef.current = null;
        unlockScroll();
      }, ms);
    },
    [unlockScroll, clearLockJob],
  );

  const resetToEcosystem = useCallback(() => {
    clearFilmTimers();
    setFilm("idle");
    setFocus(null);
    setFilmKind(null);
    setModuleLocked(false);
    setRingRotation(0);
  }, [clearFilmTimers, setFilm, setFocus, setFilmKind]);

  const exitHub = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    autoPlayRef.current = false;
    setAutoPlaying(false);
    resetFilmClock();
    pinModeRef.current = "before";
    setPinMode("before");
    setAwaitingGesture(false);
    setExperiencePhase("finished");
    resetToEcosystem();
  }, [resetToEcosystem, setExperiencePhase, resetFilmClock]);

  const scrollToNextSection = useCallback(() => {
    const go = () => {
      document
        .getElementById(NEXT_SECTION_ID)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    requestAnimationFrame(() => requestAnimationFrame(go));
  }, []);

  const skipPresentation = useCallback(() => {
    writeHubSkippedSession();
    setSessionSkipped(true);
    clearLockJob();
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    clearFilmTimers();
    resetFilmClock();
    isPlayingRef.current = false;
    wheelArmedRef.current = true;
    touchArmedRef.current = true;
    setAwaitingGesture(false);
    setSignatureSealed(true);
    setFilm("sealed");
    exitHub();
    scrollToNextSection();
  }, [
    clearFilmTimers,
    clearLockJob,
    exitHub,
    resetFilmClock,
    scrollToNextSection,
    setFilm,
  ]);

  const beginExperience = useCallback(() => {
    if (reduced) {
      setSignatureSealed(true);
      setFilm("sealed");
      exitHub();
      return;
    }
    autoPlayRef.current = false;
    setAutoPlaying(false);
    resetFilmClock();
    setHintMode("start");
    setAwaitingGesture(true);
    sceneRef.current = 0;
    setScene(0);
    mumPlanRef.current = 0;
    setMumPlan(0);
    isPlayingRef.current = false;
    wheelArmedRef.current = true;
    touchArmedRef.current = true;
    deltaAccumRef.current = 0;
    engageAtRef.current = Date.now() + ENGAGE_GRACE_MS;
    setExperiencePhase("tour");
  }, [reduced, exitHub, setFilm, setExperiencePhase, resetFilmClock]);

  const replayPresentation = useCallback(() => {
    clearHubSkippedSession();
    setSessionSkipped(false);
    clearLockJob();
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    clearFilmTimers();
    resetFilmClock();
    doneRef.current = false;
    setDone(false);
    sceneRef.current = 0;
    setScene(0);
    mumPlanRef.current = 0;
    setMumPlan(0);
    signaturePlayedRef.current = false;
    setSignatureSealed(false);
    autoPlayRef.current = false;
    setAutoPlaying(false);
    resetToEcosystem();
    setFilm("idle");
    setAwaitingGesture(true);
    setHintMode("start");
    pinModeRef.current = "before";
    setPinMode("before");
    setExperiencePhase("tour");
    requestAnimationFrame(() => {
      document
        .getElementById("ecosysteme")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [
    clearFilmTimers,
    clearLockJob,
    resetFilmClock,
    resetToEcosystem,
    setFilm,
    setExperiencePhase,
  ]);

  const snapClockAfterDemo = useCallback((filmModule: HubFilmModule) => {
    // Time-driven : ne jamais seek le clock depuis un panel (efface la timeline).
    if (autoPlayRef.current) return;
    const plan = mumPlanRef.current;
    const snap =
      nextAnchorAfterDemo(filmModule, plan) -
      (filmModule === "mum" && plan < MUM_PLAN_COUNT - 1
        ? AUTO_PLAN_BREATH_MS
        : AUTO_BREATH_MS);
    if (clockRef.current.now() < snap) {
      clockRef.current.seek(snap);
      lockJobRef.current = null;
    } else {
      clearLockJob();
    }
  }, [clearLockJob]);

  const holdThenUnlock = useCallback(
    (filmModule: HubFilmModule) => {
      if (autoPlayRef.current) {
        setFilm("hold");
        return;
      }
      snapClockAfterDemo(filmModule);
      setFilm("hold");
      filmLater(() => unlockScroll(), HOLD_MS);
    },
    [setFilm, filmLater, unlockScroll, snapClockAfterDemo],
  );

  const onMumPlanComplete = useCallback(() => {
    if (sceneRef.current !== 3) return;
    holdThenUnlock("mum");
  }, [holdThenUnlock]);

  const onClientsDemoComplete = useCallback(() => {
    if (sceneRef.current !== 5) return;
    holdThenUnlock("clients");
  }, [holdThenUnlock]);

  const onChantiersDemoComplete = useCallback(() => {
    if (sceneRef.current !== 7) return;
    holdThenUnlock("chantiers");
  }, [holdThenUnlock]);

  const onPlanDemoComplete = useCallback(() => {
    if (sceneRef.current !== 9) return;
    holdThenUnlock("planning");
  }, [holdThenUnlock]);

  const onFinDemoComplete = useCallback(() => {
    if (sceneRef.current !== 11) return;
    holdThenUnlock("finance");
  }, [holdThenUnlock]);

  const onPilotageDemoComplete = useCallback(() => {
    if (sceneRef.current !== 13) return;
    holdThenUnlock("pilotage");
  }, [holdThenUnlock]);

  const startModuleFilm = useCallback(
    (
      kind: Exclude<ActiveFilm, null>,
      focus: Exclude<FocusId, null>,
      sceneIndex: number,
      enterMs: number,
    ) => {
      clearFilmTimers();
      setDemoSeekMs(0);
      setModuleLocked(false);
      setFilmKind(kind);
      setFocus(focus);
      setRingRotation(ringRotationForModule(focus));
      setFilm("highlight");
      startSceneLock(sceneIndex);
      const readMs = moduleReadMs(focus);
      // Verrouillage en douceur à l’approche du haut
      filmLater(() => setModuleLocked(true), Math.max(240, MODULE_LOCK_MS - 260));
      // Léger zoom module → titre visible
      filmLater(() => setFilm("enter"), MODULE_LOCK_MS);
      // Lecture adaptée puis démo
      filmLater(
        () => setFilm("demo"),
        MODULE_LOCK_MS + enterMs + readMs,
      );
    },
    [clearFilmTimers, setFilmKind, setFocus, setFilm, startSceneLock, filmLater],
  );

  const startModuleReturn = useCallback(
    (
      kind: Exclude<ActiveFilm, null>,
      focus: Exclude<FocusId, null>,
      sceneIndex: number,
      returnMs: number,
    ) => {
      clearFilmTimers();
      setDemoSeekMs(0);
      setModuleLocked(false);
      setFilmKind(kind);
      setFocus(focus);
      setFilm("returning");
      startSceneLock(sceneIndex, returnMs);
      filmLater(() => {
        setFilmKind(null);
        setFocus(null);
        setFilm("idle");
      }, returnMs);
    },
    [clearFilmTimers, setFilmKind, setFocus, setFilm, startSceneLock, filmLater],
  );

  const startMumFilm = useCallback(() => {
    startModuleFilm("mum", "mum", 3, MUM_ENTER_MS);
  }, [startModuleFilm]);

  const startMumReturn = useCallback(() => {
    startModuleReturn("mum", "mum", 4, MUM_RETURN_MS);
  }, [startModuleReturn]);

  const startClientsFilm = useCallback(() => {
    startModuleFilm("clients", "clients", 5, CLIENTS_ENTER_MS);
  }, [startModuleFilm]);

  const startClientsReturn = useCallback(() => {
    startModuleReturn("clients", "clients", 6, CLIENTS_RETURN_MS);
  }, [startModuleReturn]);

  const startChantiersFilm = useCallback(() => {
    startModuleFilm("chantiers", "chantiers", 7, CHANTIER_ENTER_MS);
  }, [startModuleFilm]);

  const startChantiersReturn = useCallback(() => {
    startModuleReturn("chantiers", "chantiers", 8, CHANTIER_RETURN_MS);
  }, [startModuleReturn]);

  const startPlanFilm = useCallback(() => {
    startModuleFilm("planning", "planning", 9, PLAN_ENTER_MS);
  }, [startModuleFilm]);

  const startPlanReturn = useCallback(() => {
    startModuleReturn("planning", "planning", 10, PLAN_RETURN_MS);
  }, [startModuleReturn]);

  const startFinFilm = useCallback(() => {
    startModuleFilm("finance", "finance", 11, FIN_ENTER_MS);
  }, [startModuleFilm]);

  const startFinReturn = useCallback(() => {
    startModuleReturn("finance", "finance", 12, FIN_RETURN_MS);
  }, [startModuleReturn]);

  const startPilotageFilm = useCallback(() => {
    startModuleFilm("pilotage", "pilotage", 13, PILOTAGE_ENTER_MS);
  }, [startModuleFilm]);

  const startPilotageReturn = useCallback(() => {
    startModuleReturn("pilotage", "pilotage", 14, PILOTAGE_RETURN_MS);
  }, [startModuleReturn]);

  const startConverge = useCallback(() => {
    clearFilmTimers();
    setModuleLocked(false);
    setFilmKind(null);
    setFocus(null);
    setRingRotation(0);
    setFilm("converge");
    startSceneLock(15, FIN_CONVERGE_MS);
  }, [clearFilmTimers, setFilmKind, setFocus, setFilm, startSceneLock]);

  const onSignatureComplete = useCallback(() => {
    if (sceneRef.current !== 16) return;
    signaturePlayedRef.current = true;
    setSignatureSealed(true);
    setFilm("sealed");
    setAwaitingGesture(false);
    isPlayingRef.current = false;
    // Time-driven : la sortie est gérée quand currentTime atteint la fin.
    if (!autoPlayRef.current) {
      filmLater(() => {
        exitHub();
      }, 900);
    }
  }, [setFilm, filmLater, exitHub]);

  const startSignature = useCallback(() => {
    clearFilmTimers();
    setModuleLocked(false);
    setFilmKind(null);
    setFocus(null);
    signaturePlayedRef.current = false;
    setSignatureSealed(false);
    setFilm("signature");
    setDemoSeekMs(0);
    setSeekKey((k) => k + 1);
    startSceneLock(16, SIG_DEMO_SAFETY_MS);
  }, [
    clearFilmTimers,
    setFilmKind,
    setFocus,
    setFilm,
    startSceneLock,
  ]);

  useEffect(() => {
    startMumFilmRef.current = startMumFilm;
  }, [startMumFilm]);

  const enterMsForModule = (mod: HubFilmModule) => {
    if (mod === "mum") return MUM_ENTER_MS;
    if (mod === "clients") return CLIENTS_ENTER_MS;
    if (mod === "chantiers") return CHANTIER_ENTER_MS;
    if (mod === "planning") return PLAN_ENTER_MS;
    if (mod === "finance") return FIN_ENTER_MS;
    return PILOTAGE_ENTER_MS;
  };

  const returnMsForModule = (mod: HubFilmModule) => {
    if (mod === "mum") return MUM_RETURN_MS;
    if (mod === "clients") return CLIENTS_RETURN_MS;
    if (mod === "chantiers") return CHANTIER_RETURN_MS;
    if (mod === "planning") return PLAN_RETURN_MS;
    if (mod === "finance") return FIN_RETURN_MS;
    return PILOTAGE_RETURN_MS;
  };

  /** Applique l'état visuel d'un hit timeline (sans replanifier de narration). */
  const applyHitState = useCallback(
    (hit: TimelineHit, remountDemo: boolean) => {
      const filmModule = hit.module;
      const focus = filmModule as Exclude<FocusId, null> | null;
      isPlayingRef.current = true;
      setAwaitingGesture(false);

      sceneRef.current = hit.scene;
      setScene(hit.scene);
      mumPlanRef.current = hit.mumPlan;
      setMumPlan(hit.mumPlan);

      if (hit.kind === "intro") {
        setFilm("idle");
        setFocus(null);
        setFilmKind(null);
        setModuleLocked(false);
        setRingRotation(0);
        setSignatureSealed(false);
        setDemoSeekMs(0);
        if (remountDemo) setSeekKey((k) => k + 1);
        return;
      }

      if (hit.kind === "modulePre" && filmModule && focus) {
        const lockAt = Math.max(240, MODULE_LOCK_MS - 260);
        setFilmKind(filmModule);
        setFocus(focus);
        setRingRotation(ringRotationForModule(focus));
        setFilm(hit.filmPhase === "idle" ? "highlight" : hit.filmPhase);
        setModuleLocked(hit.preOffsetMs >= lockAt);
        setSignatureSealed(false);
        setDemoSeekMs(hit.demoOffsetMs);
        if (remountDemo && hit.filmPhase === "demo") setSeekKey((k) => k + 1);
        return;
      }

      if (hit.kind === "moduleDemo" && filmModule && focus) {
        setFilmKind(filmModule);
        setFocus(focus);
        setRingRotation(ringRotationForModule(focus));
        setFilm(hit.filmPhase);
        setModuleLocked(true);
        setSignatureSealed(false);
        setDemoSeekMs(hit.demoOffsetMs);
        if (remountDemo) setSeekKey((k) => k + 1);
        return;
      }

      if (hit.kind === "moduleReturn" && filmModule && focus) {
        const returnMs = returnMsForModule(filmModule);
        setModuleLocked(false);
        setSignatureSealed(false);
        setDemoSeekMs(0);
        if (hit.offsetMs >= returnMs) {
          setFilmKind(null);
          setFocus(null);
          setFilm("idle");
        } else {
          setFilmKind(filmModule);
          setFocus(focus);
          setRingRotation(ringRotationForModule(focus));
          setFilm("returning");
        }
        if (remountDemo) setSeekKey((k) => k + 1);
        return;
      }

      if (hit.kind === "converge") {
        setModuleLocked(false);
        setFilmKind(null);
        setFocus(null);
        setRingRotation(0);
        setFilm("converge");
        setSignatureSealed(false);
        setDemoSeekMs(0);
        if (remountDemo) setSeekKey((k) => k + 1);
        return;
      }

      // signature — seekable / rejouable
      signaturePlayedRef.current = false;
      setModuleLocked(false);
      setFilmKind(null);
      setFocus(null);
      setRingRotation(0);
      const sealedNow = hit.demoOffsetMs >= SIG_DEMO_SAFETY_MS - SIG_HOLD_MS;
      setSignatureSealed(sealedNow);
      setFilm(sealedNow ? "sealed" : "signature");
      setDemoSeekMs(hit.demoOffsetMs);
      if (remountDemo) setSeekKey((k) => k + 1);
    },
    [setFilm, setFocus, setFilmKind],
  );

  const syncFromTime = useCallback(
    (t: number, force = false) => {
      if (!autoPlayRef.current || doneRef.current) return;

      if (t >= HUB_FILM_TOTAL_MS - 1) {
        if (!exitArmedRef.current) {
          exitArmedRef.current = true;
          signaturePlayedRef.current = true;
          setSignatureSealed(true);
          setFilm("sealed");
          setElapsedMs(HUB_FILM_TOTAL_MS);
          window.setTimeout(() => {
            if (doneRef.current) return;
            exitHub();
          }, 700);
        }
        return;
      }

      const hit = resolveTimeline(t);
      const segKey = hitSegmentKey(hit);
      const phaseKey = hitPhaseKey(hit);

      if (force || segKey !== lastSegKeyRef.current) {
        lastSegKeyRef.current = segKey;
        lastPhaseKeyRef.current = phaseKey;
        const remount =
          hit.kind === "moduleDemo" ||
          hit.kind === "signature" ||
          (hit.kind === "modulePre" && hit.filmPhase === "demo");
        applyHitState(hit, remount || force);
        return;
      }

      if (phaseKey !== lastPhaseKeyRef.current) {
        lastPhaseKeyRef.current = phaseKey;
        if (hit.kind === "modulePre") {
          const lockAt = Math.max(240, MODULE_LOCK_MS - 260);
          setFilm(hit.filmPhase === "idle" ? "highlight" : hit.filmPhase);
          setModuleLocked(hit.preOffsetMs >= lockAt);
          if (hit.filmPhase === "demo") {
            setDemoSeekMs(hit.demoOffsetMs);
            setSeekKey((k) => k + 1);
          }
        } else if (hit.kind === "moduleDemo") {
          setFilm(hit.filmPhase);
          setDemoSeekMs(hit.demoOffsetMs);
        } else if (hit.kind === "signature") {
          const sealedNow = hit.demoOffsetMs >= SIG_DEMO_SAFETY_MS - SIG_HOLD_MS;
          setSignatureSealed(sealedNow);
          setFilm(sealedNow ? "sealed" : "signature");
          setDemoSeekMs(hit.demoOffsetMs);
        } else if (hit.kind === "moduleReturn") {
          applyHitState(hit, false);
        } else if (hit.kind === "intro") {
          sceneRef.current = hit.scene;
          setScene(hit.scene);
        }
      } else if (hit.kind === "signature") {
        // Progression continue pour la disparition horaire (sans remount).
        setDemoSeekMs(hit.demoOffsetMs);
      } else if (hit.kind === "intro" && sceneRef.current !== hit.scene) {
        sceneRef.current = hit.scene;
        setScene(hit.scene);
      }
    },
    [applyHitState, exitHub, setFilm],
  );

  useEffect(() => {
    syncFromTimeRef.current = syncFromTime;
  }, [syncFromTime]);

  const seekTo = useCallback(
    (ms: number) => {
      if (!autoPlayRef.current && !autoPlaying) return;
      const clamped = Math.max(0, Math.min(ms, HUB_FILM_TOTAL_MS - 1));
      clearFilmTimers();
      clearLockJob();
      exitArmedRef.current = false;
      signaturePlayedRef.current = false;
      doneRef.current = false;
      setDone(false);

      clockRef.current.seek(clamped, { clearJobs: true });
      setElapsedMs(clamped);

      autoPlayRef.current = true;
      setAutoPlaying(true);
      setExperiencePhase("tour");
      setAwaitingGesture(false);
      isPlayingRef.current = true;

      lastSegKeyRef.current = "";
      lastPhaseKeyRef.current = "";
      syncFromTime(clamped, true);

      if (!filmPausedRef.current) {
        clockRef.current.play();
      }
    },
    [
      autoPlaying,
      clearFilmTimers,
      clearLockJob,
      setExperiencePhase,
      syncFromTime,
    ],
  );

  const togglePause = useCallback(() => {
    if (!autoPlayRef.current) return;
    if (filmPausedRef.current) {
      filmPausedRef.current = false;
      setFilmPaused(false);
      clockRef.current.play();
    } else {
      filmPausedRef.current = true;
      setFilmPaused(true);
      clockRef.current.pause();
    }
  }, []);

  const restartFilm = useCallback(() => {
    if (!autoPlayRef.current && !autoPlaying) return;
    filmPausedRef.current = false;
    setFilmPaused(false);
    seekTo(0);
  }, [autoPlaying, seekTo]);

  const advanceFilm = useCallback(() => {
    if (doneRef.current || experienceRef.current !== "tour") return;
    if (isPlayingRef.current) return;

    const current = sceneRef.current;
    setAwaitingGesture(false);

    if (current < LAST_SCENE) {
      if (current === 3 && mumPlanRef.current < MUM_PLAN_COUNT - 1) {
        const nextPlan = mumPlanRef.current + 1;
        mumPlanRef.current = nextPlan;
        setMumPlan(nextPlan);
        setFilm("demo");
        startSceneLock(3);
        return;
      }

      const go = current + 1;
      sceneRef.current = go;
      setScene(go);
      if (go === 3) {
        mumPlanRef.current = 0;
        setMumPlan(0);
        startMumFilm();
      } else if (go === 4) startMumReturn();
      else if (go === 5) startClientsFilm();
      else if (go === 6) startClientsReturn();
      else if (go === 7) startChantiersFilm();
      else if (go === 8) startChantiersReturn();
      else if (go === 9) startPlanFilm();
      else if (go === 10) startPlanReturn();
      else if (go === 11) startFinFilm();
      else if (go === 12) startFinReturn();
      else if (go === 13) startPilotageFilm();
      else if (go === 14) startPilotageReturn();
      else if (go === 15) startConverge();
      else if (go === 16) startSignature();
      else startSceneLock(go);
      return;
    }

    exitHub();
  }, [
    startSceneLock,
    startMumFilm,
    startMumReturn,
    startClientsFilm,
    startClientsReturn,
    startChantiersFilm,
    startChantiersReturn,
    startPlanFilm,
    startPlanReturn,
    startFinFilm,
    startFinReturn,
    startPilotageFilm,
    startPilotageReturn,
    startConverge,
    startSignature,
    exitHub,
    setFilm,
  ]);

  useEffect(() => {
    advanceFilmRef.current = advanceFilm;
  }, [advanceFilm]);

  const applyIntent = useCallback(
    (direction: 1 | -1): "handled" | "exit" | "pass" => {
      if (!active) return "pass";
      if (pinModeRef.current !== "pin") return "pass";
      if (Date.now() < engageAtRef.current) return "handled";

      // Pendant le film auto : absorber les gestes (pas d’étapes manuelles)
      if (autoPlayRef.current) return "handled";
      if (isPlayingRef.current) return "handled";

      const current = sceneRef.current;

      if (direction > 0) {
        // Premier et unique geste : lancer tout le film
        if (current === 0) {
          autoPlayRef.current = true;
          setAutoPlaying(true);
          filmPausedRef.current = false;
          setFilmPaused(false);
          exitArmedRef.current = false;
          signaturePlayedRef.current = false;
          clearFilmTimers();
          clearLockJob();
          clockRef.current.reset();
          setDemoSeekMs(0);
          setElapsedMs(0);
          setAwaitingGesture(false);
          setHintMode("start");
          mumPlanRef.current = 0;
          setMumPlan(0);
          isPlayingRef.current = true;
          lastSegKeyRef.current = "";
          lastPhaseKeyRef.current = "";
          syncFromTime(0, true);
          clockRef.current.play();
          return "handled";
        }
        return "handled";
      }

      // Remonter uniquement depuis l’écran d’attente (avant le film)
      if (current === 0) return "pass";
      return "handled";
    },
    [
      active,
      clearFilmTimers,
      clearLockJob,
      syncFromTime,
    ],
  );

  const [gateCinematic, setGateCinematic] = useState(false);

  useEffect(() => {
    const onOpenStart = (event: Event) => {
      if (readHubSkippedSession() || doneRef.current) return;
      const detail = (event as CustomEvent<{ cinematic?: boolean }>).detail;
      setSessionSkipped(false);
      doneRef.current = false;
      setDone(false);
      autoPlayRef.current = false;
      setAutoPlaying(false);
      clockRef.current.reset();
      filmPausedRef.current = false;
      setFilmPaused(false);
      setElapsedMs(0);
      setDemoSeekMs(0);
      signaturePlayedRef.current = false;
      setSignatureSealed(false);
      sceneRef.current = 0;
      setScene(0);
      mumPlanRef.current = 0;
      setMumPlan(0);
      setHintMode("start");
      setAwaitingGesture(true);
      setGateCinematic(detail?.cinematic !== false);
      setExperiencePhase("tour");
      pinModeRef.current = "before";
      setPinMode("before");
      requestAnimationFrame(() => {
        const el = pinRef.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      });
    };
    window.addEventListener("batimum:open-hub-gate", onOpenStart);
    return () =>
      window.removeEventListener("batimum:open-hub-gate", onOpenStart);
  }, [setExperiencePhase]);

  useEffect(() => {
    if (!pinListeners || sessionSkipped) return;

    const syncPin = () => {
      const el = pinRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top > 1) {
        pinModeRef.current = "before";
        setPinMode("before");
        if (experienceRef.current === "gate") {
          setExperiencePhase("idle");
        }
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
        touchArmedRef.current = true;

        if (experienceRef.current === "idle" || experienceRef.current === "gate") {
          // Page de présentation : uniquement « Défilez pour commencer »
          setExperiencePhase("tour");
          setHintMode("start");
          setAwaitingGesture(true);
          autoPlayRef.current = false;
          setAutoPlaying(false);
        }
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
  }, [pinListeners, sessionSkipped, setExperiencePhase]);

  useEffect(() => {
    if (!pinListeners) return;

    const onWheel = (event: WheelEvent) => {
      if (pinModeRef.current !== "pin") return;

      // Gate legacy : bloquer le scroll bas
      if (experienceRef.current === "gate") {
        if (event.deltaY < 0) return;
        event.preventDefault();
        return;
      }

      if (experienceRef.current !== "tour") return;

      // Film automatique : absorber toute inertie, ne jamais avancer manuellement
      if (autoPlayRef.current || autoPlaying) {
        event.preventDefault();
        return;
      }

      if (Date.now() < engageAtRef.current) {
        event.preventDefault();
        deltaAccumRef.current = 0;
        return;
      }

      if (isPlayingRef.current || !wheelArmedRef.current) {
        event.preventDefault();
        deltaAccumRef.current = 0;
        if (!isPlayingRef.current) scheduleWheelRearm();
        return;
      }

      if (sceneRef.current === 0 && event.deltaY < 0) {
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
  }, [pinListeners, applyIntent, scheduleWheelRearm, autoPlaying]);

  useEffect(() => {
    if (!pinListeners) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (pinModeRef.current !== "pin") return;

      if (event.key === "Escape") {
        event.preventDefault();
        skipPresentation();
        return;
      }

      if (experienceRef.current === "gate") {
        if (event.key === "Enter") {
          event.preventDefault();
          beginExperience();
        }
        return;
      }

      if (experienceRef.current !== "tour") return;

      let direction: 1 | -1 | null = null;
      if (
        event.key === "ArrowDown" ||
        event.key === "PageDown" ||
        event.key === " " ||
        event.key === "Spacebar"
      ) {
        direction = 1;
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        direction = -1;
      }
      if (!direction) return;
      if (
        (event.key === " " || event.key === "Spacebar") &&
        event.target instanceof HTMLElement &&
        /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/i.test(event.target.tagName)
      ) {
        return;
      }
      if (isPlayingRef.current || !wheelArmedRef.current) {
        event.preventDefault();
        return;
      }
      const result = applyIntent(direction);
      if (result === "pass") return;
      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pinListeners, applyIntent, skipPresentation, beginExperience]);

  useEffect(() => {
    if (!pinListeners) return;
    const el = stickyRef.current;
    if (!el) return;

    const onTouchStart = (event: TouchEvent) => {
      if (pinModeRef.current !== "pin") return;
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (pinModeRef.current !== "pin") return;
      if (touchStartYRef.current == null) return;
      if (experienceRef.current === "gate") {
        const y = event.touches[0]?.clientY;
        // Bloquer glissement vers le haut (contenu suivant) pendant la gate
        if (y != null && y < touchStartYRef.current) event.preventDefault();
        return;
      }
      if (experienceRef.current !== "tour") return;
      if (sceneRef.current > 0 || isPlayingRef.current) {
        event.preventDefault();
      } else {
        const y = event.touches[0]?.clientY;
        if (y != null && y < touchStartYRef.current) event.preventDefault();
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (pinModeRef.current !== "pin") return;
      const startY = touchStartYRef.current;
      touchStartYRef.current = null;
      if (startY == null) return;
      if (experienceRef.current === "gate") return;
      if (experienceRef.current !== "tour") return;
      if (isPlayingRef.current || !touchArmedRef.current) return;
      const endY = event.changedTouches[0]?.clientY;
      if (endY == null) return;
      const dy = startY - endY;
      if (Math.abs(dy) < TOUCH_THRESHOLD) return;
      const direction: 1 | -1 = dy > 0 ? 1 : -1;
      const result = applyIntent(direction);
      if (result === "pass") return;
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
  }, [pinListeners, applyIntent]);

  useEffect(() => {
    return () => {
      clearLockJob();
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      clearFilmTimers();
    };
  }, [clearFilmTimers, clearLockJob]);

  useEffect(() => {
    const compact = document.querySelector(
      ".lp-story--compact .lp-story__compact",
    ) as HTMLElement | null;
    if (!compact) return;

    const onScroll = () => {
      const hub = pinRef.current;
      if (!hub) return;
      const hubTop = hub.getBoundingClientRect().top;
      const vh = window.innerHeight;
      if (hubTop < vh * 0.92) {
        const t = Math.min(1, Math.max(0, (vh * 0.92 - hubTop) / (vh * 0.55)));
        compact.style.opacity = String(1 - t);
        compact.style.transition = "opacity 0.35s ease";
      } else {
        compact.style.opacity = "1";
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      compact.style.opacity = "";
      compact.style.transition = "";
    };
  }, []);

  const mumDemoActive =
    activeFilm === "mum" && (filmPhase === "demo" || filmPhase === "hold");
  const clientsDemoActive =
    activeFilm === "clients" &&
    (filmPhase === "demo" || filmPhase === "hold");
  const chantiersDemoActive =
    activeFilm === "chantiers" &&
    (filmPhase === "demo" || filmPhase === "hold");
  const planDemoActive =
    activeFilm === "planning" &&
    (filmPhase === "demo" || filmPhase === "hold");
  const finDemoActive =
    activeFilm === "finance" &&
    (filmPhase === "demo" || filmPhase === "hold");
  const pilotageDemoActive =
    activeFilm === "pilotage" &&
    (filmPhase === "demo" || filmPhase === "hold");

  const signatureActive =
    scene === 16 && filmPhase === "signature" && !signatureSealed;
  const signatureVisible =
    scene === 16 ||
    (done && signatureSealed) ||
    filmPhase === "sealed" ||
    filmPhase === "signature";

  const chapter = hubChapterFromScene(scene);
  const sigDismissCount =
    scene === 16
      ? Math.min(
          MODULE_RING_ORDER.length,
          Math.floor(Math.max(0, demoSeekMs) / SIG_DISMISS_EACH_MS),
        )
      : 0;
  const showTourChrome = experience === "tour" && pinMode === "pin" && !done;
  const { controlsVisible, bumpControls } = useHubControlsVisibility(
    autoPlaying && showTourChrome,
  );
  const showHint =
    showTourChrome &&
    awaitingGesture &&
    !autoPlaying &&
    !signatureSealed &&
    hintMode === "start" &&
    scene === 0 &&
    filmPhase !== "demo" &&
    filmPhase !== "enter" &&
    filmPhase !== "highlight" &&
    filmPhase !== "returning" &&
    filmPhase !== "signature" &&
    filmPhase !== "converge" &&
    filmPhase !== "sealed";

  useEffect(() => {
    if (!autoPlaying || !showTourChrome) return;
    const el = stickyRef.current;
    if (!el) return;
    const onMove = () => bumpControls();
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("mousemove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("mousemove", onMove);
    };
  }, [autoPlaying, showTourChrome, bumpControls]);

  useEffect(() => {
    if (filmPaused && autoPlaying) bumpControls();
  }, [filmPaused, autoPlaying, bumpControls]);

  const restingBlock = (
    <div className="lp-hub__resting lp-hub__resting--signature">
      <HubAtmosphereFallback />
      <HubSignaturePanel
        active={false}
        sealed
        reduced={!!reduced}
        onComplete={() => {}}
      />
      <div className="lp-hub__restingReplay">
        <HubReplayLink onReplay={replayPresentation} />
      </div>
    </div>
  );

  return (
    <section
      className={[
        "lp-hub",
        done ? "lp-hub--done" : "",
        pinMode === "pin" ? "lp-hub--pinned" : "",
        signatureVisible ? "lp-hub--signature" : "",
        experience === "gate" ? "lp-hub--gate" : "",
        experience === "tour" ? "lp-hub--tour" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      id="ecosysteme"
      aria-labelledby="hub-title"
      data-hub-scene={scene}
      data-hub-done={done ? "true" : "false"}
      data-hub-experience={experience}
      data-film-phase={filmPhase}
      data-focus={focusId ?? ""}
      data-active-film={activeFilm ?? ""}
      data-signature={signatureSealed ? "sealed" : signatureActive ? "playing" : ""}
      data-film-paused={filmPaused ? "true" : "false"}
    >
      <h2 id="hub-title" className="sr-only">
        Le cœur de Batimum : MUM IA, Clients, Planning, Chantiers,
        Facturation et Pilotage.
      </h2>

      {done ? (
        restingBlock
      ) : (
        <div className="lp-hub__pinTrack" ref={pinRef}>
          <div
            ref={stickyRef}
            className={[
              "lp-hub__sticky",
              pinMode === "pin" ? "is-pinned" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <LandingSafeBoundary name="hub-atmosphere" fallback={<HubAtmosphereFallback />}>
              <HubAtmosphere
                containerRef={stickyRef}
                scene={experience === "gate" ? 1 : scene}
                filmPhase={filmPhase}
                focusId={focusId}
                reduced={reduced}
                enabled={true}
                paused={filmPaused}
              />
            </LandingSafeBoundary>

            {experience === "gate" ? (
              <HubExperienceGate
                cinematic={gateCinematic}
                onDiscover={beginExperience}
                onSkip={skipPresentation}
              />
            ) : (
              <>
                {showTourChrome ? (
                  <>
                    {autoPlaying || scene > 0 ? (
                      <>
                        <HubSkipControl onSkip={skipPresentation} />
                        <HubTourProgress
                          current={chapter.current}
                          total={chapter.total}
                        />
                      </>
                    ) : null}
                    {autoPlaying ? (
                      <HubFilmControls
                        visible={controlsVisible || filmPaused}
                        elapsedMs={elapsedMs}
                        paused={filmPaused}
                        onSeek={seekTo}
                        onPauseToggle={togglePause}
                        onRestart={restartFilm}
                        onUserActivity={bumpControls}
                      />
                    ) : null}
                    <HubScrollHint visible={showHint} mode="start" />
                  </>
                ) : null}

                <HubStage
                  scene={scene}
                  filmPhase={filmPhase}
                  focusId={focusId}
                  reduced={reduced}
                  ringRotation={ringRotation}
                  moduleLocked={moduleLocked}
                  signatureMode={scene === 16}
                  sigDismissCount={sigDismissCount}
                />

                <MumFilmShell phase={activeFilm === "mum" ? filmPhase : "idle"}>
                  <MumFilmPanel
                    active={mumDemoActive}
                    reduced={!!reduced}
                    plan={mumPlan}
                    onPlanComplete={onMumPlanComplete}
                    paused={filmPaused}
                    seekMs={demoSeekMs}
                    seekKey={seekKey}
                  />
                </MumFilmShell>

                <ModuleFilmShell
                  moduleId="clients"
                  phase={activeFilm === "clients" ? filmPhase : "idle"}
                >
                  <ClientsFilmPanel
                    active={clientsDemoActive}
                    reduced={!!reduced}
                    onDemoComplete={onClientsDemoComplete}
                    paused={filmPaused}
                    seekMs={demoSeekMs}
                    seekKey={seekKey}
                  />
                </ModuleFilmShell>

                <ModuleFilmShell
                  moduleId="chantiers"
                  phase={activeFilm === "chantiers" ? filmPhase : "idle"}
                >
                  <ChantiersFilmPanel
                    active={chantiersDemoActive}
                    reduced={!!reduced}
                    onDemoComplete={onChantiersDemoComplete}
                    paused={filmPaused}
                    seekMs={demoSeekMs}
                    seekKey={seekKey}
                  />
                </ModuleFilmShell>

                <ModuleFilmShell
                  moduleId="planning"
                  phase={activeFilm === "planning" ? filmPhase : "idle"}
                >
                  <PlanningFilmPanel
                    active={planDemoActive}
                    reduced={!!reduced}
                    onDemoComplete={onPlanDemoComplete}
                    paused={filmPaused}
                    seekMs={demoSeekMs}
                    seekKey={seekKey}
                  />
                </ModuleFilmShell>

                <FinanceFilmShell
                  phase={activeFilm === "finance" ? filmPhase : "idle"}
                >
                  <FinanceFilmPanel
                    active={finDemoActive}
                    reduced={!!reduced}
                    onDemoComplete={onFinDemoComplete}
                    paused={filmPaused}
                    seekMs={demoSeekMs}
                    seekKey={seekKey}
                  />
                </FinanceFilmShell>

                <PilotageFilmShell
                  phase={activeFilm === "pilotage" ? filmPhase : "idle"}
                >
                  <PilotageFilmPanel
                    active={pilotageDemoActive}
                    reduced={!!reduced}
                    onDemoComplete={onPilotageDemoComplete}
                    paused={filmPaused}
                    seekMs={demoSeekMs}
                    seekKey={seekKey}
                  />
                </PilotageFilmShell>

                {scene === 16 ? (
                  <HubSignaturePanel
                    active={signatureActive}
                    sealed={signatureSealed || filmPhase === "sealed"}
                    reduced={!!reduced}
                    onComplete={onSignatureComplete}
                    paused={filmPaused}
                    seekMs={demoSeekMs}
                    seekKey={seekKey}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
