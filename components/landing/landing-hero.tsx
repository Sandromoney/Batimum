"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import {
  HERO_FEATURES,
  HERO_BM_SYMBOL_SRC,
  LandingHeroOrbit,
} from "@/components/landing/landing-hero-orbit";
import { LandingTrialCta } from "@/components/landing/landing-trial-cta";
import { heroContent } from "@/lib/landing-hero-content";
import { useLandingExperience } from "@/components/landing/landing-experience";

const enterEase = [0.22, 1, 0.36, 1] as const;

function enterProps(reduced: boolean, delay: number, restore: boolean) {
  if (reduced || restore) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: enterEase },
  };
}

/**
 * Hero landing — colonne gauche premium + orbit à droite.
 * Ne pas modifier l’orbit ici (LandingHeroOrbit).
 */
export function LandingHero() {
  const { restore } = useLandingExperience();
  // SSR + premier paint client : toujours false → même HTML.
  // Après montage seulement, respecter prefers-reduced-motion.
  const prefersReduced = useReducedMotion();
  const [motionReady, setMotionReady] = useState(false);
  useEffect(() => setMotionReady(true), []);
  const reduced = motionReady ? (prefersReduced ?? false) : false;

  return (
    <section
      className="batimumHero batimumHero--static"
      aria-label="Présentation Batimum"
    >
      <div className="batimumHero__sticky">
        <div className="batimumHero__inner">
          <div className="batimumHero__content batimumHero__copy">
            <motion.h1
              className="batimumHero__title"
              {...enterProps(reduced, 0, restore)}
            >
              <span>La solution</span>
              <span>
                <span className="batimumHero__highlightWord">tout-en-un</span>
                {" "}pour
              </span>
              <span>piloter votre</span>
              <span>entreprise du BTP.</span>
            </motion.h1>

            <motion.p
              className="batimumHero__lead"
              {...enterProps(reduced, 0.12, restore)}
            >
              {heroContent.lead}
            </motion.p>

            <motion.p
              className="batimumHero__support"
              {...enterProps(reduced, 0.22, restore)}
            >
              {heroContent.support}
            </motion.p>

            <ul className="batimumHero__benefits">
              {heroContent.benefits.map((item, index) => {
                const Icon = item.Icon;
                const restBefore =
                  "restBefore" in item ? item.restBefore : undefined;
                return (
                  <motion.li
                    key={item.highlight}
                    className="batimumHero__benefit"
                    {...enterProps(reduced, 0.32 + index * 0.08, restore)}
                  >
                    <span className="batimumHero__benefitIcon" aria-hidden>
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="batimumHero__benefitText">
                      {restBefore ? (
                        <>
                          {restBefore}
                          <span className="batimumHero__benefitHighlight">
                            {item.highlight}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="batimumHero__benefitHighlight">
                            {item.highlight}
                          </span>
                          {item.rest}
                        </>
                      )}
                    </span>
                  </motion.li>
                );
              })}
            </ul>

            <motion.div
              className="batimumHero__ctas"
              {...enterProps(reduced, 0.58, restore)}
            >
              <LandingTrialCta
                className="batimumHero__trial"
                buttonClassName="batimumHero__ctaPrimary"
              />
              <Link
                href={heroContent.secondaryHref}
                className="landing-btn-secondary batimumHero__ctaSecondary inline-flex items-center justify-center gap-2 no-underline"
              >
                {heroContent.secondaryCta}
              </Link>
            </motion.div>

            <motion.p
              className="batimumHero__trust"
              {...enterProps(reduced, 0.68, restore)}
            >
              {heroContent.trust}
            </motion.p>
          </div>

          <div className="batimumHero__visual">
            {!reduced ? (
              <LandingHeroOrbit enableOrbit />
            ) : (
              <div className="batimumHero__mobileStack">
                <div className="batimumHero__mobileScene">
                  <div
                    className="batimumHero__nut batimumHero__nut--static"
                    aria-hidden
                  >
                    <svg
                      className="batimumHero__nutSvg"
                      viewBox="0 0 400 400"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <linearGradient
                          id="batimumNutFaceMobile"
                          x1="70"
                          y1="60"
                          x2="320"
                          y2="340"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop
                            offset="0%"
                            stopColor="rgba(255,255,255,0.45)"
                          />
                          <stop
                            offset="100%"
                            stopColor="rgba(255,255,255,0.10)"
                          />
                        </linearGradient>
                      </defs>
                      <polygon
                        points="388,200 294,362 106,362 12,200 106,38 294,38"
                        fill="url(#batimumNutFaceMobile)"
                        stroke="rgba(17,17,17,0.14)"
                        strokeWidth="1.25"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="200"
                        cy="200"
                        r="54"
                        stroke="rgba(17,17,17,0.16)"
                        strokeWidth="1.35"
                        fill="rgba(255,255,255,0.02)"
                      />
                    </svg>
                  </div>
                  <div className="batimumHero__logoSymbol" aria-label="Batimum">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={HERO_BM_SYMBOL_SRC}
                      alt="Batimum"
                      className="batimumHero__logoSymbolImg"
                      width={829}
                      height={210}
                      decoding="async"
                    />
                  </div>
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
                          <Icon size={16} strokeWidth={1.75} />
                        </span>
                        <span className="batimumHero__bubbleCopy">
                          <span className="batimumHero__bubbleTitle">
                            {feature.title}
                          </span>
                          <span className="batimumHero__bubbleSub">
                            {feature.subtitle}
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
      </div>
    </section>
  );
}
