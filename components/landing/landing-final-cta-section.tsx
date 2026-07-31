"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

const TRUST = [
  "Configuration en quelques minutes",
  "Toutes les fonctionnalités incluses",
  "Support disponible",
] as const;

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function LandingFinalCtaSection() {
  const reduced = useReducedMotion();
  const href = getPublicSignupHref();
  const label = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement pendant 7 jours";

  return (
    <section
      className="lp-section lp-final"
      aria-labelledby="final-cta-title"
    >
      <div className="lp-container">
        <motion.div
          className="lp-final__inner"
          initial={reduced ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{
            duration: reduced ? 0.01 : 0.55,
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
          <Link
            href={href}
            className="landing-btn-primary landing-btn-interactive lp-final__cta group inline-flex items-center justify-center gap-2 no-underline"
          >
            {label}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
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
