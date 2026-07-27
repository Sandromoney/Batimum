"use client";

import {
  Check,
  PhoneCall,
  FileWarning,
  FolderOpen,
  Receipt,
  HardHat,
  LineChart,
  Zap,
  Share2,
  Calendar,
  Eye,
  FileCheck,
} from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";

const WITHOUT = [
  { label: "Devis préparés le soir", Icon: FileWarning },
  { label: "Informations dispersées", Icon: FolderOpen },
  { label: "Appels répétés aux équipes", Icon: PhoneCall },
  { label: "Factures et relances oubliées", Icon: Receipt },
  { label: "Difficulté à suivre les chantiers", Icon: HardHat },
  { label: "Marges découvertes trop tard", Icon: LineChart },
] as const;

const WITH = [
  { label: "Devis préparés plus rapidement", Icon: Zap },
  { label: "Informations centralisées", Icon: Share2 },
  { label: "Planning partagé", Icon: Calendar },
  { label: "Chantiers suivis en temps réel", Icon: Eye },
  { label: "Facturation simplifiée", Icon: FileCheck },
  { label: "Rentabilité visible", Icon: Check },
] as const;

export function LandingBeforeAfterSection() {
  return (
    <section
      className="lp-section lp-section--soft lp-section--after-hero"
      aria-labelledby="before-after-title"
      id="avant-apres"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head">
            <h2 id="before-after-title" className="lp-title max-w-3xl">
              Votre entreprise aujourd&apos;hui.
              <br />
              <span className="lp-title-accent">
                Votre entreprise avec Batimum.
              </span>
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Moins de dispersion, moins de ressaisie et une vision plus claire
              de toute votre activité.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-ba">
          <LandingReveal direction="left" delay={80}>
            <article className="lp-ba__col lp-ba__col--before">
              <h3 className="lp-ba__heading">Sans Batimum</h3>
              <ul className="lp-ba__list">
                {WITHOUT.map(({ label, Icon }) => (
                  <li key={label} className="lp-ba__item">
                    <span className="lp-ba__icon lp-ba__icon--muted" aria-hidden>
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </article>
          </LandingReveal>

          <div className="lp-ba__bridge" aria-hidden="true">
            <span className="lp-ba__bridge-line" />
            <span className="lp-ba__bridge-dot" />
          </div>

          <LandingReveal direction="right" delay={180}>
            <article className="lp-ba__col lp-ba__col--after">
              <h3 className="lp-ba__heading lp-ba__heading--after">
                Avec Batimum
              </h3>
              <ul className="lp-ba__list">
                {WITH.map(({ label, Icon }) => (
                  <li key={label} className="lp-ba__item">
                    <span className="lp-ba__icon lp-ba__icon--ok" aria-hidden>
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </article>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
