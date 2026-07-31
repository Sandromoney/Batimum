"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { LandingNavMenus } from "@/components/landing/landing-nav-menus";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";
import { writeLandingSnapshot } from "@/components/landing/landing-experience";
import { cn } from "@/lib/utils";

const btnHeaderPrimaryClass =
  "landing-header-btn landing-header-btn--primary landing-btn-interactive group inline-flex items-center justify-center gap-1.5 rounded-[0.625rem] bg-primary font-semibold text-primary-foreground no-underline transition-all hover:bg-primary-hover active:scale-[0.98]";

const btnHeaderSecondaryClass =
  "landing-header-btn landing-header-btn--secondary landing-btn-interactive inline-flex items-center justify-center rounded-[0.625rem] border font-semibold no-underline transition-all active:scale-[0.98]";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
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
            <Link
              href="/login"
              className={btnHeaderSecondaryClass}
              onClick={() => writeLandingSnapshot()}
            >
              Connexion
            </Link>
            <Link
              href={getPublicSignupHref()}
              className={btnHeaderPrimaryClass}
              onClick={() => writeLandingSnapshot()}
            >
              <span className="hidden sm:inline">
                {isPrivateBetaEnabled()
                  ? "Se connecter"
                  : "Essayer gratuitement"}
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
    </>
  );
}
