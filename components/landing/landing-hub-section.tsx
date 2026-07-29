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
  MUM_HIGHLIGHT_MS,
  MUM_RETURN_MS,
  type MumFilmPhase,
} from "@/components/landing/landing-hub-mum-film";

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

const HUB_MODULES: HubModule[] = [
  {
    id: "mum",
    title: "MUM IA",
    Icon: Bot,
    x: -26,
    y: -30,
    floatDelay: 0,
    floatDuration: 5.4,
  },
  {
    id: "planning",
    title: "Planning",
    Icon: Calendar,
    x: 28,
    y: -26,
    floatDelay: 0.4,
    floatDuration: 5.8,
  },
  {
    id: "clients",
    title: "Clients",
    Icon: Users,
    x: 36,
    y: 6,
    floatDelay: 0.9,
    floatDuration: 6.2,
  },
  {
    id: "chantiers",
    title: "Chantiers",
    Icon: HardHat,
    x: 16,
    y: 34,
    floatDelay: 0.2,
    floatDuration: 5.6,
  },
  {
    id: "facturation",
    title: "Facturation",
    Icon: Receipt,
    x: -20,
    y: 32,
    floatDelay: 1.1,
    floatDuration: 6.0,
  },
  {
    id: "pilotage",
    title: "Pilotage",
    Icon: LineChart,
    x: -38,
    y: 2,
    floatDelay: 0.65,
    floatDuration: 5.5,
  },
];

/**
 * 0 breath → 1 logo → 2 ecosystem → 3 mumFilm → 4 returnHub → exit
 * Scènes 0–2 inchangées. 3 = film MUM (auto). 4 = retour hub.
 */
const LAST_SCENE = 4;
const SCENE_LOCK_MS = [900, 1100, 2200, MUM_DEMO_SAFETY_MS, MUM_RETURN_MS] as const;
const WHEEL_THRESHOLD = 44;
const TOUCH_THRESHOLD = 54;
const WHEEL_SETTLE_MS = 160;
const ENGAGE_GRACE_MS = 280;

