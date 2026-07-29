"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AlertTriangle, Calendar, Check, MapPin } from "lucide-react";

export type HubFilmPhase =
  | "idle"
  | "highlight"
  | "enter"
  | "demo"
  | "hold"
  | "returning"
  | "tease"
  | "converge"
  | "signature"
  | "sealed";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;

const JOBS = [
  {
    id: "martin",
    title: "Salle de bain",
    client: "Famille Martin",
    day: 0,
    employee: "Anthony",
  },
  {
    id: "bernard",
    title: "Cuisine",
    client: "M. Bernard",
    day: 2,
    employee: "Lucas",
  },
  {
    id: "plomberie",
    title: "Plomberie maison neuve",
    client: "Résidence Horizon",
    day: 4,
    employee: "Thomas",
  },
] as const;

export const PLAN_HIGHLIGHT_MS = 900;
export const PLAN_ENTER_MS = 1600;
export const PLAN_RETURN_MS = 1500;
export const PLAN_DEMO_SAFETY_MS = 32000;
export const PLAN_TEASE_MS = 1600;
export const PLAN_BREATH_MS = 900;

type PlanBeat =
  | "empty"
  | "days"
  | "jobs"
  | "people"
  | "reorder"
  | "conflict"
  | "resolve"
  | "route"
  | "status"
  | "done";

function PlanningCopy() {
  return (
    <div className="lp-hubPlan__copy">
      <span className="lp-eyebrow">
        <span className="lp-eyebrow__dot" aria-hidden="true" />
        Planning
      </span>
      <h3 className="lp-hubPlan__title">
        Organisez toute votre entreprise
        <br />
        en quelques secondes.
      </h3>
      <p className="lp-hubPlan__subtitle">
        Chantiers, équipes et trajets se synchronisent.
        <br />
        Batimum garde le rythme pour vous.
      </p>
    </div>
  );
}

