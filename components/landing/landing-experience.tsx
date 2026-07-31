"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Soft-return landing state.
 *
 * Cause du bug précédent : `pastIntro` / hub-skip en sessionStorage étaient
 * appliqués trop largement (scroll, back_forward), ce qui bloquait le film
 * même sur un vrai chargement.
 *
 * Règle :
 * - chargement / F5 → animation autorisée ;
 * - Fermer (auth) → flag soft-return → restore sans rejouer ;
 * - « Revoir la présentation » → clear + relance (côté hub).
 */

const DEPARTURE_KEY = "batimum-landing-departure-v2";
const SOFT_RETURN_KEY = "batimum-landing-soft-return-v2";
const INTRO_DONE_KEY = "batimum-landing-intro-done-v2";
const LEGACY_KEYS = [
  "batimum-landing-restore-v1",
  "batimum-hub-presentation-skipped",
] as const;

export type LandingDepartureSnapshot = {
  scrollY: number;
  introDone: boolean;
  savedAt: number;
};

type LandingExperienceValue = {
  restore: boolean;
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

/** Survive React Strict Mode double-mount in the same document. */
let softReturnMemory: LandingDepartureSnapshot | null | undefined;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clearLegacyKeys() {
  for (const key of LEGACY_KEYS) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function isLandingIntroDone(): boolean {
  try {
    return sessionStorage.getItem(INTRO_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markLandingPastIntro() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INTRO_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("batimum:landing-past-intro"));
}

/** Snapshot avant départ vers Connexion / Inscription. */
export function writeLandingSnapshot(partial?: { pastIntro?: boolean }) {
  if (typeof window === "undefined") return;
  try {
    const introDone = partial?.pastIntro ?? isLandingIntroDone();
    const snapshot: LandingDepartureSnapshot = {
      scrollY: Math.max(0, window.scrollY),
      introDone,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(DEPARTURE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

/** Appelé par le bouton Fermer juste avant la navigation client. */
export function prepareSoftReturnToLanding(override?: {
  scrollY?: number;
  introDone?: boolean;
}) {
  if (typeof window === "undefined") return;
  try {
    const departure = safeParse<LandingDepartureSnapshot>(
      sessionStorage.getItem(DEPARTURE_KEY),
    );

    const snapshot: LandingDepartureSnapshot = {
      scrollY: Math.max(
        0,
        override?.scrollY ?? departure?.scrollY ?? 0,
      ),
      introDone:
        override?.introDone ??
        departure?.introDone ??
        isLandingIntroDone(),
      savedAt: Date.now(),
    };
    sessionStorage.setItem(SOFT_RETURN_KEY, JSON.stringify(snapshot));
    sessionStorage.setItem(DEPARTURE_KEY, JSON.stringify(snapshot));
    softReturnMemory = undefined;
  } catch {
    /* ignore */
  }
}

export function clearLandingSnapshot() {
  try {
    sessionStorage.removeItem(DEPARTURE_KEY);
    sessionStorage.removeItem(SOFT_RETURN_KEY);
    sessionStorage.removeItem(INTRO_DONE_KEY);
    softReturnMemory = undefined;
  } catch {
    /* ignore */
  }
}

export function clearLandingIntroFlags() {
  try {
    sessionStorage.removeItem(INTRO_DONE_KEY);
    sessionStorage.removeItem("batimum-hub-presentation-skipped");
  } catch {
    /* ignore */
  }
}

function consumeSoftReturn(): LandingDepartureSnapshot | null {
  if (softReturnMemory !== undefined) return softReturnMemory;

  try {
    const raw = sessionStorage.getItem(SOFT_RETURN_KEY);
    if (!raw) {
      softReturnMemory = null;
      return null;
    }
    sessionStorage.removeItem(SOFT_RETURN_KEY);
    const parsed = safeParse<LandingDepartureSnapshot>(raw);
    softReturnMemory = parsed;
    return parsed;
  } catch {
    softReturnMemory = null;
    return null;
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
    clearLegacyKeys();

    const soft = consumeSoftReturn();
    const validSoft =
      soft != null && Date.now() - soft.savedAt < 1000 * 60 * 60;

    if (validSoft && soft) {
      if (soft.introDone) {
        try {
          sessionStorage.setItem(INTRO_DONE_KEY, "1");
        } catch {
          /* ignore */
        }
      }

      document.documentElement.classList.add("lp-restore");
      if (soft.introDone) {
        document.documentElement.classList.add("lp-restore-past-intro");
      }

      setValue({
        restore: true,
        pastIntro: soft.introDone,
        ready: true,
      });

      const applyScroll = () => {
        window.scrollTo(0, soft.scrollY);
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

    try {
      sessionStorage.removeItem(INTRO_DONE_KEY);
      sessionStorage.removeItem("batimum-hub-presentation-skipped");
    } catch {
      /* ignore */
    }

    setValue({ restore: false, pastIntro: false, ready: true });
  }, []);

  useEffect(() => {
    if (!value.ready) return;

    const onPastIntro = () => {
      try {
        sessionStorage.setItem(INTRO_DONE_KEY, "1");
      } catch {
        /* ignore */
      }
      setValue((prev) =>
        prev.pastIntro ? prev : { ...prev, pastIntro: true },
      );
    };

    const persistDeparture = () => writeLandingSnapshot();

    window.addEventListener("pagehide", persistDeparture);
    window.addEventListener("batimum:landing-past-intro", onPastIntro);
    return () => {
      window.removeEventListener("pagehide", persistDeparture);
      window.removeEventListener("batimum:landing-past-intro", onPastIntro);
    };
  }, [value.ready]);

  const memo = useMemo(() => value, [value]);

  return (
    <LandingExperienceContext.Provider value={memo}>
      {children}
    </LandingExperienceContext.Provider>
  );
}
