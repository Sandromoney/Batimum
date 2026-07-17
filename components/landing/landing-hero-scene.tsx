"use client";

import {
  CalendarDays,
  Check,
  FileText,
  MapPin,
  Receipt,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LandingHeroSceneProps = {
  visible: boolean;
  idPrefix?: string;
  className?: string;
};

const TERRAIN_ITEMS = [
  "Planning du jour",
  "Adresse du chantier",
  "Consignes terrain",
  "Documents utiles",
  "Photos d'avancement",
] as const;

export function LandingHeroScene({
  visible,
  idPrefix = "hero",
  className,
}: LandingHeroSceneProps) {
  const glowId = `${idPrefix}-line-glow`;
  const dotGradientId = `${idPrefix}-flow-dot`;

  return (
    <div
      className={cn(
        "landing-hero-scene",
        visible && "landing-hero-scene--visible",
        className,
      )}
      aria-hidden="true"
    >
      <div className="landing-hero-scene__grid">
        <svg
          className="landing-hero-scene__lines"
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <filter
              id={glowId}
              x="-30%"
              y="-120%"
              width="160%"
              height="340%"
            >
              <feGaussianBlur stdDeviation="0.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id={dotGradientId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="55%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </radialGradient>
          </defs>
          <path
            className="landing-hero-scene__line-track"
            d="M18.5 10 H39"
            pathLength={1}
          />
          <path
            className="landing-hero-scene__line-track"
            d="M61 10 H81.5"
            pathLength={1}
          />
          <path
            className="landing-hero-scene__line landing-hero-scene__line--left"
            d="M18.5 10 H39"
            pathLength={1}
            filter={`url(#${glowId})`}
          />
          <path
            className="landing-hero-scene__line landing-hero-scene__line--right"
            d="M61 10 H81.5"
            pathLength={1}
            filter={`url(#${glowId})`}
          />
          <circle
            className="landing-hero-scene__node landing-hero-scene__node--left"
            cx="39"
            cy="10"
            r="1.6"
          />
          <circle
            className="landing-hero-scene__node landing-hero-scene__node--right"
            cx="61"
            cy="10"
            r="1.6"
          />
          <circle
            className="landing-hero-scene__flow-dot"
            r="1.35"
            fill={`url(#${dotGradientId})`}
            filter={`url(#${glowId})`}
          >
            <animateMotion
              dur="9s"
              repeatCount="indefinite"
              path="M18.5 10 H39 L61 10 H81.5"
            />
          </circle>
        </svg>

        <div className="landing-hero-scene__card landing-hero-scene__terrain">
          <p className="landing-hero-scene__card-label">Terrain</p>
          <div className="landing-hero-scene__card-head">
            <span className="landing-hero-scene__icon-wrap" title="Employé">
              <UserRound className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <span className="landing-hero-scene__icon-wrap" title="Planning">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <span className="landing-hero-scene__icon-wrap" title="Chantiers">
              <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          </div>
          <div className="landing-hero-scene__mini-ui landing-hero-scene__mini-ui--terrain">
            {TERRAIN_ITEMS.map((item) => (
              <p
                key={item}
                className="landing-hero-scene__mini-row landing-hero-scene__mini-row--terrain"
              >
                <Check
                  className="landing-hero-scene__check-icon h-3 w-3 shrink-0"
                  strokeWidth={2.5}
                />
                <span>{item}</span>
              </p>
            ))}
          </div>
          <p className="landing-hero-scene__card-tagline">
            L&apos;équipe sait où aller.
          </p>
        </div>
        <div className="landing-hero-scene__hub">
          <div className="landing-hero-scene__hub-card">
            <img
              src="/logocomplet-batimum.png"
              alt=""
              className="landing-hero-scene__logo"
            />
            <p className="landing-hero-scene__hub-text">Tout est synchronisé</p>
          </div>
        </div>

        <div className="landing-hero-scene__card landing-hero-scene__bureau">
          <p className="landing-hero-scene__card-label">Bureau</p>
          <div className="landing-hero-scene__card-head">
            <span className="landing-hero-scene__icon-wrap">
              <FileText className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <span className="landing-hero-scene__icon-wrap">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <span className="landing-hero-scene__icon-wrap">
              <Receipt className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          </div>
          <div className="landing-hero-scene__mini-ui">
            <p className="landing-hero-scene__mini-row landing-hero-scene__mini-row--bureau">
              <span>Devis</span>
              <span className="text-primary">Prêt</span>
            </p>
            <p className="landing-hero-scene__mini-row landing-hero-scene__mini-row--bureau">
              <span>Planning</span>
              <span className="text-primary">À jour</span>
            </p>
            <p className="landing-hero-scene__mini-row landing-hero-scene__mini-row--bureau">
              <span>Factures</span>
              <span className="text-primary">Suivies</span>
            </p>
          </div>
          <p className="landing-hero-scene__card-tagline">
            Le patron garde le contrôle.
          </p>
        </div>
      </div>
    </div>
  );
}
