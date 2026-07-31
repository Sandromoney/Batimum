"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Bell,
  Calendar,
  Check,
  ClipboardList,
  HardHat,
  Info,
  Smartphone,
  UserRound,
} from "lucide-react";
import { FilmCursor } from "@/components/landing/landing-hub-film-cursor";
import {
  runCueTimeline,
  usePauseableTimers,
} from "@/lib/landing-hub-pauseable-timer";

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
  { id: "sarah", name: "Sarah", status: "Disponible", kind: "ok" as const },
  { id: "marc", name: "Marc", status: "Occupé", kind: "busy" as const },
] as const;

export const PLAN_HIGHLIGHT_MS = 900;
export const PLAN_ENTER_MS = 680;
export const PLAN_RETURN_MS = 750;
export const PLAN_DEMO_SAFETY_MS = 42000;
export const PLAN_TEASE_MS = 1600;
export const PLAN_BREATH_MS = 900;

type PlanBeat =
  | "empty"
  | "week"
  | "assign"
  | "click"
  | "notify"
  | "employee"
  | "done";

function PlanningCopy() {
  return (
    <div className="lp-hubPlan__copy">
      <h3 className="lp-hubPlan__title">Planning</h3>
      <p className="lp-hubPlan__subtitle">
        Affectez l’équipe. Chacun voit son chantier.
      </p>
    </div>
  );
}

function EmployeeSpace({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="lp-hubPlan__empApp is-on" aria-hidden="true">
      <div className="lp-hubPlan__empAppHead">
        <Smartphone size={14} strokeWidth={1.8} />
        <span>Espace Employé · Lucas</span>
      </div>
      <div className="lp-hubPlan__empCard">
        <p className="lp-hubPlan__empCardLabel">
          <HardHat size={12} strokeWidth={1.9} />
          Chantier du jour
        </p>
        <strong>Salle de bain · Famille Martin</strong>
        <span>Lun 14 · 08:30</span>
      </div>
      <ul className="lp-hubPlan__empList">
        <li>
          <ClipboardList size={13} strokeWidth={1.8} />
          <span>Dépose douche + préparation</span>
        </li>
        <li>
          <Info size={13} strokeWidth={1.8} />
          <span>Accès parking rue Garibaldi</span>
        </li>
        <li>
          <Calendar size={13} strokeWidth={1.8} />
          <span>Semaine : 3 chantiers planifiés</span>
        </li>
      </ul>
    </div>
  );
}

function PlanningBoard({
  beat,
}: {
  beat: PlanBeat;
}) {
  const showNotify = beat === "notify" || beat === "employee" || beat === "done";
  const showEmployee = beat === "employee" || beat === "done";
  const assigned = beat === "click" || beat === "notify" || beat === "employee" || beat === "done";

  return (
    <div className="lp-hubPlan__ui" aria-hidden="true">
      <div className="lp-hubPlan__uiHead">
        <Calendar size={15} strokeWidth={1.75} />
        <span>Planning · semaine du 14 juil.</span>
      </div>

      <div
        className={[
          "lp-hubPlan__team",
          beat !== "empty" ? "is-on" : "",
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
                (beat === "assign" || beat === "click") &&
                member.id === "lucas"
                  ? "is-hover"
                  : "",
                assigned && member.id === "lucas" ? "is-focus" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="lp-hubPlan__teamDot" />
              <strong>{member.name}</strong>
              <em>
                {assigned && member.id === "lucas"
                  ? "Martin · Lun"
                  : member.status}
              </em>
            </li>
          ))}
        </ul>
      </div>

      <div className="lp-hubPlan__week">
        {DAYS.map((day, dayIndex) => (
          <div
            key={day.name}
            className={[
              "lp-hubPlan__col",
              beat !== "empty" ? "is-on" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ transitionDelay: `${dayIndex * 50}ms` }}
          >
            <div className="lp-hubPlan__colHead">
              <span>{day.name}</span>
              <em>{day.date}</em>
            </div>
            <div className="lp-hubPlan__colBody">
              {dayIndex === 0 ? (
                <article
                  className={[
                    "lp-hubPlan__job",
                    "is-on",
                    assigned ? "is-filled" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <p className="lp-hubPlan__jobTitle">Salle de bain · 18 m²</p>
                  <p className="lp-hubPlan__jobMeta">Famille Martin</p>
                  <p className="lp-hubPlan__jobMeta">08:30 · Dépose + prep</p>
                  <div
                    className={[
                      "lp-hubPlan__emp",
                      assigned ? "is-on is-ok" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="lp-hubPlan__empDot" />
                    {assigned ? "Lucas" : "À affecter"}
                  </div>
                </article>
              ) : dayIndex === 2 ? (
                <article className="lp-hubPlan__job is-on">
                  <p className="lp-hubPlan__jobTitle">Cuisine</p>
                  <p className="lp-hubPlan__jobMeta">M. Bernard</p>
                  <div className="lp-hubPlan__emp is-on">
                    <span className="lp-hubPlan__empDot" />
                    Sarah
                  </div>
                </article>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {showNotify ? (
        <div className="lp-hubPlan__toast is-on">
          <Bell size={13} strokeWidth={1.9} />
          <span>Affectation visible pour Lucas</span>
          <Check size={13} strokeWidth={2.4} />
        </div>
      ) : null}

      <EmployeeSpace visible={showEmployee} />

      {beat === "done" ? (
        <p className="lp-hubPlan__calm">
          Lucas consulte son chantier dans l’Espace Employé.
        </p>
      ) : null}

      <FilmCursor
        visible={beat === "assign" || beat === "click"}
        target={
          beat === "assign" || beat === "click"
            ? '[data-cursor-target="plan-assign"]'
            : null
        }
        clicking={beat === "click"}
      />
    </div>
  );
}

export function PlanningFilmPanel({
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
  const [beat, setBeat] = useState<PlanBeat>("empty");
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
    setBeat("empty");
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
      finishAt: 3800,
      cues: [
        { at: 155, apply: () => setBeat("week") },
        { at: 707, apply: () => setBeat("assign") },
        { at: 1149, apply: () => setBeat("click") },
        { at: 1503, apply: () => setBeat("notify") },
        { at: 2032, apply: () => setBeat("employee") },
        { at: 3093, apply: () => setBeat("done") },
      ],
    });

    return clear;
  }, [active, reduced, seekKey, seekMs, finish, later, clear]);

  return (
    <div className="lp-hubPlan__panel">
      <PlanningCopy />
      <PlanningBoard beat={beat} />
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
