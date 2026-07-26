"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  HardHat,
  Home,
  Monitor,
  Play,
} from "lucide-react";
import { getPublicSignupHref } from "@/lib/private-beta";
import { cn } from "@/lib/utils";

const PLACES = [
  {
    icon: Monitor,
    title: "Au bureau",
    text: "Pilotez votre activité depuis votre ordinateur.",
  },
  {
    icon: Home,
    title: "À la maison",
    text: "Restez connecté et gérez vos chantiers à distance.",
  },
  {
    icon: HardHat,
    title: "Sur chantier",
    text: "Accédez à vos informations en temps réel.",
  },
] as const;

const PROOF_AVATARS = [
  "/landing/avatars/avatar-1.jpg",
  "/landing/avatars/avatar-2.jpg",
  "/landing/avatars/avatar-3.jpg",
  "/landing/avatars/avatar-4.jpg",
] as const;

function GreenWord({ children }: { children: ReactNode }) {
  return <span className="landing-hero-word-green">{children}</span>;
}

function HeroLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("landing-hero-line", className)}>{children}</span>;
}

function HeroTitle() {
  return (
    <h1 className="landing-hero-title">
      <HeroLine>Pilotez toute</HeroLine>
      <HeroLine>votre entreprise</HeroLine>
      <HeroLine>
        <GreenWord>du BTP</GreenWord> depuis
      </HeroLine>
      <HeroLine>
        <GreenWord>le chantier.</GreenWord>
      </HeroLine>
    </h1>
  );
}

export function LandingHero() {
  const signupHref = getPublicSignupHref();

  return (
    <section
      className="landing-hero-section landing-hero-section--viewport landing-hero-section--ref landing-hero--visible"
      aria-label="Présentation Batimum"
    >
      <div className="landing-hero landing-hero--split">
        <div className="landing-hero__copy">
          <p className="landing-hero-badge">
            <span className="landing-hero-badge__dot" aria-hidden />
            La solution tout-en-un pour les entreprises du BTP
          </p>

          <HeroTitle />

          <p className="landing-hero-subtitle landing-hero-fade">
            Devis, planning, chantiers, facturation et rentabilité. Toutes vos
            données à jour, partout, tout le temps.
          </p>

          <div className="landing-hero-cta">
            <Link href={signupHref} className="landing-btn-primary group">
              Essayer gratuitement
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
            <Link href="/landing#demo-devis" className="landing-btn-demo">
              <span className="landing-btn-demo__play" aria-hidden>
                <Play className="h-3 w-3 fill-current" />
              </span>
              Voir la démo
            </Link>
          </div>

          <div className="landing-hero-proof">
            <div className="landing-hero-proof__avatars" aria-hidden>
              {PROOF_AVATARS.map((src) => (
                <span key={src}>
                  <Image src={src} alt="" width={36} height={36} />
                </span>
              ))}
            </div>
            <p>
              <span className="landing-hero-proof__count">+1 200</span> artisans
              et dirigeants du BTP pilotent déjà avec Batimum
            </p>
          </div>
        </div>

        <div className="landing-hero__visual">
          <Image
            src="/landing/hero-devices-mock.png"
            alt="Batimum sur ordinateur et mobile : tableau de bord et planning chantier"
            width={594}
            height={334}
            priority
            className="landing-hero__visual-img"
            sizes="(max-width: 1023px) 100vw, 60vw"
          />
        </div>
      </div>

      <div className="landing-hero-places" aria-label="Où utiliser Batimum">
        <ul className="landing-hero-places__list">
          {PLACES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="landing-hero-places__item">
              <span className="landing-hero-places__icon" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="landing-hero-places__tagline">
          <strong>
            Au bureau, à la maison ou directement sur le chantier.
          </strong>
          <span>Vos données restent synchronisées partout.</span>
        </p>
      </div>
    </section>
  );
}
