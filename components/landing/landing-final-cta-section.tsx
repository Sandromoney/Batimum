"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { useLandingExperience } from "@/components/landing/landing-experience";

const TRUST = [
  "Configuration en quelques minutes",
  "Toutes les fonctionnalités incluses",
  "Support disponible",
] as const;

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function LandingFinalCtaSection() {
  const reduced = useReducedMotion();
  const { restore } = useLandingExperience();

  return (
    <section
      className="lp-section lp-final"
      aria-labelledby="final-cta-title"
      id="commencer"
    >
      <div className="lp-container">
        <motion.div
          className="lp-final__inner"
          initial={reduced || restore ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{
            duration: reduced || restore ? 0.01 : 0.55,
            ease: EASE,
          }}
        >
          <h2 id="final-cta-title" className="lp-final__title">
            Votre métier est de gérer vos chantiers.
            <br />
            <span>Le nôtre est de vous faire gagner du temps.</span>
          </h2>
          <p className="lp-final__sub">
            Rejoignez les entreprises qui choisissent de consacrer plus de temps
            à leurs chantiers et moins à leur administratif.
          </p>
          <LandingTrialCta
            className="lp-final__trial"
            buttonClassName="lp-final__cta"
            label="Démarrer mes 7 jours gratuits"
          />
          <ul className="lp-final__trust">
            {TRUST.map((item) => (
              <li key={item}>
                <Check size={14} strokeWidth={2.2} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
