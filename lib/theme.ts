/** Batimum — thème unique clair (aligné landing). */
export const APP_THEME = "light" as const;
export type ThemePreference = typeof APP_THEME;

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: "Mode clair",
};

/** Toujours clair — compatibilité données historiques dark/system. */
export function normalizeThemePreference(
  _theme?: string | null,
): ThemePreference {
  return APP_THEME;
}

export function resolveTheme(): ThemePreference {
  return APP_THEME;
}

export function readThemePreferenceFromStorage(): ThemePreference {
  return APP_THEME;
}

/** Applique le thème clair unique sur <html>. */
export function applyTheme(_preference?: string | null) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = APP_THEME;
  document.documentElement.dataset.themeEffective = APP_THEME;
  document.documentElement.style.colorScheme = "light";
}

/** Script inline anti-flash (layout.tsx). */
export const THEME_INIT_SCRIPT = `(function(){try{document.documentElement.dataset.theme="light";document.documentElement.dataset.themeEffective="light";document.documentElement.style.colorScheme="light";}catch(e){}})();`;

/** @deprecated Utiliser normalizeThemePreference */
export function normalizeTheme(theme?: string): ThemePreference {
  return normalizeThemePreference(theme);
}