function PlanningBoard({
  beat,
  daysOn,
  jobsOn,
  peopleOn,
  reordered,
  conflict,
  resolved,
  routeOn,
  statusStep,
}: {
  beat: PlanBeat;
  daysOn: number;
  jobsOn: number;
  peopleOn: number;
  reordered: boolean;
  conflict: boolean;
  resolved: boolean;
  routeOn: boolean;
  statusStep: number;
}) {
  const jobOrder = reordered
    ? [JOBS[1], JOBS[0], JOBS[2]]
    : [JOBS[0], JOBS[1], JOBS[2]];

  const statusLabel =
    statusStep >= 2 ? "Terminé" : statusStep >= 1 ? "En cours" : "Prévu";

  return (
    <div className="lp-hubPlan__ui" aria-hidden="true">
      <div className="lp-hubPlan__uiHead">
        <Calendar size={15} strokeWidth={1.75} />
        <span>Planning · semaine en cours</span>
      </div>

      <div className="lp-hubPlan__days">
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={[
              "lp-hubPlan__day",
              i < daysOn ? "is-on" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="lp-hubPlan__dayName">{day}</span>
            <div className="lp-hubPlan__daySlot" />
          </div>
        ))}
      </div>

      <div className="lp-hubPlan__board">
        {jobOrder.map((job, index) => {
          const visible = index < jobsOn;
          const isMartin = job.id === "martin";
          const empVisible = peopleOn > index;
          const showConflict = conflict && !resolved && isMartin;
          const assigned =
            resolved && isMartin ? "Lucas" : job.employee;

          return (
            <article
              key={job.id}
              className={[
                "lp-hubPlan__job",
                visible ? "is-on" : "",
                showConflict ? "is-conflict" : "",
                resolved && isMartin ? "is-resolved" : "",
                reordered && isMartin ? "is-moved" : "",
                `is-day-${job.day}`,
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ "--job-i": index } as CSSProperties}
            >
              <div className="lp-hubPlan__jobMain">
                <p className="lp-hubPlan__jobTitle">{job.title}</p>
                <p className="lp-hubPlan__jobClient">{job.client}</p>
              </div>

              <div
                className={[
                  "lp-hubPlan__status",
                  statusStep >= 2 && isMartin ? "is-done" : "",
                  statusStep >= 1 && isMartin ? "is-progress" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isMartin ? statusLabel : "Prévu"}
                {statusStep >= 2 && isMartin ? (
                  <Check size={12} strokeWidth={2.4} />
                ) : null}
              </div>

              <div
                className={[
                  "lp-hubPlan__emp",
                  empVisible ? "is-on" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="lp-hubPlan__empDot" />
                <span>{assigned}</span>
                <span
                  className={[
                    "lp-hubPlan__link",
                    empVisible ? "is-on" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                />
              </div>
            </article>
          );
        })}

        {conflict ? (
          <div
            className={[
              "lp-hubPlan__alert",
              conflict ? "is-on" : "",
              resolved ? "is-out" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <AlertTriangle size={14} strokeWidth={1.9} />
            <div>
              <p className="lp-hubPlan__alertTitle">Conflit détecté</p>
              <p className="lp-hubPlan__alertText">
                {resolved
                  ? "Réaffecté automatiquement à Lucas."
                  : "Anthony est déjà occupé."}
              </p>
            </div>
          </div>
        ) : null}

        {routeOn ? (
          <div className="lp-hubPlan__route is-on">
            <MapPin size={13} strokeWidth={1.9} />
            <span className="lp-hubPlan__routeLine" aria-hidden="true" />
            <span>−18 min de trajet</span>
          </div>
        ) : null}
      </div>

      {beat === "done" ? (
        <p className="lp-hubPlan__calm">Entreprise synchronisée.</p>
      ) : null}
    </div>
  );
}

export function PlanningFilmPanel({
  active,
  reduced,
  onDemoComplete,
}: {
  active: boolean;
  reduced: boolean;
  onDemoComplete: () => void;
}) {
  const [beat, setBeat] = useState<PlanBeat>("empty");
  const [daysOn, setDaysOn] = useState(0);
  const [jobsOn, setJobsOn] = useState(0);
  const [peopleOn, setPeopleOn] = useState(0);
  const [reordered, setReordered] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [routeOn, setRouteOn] = useState(false);
  const [statusStep, setStatusStep] = useState(0);
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
    setBeat("empty");
    setDaysOn(0);
    setJobsOn(0);
    setPeopleOn(0);
    setReordered(false);
    setConflict(false);
    setResolved(false);
    setRouteOn(false);
    setStatusStep(0);

    if (!active) return;

    if (reduced) {
      setDaysOn(5);
      setJobsOn(3);
      setPeopleOn(3);
      setReordered(true);
      setResolved(true);
      setRouteOn(true);
      setStatusStep(2);
      setBeat("done");
      later(finish, 500);
      return clearTimers;
    }

    // Scène 1 — jours
    later(() => setBeat("days"), 350);
    DAYS.forEach((_, i) => {
      later(() => setDaysOn(i + 1), 450 + i * 220);
    });

    // Scène 2 — cartes chantier
    later(() => setBeat("jobs"), 450 + 5 * 220 + 280);
    JOBS.forEach((_, i) => {
      later(() => setJobsOn(i + 1), 450 + 5 * 220 + 450 + i * 420);
    });

    // Scène 3 — employés
    const peopleStart = 450 + 5 * 220 + 450 + 3 * 420 + 350;
    later(() => setBeat("people"), peopleStart);
    JOBS.forEach((_, i) => {
      later(() => setPeopleOn(i + 1), peopleStart + 280 + i * 380);
    });

    // Scène 4 — déplacement
    const reorderAt = peopleStart + 280 + 3 * 380 + 500;
    later(() => {
      setBeat("reorder");
      setReordered(true);
    }, reorderAt);

    // Scène 5 — conflit + résolution
    const conflictAt = reorderAt + 900;
    later(() => {
      setBeat("conflict");
      setConflict(true);
    }, conflictAt);
    later(() => {
      setBeat("resolve");
      setResolved(true);
    }, conflictAt + 1100);

    // Scène 6 — trajet
    const routeAt = conflictAt + 1100 + 700;
    later(() => {
      setBeat("route");
      setRouteOn(true);
    }, routeAt);

    // Scène 7 — statuts
    const statusAt = routeAt + 900;
    later(() => setBeat("status"), statusAt);
    later(() => setStatusStep(1), statusAt + 450);
    later(() => setStatusStep(2), statusAt + 950);
    later(() => setBeat("done"), statusAt + 1400);
    later(finish, statusAt + 2200);

    return clearTimers;
  }, [active, reduced, finish]);

  return (
    <div className="lp-hubPlan__panel">
      <PlanningCopy />
      <PlanningBoard
        beat={beat}
        daysOn={daysOn}
        jobsOn={jobsOn}
        peopleOn={peopleOn}
        reordered={reordered}
        conflict={conflict}
        resolved={resolved}
        routeOn={routeOn}
        statusStep={statusStep}
      />
    </div>
  );
}

export function ModuleFilmShell({
  phase,
  moduleId,
  children,
}: {
  phase: HubFilmPhase;
  moduleId: "mum" | "planning" | "clients" | "chantiers";
  children: ReactNode;
}) {
  const open =
    phase === "enter" ||
    phase === "demo" ||
    phase === "hold" ||
    phase === "returning";

  const root =
    moduleId === "mum"
      ? "lp-hubMum"
      : moduleId === "clients"
        ? "lp-hubClients"
        : moduleId === "chantiers"
          ? "lp-hubChantier"
          : "lp-hubPlan";
  const frame = `${root}__frame`;

  return (
    <div
      className={[
        root,
        open ? "is-open" : "",
        phase === "enter" ? "is-entering" : "",
        phase === "demo" || phase === "hold" ? "is-inside" : "",
        phase === "returning" ? "is-returning" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!open}
    >
      <div className={frame}>{children}</div>
    </div>
  );
}
