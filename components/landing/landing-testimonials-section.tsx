"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

type Testimonial = {
  id: string;
  firstName: string;
  initials: string;
  company: string;
  teamSize: string;
  quote: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: "marc",
    firstName: "Marc",
    initials: "M",
    company: "Entreprise de plomberie",
    teamSize: "4 salariés",
    quote:
      "Avant, je passais mes soirées à terminer les devis. Aujourd’hui, tout est centralisé et je peux enfin me concentrer sur mes chantiers.",
  },
  {
    id: "karim",
    firstName: "Karim",
    initials: "K",
    company: "Entreprise générale",
    teamSize: "6 salariés",
    quote:
      "Le planning est devenu beaucoup plus simple. Les équipes savent directement où aller sans que je passe mon temps au téléphone.",
  },
  {
    id: "sophie",
    firstName: "Sophie",
    initials: "S",
    company: "Entreprise de rénovation",
    teamSize: "5 salariés",
    quote:
      "Le pilotage m’a permis d’identifier plusieurs chantiers moins rentables que prévu. Aujourd’hui je prends mes décisions avec de vrais chiffres.",
  },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function LandingTestimonialsSection() {
  const reduced = useReducedMotion();
  const signupHref = getPublicSignupHref();
  const ctaLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement pendant 7 jours";

  const t = {
    duration: reduced ? 0.01 : 0.5,
    ease: EASE,
  };

  return (
    <section
      id="temoignages"
      className="lp-section lp-voices"
      aria-labelledby="testimonials-title"
    >
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-section-head lp-voices__head">
            <p className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Retours terrain
            </p>
            <h2 id="testimonials-title" className="lp-title mt-5 max-w-3xl">
              Ce que nos utilisateurs{" "}
              <span className="lp-title-accent">nous disent</span>
            </h2>
            <p className="lp-subtitle mt-5 max-w-2xl">
              Des retours recueillis auprès des entreprises qui utilisent
              Batimum au quotidien.
            </p>
          </div>
        </LandingReveal>

        <div className="lp-voices__grid">
          {TESTIMONIALS.map((item, index) => (
            <motion.article
              key={item.id}
              className="lp-voices__card"
              initial={
                reduced ? false : { opacity: 0, y: 18, scale: 0.985 }
              }
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                ...t,
                delay: reduced ? 0 : index * 0.1,
              }}
            >
              <blockquote className="lp-voices__quote">
                « {item.quote} »
              </blockquote>
              <footer className="lp-voices__meta">
                <span className="lp-voices__avatar" aria-hidden="true">
                  {item.initials}
                </span>
                <span className="lp-voices__who">
                  <span className="lp-voices__name">{item.firstName}</span>
                  <span className="lp-voices__detail">
                    {item.company} · {item.teamSize}
                  </span>
                </span>
              </footer>
            </motion.article>
          ))}
        </div>

        <LandingReveal delay={140}>
          <div className="lp-voices__footer">
            <p className="lp-voices__closing">
              Et si votre entreprise était la prochaine à gagner plusieurs
              heures chaque semaine ?
            </p>
            <Link
              href={signupHref}
              className="landing-btn-primary landing-btn-interactive group inline-flex items-center justify-center gap-2 no-underline"
            >
              {ctaLabel}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
