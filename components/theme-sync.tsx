"use client";

import { useEffect, useLayoutEffect } from "react";
import { useStore } from "@/lib/store";
import {
  applyTheme,
  normalizeThemePreference,
} from "@/lib/theme";

/** Synchronise le thème avec les paramètres et le mode système. */
export function ThemeSync() {
  const { data, hydrated } = useStore();
  const preference = normalizeThemePreference(data.parametres.theme);

  useLayoutEffect(() => {
    if (!hydrated) return;
    applyTheme(preference);
  }, [hydrated, preference]);

  useEffect(() => {
    if (!hydrated || preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [hydrated, preference]);

  return null;
}
