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

  const plans: Array<{
    id: PlanId;
    title: string;
    price: number;
    hint: string;
    featured?: boolean;
    badge?: string;
  }> = [
    {
      id: "monthly",
      title: "Sans engagement",
      price: MONTHLY_PRICE,
      hint: "Résiliez quand vous le souhaitez.",
    },
    {
      id: "yearly",
      title: "Engagement annuel",
      price: YEARLY_MONTHLY_PRICE,
      hint: `Engagement de 12 mois · ${YEARLY_SAVINGS} € économisés.`,
      featured: true,
      badge: `${YEARLY_SAVINGS} € économisés par an`,
    },
  ];

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
              Une seule offre.{" "}
              <span className="lp-title-accent">Tout Batimum.</span>
            </h2>
            <p className="lp-subtitle lp-plans__lead">
              Tout le logiciel, sans options cachées.
            </p>
            <p className="lp-plans__micro">
              Choisissez simplement votre rythme de paiement.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-plans__grid">
          {plans.map((plan, index) => (
            <motion.article
              key={plan.id}
              className={[
                "lp-plans__card",
                plan.featured ? "lp-plans__card--featured" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              initial={
                reduced
                  ? false
                  : {
                      opacity: 0,
                      y: 16,
                      scale: plan.featured ? 0.985 : 0.99,
                    }
              }
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.28 }}
              transition={{
                ...t,
                delay: reduced ? 0 : plan.featured ? 0.14 : index * 0.08,
              }}
            >
              {plan.badge ? (
                <span className="lp-plans__badge">{plan.badge}</span>
              ) : null}

              <h3 className="lp-plans__title">{plan.title}</h3>

              <div className="lp-plans__price">
                <span className="lp-plans__amount">{plan.price}&nbsp;€</span>
                <span className="lp-plans__period">par mois</span>
              </div>
              <p className="lp-plans__hint">{plan.hint}</p>

              <LandingTrialCta
                href={checkoutHrefFor(plan.id)}
                fullWidth
                buttonClassName="lp-plans__cta"
              />

              <ul className="lp-plans__features">
                {FEATURES.map((feature, fi) => (
                  <motion.li
                    key={feature}
                    className="lp-plans__feature"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      ...t,
                      delay: reduced ? 0 : 0.18 + fi * 0.03,
                    }}
                  >
                    <span className="lp-plans__check" aria-hidden="true">
                      <Check size={14} strokeWidth={2.2} />
                    </span>
                    <span>{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.article>
          ))}
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