type PinMode = "before" | "pin";

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
  reduced,
}: {
  scene: number;
  filmPhase: MumFilmPhase;
  reduced: boolean | null;
}) {
  const showLogo = scene >= 1;
  const showModules = scene >= 2;
  const inFilm = scene === 3 || scene === 4;
  const highlight =
    filmPhase === "highlight" ||
    (scene === 3 && filmPhase === "idle");
  const deep =
    filmPhase === "enter" ||
    filmPhase === "demo" ||
    filmPhase === "hold";
  const returning = filmPhase === "returning" || scene === 4;
  const floatOn =
    showModules &&
    !reduced &&
    (scene === 2 || highlight || (scene === 4 && filmPhase === "idle"));
  const logoAwake = scene >= 2;

  const hubVisible = !deep;
  const mumHierarchy = highlight || deep || returning;

  return (
    <div
      className={[
        "lp-hub__stage",
        highlight ? "lp-hub__stage--highlight" : "",
        deep ? "lp-hub__stage--deep" : "",
        returning && !deep ? "lp-hub__stage--return" : "",
        floatOn ? "lp-hub__stage--float" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-hub-scene={scene}
      data-film-phase={filmPhase}
    >
      <div
        className={[
          "lp-hub__world",
          hubVisible ? "is-visible" : "is-faded",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="lp-hub__core">
          <motion.div
            className={[
              "lp-hub__logoWrap",
              logoAwake ? "lp-hub__logoWrap--awake" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            initial={false}
            animate={
              showLogo
                ? {
                    opacity: mumHierarchy ? 0.72 : 1,
                    scale: logoAwake ? (highlight ? 1.04 : 1.06) : 1,
                  }
                : { opacity: 0, scale: 0.95 }
            }
            transition={{
              duration: reduced ? 0.01 : showLogo && scene === 1 ? 0.85 : 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span
              className={[
                "lp-hub__halo",
                logoAwake && !mumHierarchy ? "is-on" : "",
                highlight ? "is-soft" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            />
            <BmMark />
          </motion.div>
        </div>

        <ul
          className="lp-hub__orbit"
          role="list"
          aria-hidden={showModules ? undefined : true}
        >
          {HUB_MODULES.map((mod, index) => {
            const Icon = mod.Icon;
            const isMum = mod.id === "mum";
            const active = mumHierarchy && isMum;
            const dimmed = mumHierarchy && !isMum;

            return (
              <li
                key={mod.id}
                className={[
                  "lp-hub__mod",
                  isMum ? "lp-hub__mod--mum" : "",
                  active ? "is-active" : "",
                  dimmed ? "is-dimmed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  {
                    "--hub-x": `${mod.x}%`,
                    "--hub-y": `${mod.y}%`,
                  } as CSSProperties
                }
              >
                <motion.div
                  className="lp-hub__modMotion"
                  initial={false}
                  animate={
                    showModules
                      ? {
                          opacity: dimmed ? 0.7 : 1,
                          scale: active ? 1.08 : dimmed ? 0.97 : 1,
                        }
                      : { opacity: 0, scale: 0.92 }
                  }
                  transition={{
                    duration: reduced ? 0.01 : highlight ? 1.1 : 0.75,
                    delay:
                      reduced || inFilm || !showModules
                        ? 0
                        : 0.12 + index * 0.1,
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
                    <article className="lp-hub__card">
                      <span className="lp-hub__icon" aria-hidden="true">
                        <Icon size={20} strokeWidth={1.7} />
                      </span>
                      <h3 className="lp-hub__cardTitle">{mod.title}</h3>
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
  return (
    <div className="lp-hub__static">
      <div className="lp-hub__stage lp-hub__stage--static">
        <div className="lp-hub__core">
          <div className="lp-hub__logoWrap lp-hub__logoWrap--awake">
            <span className="lp-hub__halo is-on" aria-hidden="true" />
            <BmMark />
          </div>
        </div>
        <ul className="lp-hub__orbit" role="list">
          {HUB_MODULES.map((mod) => {
            const Icon = mod.Icon;
            return (
              <li
                key={mod.id}
                className="lp-hub__mod"
                style={
                  {
                    "--hub-x": `${mod.x}%`,
                    "--hub-y": `${mod.y}%`,
                  } as CSSProperties
                }
              >
                <article className="lp-hub__card">
                  <span className="lp-hub__icon" aria-hidden="true">
                    <Icon size={20} strokeWidth={1.7} />
                  </span>
                  <h3 className="lp-hub__cardTitle">{mod.title}</h3>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function LandingHubSection() {
  const reduced = useReducedMotion();
  const pinRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  const [scene, setScene] = useState(0);
  const sceneRef = useRef(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  const [filmPhase, setFilmPhase] = useState<MumFilmPhase>("idle");
  const filmPhaseRef = useRef<MumFilmPhase>("idle");
  const filmTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [pinMode, setPinMode] = useState<PinMode>("before");
  const pinModeRef = useRef<PinMode>("before");

  const isPlayingRef = useRef(false);
  const wheelArmedRef = useRef(true);
  const deltaAccumRef = useRef(0);
  const engageAtRef = useRef(0);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const active = !reduced && !done;

  const clearFilmTimers = useCallback(() => {
    filmTimersRef.current.forEach(clearTimeout);
    filmTimersRef.current = [];
  }, []);

  const filmLater = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    filmTimersRef.current.push(id);
  }, []);

  const setFilm = useCallback((phase: MumFilmPhase) => {
    filmPhaseRef.current = phase;
    setFilmPhase(phase);
  }, []);

  const armWheelAfterSettle = useCallback(() => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      wheelArmedRef.current = true;
      deltaAccumRef.current = 0;
      settleTimerRef.current = null;
    }, WHEEL_SETTLE_MS);
  }, []);

  const unlockScroll = useCallback(() => {
    isPlayingRef.current = false;
    armWheelAfterSettle();
  }, [armWheelAfterSettle]);

  const startSceneLock = useCallback(
    (sceneIndex: number, overrideMs?: number) => {
      isPlayingRef.current = true;
      wheelArmedRef.current = false;
      deltaAccumRef.current = 0;
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      const ms = overrideMs ?? SCENE_LOCK_MS[sceneIndex] ?? 1200;
      lockTimerRef.current = setTimeout(() => {
        // Scène 3 : déverrouillage géré par la fin de démo
        if (sceneIndex === 3) return;
        unlockScroll();
      }, ms);
    },
    [unlockScroll],
  );

  const exitHub = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    pinModeRef.current = "before";
    setPinMode("before");
    setFilm("idle");
  }, [setFilm]);

  const onMumDemoComplete = useCallback(() => {
    if (sceneRef.current !== 3) return;
    setFilm("hold");
    // Silence court, puis rendu du scroll pour le retour hub
    filmLater(() => {
      unlockScroll();
    }, 500);
  }, [setFilm, filmLater, unlockScroll]);

  const startMumFilm = useCallback(() => {
    clearFilmTimers();
    setFilm("highlight");
    startSceneLock(3);

    filmLater(() => {
      setFilm("enter");
    }, MUM_HIGHLIGHT_MS);

    filmLater(() => {
      setFilm("demo");
    }, MUM_HIGHLIGHT_MS + MUM_ENTER_MS);
  }, [clearFilmTimers, setFilm, startSceneLock, filmLater]);

  const startMumReturn = useCallback(() => {
    clearFilmTimers();
    setFilm("returning");
    startSceneLock(4, MUM_RETURN_MS);

    filmLater(() => {
      setFilm("idle");
    }, MUM_RETURN_MS);
  }, [clearFilmTimers, setFilm, startSceneLock, filmLater]);

  const applyIntent = useCallback(
    (direction: 1 | -1): "handled" | "exit" | "pass" => {
      if (!active) return "pass";
      if (pinModeRef.current !== "pin") return "pass";
      if (Date.now() < engageAtRef.current) return "handled";
      if (isPlayingRef.current) return "handled";

      const current = sceneRef.current;

      if (direction > 0) {
        if (current < LAST_SCENE) {
          const next = current + 1;
          sceneRef.current = next;
          setScene(next);
          if (next === 3) startMumFilm();
          else if (next === 4) startMumReturn();
          else startSceneLock(next);
          return "handled";
        }
        exitHub();
        return "exit";
      }

      // Remonter : depuis return/hold → pas de rejoue du film au milieu
      if (current > 0) {
        if (current === 4 || current === 3) {
          // Revenir à l’écosystème hub
          clearFilmTimers();
          setFilm("idle");
          sceneRef.current = 2;
          setScene(2);
          startSceneLock(2);
          return "handled";
        }
        const prev = current - 1;
        sceneRef.current = prev;
        setScene(prev);
        startSceneLock(prev);
        return "handled";
      }

      return "pass";
    },
    [
      active,
      startSceneLock,
      startMumFilm,
      startMumReturn,
      exitHub,
      clearFilmTimers,
      setFilm,
    ],
  );

  useEffect(() => {
    if (!active) return;

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
        if (sceneRef.current === 0) startSceneLock(0);
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
  }, [active, startSceneLock]);

  useEffect(() => {
    if (!active) return;

    const onWheel = (event: WheelEvent) => {
      if (pinModeRef.current !== "pin") return;

      if (Date.now() < engageAtRef.current) {
        event.preventDefault();
        deltaAccumRef.current = 0;
        return;
      }

      if (isPlayingRef.current || !wheelArmedRef.current) {
        event.preventDefault();
        deltaAccumRef.current = 0;
        if (!isPlayingRef.current) armWheelAfterSettle();
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
  }, [active, applyIntent, armWheelAfterSettle]);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (pinModeRef.current !== "pin") return;
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
      const result = applyIntent(direction);
      if (result === "pass") return;
      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, applyIntent]);

  useEffect(() => {
    if (!active) return;
    const el = stickyRef.current;
    if (!el) return;

    const onTouchStart = (event: TouchEvent) => {
      if (pinModeRef.current !== "pin") return;
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (pinModeRef.current !== "pin") return;
      if (touchStartYRef.current == null) return;
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
  }, [active, applyIntent]);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      clearFilmTimers();
    };
  }, [clearFilmTimers]);

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
        compact.style.transition = "opacity 0.05s linear";
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

  const demoActive = filmPhase === "demo" || filmPhase === "hold";
  const restingScene = 2;

  return (
    <section
      className={[
        "lp-hub",
        done ? "lp-hub--done" : "",
        pinMode === "pin" ? "lp-hub--pinned" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      id="ecosysteme"
      aria-labelledby="hub-title"
      data-hub-scene={scene}
      data-hub-done={done ? "true" : "false"}
      data-film-phase={filmPhase}
    >
      <h2 id="hub-title" className="sr-only">
        L’écosystème Batimum : MUM IA, Planning, Clients, Chantiers,
        Facturation et Pilotage.
      </h2>

      {reduced ? (
        <HubStatic />
      ) : done ? (
        <div className="lp-hub__resting">
          <HubStage
            scene={restingScene}
            filmPhase="idle"
            reduced={reduced}
          />
        </div>
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
            <HubStage
              scene={scene}
              filmPhase={filmPhase}
              reduced={reduced}
            />
            <MumFilmShell phase={filmPhase}>
              <MumFilmPanel
                active={demoActive}
                reduced={!!reduced}
                onDemoComplete={onMumDemoComplete}
              />
            </MumFilmShell>
          </div>
        </div>
      )}
    </section>
  );
}
