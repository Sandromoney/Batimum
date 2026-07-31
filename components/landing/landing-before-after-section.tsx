"use client";

import { motion, useReducedMotion } from "framer-motion";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";

type CompareRow = {
  id: string;
  today: string;
  withBatimum: string;
  note?: string;
};

const ROWS: CompareRow[] = [
  {
    id: "outils",
    today: "Plusieurs logiciels, plusieurs onglets, plusieurs endroits.",
    withBatimum: "Une seule plateforme pour tout piloter.",
  },
  {
    id: "devis",
    today: "Les devis se font encore à la main, souvent le soir.",
    withBatimum: "MUM IA prépare vos devis en quelques instants.",
  },
  {
    id: "planning",
    today: "Le planning change sans cesse, et personne n’a la même version.",
    withBatimum: "Un planning centralisé, toujours à jour.",
  },
  {
    id: "equipes",
    today: "Vous appelez vos salariés juste pour savoir où ils sont.",
    withBatimum:
      "Chaque salarié a son espace : planning, chantiers et consignes.",
    note: "Sans accès aux devis, aux marges ni aux données confidentielles.",
  },
  {
    id: "marges",
    today:
      "Vous découvrez parfois trop tard qu’un chantier est moins rentable que prévu.",
    withBatimum:
      "Vos coûts, vos marges et votre rentabilité, suivis en temps réel.",
  },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function LandingBeforeAfterSection() {
  const reduced = useReducedMotion();

  const t = {
    duration: reduced ? 0.01 : 0.48,
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
            <h2 id="before-after-title" className="lp-title mt-5 max-w-3xl">
              Pourquoi changer vos habitudes{" "}
              <span className="lp-title-accent">aujourd’hui ?</span>
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Batimum remplace plusieurs outils, simplifie votre quotidien et
              vous rend du temps — sur le chantier comme au bureau.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-ba__rows" role="list">
          {ROWS.map((row, index) => {
            const baseDelay = reduced ? 0 : index * 0.12;
            return (
              <div key={row.id} className="lp-ba__row" role="listitem">
                <motion.article
                  className="lp-ba__card lp-ba__card--today"
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ ...t, delay: baseDelay }}
                >
                  <p className="lp-ba__label">Aujourd’hui</p>
                  <p className="lp-ba__text">{row.today}</p>
                </motion.article>

                <div className="lp-ba__arrow" aria-hidden="true">
                  <span className="lp-ba__arrowLine" />
                  <span className="lp-ba__arrowTip" />
                </div>

                <motion.article
                  className="lp-ba__card lp-ba__card--batimum"
                  initial={reduced ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{
                    ...t,
                    delay: reduced ? 0 : baseDelay + 0.16,
                  }}
                >
                  <p className="lp-ba__label lp-ba__label--batimum">
                    Avec Batimum
                  </p>
                  <p className="lp-ba__text">{row.withBatimum}</p>
                  {row.note ? (
                    <p className="lp-ba__note">{row.note}</p>
                  ) : null}
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
