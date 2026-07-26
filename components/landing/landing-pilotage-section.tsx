"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";
import { LandingLaptop } from "@/components/landing/landing-device-frames";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type Phase = 0 | 1 | 2 | 3 | 4 | 5;

const STEPS_MS = [0, 500, 1400, 2400, 3400, 4400] as const;
const LOOP_MS = 7200;

const BENEFITS = [
  {
    id: "rentables",
    title: "Repérez les chantiers rentables",
    from: 4 as Phase,
  },
  {
    id: "depassements",
    title: "Anticipez les dépassements",
    from: 5 as Phase,
  },
  {
    id: "decisions",
    title: "Prenez vos décisions avec des chiffres clairs",
    from: 5 as Phase,
  },
] as const;

export function LandingPilotageSection() {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [phase, setPhase] = useState<Phase>(0);

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

  useEffect(() => {
    if (reducedMotion) {
      setPhase(5);
      return;
    }
    if (!inView) return;

    const timers: number[] = [];
    const run = () => {
      setPhase(0);
      STEPS_MS.forEach((ms, index) => {
        timers.push(window.setTimeout(() => setPhase(index as Phase), ms));
      });
    };

    run();
    const interval = window.setInterval(run, LOOP_MS);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(interval);
    };
  }, [inView, reducedMotion]);

  return (
    <section
      id="pilotage"
      ref={ref}
      className="landing-pilotage-pro"
      aria-label="Pilotage et rentabilité Batimum"
    >
      <div className="landing-container">
        <header className="landing-pilotage-pro__header">
          <p className="landing-pilotage-pro__badge">
            Enfin savoir ce que vous gagnez vraiment
          </p>
          <h2 className="landing-pilotage-pro__title">
            Votre chiffre d’affaires ne suffit pas. Suivez votre{" "}
            <span className="landing-pilotage-pro__mark">rentabilité</span>.
          </h2>
          <p className="landing-pilotage-pro__lead">
            Comparez le prévu et le réel, suivez les coûts, les heures et les
            marges de chaque chantier.
          </p>
        </header>

        <div className="landing-pilotage-pro__layout">
          <LandingLaptop
            className="landing-pilotage-pro__laptop"
            alive={inView && !reducedMotion}
            size="lg"
          >
            <div
              className={cn(
                "landing-pilotage-dash",
                `landing-pilotage-dash--phase-${phase}`,
              )}
              aria-hidden={false}
            >
            <div className="landing-pilotage-dash__top">
              <div>
                <p className="landing-pilotage-dash__eyebrow">Pilotage</p>
                <p className="landing-pilotage-dash__period">
                  Mars 2026 · données de démonstration
                </p>
              </div>
              <span className="landing-pilotage-dash__demo-tag">Exemple fictif</span>
            </div>

            <div className="landing-pilotage-dash__grid">
              <article
                className={cn(
                  "pilot-kpi pilot-kpi--hero",
                  phase >= 1 && "pilot-kpi--visible",
                )}
              >
                <div className="pilot-kpi__icon" aria-hidden>
                  <Wallet className="h-4 w-4" />
                </div>
                <p className="pilot-kpi__label">Chiffre d’affaires du mois</p>
                <p className="pilot-kpi__value">48 200 €</p>
                <p className="pilot-kpi__hint">CA facturé (démo)</p>
              </article>

              <article
                className={cn(
                  "pilot-kpi",
                  phase >= 2 && "pilot-kpi--visible",
                )}
              >
                <p className="pilot-kpi__label">Montant encaissé</p>
                <p className="pilot-kpi__value pilot-kpi__value--sm">31 450 €</p>
              </article>

              <article
                className={cn(
                  "pilot-kpi",
                  phase >= 2 && "pilot-kpi--visible",
                )}
                style={{ transitionDelay: "80ms" }}
              >
                <p className="pilot-kpi__label">Factures en attente</p>
                <p className="pilot-kpi__value pilot-kpi__value--sm">12 800 €</p>
              </article>

              <article
                className={cn(
                  "pilot-compare",
                  phase >= 3 && "pilot-compare--visible",
                )}
              >
                <div className="pilot-compare__head">
                  <Clock3 className="h-4 w-4" aria-hidden />
                  <span>Heures chantier · SDB Dupont</span>
                </div>
                <div className="pilot-compare__cols">
                  <div
                    className={cn(
                      "pilot-compare__col",
                      phase >= 3 && "pilot-compare__col--prevu",
                    )}
                  >
                    <p className="pilot-compare__tag">Prévu</p>
                    <p className="pilot-compare__num">120 h</p>
                  </div>
                  <div className="pilot-compare__bridge" aria-hidden>
                    <span />
                  </div>
                  <div
                    className={cn(
                      "pilot-compare__col",
                      phase >= 3 && "pilot-compare__col--reel",
                    )}
                  >
                    <p className="pilot-compare__tag">Réel</p>
                    <p className="pilot-compare__num">138 h</p>
                  </div>
                </div>
                <div className="pilot-compare__bars" aria-hidden>
                  <div className="pilot-compare__bar pilot-compare__bar--prevu">
                    <span style={{ width: phase >= 3 ? "72%" : "0%" }} />
                  </div>
                  <div className="pilot-compare__bar pilot-compare__bar--reel">
                    <span style={{ width: phase >= 3 ? "86%" : "0%" }} />
                  </div>
                </div>
              </article>

              <article
                className={cn(
                  "pilot-kpi pilot-kpi--marge",
                  phase >= 4 && "pilot-kpi--visible",
                )}
              >
                <div className="pilot-kpi__icon" aria-hidden>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <p className="pilot-kpi__label">Marge chantier</p>
                <p className="pilot-kpi__value">24 %</p>
                <p className="pilot-kpi__hint">Estimation indicative · démo</p>
              </article>

              <article
                className={cn(
                  "pilot-kpi pilot-kpi--top",
                  phase >= 4 && "pilot-kpi--visible",
                )}
                style={{ transitionDelay: "90ms" }}
              >
                <div className="pilot-kpi__icon" aria-hidden>
                  <Trophy className="h-4 w-4" />
                </div>
                <p className="pilot-kpi__label">Chantier le plus rentable</p>
                <p className="pilot-kpi__title">SDB Dupont</p>
                <p className="pilot-kpi__hint">Marge indicative 29 %</p>
              </article>

              <article
                className={cn(
                  "pilot-alert",
                  phase >= 5 && "pilot-alert--visible",
                )}
              >
                <div className="pilot-alert__icon" aria-hidden>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="pilot-alert__label">Alerte dépassement</p>
                  <p className="pilot-alert__text">
                    Heures réelles +15 % vs prévu sur SDB Dupont — à vérifier
                    avant de conclure.
                  </p>
                </div>
              </article>
            </div>
          </div>
          </LandingLaptop>

          <aside className="landing-pilotage-pro__side">
            <ul className="landing-pilotage-pro__benefits" role="list">
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit.id}
                  className={cn(
                    "landing-pilotage-pro__benefit",
                    phase >= benefit.from &&
                      "landing-pilotage-pro__benefit--visible",
                  )}
                >
                  {benefit.title}
                </li>
              ))}
            </ul>
            <p className="landing-pilotage-pro__disclaimer">
              Batimum est un outil d’aide au pilotage : les indicateurs vous
              éclairent, les décisions restent les vôtres.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
