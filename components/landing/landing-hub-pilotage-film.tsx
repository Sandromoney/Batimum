"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, LineChart } from "lucide-react";
import { FilmCursor } from "@/components/landing/landing-hub-film-cursor";
import {
  runCueTimeline,
  usePauseableTimers,
} from "@/lib/landing-hub-pauseable-timer";

export const PILOTAGE_HIGHLIGHT_MS = 1400;
export const PILOTAGE_ENTER_MS = 640;
export const PILOTAGE_RETURN_MS = 700;
export const PILOTAGE_DEMO_SAFETY_MS = 16000;

type PilotBeat = "read" | "scan" | "warn" | "ok" | "done";

function PilotageCopy() {
  return (
    <div className="lp-hubPilot__copy">
      <h3 className="lp-hubPilot__title">Pilotage</h3>
      <p className="lp-hubPilot__subtitle">
        Coûts, marges et rentabilité — suivis en temps réel, au plus près.
      </p>
    </div>
  );
}

function PilotageBoard({ beat }: { beat: PilotBeat }) {
  return (
    <div className="lp-hubPilot__ui" aria-hidden="true">
      <div className="lp-hubPilot__uiHead">
        <LineChart size={15} strokeWidth={1.75} />
        <span>Pilotage · juillet 2026</span>
      </div>

      <div className="lp-hubPilot__kpis">
        <article className="lp-hubPilot__kpi is-on">
          <p>Coûts du mois</p>
          <strong>37 600 €</strong>
        </article>
        <article className="lp-hubPilot__kpi is-on">
          <p>Marge moyenne</p>
          <strong>22&nbsp;%</strong>
        </article>
        <article className="lp-hubPilot__kpi is-on">
          <p>Rentabilité</p>
          <strong>+10 600 €</strong>
        </article>
      </div>

      <article
        data-cursor-target="pilot-warn"
        className={[
          "lp-hubPilot__alert",
          beat === "warn" || beat === "ok" || beat === "done" ? "is-on" : "",
          beat === "warn" ? "is-hover" : "",
          beat === "ok" || beat === "done" ? "is-resolved" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {beat === "ok" || beat === "done" ? (
          <Check size={14} strokeWidth={2.4} />
        ) : (
          <AlertTriangle size={14} strokeWidth={1.9} />
        )}
        <div>
          <p className="lp-hubPilot__alertTitle">
            {beat === "ok" || beat === "done"
              ? "Écart identifié"
              : "Marge sous les prévisions"}
          </p>
          <p className="lp-hubPilot__alertText">
            Cuisine — M. Bernard · écart de 380&nbsp;€
          </p>
        </div>
      </article>

      {beat === "done" ? (
          <p className="lp-hubPilot__calm">
            Coûts, marges, rentabilité — en temps réel.
          </p>
      ) : null}

      <FilmCursor
        visible={beat === "warn"}
        target={beat === "warn" ? '[data-cursor-target="pilot-warn"]' : null}
        clicking={beat === "warn"}
      />
    </div>
  );
}

export function PilotageFilmPanel({
  active,
  reduced,
  paused = false,
  seekMs = 0,
  seekKey = 0,
  onDemoComplete,
}: {
  active: boolean;
  reduced: boolean;
  paused?: boolean;
  seekMs?: number;
  seekKey?: number;
  onDemoComplete: () => void;
}) {
  const [beat, setBeat] = useState<PilotBeat>("read");
  const finishedRef = useRef(false);
  const { later, clear } = usePauseableTimers(paused);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDemoComplete();
  }, [onDemoComplete]);

  useEffect(() => {
    clear();
    finishedRef.current = false;
    setBeat("read");
    if (!active) return;

    if (reduced) {
      setBeat("done");
      later(finish, 400);
      return clear;
    }

    runCueTimeline({
      seekMs,
      later,
      onFinish: finish,
      finishAt: 2800,
      cues: [
        { at: 181, apply: () => setBeat("scan") },
        { at: 722, apply: () => setBeat("warn") },
        { at: 1445, apply: () => setBeat("ok") },
        { at: 2168, apply: () => setBeat("done") },
      ],
    });
    return clear;
  }, [active, reduced, seekKey, seekMs, finish, later, clear]);

  return (
    <div className="lp-hubPilot__panel">
      <PilotageCopy />
      <PilotageBoard beat={beat} />
    </div>
  );
}

export function PilotageFilmShell({
  phase,
  children,
}: {
  phase: string;
  children: ReactNode;
}) {
  const open =
    phase === "enter" ||
    phase === "demo" ||
    phase === "hold" ||
    phase === "returning";

  return (
    <div
      className={[
        "lp-hubPilot",
        open ? "is-open" : "",
        phase === "enter" ? "is-entering" : "",
        phase === "demo" || phase === "hold" ? "is-inside" : "",
        phase === "returning" ? "is-returning" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!open}
    >
      <div className="lp-hubPilot__frame">{children}</div>
    </div>
  );
}
