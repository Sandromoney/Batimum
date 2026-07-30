"use client";

import { useEffect, useState } from "react";

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
}: {
  onDiscover: () => void;
  onSkip: () => void;
}) {
  useEffect(() => {
    const btn = document.querySelector(
      ".lp-hub__gateBtn--primary",
    ) as HTMLButtonElement | null;
    btn?.focus();
  }, []);

  return (
    <div
      className="lp-hub__gate"
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

  return (
    <div
      className={[
        "lp-hub__hint",
        visible ? "is-visible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <span className="lp-hub__hintText">{label}</span>
      <span className="lp-hub__hintArrow" aria-hidden="true">
        <svg
          width="18"
          height="18"
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

/** Mappe les scènes internes vers 6 chapitres lisibles. */
export function hubChapterFromScene(scene: number): { current: number; total: number } {
  const total = 6;
  if (scene <= 2) return { current: 1, total };
  if (scene <= 4) return { current: 2, total };
  if (scene <= 6) return { current: 3, total };
  if (scene <= 8) return { current: 4, total };
  if (scene <= 10) return { current: 5, total };
  return { current: 6, total };
}
