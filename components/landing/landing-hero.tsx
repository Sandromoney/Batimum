"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Mouse,
} from "lucide-react";
import { LandingHeroOrbit } from "@/components/landing/landing-hero-orbit";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

const BENEFITS = [
  "Devis IA créés en quelques minutes",
  "Planning et équipes toujours synchronisés",
  "Rentabilité visible en temps réel",
] as const;

export function LandingHero() {
  const signupHref = getPublicSignupHref();
  const primaryLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";
  const reduced = useReducedMotion() ?? false;
  const { scrollY } = useScroll();
  const entranceY = useMotionValue(reduced ? 0 : 18);
  const scrollShift = useTransform(scrollY, [0, 600], [0, -28]);
  const copyY = useTransform(
    [entranceY, scrollShift],
    ([entrance, scroll]) => (entrance as number) + (reduced ? 0 : (scroll as number)),
  );
  const cueOpacity = useTransform(scrollY, [0, 120], [1, 0]);
  const [cueGone, setCueGone] = useState(false);

  useEffect(() => {
    if (reduced) {
      entranceY.set(0);
      return;
    }
    const controls = animate(entranceY, 0, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [entranceY, reduced]);

  useEffect(() => {
    return scrollY.on("change", (y) => {
      if (y > 80) setCueGone(true);
    });
  }, [scrollY]);

  return (
    <section className="lp-hero" aria-label="Présentation Batimum">
      <div className="lp-hero__container">
        <div className="lp-hero__grid">
          <motion.div
            className="lp-hero__copy"
            style={{ y: copyY }}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="lp-eyebrow lp-hero__badge">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Pensé uniquement pour les entreprises du BTP
            </span>

            <h1 className="lp-hero__title">
              Votre entreprise du BTP.
              <span className="lp-hero__title-accent">Enfin sous contrôle.</span>
            </h1>

            <p className="lp-hero__subtitle">
              Batimum centralise vos devis, vos équipes, vos chantiers, vos
              factures et votre rentabilité dans une seule plateforme simple et
              intelligente.
            </p>

            <ul className="lp-hero__benefits">
              {BENEFITS.map((item) => (
                <li key={item} className="lp-hero__benefit">
                  <Check
                    className="lp-hero__benefit-icon"
                    aria-hidden="true"
                    strokeWidth={2.25}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="lp-hero__ctas">
              <Link
                href={signupHref}
                className="landing-btn-primary lp-hero__cta-primary group inline-flex items-center justify-center gap-2 no-underline"
              >
                {primaryLabel}
                <ArrowRight
                  className="lp-hero__cta-arrow h-4 w-4"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/landing#fonctionnalites"
                className="landing-btn-secondary lp-hero__cta-secondary inline-flex items-center justify-center gap-2 no-underline"
              >
                Découvrir Batimum
              </Link>
            </div>

            <p className="lp-hero__trust">
              Sans engagement · Mise en route rapide · Données sécurisées
            </p>
          </motion.div>

          <div className="lp-hero__visual">
            <LandingHeroOrbit />
          </div>
        </div>
      </div>

      {!cueGone && (
        <motion.p
          className="lp-hero__scroll-cue"
          style={reduced ? undefined : { opacity: cueOpacity }}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >
          <span className="lp-hero__scroll-icon" aria-hidden>
            <Mouse size={14} strokeWidth={1.75} />
            <ArrowDown size={12} strokeWidth={2} className="lp-hero__scroll-arrow" />
          </span>
          Faites défiler pour découvrir Batimum
        </motion.p>
      )}
    </section>
  );
}
