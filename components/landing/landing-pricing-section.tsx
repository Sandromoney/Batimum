"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import {
  useLandingExperience,
  writeLandingSnapshot,
} from "@/components/landing/landing-experience";
import { isStripeConfigured } from "@/lib/dev-access";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

const MONTHLY_PRICE = 39;
const YEARLY_MONTHLY_PRICE = 29;
const YEARLY_SAVINGS = 120;

const FEATURES = [
  "MUM IA et gestion complète des devis",
  "Signature électronique",
  "Clients et historique centralisé",
  "Planning des équipes",
  "Espace employé sécurisé",
  "Suivi des chantiers",
  "Facturation",
  "Pilotage et rentabilité",
  "Mises à jour incluses",
  "Support",
] as const;

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type PlanId = "monthly" | "yearly";

function checkoutHrefFor(plan: PlanId): string {
  if (isPrivateBetaEnabled()) return "/login";
  if (isStripeConfigured()) return `/checkout?billing=${plan}`;
  return getPublicSignupHref();
}

export function LandingPricingSection() {
  const reduced = useReducedMotion();
  const { restore } = useLandingExperience();

  const t = {
    duration: reduced || restore ? 0.01 : 0.48,
    ease: EASE,
  };

  return (
    <section id="plans" className="lp-section lp-plans" aria-labelledby="plans-title">
      <div className="lp-container lp-plans__shell">
        <LandingReveal>
          <div className="lp-section-head lp-plans__head">
            <p className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Tarifs
            </p>
            <h2 id="plans-title" className="lp-title lp-plans__titleHead">
              Un tarif simple.{" "}
              <span className="lp-title-accent">Sans surprise.</span>
            </h2>
            <p className="lp-subtitle lp-plans__lead">
              Une seule offre, toutes les fonctionnalités incluses.
            </p>
            <p className="lp-plans__micro">
              Choisissez simplement votre rythme de paiement.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-plans__grid">
          <motion.article
            className="lp-plans__card"
            initial={reduced ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.28 }}
            transition={{ ...t, delay: reduced ? 0 : 0.06 }}
          >
            <h3 className="lp-plans__title">Sans engagement</h3>
            <p className="lp-plans__subtitle">
              Restez libre, résiliez quand vous le souhaitez.
            </p>

            <div className="lp-plans__price">
              <span className="lp-plans__amount">{MONTHLY_PRICE}&nbsp;€</span>
              <span className="lp-plans__period">/ mois</span>
            </div>

            <LandingTrialCta
              href={checkoutHrefFor("monthly")}
              fullWidth
              buttonClassName="lp-plans__cta"
              label="Commencer mon essai gratuit"
              showTrialNote={false}
            />
            <p className="lp-plans__reassure">
              7 jours d&apos;essai gratuit · Sans engagement
            </p>

            <ul className="lp-plans__features">
              {FEATURES.map((feature) => (
                <li key={feature} className="lp-plans__feature">
                  <span className="lp-plans__check" aria-hidden="true">
                    <Check size={14} strokeWidth={2.4} />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.article>

          <motion.article
            className="lp-plans__card lp-plans__card--featured"
            initial={reduced ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.28 }}
            transition={{ ...t, delay: reduced ? 0 : 0.14 }}
          >
            <div className="lp-plans__badgeRow">
              <span className="lp-plans__badge">Le plus avantageux</span>
            </div>
            <h3 className="lp-plans__title">Engagement annuel</h3>
            <p className="lp-plans__subtitle">
              Le meilleur tarif pour piloter votre entreprise toute l’année.
            </p>

            <div className="lp-plans__price">
              <span className="lp-plans__amount">
                {YEARLY_MONTHLY_PRICE}&nbsp;€
              </span>
              <span className="lp-plans__period">/ mois</span>
            </div>
            <p className="lp-plans__savings">
              {YEARLY_SAVINGS}&nbsp;€ économisés par an
            </p>

            <LandingTrialCta
              href={checkoutHrefFor("yearly")}
              fullWidth
              buttonClassName="lp-plans__cta lp-plans__cta--featured"
              label="Démarrer avec l’offre annuelle"
              showTrialNote={false}
            />
            <p className="lp-plans__reassure">
              7 jours d&apos;essai gratuit · 12 mois d&apos;engagement
            </p>

            <ul className="lp-plans__features">
              {FEATURES.map((feature) => (
                <li key={feature} className="lp-plans__feature">
                  <span className="lp-plans__check" aria-hidden="true">
                    <Check size={14} strokeWidth={2.4} />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.article>
        </div>

        <LandingReveal delay={120}>
          <ul className="lp-plans__trust">
            <li>
              <Check size={14} strokeWidth={2.2} aria-hidden="true" />
              7 jours d&apos;essai gratuit
            </li>
            <li>
              <Check size={14} strokeWidth={2.2} aria-hidden="true" />
              Toutes les fonctionnalités incluses
            </li>
            <li>
              <Check size={14} strokeWidth={2.2} aria-hidden="true" />
              Aucune option cachée
            </li>
          </ul>
          <p className="lp-plans__login">
            Déjà inscrit ?{" "}
            <Link
              href="/login"
              className="lp-plans__loginLink"
              onClick={() => writeLandingSnapshot()}
            >
              Se connecter
            </Link>
          </p>
        </LandingReveal>
      </div>
    </section>
  );
}
