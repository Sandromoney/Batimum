"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ProgressSection = {
  id: string;
  label: string;
};

const SECTIONS: ProgressSection[] = [
  { id: "hero", label: "Hero" },
  { id: "ecosysteme", label: "Présentation" },
  { id: "diagnostic", label: "Diagnostic" },
  { id: "avant-apres", label: "Comparaison" },
  { id: "temoignages", label: "Avis" },
  { id: "plans", label: "Tarifs" },
  { id: "faq", label: "FAQ" },
  { id: "commencer", label: "Commencer" },
];

function resolveActiveId(scrollY: number, viewportH: number): string {
  const marker = scrollY + viewportH * 0.32;
  let active = SECTIONS[0]?.id ?? "hero";

  for (const section of SECTIONS) {
    const el =
      section.id === "hero"
        ? document.getElementById("batimum-hero") ||
          document.querySelector(".batimumHero") ||
          document.querySelector(".landing-top")
        : section.id === "commencer"
          ? document.querySelector(".lp-final")
          : document.getElementById(section.id);

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
    const el =
      id === "hero"
        ? document.getElementById("batimum-hero") ||
          document.querySelector(".batimumHero") ||
          document.querySelector(".landing-top")
        : id === "commencer"
          ? document.querySelector(".lp-final")
          : document.getElementById(id);
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
