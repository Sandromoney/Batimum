"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Calendar, Check, HardHat, MapPin, User } from "lucide-react";
import { FilmCursor } from "@/components/landing/landing-hub-film-cursor";
import {
  runCueTimeline,
  usePauseableTimers,
} from "@/lib/landing-hub-pauseable-timer";

export const CHANTIER_HIGHLIGHT_MS = 900;
export const CHANTIER_ENTER_MS = 680;
export const CHANTIER_RETURN_MS = 750;
export const CHANTIER_DEMO_SAFETY_MS = 42000;

type ChantierBeat =
  | "fiche"
  | "steps"
  | "progress"
  | "faïence"
  | "bump"
  | "alive"
  | "done";

/** Poids réels — la faïence pèse 30 % de l’avancement global. */
const STEPS = [
  {
    id: "prep",
    label: "Préparation",
    weight: 5,
    difficulty: "Faible",
    initial: "done" as const,
  },
  {
    id: "plomb",
    label: "Plomberie",
    weight: 20,
    difficulty: "Élevée",
    initial: "done" as const,
  },
  {
    id: "elec",
    label: "Électricité",
    weight: 10,
    difficulty: "Moyenne",
    initial: "done" as const,
  },
  {
    id: "placo",
    label: "Placo",
    weight: 15,
    difficulty: "Moyenne",
    initial: "done" as const,
  },
  {
    id: "faience",
    label: "Faïence",
    weight: 30,
    difficulty: "Élevée",
    initial: "active" as const,
  },
  {
    id: "peint",
    label: "Peinture",
    weight: 10,
    difficulty: "Moyenne",
    initial: "todo" as const,
  },
  {
    id: "fin",
    label: "Finitions",
    weight: 10,
    difficulty: "Moyenne",
    initial: "todo" as const,
  },
] as const;

type StepState = "todo" | "active" | "done";

function weightedProgress(states: Record<string, StepState>) {
  let done = 0;
  let total = 0;
  for (const step of STEPS) {
    total += step.weight;
    if (states[step.id] === "done") done += step.weight;
    else if (states[step.id] === "active") done += step.weight * 0.45;
  }
  return Math.round((done / total) * 100);
}

function ChantiersCopy() {
  return (
    <div className="lp-hubChantier__copy">
      <h3 className="lp-hubChantier__title">Chantiers</h3>
      <p className="lp-hubChantier__subtitle">
        Avancement, étapes, affectations et historique — centralisés.
      </p>
    </div>
  );
}

