"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowRight, CalendarRange, Sparkles, TrendingUp } from "lucide-react";
import {
  HERO_FEATURES,
  LandingHeroOrbit,
} from "@/components/landing/landing-hero-orbit";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

const BENEFITS = [
  {
    label: "Devis générés rapidement avec l’IA",
    Icon: Sparkles,
  },
  {
    label: "Équipes et planning toujours synchronisés",
    Icon: CalendarRange,
  },
  {
    label: "Rentabilité visible en temps réel",
    Icon: TrendingUp,
  },
] as const;

/** Scroll story only on large desktop (≥1100). Default false avoids SSR 350vh flash. */
function useDesktopScrollStory(reduced: boolean) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (reduced) {
      setEnabled(false);
      return;
    }
    const mq = window.matchMedia("(min-width: 1100px)");
    const apply = () => setEnabled(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [reduced]);
  return enabled;
}

/** Orbit visual between tablet and desktop when scroll story is off. */
function useShowOrbit(reduced: boolean) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (reduced) {
      setShow(false);
      return;
    }
    const mq = window.matchMedia("(min-width: 900px)");
    const apply = () => setShow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [reduced]);
  return show;
}

export function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const signupHref = getPublicSignupHref();
  const primaryLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";
  const reduced = useReducedMotion() ?? false;
  const enableScrollStory = useDesktopScrollStory(reduced);
  const showOrbit = useShowOrbit(reduced);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const idleProgress = useMotionValue(0);
  const progress = enableScrollStory ? scrollYProgress : idleProgress;

  const copyOpacity = useTransform(
    progress,
    [0, 0.2, 0.35, 0.94, 1],
    [1, 1, 0.45, 0.4, 0.85],
  );
  const copyY = useTransform(progress, [0, 0.35, 1], [0, -16, -8]);
  const cueOpacity = useTransform(progress, [0, 0.08], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className={
        enableScrollStory
          ? "batimumHero batimumHero--scroll"
          : "batimumHero batimumHero--static"
      }
      aria-label="Présentation Batimum"
    >
      <div className="batimumHero__sticky">
        <div className="batimumHero__inner">
          <motion.div
            className="batimumHero__copy"
            style={
              enableScrollStory
                ? { opacity: copyOpacity, y: copyY }
                : undefined
            }
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="batimumHero__badge">
              <span className="batimumHero__badgeDot" aria-hidden="true" />
              Pensé uniquement pour les entreprises du BTP
            </span>

            <h1 className="batimumHero__title">
              La solution tout-en-un pour{" "}
              <span className="batimumHero__titleAccent">
                piloter votre entreprise
              </span>{" "}
              du BTP.
            </h1>

            <p className="batimumHero__subtitle">
              Créez vos devis en quelques minutes, planifiez vos équipes,
              suivez vos chantiers et pilotez votre rentabilité depuis le
              bureau comme sur le terrain.
            </p>

            <ul className="batimumHero__benefits">
              {BENEFITS.map(({ label, Icon }) => (
                <li key={label} className="batimumHero__benefit">
                  <Icon
                    className="batimumHero__benefitIcon"
                    size={16}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
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

          <div className="batimumHero__visual">
            {showOrbit ? (
              <LandingHeroOrbit
                scrollProgress={progress}
                enableOrbit={!reduced}
              />
            ) : (
              <div className="batimumHero__mobileStack">
                <div className="batimumHero__logoPad batimumHero__logoPad--solo">
                  <img
                    src="/logo-batimum.png"
                    alt="Batimum"
                    className="batimumHero__logoImg"
                    width={115}
                    height={29}
                    decoding="async"
                  />
                </div>
                <ul className="batimumHero__stackList">
                  {HERO_FEATURES.map((feature) => {
                    const Icon = feature.Icon;
                    return (
                      <li key={feature.id} className="batimumHero__stackItem">
                        <span
                          className="batimumHero__bubbleIcon"
                          style={
                            {
                              "--card-accent": feature.accent,
                            } as CSSProperties
                          }
                          aria-hidden
                        >
                          <Icon size={17} strokeWidth={1.8} />
                        </span>
                        <span className="batimumHero__bubbleCopy">
                          <span className="batimumHero__bubbleTitle">
                            {feature.title}
                          </span>
                          <span className="batimumHero__bubbleSub">
                            {feature.detail}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {enableScrollStory ? (
          <motion.p
            className="batimumHero__scrollCue"
            style={{ opacity: cueOpacity }}
          >
            <ArrowDown
              className="batimumHero__scrollArrow"
              size={14}
              strokeWidth={1.8}
              aria-hidden
            />
            Faites défiler pour découvrir Batimum
          </motion.p>
        ) : null}
      </div>
    </section>
  );
}
