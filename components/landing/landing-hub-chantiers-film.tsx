"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Calendar, Check, HardHat, MapPin, User } from "lucide-react";

export const CHANTIER_HIGHLIGHT_MS = 900;
export const CHANTIER_ENTER_MS = 1600;
export const CHANTIER_RETURN_MS = 1500;
export const CHANTIER_DEMO_SAFETY_MS = 32000;

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
      <span className="lp-eyebrow">
        <span className="lp-eyebrow__dot" aria-hidden="true" />
        Chantiers
      </span>
      <h3 className="lp-hubChantier__title">
        Suivez l’avancement réel.
        <br />
        Pas juste la liste des tâches.
      </h3>
      <p className="lp-hubChantier__subtitle">
        Chaque étape a un poids.
        <br />
        Batimum calcule la progression intelligemment.
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
  const highlightFaïence = beat === "faïence" || beat === "bump" || beat === "alive" || beat === "done";

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
            24 rue Garibaldi, Lyon 3e
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

        <div className="lp-hubChantier__photos" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

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
        <div className="lp-hubChantier__steps is-on">
          <p className="lp-hubChantier__blockLabel">Étapes</p>
          <ul>
            {STEPS.map((step) => {
              const st = states[step.id];
              return (
                <li
                  key={step.id}
                  className={[
                    `is-${st}`,
                    step.id === "faience" && highlightFaïence ? "is-focus" : "",
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
          Faïence terminée · avancement recalculé.
        </p>
      ) : null}
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
  onDemoComplete,
}: {
  active: boolean;
  reduced: boolean;
  onDemoComplete: () => void;
}) {
  const [beat, setBeat] = useState<ChantierBeat>("fiche");
  const [states, setStates] = useState(initialStates);
  const [percent, setPercent] = useState(() =>
    weightedProgress(initialStates()),
  );
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
    const base = initialStates();
    setStates(base);
    setPercent(weightedProgress(base));
    setBeat("fiche");

    if (!active) return;

    if (reduced) {
      const done = { ...base, faience: "done" as const, peint: "active" as const };
      setStates(done);
      setPercent(weightedProgress(done));
      setBeat("done");
      later(finish, 400);
      return clearTimers;
    }

    later(() => setBeat("steps"), 700);
    later(() => setBeat("progress"), 1600);
    later(() => setBeat("faïence"), 2800);
    later(() => {
      setBeat("bump");
      setStates((prev) => {
        const next = { ...prev, faience: "done" as const, peint: "active" as const };
        const target = weightedProgress(next);
        // Animate percent smoothly
        const from = weightedProgress(prev);
        const start = performance.now();
        const dur = 900;
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          setPercent(Math.round(from + (target - from) * eased));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        return next;
      });
    }, 4200);
    later(() => setBeat("alive"), 5600);
    later(() => setBeat("done"), 7200);
    later(finish, 8600);

    return clearTimers;
  }, [active, reduced, finish]);

  return (
    <div className="lp-hubChantier__panel">
      <ChantiersCopy />
      <ChantiersBoard beat={beat} states={states} percent={percent} />
    </div>
  );
}
