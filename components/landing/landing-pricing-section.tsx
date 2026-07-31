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
  "MUM IA",
  "Gestion des devis",
  "Gestion des clients",
  "Planning",
  "Chantiers",
  "Pilotage",
  "Espace employé sécurisé",
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
    duration: reduced || restore ? 0.01 : 0.5,
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
      hint: `Économisez ${YEARLY_SAVINGS} € par an.`,
      featured: true,
      badge: "Le plus choisi",
    },
  ];

  return (
    <section id="plans" className="lp-section lp-plans" aria-labelledby="plans-title">
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head lp-plans__head">
            <p className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Tarifs
            </p>
            <h2 id="plans-title" className="lp-title mt-5 max-w-3xl">
              Un tarif simple.{" "}
              <span className="lp-title-accent">Sans surprise.</span>
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Une seule offre, toutes les fonctionnalités incluses.
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
                      y: 18,
                      scale: plan.featured ? 0.98 : 0.99,
                    }
              }
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                ...t,
                delay: reduced ? 0 : index * 0.12,
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
                {FEATURES.map((feature) => (
                  <li key={feature} className="lp-plans__feature">
                    <span className="lp-plans__check" aria-hidden="true">
                      <Check size={14} strokeWidth={2.2} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>

        <LandingReveal delay={120}>
          <ul className="lp-plans__trust">
            <li>
              <Check size={14} strokeWidth={2.2} aria-hidden="true" />
              Essai gratuit de 7 jours
            </li>
            <li>
              <Check size={14} strokeWidth={2.2} aria-hidden="true" />
              Annulation possible avant la fin de l’essai
            </li>
            <li>
              <Check size={14} strokeWidth={2.2} aria-hidden="true" />
              Une seule offre, tout inclus
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
