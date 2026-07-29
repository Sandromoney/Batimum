"use client";

import { useEffect } from "react";

/**
 * Landing only: arrive always on the Hero after a normal load/refresh.
 * Keeps intentional hash anchors (navbar / deep links) working.
 */
export function LandingScrollReset() {
  useEffect(() => {
    const previous = history.scrollRestoration;
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const hash = window.location.hash;
    const hasAnchor = hash.length > 1;

    if (!hasAnchor) {
      window.scrollTo(0, 0);
      // Catch late browser restoration after paint
      const t0 = window.setTimeout(() => window.scrollTo(0, 0), 0);
      const t1 = window.setTimeout(() => {
        if (!window.location.hash || window.location.hash.length <= 1) {
          window.scrollTo(0, 0);
        }
      }, 50);
      return () => {
        window.clearTimeout(t0);
        window.clearTimeout(t1);
        if ("scrollRestoration" in history) {
          history.scrollRestoration = previous;
        }
      };
    }

    return () => {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = previous;
      }
    };
  }, []);

  return null;
}
