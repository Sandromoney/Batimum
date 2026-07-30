"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  MapPin,
  UserRound,
} from "lucide-react";
import { FilmCursor } from "@/components/landing/landing-hub-film-cursor";

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

const DAYS = [
  { name: "Lun", date: "14" },
  { name: "Mar", date: "15" },
  { name: "Mer", date: "16" },
  { name: "Jeu", date: "17" },
  { name: "Ven", date: "18" },
] as const;

const TEAM = [
  { id: "anthony", name: "Anthony", status: "Congé", kind: "off" as const },
  { id: "lucas", name: "Lucas", status: "Disponible", kind: "ok" as const },
  { id: "thomas", name: "Thomas", status: "Formation", kind: "busy" as const },
  { id: "sarah", name: "Sarah", status: "Disponible", kind: "ok" as const },
  { id: "marc", name: "Marc", status: "Occupé", kind: "busy" as const },
  { id: "lea", name: "Léa", status: "Arrêt maladie", kind: "off" as const },
] as const;

const JOBS = [
  {
    id: "martin",
    title: "Salle de bain · 18 m²",
    client: "Famille Martin",
    day: 0,
    slot: "08:30",
    employee: "Anthony",
  },
  {
    id: "bernard",
    title: "Cuisine",
    client: "M. Bernard",
    day: 2,
    slot: "09:00",
    employee: "Lucas",
  },
  {
    id: "plomberie",
    title: "Plomberie",
    client: "Résidence Horizon",
    day: 4,
    slot: "10:15",
    employee: "Sarah",
  },
] as const;

export const PLAN_HIGHLIGHT_MS = 900;
export const PLAN_ENTER_MS = 1750;
export const PLAN_RETURN_MS = 1700;
export const PLAN_DEMO_SAFETY_MS = 48000;
export const PLAN_TEASE_MS = 1600;
export const PLAN_BREATH_MS = 900;

type PlanBeat =
  | "empty"
  | "days"
  | "team"
  | "jobs"
  | "people"
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
      <h3 className="lp-hubPlan__title">Planning</h3>
      <p className="lp-hubPlan__subtitle">
        Centralisez les équipes et les indisponibilités.
      </p>
    </div>
  );
}

