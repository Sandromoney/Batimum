"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ProgressSection = {
  id: string;
  label: string;
};

/** Libellés commerciaux — Hero + post-hero regroupés sous Présentation. */
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
      (document.querySelector(".landing-top") as HTMLElement | null) ||
      (document.getElementById("ecosysteme") as HTMLElement | null)
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

  for (const section of SECTIONS) {
    const el = sectionElement(section.id);
    if (!(el instanceof HTMLElement)) continue;
    const top = el.getBoundingClientRect().top + window.scrollY;
    if (marker >= top - 8) active = section.id;
  }

  return active;
}

export function LandingSideProgress() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [visible, setVisible] = useState(false);

  const items = useMemo(() => SECTIONS, []);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      setVisible(y > 120);
      setActiveId(resolveActiveId(y, window.innerHeight));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const jumpTo = (id: string) => {
    const el = sectionElement(id);
    if (!(el instanceof HTMLElement)) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      className={cn("lp-side-progress", visible && "is-visible")}
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