function ChantiersBoard({
  beat,
  states,
  percent,
}: {
  beat: ChantierBeat;
  states: Record<string, StepState>;
  percent: number;
}) {
  const showSteps = beat !== "fiche";
  const highlightFaïence =
    beat === "faïence" ||
    beat === "bump" ||
    beat === "alive" ||
    beat === "done";

  return (
    <div className="lp-hubChantier__ui" aria-hidden="true">
      <div className="lp-hubChantier__uiHead">
        <HardHat size={15} strokeWidth={1.75} />
        <span>Fiche chantier</span>
      </div>

      <div className="lp-hubChantier__fiche is-on">
        <div className="lp-hubChantier__titleRow">
          <div>
            <p className="lp-hubChantier__name">Salle de bain · 18 m²</p>
            <p className="lp-hubChantier__client">Famille Martin</p>
          </div>
          <span className="lp-hubChantier__badge">En cours</span>
        </div>

        <ul className="lp-hubChantier__meta">
          <li>
            <MapPin size={13} strokeWidth={1.8} />
            24 rue Garibaldi, 69003 Lyon
          </li>
          <li>
            <User size={13} strokeWidth={1.8} />
            Responsable · Anthony
          </li>
          <li>
            <Calendar size={13} strokeWidth={1.8} />
            14 juil. → 8 août 2026
          </li>
        </ul>

        <div
          className={[
            "lp-hubChantier__progress",
            beat === "bump" || beat === "alive" || beat === "done"
              ? "is-pulse"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="lp-hubChantier__progressTop">
            <span>Avancement global</span>
            <strong>{percent}&nbsp;%</strong>
          </div>
          <div className="lp-hubChantier__bar">
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="lp-hubChantier__weightHint">
            Calculé selon le poids de chaque étape
          </p>
        </div>
      </div>

      {showSteps ? (
        <div
          className={[
            "lp-hubChantier__steps",
            "is-on",
            highlightFaïence ? "is-focusFaience" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="lp-hubChantier__blockLabel">Étapes</p>
          <ul>
            {STEPS.map((step) => {
              const st = states[step.id];
              return (
                <li
                  key={step.id}
                  data-cursor-target={step.id === "faience" ? "chantier-step" : undefined}
                  className={[
                    `is-${st}`,
                    step.id === "faience" && highlightFaïence ? "is-focus" : "",
                    step.id === "faience" &&
                    (beat === "faïence" || beat === "bump")
                      ? "is-hover"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="lp-hubChantier__stepMark" aria-hidden="true">
                    {st === "done" ? (
                      <Check size={12} strokeWidth={2.4} />
                    ) : null}
                  </span>
                  <div className="lp-hubChantier__stepBody">
                    <div className="lp-hubChantier__stepTop">
                      <span>{step.label}</span>
                      <span className="lp-hubChantier__stepMeta">
                        <span className="lp-hubChantier__diff">
                          {step.difficulty}
                        </span>
                        <span className="lp-hubChantier__weight">
                          {step.weight}&nbsp;%
                        </span>
                      </span>
                    </div>
                    <div className="lp-hubChantier__stepBar">
                      <span
                        style={{
                          width:
                            st === "done"
                              ? "100%"
                              : st === "active"
                                ? "45%"
                                : "0%",
                        }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {beat === "alive" || beat === "done" ? (
        <p className="lp-hubChantier__calm">
          Étapes, progression et affectations — au même endroit.
        </p>
      ) : null}

      <FilmCursor
        visible={beat === "faïence" || beat === "bump"}
        target={
          beat === "faïence" || beat === "bump"
            ? '[data-cursor-target="chantier-step"]'
            : null
        }
        clicking={beat === "faïence" || beat === "bump"}
      />
    </div>
  );
}

function initialStates(): Record<string, StepState> {
  const out: Record<string, StepState> = {};
  for (const s of STEPS) out[s.id] = s.initial;
  return out;
}

export function ChantiersFilmPanel({
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
  const [beat, setBeat] = useState<ChantierBeat>("fiche");
  const [states, setStates] = useState(initialStates);
  const [percent, setPercent] = useState(() =>
    weightedProgress(initialStates()),
  );
  const finishedRef = useRef(false);
  const { later, clear } = usePauseableTimers(paused);
  const rafRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDemoComplete();
  }, [onDemoComplete]);

  useEffect(() => {
    clear();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    finishedRef.current = false;
    const base = initialStates();
    setStates(base);
    setPercent(weightedProgress(base));
    setBeat("fiche");

    if (!active) return;

    if (reduced) {
      const done = {
        ...base,
        faience: "done" as const,
        peint: "active" as const,
      };
      setStates(done);
      setPercent(weightedProgress(done));
      setBeat("done");
      later(finish, 400);
      return clear;
    }

    const bumpProgress = () => {
      setBeat("bump");
      setStates((prev) => {
        const next = {
          ...prev,
          faience: "done" as const,
          peint: "active" as const,
        };
        const target = weightedProgress(next);
        const from = weightedProgress(prev);
        let start = performance.now();
        let frozen = 0;
        const dur = 1200;
        const step = (now: number) => {
          if (pausedRef.current) {
            frozen = now;
            rafRef.current = requestAnimationFrame(step);
            return;
          }
          if (frozen) {
            start += now - frozen;
            frozen = 0;
          }
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          setPercent(Math.round(from + (target - from) * eased));
          if (t < 1) rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return next;
      });
    };

    if (seekMs >= 2576) {
      const done = {
        ...base,
        faience: "done" as const,
        peint: "active" as const,
      };
      setStates(done);
      setPercent(weightedProgress(done));
    }

    runCueTimeline({
      seekMs,
      later,
      onFinish: finish,
      finishAt: 5000,
      cues: [
        { at: 417, apply: () => setBeat("steps") },
        { at: 985, apply: () => setBeat("progress") },
        { at: 1667, apply: () => setBeat("faïence") },
        { at: 2576, apply: bumpProgress },
        { at: 3333, apply: () => setBeat("alive") },
        { at: 4242, apply: () => setBeat("done") },
      ],
    });

    return () => {
      clear();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, reduced, seekKey, seekMs, finish, later, clear]);

  return (
    <div className="lp-hubChantier__panel">
      <ChantiersCopy />
      <ChantiersBoard beat={beat} states={states} percent={percent} />
    </div>
  );
}
