"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { LandingNavMenus } from "@/components/landing/landing-nav-menus";
import { LandingHeroAtmosphere } from "@/components/landing/landing-hero-atmosphere";
import { LandingHeroDiffBadges } from "@/components/landing/landing-hero-diff-badges";
import { LandingHeroScene } from "@/components/landing/landing-hero-scene";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";
import { cn } from "@/lib/utils";

const btnHeaderPrimaryClass =
  "landing-header-btn landing-header-btn--primary landing-btn-interactive group inline-flex items-center justify-center gap-1.5 rounded-[0.625rem] bg-primary font-semibold text-primary-foreground no-underline transition-all hover:bg-primary-hover active:scale-[0.98]";

const btnHeaderSecondaryClass =
  "landing-header-btn landing-header-btn--secondary landing-btn-interactive inline-flex items-center justify-center rounded-[0.625rem] border font-semibold text-foreground no-underline transition-all hover:bg-card-hover/60 active:scale-[0.98]";

const headerEmployeeLinkClass =
  "landing-header-employee-link inline-flex shrink-0 items-center whitespace-nowrap no-underline transition-colors";

const btnHeroCtaClass =
  "landing-btn-primary landing-btn-interactive landing-hero-main-cta group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground no-underline shadow-glow transition-all hover:bg-primary-hover active:scale-[0.98] sm:px-6 sm:py-3";

function HeroRevealLine({
  children,
  delay,
}: {
  children: ReactNode;
  delay: number;
}) {
  return (
    <span
      className="landing-hero-line"
      style={{ "--hero-line-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </span>
  );
}

function HeroKeyword({ children }: { children: ReactNode }) {
  return <span className="text-primary">{children}</span>;
}

export function LandingTop() {
  const [scrolled, setScrolled] = useState(false);
  // Visible dès le SSR — évite écran blanc si l'hydratation JS échoue ou tarde.
  const [ready] = useState(true);
  const heroVisible = true;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={cn("landing-top", ready && "landing-top--ready")}>
      <header
        className={cn(
          "landing-header-bar fixed top-0 left-0 right-0 z-50",
          scrolled && "landing-header-bar--scrolled",
        )}
      >
        <div className="landing-header-grid">
          <div className="landing-header-logo-container">
            <Link
              href="/landing"
              className="landing-logo-enter no-underline"
              aria-label="BATIMUM"
            >
              <img
                src="/logo-batimum.png"
                alt="Batimum"
                className="landing-header-logo"
              />
            </Link>
          </div>

          <LandingNavMenus className="landing-header-nav flex min-w-0 items-center justify-center" />

          <div className="landing-header-actions flex items-center gap-3">
            <Link href="/login-employe" className={headerEmployeeLinkClass}>
              Connexion employé
            </Link>
            <Link href="/login" className={btnHeaderSecondaryClass}>
              Connexion
            </Link>
            <Link href={getPublicSignupHref()} className={btnHeaderPrimaryClass}>
              <span className="hidden sm:inline">
                {isPrivateBetaEnabled() ? "Se connecter" : "Commencer gratuitement"}
              </span>
              <span className="sm:hidden">
                {isPrivateBetaEnabled() ? "Connexion" : "Essayer"}
              </span>
              <ArrowRight
                className="landing-btn-arrow h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </header>

      <div className="landing-header-spacer" aria-hidden="true" />

      <section
        className="landing-hero-section landing-hero-section--viewport relative overflow-hidden"
        aria-label="Présentation Batimum"
      >
        <LandingHeroAtmosphere />

        <div
          className={cn(
            "landing-hero landing-hero--connected relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-5 px-6 py-6 sm:px-8 sm:py-7 lg:gap-7 lg:px-10 lg:py-9",
            heroVisible && "landing-hero--visible",
          )}
        >
          <LandingHeroScene visible={heroVisible} />

          <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
            <h1 className="landing-hero-title landing-hero-title--centered landing-hero-title--hook">
              <HeroRevealLine delay={920}>
                Le terrain.
              </HeroRevealLine>
              <HeroRevealLine delay={1040}>
                Le bureau.
              </HeroRevealLine>
              <HeroRevealLine delay={1160}>
                Enfin <HeroKeyword>connectés</HeroKeyword>.
              </HeroRevealLine>
            </h1>

            <p
              className="landing-hero-fade landing-hero-subtitle mt-3 max-w-[680px] text-base leading-7 text-muted-foreground sm:mt-4 sm:text-lg sm:leading-8"
              style={{ "--hero-line-delay": "1280ms" } as CSSProperties}
            >
              Batimum réunit vos devis, vos équipes, vos chantiers et vos
              factures dans un seul logiciel pensé pour les TPE du bâtiment.
            </p>

            <p
              className="landing-hero-fade mt-4 text-sm font-medium leading-7 text-foreground/90 sm:text-base"
              style={{ "--hero-line-delay": "1400ms" } as CSSProperties}
            >
              Vos employés savent où aller.
              <br />
              Vous gardez le contrôle.
            </p>

            <LandingHeroDiffBadges visible={heroVisible} baseDelay={1520} />

            <div
              className="landing-hero-cta mt-5 sm:mt-6"
              style={{ "--hero-line-delay": "1880ms" } as CSSProperties}
            >
              <Link href={getPublicSignupHref()} className={btnHeroCtaClass}>
                {isPrivateBetaEnabled()
                  ? "Se connecter"
                  : "Commencer gratuitement"}
                <ArrowRight
                  className="landing-btn-arrow h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>

            <p
              className="landing-hero-reassurance mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground"
              style={{ "--hero-line-delay": "2000ms" } as CSSProperties}
            >
              <span>7 jours d&apos;essai</span>
              <span className="text-border/80" aria-hidden="true">
                ·
              </span>
              <span>Sans engagement</span>
              <span className="text-border/80" aria-hidden="true">
                ·
              </span>
              <span>Support français</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
