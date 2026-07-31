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

export const PILOTAGE_HIGHLIGHT_MS = 1400;
export const PILOTAGE_ENTER_MS = 1320;
export const PILOTAGE_RETURN_MS = 1600;
export const PILOTAGE_DEMO_SAFETY_MS = 16000;

type PilotBeat = "read" | "scan" | "warn" | "ok" | "done";

function PilotageCopy() {
  return (
    <div className="lp-hubPilot__copy">
      <span className="lp-eyebrow">
        <span className="lp-eyebrow__dot" aria-hidden="true" />
        Pilotage
      </span>
      <h3 className="lp-hubPilot__title">Pilotage</h3>
      <p className="lp-hubPilot__subtitle">
        Visualisez vos marges avant qu’il soit trop tard.
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
          <p>CA mensuel</p>
          <strong>48 200 €</strong>
        </article>
        <article className="lp-hubPilot__kpi is-on">
          <p>Marge moyenne</p>
          <strong>22&nbsp;%</strong>
        </article>
        <article className="lp-hubPilot__kpi is-on">
          <p>Chantiers actifs</p>
          <strong>8</strong>
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
        <p className="lp-hubPilot__calm">Décidez avant que la marge parte.</p>
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
  onDemoComplete,
}: {
  active: boolean;
  reduced: boolean;
  onDemoComplete: () => void;
}) {
  const [beat, setBeat] = useState<PilotBeat>("read");
  const finishedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDemoComplete();
  }, [onDemoComplete]);

  useEffect(() => {
    clearTimers();
    finishedRef.current = false;
    setBeat("read");
    if (!active) return;

    if (reduced) {
      setBeat("done");
      later(finish, 400);
      return clearTimers;
    }

    later(() => setBeat("scan"), 400);
    later(() => setBeat("warn"), 1600);
    later(() => setBeat("ok"), 3200);
    later(() => setBeat("done"), 4800);
    later(finish, 6200);
    return clearTimers;
  }, [active, reduced, finish]);

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
