"use client";

import { useEffect } from "react";
import { useLandingExperience } from "@/components/landing/landing-experience";

/**
 * Arrive en haut après un chargement normal / refresh.
 * Conserve le scroll lors d’un retour navigateur (back/forward).
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

    const hash = window.location.hash;
    const hasAnchor = hash.length > 1;

    if (!hasAnchor) {
      window.scrollTo(0, 0);
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
  }, [ready, restore]);

  return null;
}
