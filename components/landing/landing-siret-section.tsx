"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Building2, Check, Search } from "lucide-react";
import { getPublicSignupHref } from "@/lib/private-beta";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEPS_MS = [0, 600, 1600, 2400, 3200, 4000, 4800, 5600] as const;
const LOOP_MS = 7800;

/** Démonstration purement illustrative — aucune donnée API. */
const DEMO = {
  siretDisplay: "123 456 789 00012",
  entreprise: "Entreprise d’exemple",
  adresse: "Adresse d’exemple",
  activite: "Activité d’exemple",
  tva: "TVA si disponible",
} as const;

export function LandingSiretSection() {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [phase, setPhase] = useState<Phase>(0);
  const signupHref = getPublicSignupHref();

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
      setPhase(7);
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

  const typed =
    phase === 0
      ? ""
      : phase === 1
        ? DEMO.siretDisplay.slice(0, 10)
        : DEMO.siretDisplay;

  return (
    <section
      id="siret"
      ref={ref}
      className="landing-siret"
      aria-label="Configuration entreprise par SIRET"
    >
      <div className="landing-container">
        <header className="landing-siret__header">
          <p className="landing-siret__badge">Création de compte</p>
          <h2 className="landing-siret__title">
            Votre entreprise configurée en quelques instants.
          </h2>
          <p className="landing-siret__lead">
            Entrez votre SIRET. Batimum préremplit les principales informations
            administratives.
          </p>
        </header>

        <div className="landing-siret__layout">
          <div
            className={cn(
              "landing-siret-mock",
              `landing-siret-mock--phase-${phase}`,
            )}
            aria-hidden
          >
            <div className="landing-siret-mock__top">
              <span>Configurer l’entreprise</span>
              <span className="landing-siret-mock__demo">Démonstration</span>
            </div>

            <label className="landing-siret-mock__field">
              <span>SIRET</span>
              <div
                className={cn(
                  "landing-siret-mock__input",
                  phase >= 1 && "landing-siret-mock__input--active",
                )}
              >
                {phase === 0 ? (
                  <span className="landing-siret-mock__placeholder">
                    14 chiffres
                  </span>
                ) : (
                  <span>
                    {typed}
                    {phase === 1 ? (
                      <span className="landing-siret-mock__caret" />
                    ) : null}
                  </span>
                )}
              </div>
            </label>

            <div
              className={cn(
                "landing-siret-mock__search",
                phase === 2 && "landing-siret-mock__search--visible",
              )}
            >
              <Search
                className={cn("h-4 w-4", phase === 2 && "animate-spin")}
                aria-hidden
              />
              Recherche en cours…
            </div>

            <div
              className={cn(
                "landing-siret-mock__found",
                phase >= 3 && "landing-siret-mock__found--visible",
              )}
            >
              <Check className="h-4 w-4" aria-hidden />
              Entreprise trouvée
            </div>

            <div className="landing-siret-mock__results">
              <ResultRow
                label="Entreprise"
                value={DEMO.entreprise}
                visible={phase >= 3}
              />
              <ResultRow
                label="Adresse"
                value={DEMO.adresse}
                visible={phase >= 4}
              />
              <ResultRow
                label="Activité"
                value={DEMO.activite}
                visible={phase >= 5}
              />
              <ResultRow
                label="N° de TVA"
                value={DEMO.tva}
                visible={phase >= 6}
              />
            </div>

            <div
              className={cn(
                "landing-siret-mock__confirm",
                phase >= 7 && "landing-siret-mock__confirm--visible",
              )}
            >
              Confirmer
            </div>

            <p className="landing-siret-mock__note">
              Maquette illustrative — aucune donnée réelle n’est récupérée ici.
            </p>
          </div>

          <aside className="landing-siret__side">
            <ul className="landing-siret__points">
              <li>
                <Building2 className="h-4 w-4" aria-hidden />
                Moins de saisie administrative
              </li>
              <li>
                <Check className="h-4 w-4" aria-hidden />
                Vous vérifiez avant de confirmer
              </li>
              <li>
                <Check className="h-4 w-4" aria-hidden />
                Possible sans SIRET si l’entreprise est en création
              </li>
            </ul>

            <Link
              href={signupHref}
              className="landing-btn-primary group landing-siret__cta"
            >
              Commencer
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
            <Link
              href={`${signupHref}${signupHref.includes("?") ? "&" : "?"}nouvelle-entreprise=1`}
              className="landing-siret__secondary"
            >
              Je crée une nouvelle entreprise
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ResultRow({
  label,
  value,
  visible,
}: {
  label: string;
  value: string;
  visible: boolean;
}) {
  return (
    <div
      className={cn(
        "landing-siret-mock__row",
        visible && "landing-siret-mock__row--visible",
      )}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
