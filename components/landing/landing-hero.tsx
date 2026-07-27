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
import { ArrowDown, ArrowRight, Check } from "lucide-react";
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
  const entranceY = useMotionValue(reduced ? 0 : 16);
  const scrollShift = useTransform(scrollY, [0, 600], [0, -16]);
  const copyY = useTransform(
    [entranceY, scrollShift],
    ([entrance, scroll]) =>
      (entrance as number) + (reduced ? 0 : (scroll as number)),
  );
  const sceneScale = useTransform(scrollY, [0, 600], [1, 0.96]);
  const cueOpacity = useTransform(scrollY, [0, 150], [1, 0]);
  const [cueGone, setCueGone] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) {
      entranceY.set(0);
      return;
    }
    const controls = animate(entranceY, 0, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [entranceY, reduced]);

  useEffect(() => {
    return scrollY.on("change", (y) => {
      if (y > 150) setCueGone(true);
    });
  }, [scrollY]);

  const disableParallax = reduced || narrow;

  return (
    <section className="batimumHero" aria-label="Présentation Batimum">
      <div className="batimumHero__container">
        <div className="batimumHero__grid">
          <motion.div
            className="batimumHero__copy"
            style={disableParallax ? undefined : { y: copyY }}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="batimumHero__badge">
              <span className="batimumHero__badgeDot" aria-hidden="true" />
              Pensé uniquement pour les entreprises du BTP
            </span>

            <h1 className="batimumHero__title">
              Votre entreprise du BTP.
              <span className="batimumHero__titleAccent">
                Enfin sous contrôle.
              </span>
            </h1>

            <p className="batimumHero__subtitle">
              Batimum centralise vos devis, vos équipes, vos chantiers, vos
              factures et votre rentabilité dans une seule plateforme simple et
              intelligente.
            </p>

            <ul className="batimumHero__benefits">
              {BENEFITS.map((item) => (
                <li key={item} className="batimumHero__benefit">
                  <Check
                    className="batimumHero__benefitIcon"
                    size={17}
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="batimumHero__ctas">
              <Link
                href={signupHref}
                className="landing-btn-primary batimumHero__ctaPrimary group inline-flex items-center justify-center gap-2 no-underline"
              >
                {primaryLabel}
                <ArrowRight
                  className="batimumHero__ctaArrow h-4 w-4"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/landing#fonctionnalites"
                className="landing-btn-secondary batimumHero__ctaSecondary inline-flex items-center justify-center gap-2 no-underline"
              >
                Découvrir Batimum
              </Link>
            </div>

            <p className="batimumHero__trust">
              Sans engagement · Mise en route rapide · Données sécurisées
            </p>
          </motion.div>

          <motion.div
            className="batimumHero__visual"
            style={disableParallax ? undefined : { scale: sceneScale }}
          >
            <LandingHeroOrbit />
          </motion.div>
        </div>
      </div>

      {!cueGone && (
        <motion.p
          className="batimumHero__scrollCue"
          style={reduced ? undefined : { opacity: cueOpacity }}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.45 }}
        >
          <ArrowDown
            className="batimumHero__scrollArrow"
            size={14}
            strokeWidth={1.8}
            aria-hidden
          />
          Faites défiler pour découvrir Batimum
        </motion.p>
      )}
    </section>
  );
}
