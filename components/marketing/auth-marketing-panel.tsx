"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  Brain,
  LayoutDashboard,
  Rocket,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ASPIRATION_CARDS: {
  icon: LucideIcon;
  title: string;
  text: string;
  badge: string;
}[] = [
  {
    icon: Rocket,
    title: "Prêt à changer le rythme de votre entreprise ?",
    text: "Passez moins de temps dans l'administratif et plus de temps à produire.",
    badge: "+ 5h gagnées par semaine en moyenne",
  },
  {
    icon: Brain,
    title: "Une IA qui apprend votre façon de travailler",
    text: "Chaque devis généré devient plus pertinent pour votre métier et vos habitudes.",
    badge: "Votre entreprise, vos méthodes, votre IA",
  },
  {
    icon: TrendingUp,
    title: "Connaissez enfin votre vraie rentabilité",
    text: "Déboursés, marges et performances par employé en temps réel.",
    badge: "Chaque chantier devient une décision éclairée",
  },
  {
    icon: LayoutDashboard,
    title: "Pilotez votre société sans être partout",
    text: "Vos équipes avancent, vous gardez la vision globale.",
    badge: "Le terrain travaille. Le bureau maîtrise.",
  },
];

const ROTATING_PHRASES = [
  "Vos employés savent toujours où aller.",
  "Connaissez votre rentabilité chantier par chantier.",
  "Ne ressaisissez plus jamais un devis.",
  "Pilotez votre entreprise depuis un seul outil.",
  "Gardez le contrôle, même sur le terrain.",
] as const;

const ROTATE_MS = 4000;

export function AuthMarketingPanel() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setPhraseIndex((current) => (current + 1) % ROTATING_PHRASES.length);
        setVisible(true);
      }, 320);
    }, ROTATE_MS);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="auth-marketing-panel flex h-full flex-col justify-center px-10 py-12 xl:px-14">
      <div className="auth-marketing-panel__content mx-auto w-full max-w-lg">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-[#0f172a] xl:text-[2rem]">
          Votre entreprise continue de perdre du temps.
          <br />
          <span className="text-[#10b981]">Pas Batimum.</span>
        </h2>

        <p className="mt-5 text-sm leading-7 text-[#64748b]">
          Chaque semaine, les artisans perdent des heures à :
        </p>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-[#64748b]">
          <li className="flex gap-2">
            <span className="text-[#10b981]" aria-hidden="true">
              •
            </span>
            ressaisir des devis
          </li>
          <li className="flex gap-2">
            <span className="text-[#10b981]" aria-hidden="true">
              •
            </span>
            gérer des plannings sur WhatsApp
          </li>
          <li className="flex gap-2">
            <span className="text-[#10b981]" aria-hidden="true">
              •
            </span>
            calculer leurs marges sur Excel
          </li>
          <li className="flex gap-2">
            <span className="text-[#10b981]" aria-hidden="true">
              •
            </span>
            répondre aux appels des équipes
          </li>
        </ul>

        <p className="mt-4 text-sm font-medium text-[#0f172a]">
          Batimum automatise tout cela.
        </p>

        <div className="auth-marketing-panel__cards mt-8 grid gap-3 sm:grid-cols-2">
          {ASPIRATION_CARDS.map((card, index) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="auth-marketing-card rounded-[18px] border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                style={{ "--card-delay": `${index * 80}ms` } as CSSProperties}
              >
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#10b981]/12 text-[#10b981]"
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <p className="mt-2 text-sm font-semibold text-[#0f172a]">
                  {card.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#64748b]">
                  {card.text}
                </p>
                <p className="mt-2 text-[0.65rem] font-semibold leading-5 tracking-wide text-[#10b981]">
                  {card.badge}
                </p>
              </article>
            );
          })}
        </div>

        <p className="mt-6 text-sm leading-6 text-[#64748b]">
          Les entreprises qui pilotent mieux gagnent plus de temps pour
          produire.
        </p>

        <div className="auth-marketing-panel__rotator mt-8 min-h-[3.5rem]">
          <p
            className={cn(
              "auth-marketing-panel__phrase text-base font-medium leading-7 text-[#0f172a] transition-all duration-300",
              visible
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0",
            )}
            aria-live="polite"
          >
            {ROTATING_PHRASES[phraseIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}
