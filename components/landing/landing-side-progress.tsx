"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ProgressSection = {
  id: string;
  label: string;
};

/**
 * Libellés commerciaux uniquement.
 * « Présentation » couvre Hero + post-Hero + film hub (libellé seul —
 * les sections restent séparées visuellement).
 */
const SECTIONS: ProgressSection[] = [
  { id: "presentation", label: "Présentation" },
  { id: "diagnostic", label: "Questionnaire Batimum" },
  { id: "avant-apres", label: "Comparaison" },
  { id: "temoignages", label: "Avis" },
  { id: "plans", label: "Tarifs" },
  { id: "faq", label: "FAQ" },
  { id: "commencer", label: "Essai gratuit" },
];

function sectionElement(id: string): HTMLElement | null {
  if (id === "presentation") {
    return (
      (document.getElementById("batimum-hero") as HTMLElement | null) ||
      (document.querySelector(".batimumHero") as HTMLElement | null) ||
      (document.querySelector(".landing-top") as HTMLElement | null)
    );
  }
  if (id === "commencer") {
    return document.querySelector(".lp-final") as HTMLElement | null;
  }
  return document.getElementById(id);
}

function resolveActiveId(scrollY: number, viewportH: number): string {
  const marker = scrollY + viewportH * 0.32;
  let active = SECTIONS[0]?.id ?? "presentation";

  // Présentation reste active jusqu’au questionnaire (hero + pain + hub).
  const diagnostic = document.getElementById("diagnostic");
  if (diagnostic) {
    const diagTop =
      diagnostic.getBoundingClientRect().top + window.scrollY;
    if (marker < diagTop - 8) return "presentation";
  }

  for (const section of SECTIONS) {
    if (section.id === "presentation") continue;
    const el = sectionElement(section.id);
    if (!(el instanceof HTMLElement)) continue;
    const top = el.getBoundingClientRect().top + window.scrollY;
    if (marker >= top - 8) active = section.id;
  }

  return active;
}

function contentOverlapsLabels(navEl: HTMLElement): boolean {
  const navRect = navEl.getBoundingClientRect();
  // Dot (6) + gap + label max (~8.5rem) + marge
  const estimatedLabelRight = navRect.left + 6 + 10 + 136;

  const selectors = [
    ".landing-emerald .batimumHero__content",
    ".landing-emerald .batimumHero__inner",
    ".landing-emerald .lp-container",
    ".landing-emerald .lp-story__sticky",
    ".landing-emerald .lp-hub__stage",
  ];

  let minContentLeft = Infinity;
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((node) => {
      const el = node as HTMLElement;
      const r = el.getBoundingClientRect();
      if (r.width < 48) return;
      if (r.bottom < 80 || r.top > window.innerHeight - 40) return;
      minContentLeft = Math.min(minContentLeft, r.left);
    });
  }

  if (!Number.isFinite(minContentLeft)) {
    return window.innerWidth < 1320;
  }

  return minContentLeft < estimatedLabelRight + 14;
}

export function LandingSideProgress() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [visible, setVisible] = useState(false);
  const [labelsSafe, setLabelsSafe] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  const overlapStableRef = useRef(false);
  const items = useMemo(() => SECTIONS, []);

  useEffect(() => {
    let raf = 0;
    let overlapTimer: ReturnType<typeof setTimeout> | null = null;

    const update = () => {
      const y = window.scrollY;
      setVisible(y > 80);
      setActiveId(resolveActiveId(y, window.innerHeight));

      const nav = navRef.current;
      if (!nav || window.innerWidth < 1100) {
        setLabelsSafe(false);
        return;
      }

      const overlaps = contentOverlapsLabels(nav);
      // Hystérésis anti-clignotement
      if (overlaps === overlapStableRef.current) return;
      if (overlapTimer) clearTimeout(overlapTimer);
      overlapTimer = setTimeout(() => {
        overlapStableRef.current = overlaps;
        setLabelsSafe(!overlaps);
      }, overlaps ? 40 : 120);
    };

    const onScrollOrResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (raf) cancelAnimationFrame(raf);
      if (overlapTimer) clearTimeout(overlapTimer);
    };
  }, []);

  const jumpTo = (id: string) => {
    const el = sectionElement(id);
    if (!(el instanceof HTMLElement)) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      ref={navRef}
      className={cn(
        "lp-side-progress",
        visible && "is-visible",
        labelsSafe ? "is-labels-on" : "is-labels-off",
      )}
      aria-label="Progression dans la page"
    >
      <ol className="lp-side-progress__list">
        {items.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id}>
              <button
                type="button"
                className={cn(
                  "lp-side-progress__item",
                  active && "is-active",
                )}
                aria-current={active ? "true" : undefined}
                title={section.label}
                onClick={() => jumpTo(section.id)}
              >
                <span className="lp-side-progress__dot" aria-hidden="true" />
                <span className="lp-side-progress__label">{section.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
