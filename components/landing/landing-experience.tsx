"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "batimum-landing-restore-v1";

export type LandingRestoreSnapshot = {
  scrollY: number;
  pastIntro: boolean;
  savedAt: number;
};

type LandingExperienceValue = {
  /** Retour navigateur : restaurer scroll + sauter les entrées animées. */
  restore: boolean;
  /** L’utilisateur était déjà passé l’intro (pain + hub). */
  pastIntro: boolean;
  ready: boolean;
};

const LandingExperienceContext = createContext<LandingExperienceValue>({
  restore: false,
  pastIntro: false,
  ready: false,
});

export function useLandingExperience() {
  return useContext(LandingExperienceContext);
}

function readNavType(): string {
  const entry = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined;
  return entry?.type ?? "navigate";
}

function readSnapshot(): LandingRestoreSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LandingRestoreSnapshot;
  } catch {
    return null;
  }
}

export function writeLandingSnapshot(partial?: {
  pastIntro?: boolean;
}) {
  if (typeof window === "undefined") return;
  try {
    const prev = readSnapshot();
    const pastIntro =
      partial?.pastIntro ??
      prev?.pastIntro ??
      Boolean(document.getElementById("diagnostic") &&
        window.scrollY >=
          (document.getElementById("diagnostic")?.offsetTop ?? Number.MAX_SAFE_INTEGER) -
            window.innerHeight * 0.35);

    const snapshot: LandingRestoreSnapshot = {
      scrollY: Math.max(0, window.scrollY),
      pastIntro,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota */
  }
}

export function clearLandingSnapshot() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Marque l’intro (pain + hub) comme déjà vue pour cette session de visite. */
export function markLandingPastIntro() {
  if (typeof window === "undefined") return;
  writeLandingSnapshot({ pastIntro: true });
  window.dispatchEvent(new Event("batimum:landing-past-intro"));
}

function clearHubSkipOnReload() {
  try {
    sessionStorage.removeItem("batimum-hub-presentation-skipped");
  } catch {
    /* ignore */
  }
}

export function LandingExperienceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [value, setValue] = useState<LandingExperienceValue>({
    restore: false,
    pastIntro: false,
    ready: false,
  });

  useEffect(() => {
    const navType = readNavType();
    const isBackForward = navType === "back_forward";
    const isReload = navType === "reload";

    if (isReload) {
      clearLandingSnapshot();
      clearHubSkipOnReload();
      setValue({ restore: false, pastIntro: false, ready: true });
      return;
    }

    const snapshot = readSnapshot();
    const shouldRestore =
      isBackForward && snapshot != null && Date.now() - snapshot.savedAt < 1000 * 60 * 60;

    if (shouldRestore && snapshot) {
      document.documentElement.classList.add("lp-restore");
      if (snapshot.pastIntro) {
        document.documentElement.classList.add("lp-restore-past-intro");
      }
      setValue({
        restore: true,
        pastIntro: snapshot.pastIntro,
        ready: true,
      });

      const applyScroll = () => {
        window.scrollTo(0, snapshot.scrollY);
      };
      applyScroll();
      requestAnimationFrame(applyScroll);
      const t = window.setTimeout(applyScroll, 40);
      return () => {
        window.clearTimeout(t);
        document.documentElement.classList.remove(
          "lp-restore",
          "lp-restore-past-intro",
        );
      };
    }

    setValue({ restore: false, pastIntro: false, ready: true });
  }, []);

  useEffect(() => {
    if (!value.ready) return;

    const persist = () => writeLandingSnapshot();
    const onPastIntro = () => {
      writeLandingSnapshot({ pastIntro: true });
      setValue((prev) =>
        prev.pastIntro ? prev : { ...prev, pastIntro: true },
      );
    };

    let scrollT: number | null = null;
    const onScroll = () => {
      if (scrollT != null) return;
      scrollT = window.setTimeout(() => {
        scrollT = null;
        const diagnostic = document.getElementById("diagnostic");
        if (diagnostic) {
          const top =
            diagnostic.getBoundingClientRect().top + window.scrollY;
          if (window.scrollY + window.innerHeight * 0.4 >= top) {
            onPastIntro();
          }
        }
        writeLandingSnapshot();
      }, 250);
    };

    window.addEventListener("pagehide", persist);
    window.addEventListener("batimum:landing-past-intro", onPastIntro);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("batimum:landing-past-intro", onPastIntro);
      window.removeEventListener("scroll", onScroll);
      if (scrollT != null) window.clearTimeout(scrollT);
    };
  }, [value.ready]);

  const memo = useMemo(() => value, [value]);

  return (
    <LandingExperienceContext.Provider value={memo}>
      {children}
    </LandingExperienceContext.Provider>
  );
}
