"use client";

import { Check } from "lucide-react";
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
    before: "Plusieurs outils, fichiers et messages dispersés",
    withBatimum: "Une seule plateforme pour centraliser votre entreprise",
  },
  {
    id: "devis",
    before: "Chaque devis recommence presque depuis zéro",
    withBatimum:
      "MUM IA prépare un devis structuré, modifiable et adapté à vos prix",
  },
  {
    id: "clients",
    before: "Les informations clients sont réparties entre plusieurs supports",
    withBatimum:
      "Coordonnées, devis, factures et chantiers réunis dans une seule fiche",
  },
  {
    id: "planning",
    before:
      "Le planning change et les salariés doivent être prévenus un par un",
    withBatimum:
      "Affectations centralisées et espace employé séparé avec planning et consignes",
  },
  {
    id: "chantiers",
    before: "L’avancement d’un chantier reste difficile à mesurer",
    withBatimum:
      "Une progression calculée selon le poids réel de chaque étape",
  },
  {
    id: "marges",
    before: "La marge est souvent découverte une fois le chantier terminé",
    withBatimum:
      "Coûts, prévisionnel, réel et rentabilité visibles pendant le chantier",
  },
  {
    id: "confidentialite",
    before: "Les données sensibles peuvent être partagées par erreur",
    withBatimum:
      "Les salariés accèdent uniquement à leur espace, sans voir les marges ni les données du dirigeant",
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
      <div className="lp-container">
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

        <div className="lp-ba__rows" role="list">
          {ROWS.map((row, index) => {
            const baseDelay = reduced ? 0 : index * 0.1;
            return (
              <div key={row.id} className="lp-ba__row" role="listitem">
                <motion.article
                  className="lp-ba__card lp-ba__card--today"
                  initial={reduced ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ ...t, delay: baseDelay }}
                >
                  <p className="lp-ba__label">Avant Batimum</p>
                  <p className="lp-ba__text">{row.before}</p>
                </motion.article>

                <div className="lp-ba__arrow" aria-hidden="true">
                  <span className="lp-ba__arrowLine" />
                  <span className="lp-ba__arrowTip" />
                </div>

                <motion.article
                  className="lp-ba__card lp-ba__card--batimum"
                  initial={reduced ? false : { opacity: 0, y: 12, scale: 0.99 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    ...t,
                    delay: reduced ? 0 : baseDelay + 0.22,
                  }}
                >
                  <p className="lp-ba__label lp-ba__label--batimum">
                    <Check size={12} strokeWidth={2.4} aria-hidden="true" />
                    Avec Batimum
                  </p>
                  <p className="lp-ba__text">{row.withBatimum}</p>
                </motion.article>
              </div>
            );
          })}
        </div>

        <LandingReveal delay={120}>
          <div className="lp-ba__footer">
            <p className="lp-ba__closing">
              Moins de temps sur l’administratif.
              <br />
              Plus de temps sur vos chantiers.
            </p>
            <LandingTrialCta className="lp-ba__trial" />
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