function PlanningBoard({
  beat,
  daysOn,
  teamOn,
  jobsOn,
  peopleOn,
  conflict,
  resolved,
  routeOn,
  statusStep,
}: {
  beat: PlanBeat;
  daysOn: number;
  teamOn: boolean;
  jobsOn: number;
  peopleOn: number;
  conflict: boolean;
  resolved: boolean;
  routeOn: boolean;
  statusStep: number;
}) {
  const statusLabel =
    statusStep >= 1 ? "En cours" : "Prévu";

  return (
    <div className="lp-hubPlan__ui" aria-hidden="true">
      <div className="lp-hubPlan__uiHead">
        <Calendar size={15} strokeWidth={1.75} />
        <span>Planning · semaine du 14 juil.</span>
      </div>

      <div
        className={[
          "lp-hubPlan__team",
          teamOn ? "is-on" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="lp-hubPlan__teamLabel">
          <UserRound size={12} strokeWidth={1.9} />
          Équipe
        </span>
        <ul>
          {TEAM.map((member) => (
            <li
              key={member.id}
              data-cursor-target={
                member.id === "lucas" ? "plan-assign" : undefined
              }
              className={[
                `is-${member.kind}`,
                conflict && !resolved && member.id === "anthony"
                  ? "is-focus"
                  : "",
                resolved && member.id === "lucas" ? "is-focus" : "",
                beat === "people" && member.id === "lucas" ? "is-hover" : "",
                beat === "resolve" && member.id === "lucas" ? "is-hover" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="lp-hubPlan__teamDot" />
              <strong>{member.name}</strong>
              <em>{member.status}</em>
            </li>
          ))}
        </ul>
      </div>

      <div className="lp-hubPlan__week">
        {DAYS.map((day, dayIndex) => {
          const dayJobs = JOBS.filter((j) => j.day === dayIndex);
          return (
            <div
              key={day.name}
              className={[
                "lp-hubPlan__col",
                dayIndex < daysOn ? "is-on" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="lp-hubPlan__colHead">
                <span>{day.name}</span>
                <em>{day.date}</em>
              </div>
              <div className="lp-hubPlan__colBody">
                {dayJobs.map((job) => {
                  const jobIndex = JOBS.findIndex((j) => j.id === job.id);
                  const visible = jobIndex < jobsOn;
                  const isMartin = job.id === "martin";
                  const empVisible = peopleOn > jobIndex;
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
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ "--job-i": jobIndex } as CSSProperties}
                    >
                      <p className="lp-hubPlan__jobSlot">{job.slot}</p>
                      <p className="lp-hubPlan__jobTitle">{job.title}</p>
                      <p className="lp-hubPlan__jobClient">{job.client}</p>
                      <div
                        className={[
                          "lp-hubPlan__status",
                          statusStep >= 1 && isMartin ? "is-progress" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {isMartin ? statusLabel : "Prévu"}
                      </div>
                      <div
                        className={[
                          "lp-hubPlan__emp",
                          empVisible ? "is-on" : "",
                          showConflict ? "is-bad" : "",
                          resolved && isMartin ? "is-ok" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="lp-hubPlan__empDot" />
                        <span>{assigned}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {conflict ? (
        <div
          className={[
            "lp-hubPlan__alert",
            "is-on",
            resolved ? "is-out" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <AlertTriangle size={14} strokeWidth={1.9} />
          <div>
            <p className="lp-hubPlan__alertTitle">
              {resolved ? "Affectation corrigée" : "Indisponibilité détectée"}
            </p>
            <p className="lp-hubPlan__alertText">
              {resolved
                ? "Lucas est disponible. Affectation proposée automatiquement."
                : "Anthony est en congé. Impossible d’affecter ce créneau."}
            </p>
          </div>
          {resolved ? <Check size={14} strokeWidth={2.4} /> : null}
        </div>
      ) : null}

      {routeOn ? (
        <div className="lp-hubPlan__route is-on">
          <MapPin size={13} strokeWidth={1.9} />
          <span className="lp-hubPlan__routeLine" aria-hidden="true" />
          <span>Trajet optimisé · −18 min</span>
        </div>
      ) : null}

      {beat === "done" ? (
        <p className="lp-hubPlan__calm">Planning synchronisé avec les disponibilités.</p>
      ) : null}

      <FilmCursor
        visible={beat === "people" || beat === "resolve"}
        target={
          beat === "people" || beat === "resolve"
            ? '[data-cursor-target="plan-assign"]'
            : null
        }
        clicking={beat === "people" || beat === "resolve"}
      />
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
  const [teamOn, setTeamOn] = useState(false);
  const [jobsOn, setJobsOn] = useState(0);
  const [peopleOn, setPeopleOn] = useState(0);
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
    setTeamOn(false);
    setJobsOn(0);
    setPeopleOn(0);
    setConflict(false);
    setResolved(false);
    setRouteOn(false);
    setStatusStep(0);

    if (!active) return;

    if (reduced) {
      setDaysOn(5);
      setTeamOn(true);
      setJobsOn(3);
      setPeopleOn(3);
      setResolved(true);
      setConflict(true);
      setRouteOn(true);
      setStatusStep(1);
      setBeat("done");
      later(finish, 500);
      return clearTimers;
    }

    // Jours (lent)
    later(() => setBeat("days"), 400);
    DAYS.forEach((_, i) => {
      later(() => setDaysOn(i + 1), 500 + i * 360);
    });

    // Disponibilités équipe
    const teamAt = 500 + 5 * 360 + 500;
    later(() => {
      setBeat("team");
      setTeamOn(true);
    }, teamAt);

    // Cartes dans le calendrier
    const jobsAt = teamAt + 1400;
    later(() => setBeat("jobs"), jobsAt);
    JOBS.forEach((_, i) => {
      later(() => setJobsOn(i + 1), jobsAt + 500 + i * 700);
    });

    // Affectations (Anthony en congé → conflit)
    const peopleAt = jobsAt + 500 + 3 * 700 + 600;
    later(() => setBeat("people"), peopleAt);
    JOBS.forEach((_, i) => {
      later(() => setPeopleOn(i + 1), peopleAt + 400 + i * 650);
    });

    const conflictAt = peopleAt + 400 + 3 * 650 + 800;
    later(() => {
      setBeat("conflict");
      setConflict(true);
    }, conflictAt);

    later(() => {
      setBeat("resolve");
      setResolved(true);
    }, conflictAt + 2200);

    const routeAt = conflictAt + 2200 + 1200;
    later(() => {
      setBeat("route");
      setRouteOn(true);
    }, routeAt);

    // Statut → En cours (cohérent avec film Chantiers)
    const statusAt = routeAt + 1400;
    later(() => setBeat("status"), statusAt);
    later(() => setStatusStep(1), statusAt + 900);
    later(() => setBeat("done"), statusAt + 2200);
    later(finish, statusAt + 3600);

    return clearTimers;
  }, [active, reduced, finish]);

  return (
    <div className="lp-hubPlan__panel">
      <PlanningCopy />
      <PlanningBoard
        beat={beat}
        daysOn={daysOn}
        teamOn={teamOn}
        jobsOn={jobsOn}
        peopleOn={peopleOn}
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
