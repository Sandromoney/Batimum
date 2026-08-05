"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  chapterAtTime,
  formatFilmTime,
  HUB_FILM_CHAPTERS,
  HUB_FILM_TOTAL_MS,
} from "@/lib/landing-hub-timeline";

/** Session only — cleared on full page reload. */
export const HUB_SKIP_SESSION_KEY = "batimum-hub-presentation-skipped";

export function readHubSkippedSession(): boolean {
  try {
    return sessionStorage.getItem(HUB_SKIP_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHubSkippedSession() {
  try {
    sessionStorage.setItem(HUB_SKIP_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function clearHubSkippedSession() {
  try {
    sessionStorage.removeItem(HUB_SKIP_SESSION_KEY);
  } catch {
    /* private mode */
  }
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return coarse;
}

const BM_SRC = "/logo-batimum.png";

/** Écran d’entrée — choix découvrir / passer. */
export function HubExperienceGate({
  onDiscover,
  onSkip,
  cinematic = false,
}: {
  onDiscover: () => void;
  onSkip: () => void;
  cinematic?: boolean;
}) {
  useEffect(() => {
    const btn = document.querySelector(
      ".lp-hub__gateBtn--primary",
    ) as HTMLButtonElement | null;
    btn?.focus();
  }, []);

  return (
    <div
      className={[
        "lp-hub__gate",
        cinematic ? "is-cinematic" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-gate-title"
      aria-describedby="hub-gate-desc"
    >
      <div className="lp-hub__gateInner">
        <div className="lp-hub__gateLogo" aria-hidden="true">
          <div className="lp-hub__gateLogoBreath">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BM_SRC}
              alt=""
              className="lp-hub__gateLogoImg"
              width={829}
              height={210}
              decoding="async"
              draggable={false}
            />
          </div>
        </div>

        <h3 id="hub-gate-title" className="lp-hub__gateTitle">
          Découvrez Batimum autrement.
        </h3>
        <p id="hub-gate-desc" className="lp-hub__gateLead">
          Parcourez les principales fonctionnalités du logiciel à votre rythme.
        </p>

        <div className="lp-hub__gateActions">
          <button
            type="button"
            className="lp-hub__gateBtn lp-hub__gateBtn--primary"
            onClick={onDiscover}
          >
            Découvrir l’expérience
          </button>
          <button
            type="button"
            className="lp-hub__gateBtn lp-hub__gateBtn--ghost"
            onClick={onSkip}
          >
            Passer la présentation
          </button>
        </div>
      </div>
    </div>
  );
}

/** Contrôle discret pour quitter à tout moment. */
export function HubSkipControl({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      className="lp-hub__skip"
      onClick={onSkip}
    >
      Passer la présentation
    </button>
  );
}

const CONTROLS_IDLE_MS = 2600;

/**
 * Contrôles film : barre noire toujours visible + pause / restart discrets.
 * Le skip reste un composant séparé (inchangé).
 */
export function HubFilmControls({
  visible,
  elapsedMs,
  totalMs = HUB_FILM_TOTAL_MS,
  paused,
  onPauseToggle,
  onSeek,
  onRestart,
  onUserActivity,
}: {
  visible: boolean;
  elapsedMs: number;
  totalMs?: number;
  paused: boolean;
  onPauseToggle: () => void;
  onSeek: (ms: number) => void;
  onRestart?: () => void;
  onUserActivity: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [hovering, setHovering] = useState(false);
  const [hoverRatio, setHoverRatio] = useState(0);
  const [tipShift, setTipShift] = useState(0);
  const draggingRef = useRef(false);

  const ratio = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 0;
  const hoverMs = hoverRatio * totalMs;
  const hoverChapter = chapterAtTime(hoverMs);

  const ratioFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const r = ratioFromClientX(clientX);
      onSeek(r * totalMs);
      onUserActivity();
    },
    [onSeek, onUserActivity, ratioFromClientX, totalMs],
  );

  const clampTip = useCallback(() => {
    const tip = tipRef.current;
    const track = trackRef.current;
    if (!tip || !track) return;
    const tipRect = tip.getBoundingClientRect();
    const pad = 8;
    let shift = 0;
    if (tipRect.left < pad) shift = pad - tipRect.left;
    else if (tipRect.right > window.innerWidth - pad) {
      shift = window.innerWidth - pad - tipRect.right;
    }
    setTipShift(shift);
  }, []);

  useEffect(() => {
    if (!hovering) {
      setTipShift(0);
      return;
    }
    const id = requestAnimationFrame(clampTip);
    return () => cancelAnimationFrame(id);
  }, [hovering, hoverRatio, clampTip]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setHovering(true);
    setHoverRatio(ratioFromClientX(e.clientX));
    seekFromClientX(e.clientX);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = ratioFromClientX(e.clientX);
    setHoverRatio(r);
    if (draggingRef.current) seekFromClientX(e.clientX);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  return (
    <div
      className={[
        "lp-hub__filmControls",
        visible ? "is-visible" : "",
        paused ? "is-paused" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerMove={onUserActivity}
    >
      <div
        ref={trackRef}
        className={[
          "lp-hub__scrub",
          hovering || draggingRef.current ? "is-hot" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="slider"
        aria-label="Progression de la présentation"
        aria-valuemin={0}
        aria-valuemax={Math.round(totalMs / 1000)}
        aria-valuenow={Math.round(elapsedMs / 1000)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={() => {
          setHovering(true);
          onUserActivity();
        }}
        onPointerLeave={() => {
          if (!draggingRef.current) setHovering(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            onSeek(Math.min(totalMs, elapsedMs + 2000));
            onUserActivity();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            onSeek(Math.max(0, elapsedMs - 2000));
            onUserActivity();
          }
        }}
      >
        <div className="lp-hub__scrubTrack" aria-hidden="true">
          <div
            className="lp-hub__scrubFill"
            style={{ transform: `scaleX(${ratio})` }}
          />
          {HUB_FILM_CHAPTERS.filter((ch) => ch.startMs > 0 && ch.startMs < totalMs).map(
            (ch) => (
              <span
                key={ch.id}
                className="lp-hub__scrubMark"
                style={{ left: `${(ch.startMs / totalMs) * 100}%` }}
                title={ch.label}
              />
            ),
          )}
        </div>
        {hovering ? (
          <span
            ref={tipRef}
            className="lp-hub__scrubTime"
            style={{
              left: `${hoverRatio * 100}%`,
              transform: `translateX(calc(-50% + ${tipShift}px))`,
            }}
            aria-hidden="true"
          >
            <span className="lp-hub__scrubTimeChapter">{hoverChapter.label}</span>
            <span className="lp-hub__scrubTimeValue">
              {formatFilmTime(hoverMs)} / {formatFilmTime(totalMs)}
            </span>
          </span>
        ) : null}
      </div>

      <div className="lp-hub__transport">
        <button
          type="button"
          className="lp-hub__pause"
          onClick={() => {
            onPauseToggle();
            onUserActivity();
          }}
          aria-label={paused ? "Reprendre la présentation" : "Mettre en pause"}
        >
          {paused ? (
            <Play size={14} strokeWidth={2.2} fill="currentColor" />
          ) : (
            <Pause size={14} strokeWidth={2.2} fill="currentColor" />
          )}
        </button>
        {onRestart ? (
          <button
            type="button"
            className="lp-hub__restart"
            onClick={() => {
              onRestart();
              onUserActivity();
            }}
            aria-label="Recommencer la présentation"
          >
            <RotateCcw size={13} strokeWidth={2.2} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function useHubControlsVisibility(active: boolean) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bump = useCallback(() => {
    if (!active) return;
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), CONTROLS_IDLE_MS);
  }, [active]);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    bump();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, bump]);

  return { controlsVisible: visible, bumpControls: bump };
}

/** Progression légère 01 / 06. */
export function HubTourProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const label = `${String(current).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  return (
    <div className="lp-hub__progress" aria-hidden="true">
      <span className="lp-hub__progressLabel">{label}</span>
      <span className="lp-hub__progressDots">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={[
              "lp-hub__progressDot",
              i < current ? "is-done" : "",
              i === current - 1 ? "is-current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
      </span>
    </div>
  );
}

/** Indication de geste entre les scènes. */
export function HubScrollHint({
  visible,
  mode,
}: {
  visible: boolean;
  mode: "start" | "continue";
}) {
  const coarse = useCoarsePointer();
  const label =
    mode === "start"
      ? coarse
        ? "Faites glisser pour commencer"
        : "Défilez pour commencer"
      : coarse
        ? "Faites glisser pour continuer"
        : "Défilez pour continuer";

  const arrowSize = mode === "start" ? 22 : 18;

  return (
    <div
      className={[
        "lp-hub__hint",
        mode === "start" ? "lp-hub__hint--start" : "lp-hub__hint--continue",
        visible ? "is-visible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <span className="lp-hub__hintText">{label}</span>
      <span className="lp-hub__hintArrow" aria-hidden="true">
        <svg
          width={arrowSize}
          height={arrowSize}
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 3.5v11M9 14.5l4-4M9 14.5l-4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

/** Lien discret en fin de parcours. */
export function HubReplayLink({ onReplay }: { onReplay: () => void }) {
  return (
    <button type="button" className="lp-hub__replay" onClick={onReplay}>
      Revoir la présentation
    </button>
  );
}

/** Mappe les scènes internes vers 6 modules (MUM → … → Pilotage). */
export function hubChapterFromScene(scene: number): { current: number; total: number } {
  const total = 6;
  if (scene <= 4) return { current: 1, total }; // intro + MUM
  if (scene <= 6) return { current: 2, total }; // Clients
  if (scene <= 8) return { current: 3, total }; // Chantiers
  if (scene <= 10) return { current: 4, total }; // Planning
  if (scene <= 12) return { current: 5, total }; // Facturation
  return { current: 6, total }; // Pilotage + finale
}
