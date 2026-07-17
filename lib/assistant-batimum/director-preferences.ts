/**
 * Préférences dirigeant mémorisées par l'Assistant Batimum.
 * Persistées dans AssistantMemory.habits + localStorage dédié.
 */

export const DIRECTOR_PREFS_STORAGE_KEY = "batimum-assistant-director-prefs-v1";

export type DirectorPreferences = {
  /** Afficher les prix en HT (défaut true). */
  pricesHt: boolean;
  /** Afficher les marges en euros plutôt qu'en %. */
  marginsInEuros: boolean;
  /** Fournisseur à comparer en priorité. */
  preferredCompareSupplier?: string;
  /** Fournisseur privilégié pour les achats. */
  preferredSupplier?: string;
  /** Notes libres du dirigeant. */
  notes?: string[];
};

export const DEFAULT_DIRECTOR_PREFERENCES: DirectorPreferences = {
  pricesHt: true,
  marginsInEuros: true,
};

export function loadDirectorPreferences(): DirectorPreferences {
  if (typeof localStorage === "undefined") return { ...DEFAULT_DIRECTOR_PREFERENCES };
  try {
    const raw = localStorage.getItem(DIRECTOR_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DIRECTOR_PREFERENCES };
    return {
      ...DEFAULT_DIRECTOR_PREFERENCES,
      ...(JSON.parse(raw) as Partial<DirectorPreferences>),
    };
  } catch {
    return { ...DEFAULT_DIRECTOR_PREFERENCES };
  }
}

export function saveDirectorPreferences(prefs: DirectorPreferences) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DIRECTOR_PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

export function patchDirectorPreferences(
  patch: Partial<DirectorPreferences>,
): DirectorPreferences {
  const next = { ...loadDirectorPreferences(), ...patch };
  saveDirectorPreferences(next);
  return next;
}

/** Extrait des préférences depuis une phrase naturelle (règles simples). */
export function inferPreferencesFromMessage(
  message: string,
  current: DirectorPreferences = loadDirectorPreferences(),
): DirectorPreferences | null {
  const text = message.toLowerCase();
  const patch: Partial<DirectorPreferences> = {};

  if (/toujours.*(prix|afficher).*ht|prix en ht|en ht/.test(text)) {
    patch.pricesHt = true;
  }
  if (/prix en ttc|afficher.*ttc/.test(text)) {
    patch.pricesHt = false;
  }
  if (/marge.*(en )?euro|marges? en €/.test(text)) {
    patch.marginsInEuros = true;
  }
  if (/marge.*(en )?%|marges? en pourcent/.test(text)) {
    patch.marginsInEuros = false;
  }

  const compareMatch = text.match(
    /(?:comparer?|compare).*?(gedimat|point\.?p|cedeo|t[eé]r[eé]va|bigmat|rexel|chausson)/i,
  );
  if (compareMatch?.[1]) {
    patch.preferredCompareSupplier = compareMatch[1];
  }

  const preferMatch = text.match(
    /(?:privil[eé]gie[rz]?|pr[eé]f[eè]re[rz]?).*?(gedimat|point\.?p|cedeo|t[eé]r[eé]va|bigmat|rexel|chausson)/i,
  );
  if (preferMatch?.[1]) {
    patch.preferredSupplier = preferMatch[1];
  }

  if (Object.keys(patch).length === 0) return null;
  return { ...current, ...patch };
}

export function formatPreferencesForPrompt(prefs: DirectorPreferences): string {
  const lines = [
    `Prix affichés : ${prefs.pricesHt ? "HT" : "TTC"}`,
    `Marges : ${prefs.marginsInEuros ? "en euros" : "en %"}`,
  ];
  if (prefs.preferredCompareSupplier) {
    lines.push(`Comparer en priorité : ${prefs.preferredCompareSupplier}`);
  }
  if (prefs.preferredSupplier) {
    lines.push(`Fournisseur privilégié : ${prefs.preferredSupplier}`);
  }
  return lines.join("\n");
}
