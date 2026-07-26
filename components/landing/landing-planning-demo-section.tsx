"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Phone } from "lucide-react";
import {
  LandingLaptop,
  LandingPhone,
} from "@/components/landing/landing-device-frames";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type Phase = 0 | 1 | 2 | 3 | 4 | 5;

const DAYS = [
  { key: "lun", label: "Lun", num: "21" },
  { key: "mar", label: "Mar", num: "22" },
  { key: "mer", label: "Mer", num: "23" },
  { key: "jeu", label: "Jeu", num: "24" },
  { key: "ven", label: "Ven", num: "25" },
] as const;

const BENEFITS = [
  { id: "appels", title: "Moins d’appels", from: 2 },
  { id: "oublis", title: "Moins d’oublis", from: 3 },
  { id: "orga", title: "Des équipes mieux organisées", from: 5 },
] as const;

/** Timings desktop (ms). Mobile uses a shorter scale. */
const DESKTOP_STEPS = [0, 900, 2200, 3400, 4800, 6200] as const;
const MOBILE_STEPS = [0, 600, 1400, 2200, 3200, 4000] as const;
const DESKTOP_LOOP = 8200;
const MOBILE_LOOP = 5400;

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

export function LandingPlanningDemoSection() {
  const reducedMotion = usePrefersReducedMotion();
  const narrow = useIsNarrow();
  const { ref, inView } = useInViewOnce();
  const [phase, setPhase] = useState<Phase>(0);

  useEffect(() => {
    if (reducedMotion) {
      setPhase(5);
      return;
    }
    if (!inView) return;

    const steps = narrow ? MOBILE_STEPS : DESKTOP_STEPS;
    const loop = narrow ? MOBILE_LOOP : DESKTOP_LOOP;
    const timers: number[] = [];

    const runCycle = () => {
      setPhase(0);
      steps.forEach((ms, index) => {
        timers.push(
          window.setTimeout(() => setPhase(index as Phase), ms),
        );
      });
    };

    runCycle();
    const interval = window.setInterval(runCycle, loop);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(interval);
    };
  }, [inView, reducedMotion, narrow]);

  const showAssigned = phase >= 1;
  const showLink = phase >= 2 && !narrow;
  const showNotif = phase === 3;
  const showPhoneCard = phase >= 4;
  const highlightRoute = phase >= 5;

  return (
    <section
      id="planning-equipes"
      ref={ref}
      className="landing-planning-demo"
      aria-label="Démonstration planning et espace employé"
    >
      <div className="landing-container">
        <header className="landing-planning-demo__header">
          <p className="landing-planning-demo__badge">
            Vos équipes toujours informées
          </p>
          <h2 className="landing-planning-demo__title">
            Vous planifiez. Ils savent{" "}
            <span className="landing-planning-demo__mark">où aller</span>.
          </h2>
          <p className="landing-planning-demo__lead">
            Affectez un chantier à un employé. Son planning se met à jour sur
            son téléphone avec l’adresse, les horaires et les informations
            utiles.
          </p>
        </header>

        <div className="landing-planning-demo__stage">
          <div className="landing-planning-demo__devices">
            <div
              className={cn(
                "landing-planning-demo__tablet-wrap",
                showAssigned && "landing-planning-demo__tablet-wrap--assigned",
              )}
            >
              <p className="landing-planning-demo__device-label">Dirigeant</p>
              <LandingLaptop
                className="landing-planning-demo__tablet"
                size="md"
                alive
              >
                <DirigeantPlanningUi
                  phase={phase}
                  showAssigned={showAssigned}
                />
              </LandingLaptop>
            </div>

            <div
              className={cn(
                "landing-planning-demo__link",
                showLink && "landing-planning-demo__link--visible",
              )}
              aria-hidden
            >
              <svg viewBox="0 0 120 40" className="landing-planning-demo__link-svg">
                <path
                  d="M4 20 C 40 20, 80 20, 116 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  className="landing-planning-demo__link-path"
                />
                <circle cx="116" cy="20" r="4" fill="currentColor" />
              </svg>
              <span>Synchronisé</span>
            </div>

            <div
              className={cn(
                "landing-planning-demo__phone-wrap",
                showPhoneCard && "landing-planning-demo__phone-wrap--live",
              )}
            >
              <p className="landing-planning-demo__device-label">Espace employé</p>
              <LandingPhone
                className="landing-planning-demo__phone"
                statusLabel="9:41"
                alive
              >
                <EmployeePhoneUi
                  showNotif={showNotif}
                  showCard={showPhoneCard}
                  highlightRoute={highlightRoute}
                />
              </LandingPhone>
            </div>
          </div>

          <ul className="landing-planning-demo__benefits" role="list">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.id}
                className={cn(
                  "landing-planning-demo__benefit",
                  phase >= benefit.from &&
                    "landing-planning-demo__benefit--visible",
                )}
              >
                {benefit.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function useInViewOnce() {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { threshold: 0.28 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

function DirigeantPlanningUi({
  phase,
  showAssigned,
}: {
  phase: Phase;
  showAssigned: boolean;
}) {
  return (
    <div className="plan-demo-board">
      <div className="plan-demo-board__top">
        <strong>Planning</strong>
        <span className="plan-demo-board__pill">Semaine</span>
      </div>

      <div className="plan-demo-board__pool">
        <p className="plan-demo-board__pool-label">À affecter</p>
        <div
          className={cn(
            "plan-demo-card plan-demo-card--draggable",
            phase === 0 && "plan-demo-card--idle",
            phase >= 1 && "plan-demo-card--placed",
          )}
        >
          <span className="plan-demo-card__title">Dupont</span>
          <span className="plan-demo-card__meta">Lucas · 08:00–17:00</span>
        </div>
      </div>

      <div className="plan-demo-board__week">
        {DAYS.map((day) => {
          const isTarget = day.key === "mar";
          return (
            <div
              key={day.key}
              className={cn(
                "plan-demo-day",
                isTarget && "plan-demo-day--target",
                isTarget && showAssigned && "plan-demo-day--filled",
              )}
            >
              <div className="plan-demo-day__head">
                <span>{day.label}</span>
                <strong>{day.num}</strong>
              </div>
              <div className="plan-demo-day__body">
                {isTarget && showAssigned ? (
                  <div className="plan-demo-card plan-demo-card--settled">
                    <span className="plan-demo-card__title">Dupont</span>
                    <span className="plan-demo-card__meta">Lucas</span>
                  </div>
                ) : day.key === "lun" ? (
                  <div className="plan-demo-card plan-demo-card--muted">
                    <span className="plan-demo-card__title">Martin</span>
                    <span className="plan-demo-card__meta">Léa</span>
                  </div>
                ) : (
                  <span className="plan-demo-day__empty">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmployeePhoneUi({
  showNotif,
  showCard,
  highlightRoute,
}: {
  showNotif: boolean;
  showCard: boolean;
  highlightRoute: boolean;
}) {
  return (
    <div className="emp-demo-ui">
      <div className="emp-demo-ui__hello">
        <p className="emp-demo-ui__greeting">Bonjour Lucas</p>
        <p className="emp-demo-ui__sub">Mon planning</p>
      </div>

      {showNotif ? (
        <div className="emp-demo-ui__notif" role="status">
          Nouvelle intervention ajoutée
        </div>
      ) : null}

      {!showCard ? (
        <div className="emp-demo-ui__empty">
          <p>Aucune intervention prévue aujourd’hui.</p>
          <p className="emp-demo-ui__hint">
            En attente d’affectation du dirigeant…
          </p>
        </div>
      ) : (
        <div className="emp-demo-ui__card">
          <p className="emp-demo-ui__kicker">Intervention du jour</p>
          <p className="emp-demo-ui__client">Client Dupont</p>
          <p className="emp-demo-ui__time">8 h 00 – 17 h 00</p>
          <p className="emp-demo-ui__chantier">Rénovation salle de bain</p>
          <p className="emp-demo-ui__address">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            <span>12 rue des Lilas, 69003 Lyon</span>
          </p>
          <div className="emp-demo-ui__actions">
            <span className="emp-demo-ui__btn emp-demo-ui__btn--call">
              <Phone className="h-3.5 w-3.5" aria-hidden />
              Appeler
            </span>
            <span
              className={cn(
                "emp-demo-ui__btn emp-demo-ui__btn--route",
                highlightRoute && "emp-demo-ui__btn--route-pulse",
              )}
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              Itinéraire
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
