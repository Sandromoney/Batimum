"use client";

import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  HERO_FEATURES,
  HERO_BM_SYMBOL_SRC,
  LandingHeroOrbit,
} from "@/components/landing/landing-hero-orbit";
import { heroContent } from "@/lib/landing-hero-content";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";
import type { CSSProperties } from "react";

/**
 * Hero landing — une seule voie visuelle :
 * - motion OK → LandingHeroOrbit (spin + stats + bulles)
 * - prefers-reduced-motion → stack statique accessible
 */
export function LandingHero() {
  const signupHref = getPublicSignupHref();
  const primaryLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : heroContent.primaryCta;
  const reduced = useReducedMotion() ?? false;

  return (
    <section
      className="batimumHero batimumHero--static"
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
              <span>La solution</span>
              <span>
                <span className="batimumHero__highlightWord">tout-en-un</span>{" "}
                pour
              </span>
              <span>piloter votre</span>
              <span>entreprise du</span>
              <span>BTP.</span>
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
