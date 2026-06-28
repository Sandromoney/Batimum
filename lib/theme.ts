export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  dark: "Mode sombre",
  light: "Mode clair",
  system: "Automatique (suivre le système)",
};

/** Préférence utilisateur normalisée — sombre par défaut. */
export function normalizeThemePreference(theme?: string | null): ThemePreference {
  if (theme === "light" || theme === "system") return theme;
  return "dark";
}

/** Résout la préférence en thème effectif affiché. */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return "dark";
}

export function readThemePreferenceFromStorage(): ThemePreference {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = localStorage.getItem("btp-gestion-data");
    if (!raw) return "dark";
    const parsed = JSON.parse(raw) as { parametres?: { theme?: string } };
    return normalizeThemePreference(parsed.parametres?.theme);
  } catch {
    return "dark";
  }
}

/** Applique la préférence sur <html> (data-theme + data-theme-effective). */
export function applyTheme(preference?: string | null) {
  if (typeof document === "undefined") return;
  const pref = normalizeThemePreference(preference);
  const effective = resolveTheme(pref);
  document.documentElement.dataset.theme = pref;
  document.documentElement.dataset.themeEffective = effective;
  document.documentElement.style.colorScheme = effective;
}

/** Script inline anti-flash (layout.tsx). */
export const THEME_INIT_SCRIPT = `(function(){try{var pref="dark";var raw=localStorage.getItem("btp-gestion-data");if(raw){var data=JSON.parse(raw);if(data.parametres&&data.parametres.theme)pref=data.parametres.theme;}if(pref!=="light"&&pref!=="system")pref="dark";var eff=pref;if(pref==="system"){eff=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.dataset.theme=pref;document.documentElement.dataset.themeEffective=eff;document.documentElement.style.colorScheme=eff;}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.dataset.themeEffective="dark";document.documentElement.style.colorScheme="dark";}})();`;

/** @deprecated Utiliser normalizeThemePreference */
export function normalizeTheme(theme?: string): ThemePreference {
  return normalizeThemePreference(theme);
}
