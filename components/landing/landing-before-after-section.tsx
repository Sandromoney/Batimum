"use client";

import { ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";

type CompareRow = {
  id: string;
  before: string;
  withBatimum: string;
};

const ROWS: CompareRow[] = [
  {
    id: "outils",
    before: "Plusieurs outils dispersés",
    withBatimum: "Toute votre entreprise dans une seule plateforme",
  },
  {
    id: "devis",
    before: "Devis recommencés manuellement",
    withBatimum: "MUM IA prépare une base complète et modifiable",
  },
  {
    id: "clients",
    before: "Informations clients difficiles à retrouver",
    withBatimum: "Tout l’historique dans une seule fiche",
  },
  {
    id: "planning",
    before: "Planning modifié et salariés prévenus un par un",
    withBatimum: "Planning centralisé et espace employé connecté",
  },
  {
    id: "chantiers",
    before: "Avancement du chantier estimé approximativement",
    withBatimum: "Progression calculée selon le poids des étapes",
  },
  {
    id: "marges",
    before: "Marges découvertes trop tard",
    withBatimum: "Coûts, prévisionnel et rentabilité suivis en direct",
  },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function LandingBeforeAfterSection() {
  const reduced = useReducedMotion();

  const t = {
    duration: reduced ? 0.01 : 0.45,
    ease: EASE,
  };

  return (
    <section
      className="lp-section lp-ba"
      aria-labelledby="before-after-title"
      id="avant-apres"
    >
      <div className="lp-container lp-ba__container">
        <LandingReveal>
          <div className="lp-section-head lp-ba__head">
            <p className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Pourquoi changer
            </p>
            <h2 id="before-after-title" className="lp-title lp-ba__title">
              Avant Batimum.{" "}
              <span className="lp-title-accent">Avec Batimum.</span>
            </h2>
            <p className="lp-subtitle lp-ba__lead">
              Les écarts concrets que Batimum comble dans le quotidien d’une TPE
              du BTP.
            </p>
          </div>
        </LandingReveal>

        <LandingReveal delay={80}>
          <div
            className="lp-ba__table"
            role="table"
            aria-label="Avant et avec Batimum"
          >
            <div className="lp-ba__tableHead" role="row">
              <div
                className="lp-ba__colHead lp-ba__colHead--before"
                role="columnheader"
              >
                Avant Batimum
              </div>
              <div className="lp-ba__colHeadSpacer" aria-hidden="true" />
              <div
                className="lp-ba__colHead lp-ba__colHead--after"
                role="columnheader"
              >
                <Check size={15} strokeWidth={2.6} aria-hidden="true" />
                Avec Batimum
              </div>
            </div>

            <div className="lp-ba__tableBody" role="rowgroup">
              {ROWS.map((row, index) => (
                <motion.div
                  key={row.id}
                  className="lp-ba__tableRow"
                  role="row"
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    ...t,
                    delay: reduced ? 0 : index * 0.06,
                  }}
                >
                  <div className="lp-ba__cell lp-ba__cell--before" role="cell">
                    <span className="lp-ba__mobileLabel">Avant Batimum</span>
                    <p>{row.before}</p>
                  </div>
                  <div className="lp-ba__cellArrow" aria-hidden="true">
                    <ArrowRight size={16} strokeWidth={2.2} />
                  </div>
                  <div className="lp-ba__cell lp-ba__cell--after" role="cell">
                    <span className="lp-ba__mobileLabel lp-ba__mobileLabel--after">
                      Avec Batimum
                    </span>
                    <p>{row.withBatimum}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </LandingReveal>

        <LandingReveal delay={120}>
          <div className="lp-ba__footer">
            <p className="lp-ba__closing">
              Moins de temps sur l’administratif.
              <br />
              Plus de temps sur vos chantiers.
            </p>
            <LandingTrialCta
              className="lp-ba__trial"
              label="Découvrir Batimum gratuitement"
            />
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
