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
import { ArrowDown, ArrowRight } from "lucide-react";
import {
  HERO_FEATURES,
  HERO_BM_SYMBOL_SRC,
  LandingHeroOrbit,
} from "@/components/landing/landing-hero-orbit";
import { heroContent } from "@/lib/landing-hero-content";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

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
    : heroContent.primaryCta;
  const reduced = useReducedMotion() ?? false;
  const enableScrollStory = useDesktopScrollStory(reduced);
  const showOrbit = useShowOrbit(reduced);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const idleProgress = useMotionValue(0);
  const progress = enableScrollStory ? scrollYProgress : idleProgress;
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
          <div className="batimumHero__content batimumHero__copy">
            <span className="batimumHero__badge">
              <span className="batimumHero__badgeDot" aria-hidden="true" />
              {heroContent.badge}
            </span>

            <h1 className="batimumHero__title">
              {heroContent.titleBefore}
              <span className="batimumHero__highlight">
                {heroContent.titleHighlight}
              </span>
              {heroContent.titleAfter}
            </h1>

            <p className="batimumHero__subtitle">{heroContent.subtitle}</p>

            <ul className="batimumHero__benefits">
              {heroContent.benefits.map(({ label, Icon }) => (
                <li key={label} className="batimumHero__benefit">
                  <Icon
                    className="batimumHero__benefitIcon"
                    size={18}
                    strokeWidth={1.75}
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
                href={heroContent.secondaryHref}
                className="landing-btn-secondary batimumHero__ctaSecondary inline-flex items-center justify-center gap-2 no-underline"
              >
                {heroContent.secondaryCta}
              </Link>
            </div>

            <p className="batimumHero__trust">{heroContent.trust}</p>
          </div>

          <div className="batimumHero__visual">
            {showOrbit ? (
              <LandingHeroOrbit
                scrollProgress={progress}
                enableOrbit={!reduced}
              />
            ) : (
              <div className="batimumHero__mobileStack">
                <div className="batimumHero__mobileScene">
                  <div className="batimumHero__nut batimumHero__nut--static" aria-hidden>
                    <svg
                      className="batimumHero__nutSvg"
                      viewBox="0 0 400 400"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <polygon
                        points="388,200 294,362 106,362 12,200 106,38 294,38"
                        stroke="rgba(17,17,17,0.10)"
                        strokeWidth="1.45"
                        strokeLinejoin="round"
                      />
                      <polygon
                        points="372,200 286,350 114,350 28,200 114,50 286,50"
                        stroke="rgba(17,17,17,0.055)"
                        strokeWidth="1.05"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="200"
                        cy="200"
                        r="94"
                        stroke="rgba(59,130,246,0.10)"
                        strokeWidth="1.05"
                      />
                      <circle
                        cx="200"
                        cy="200"
                        r="54"
                        stroke="rgba(17,17,17,0.09)"
                        strokeWidth="1.35"
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

        {enableScrollStory ? (
          <motion.p
            className="batimumHero__scrollCue batimumHero__scrollHint"
            style={{ opacity: cueOpacity }}
          >
            <ArrowDown
              className="batimumHero__scrollArrow"
              size={14}
              strokeWidth={1.8}
              aria-hidden
            />
            {heroContent.scrollCue}
          </motion.p>
        ) : null}
      </div>
    </section>
  );
}
