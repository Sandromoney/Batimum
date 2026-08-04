"use client";

import { useEffect } from "react";
import {
  markLandingPastIntro,
  useLandingExperience,
} from "@/components/landing/landing-experience";

/**
 * Arrive en haut après un chargement normal / refresh.
 *
 * - /landing (sans ancre) → scroll 0, Hero visible
 * - F5 / reload → toujours Hero (hash marketing stripé)
 * - soft-return (Fermer auth) → conserve le scroll restauré
 * - clic / URL avec ancre (#plans, #diagnostic…) → ancre honorée
 */
export function LandingScrollReset() {
  const { restore, ready } = useLandingExperience();

  useEffect(() => {
    if (!ready) return;

    const previous = history.scrollRestoration;
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    if (restore) {
      return () => {
        if ("scrollRestoration" in history) {
          history.scrollRestoration = previous;
        }
      };
    }

    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    const isReload = nav?.type === "reload";

    // Reload de /landing : toujours le Hero, même si un hash était resté.
    if (isReload && window.location.hash) {
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", `${pathname}${search}`);
    }

    const hash = window.location.hash;
    const hasAnchor = hash.length > 1;

    if (hasAnchor && !isReload) {
      const id = hash.slice(1);
      markLandingPastIntro();
      const go = () => {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: "auto", block: "start" });
        }
      };
      const t0 = window.setTimeout(go, 60);
      const t1 = window.setTimeout(go, 220);
      return () => {
        window.clearTimeout(t0);
        window.clearTimeout(t1);
        if ("scrollRestoration" in history) {
          history.scrollRestoration = previous;
        }
      };
    }

    const forceTop = () => {
      if (window.location.hash && window.location.hash.length > 1) return;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    forceTop();
    const raf = requestAnimationFrame(forceTop);
    const timers = [0, 50, 120, 280, 500].map((ms) =>
      window.setTimeout(forceTop, ms),
    );

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
      if ("scrollRestoration" in history) {
        history.scrollRestoration = previous;
      }
    };
  }, [ready, restore]);

  return null;
}
