export const UNITES_DEVIS = ["m²", "ml", "u", "forfait", "h", "jour"] as const;

/** Valeur select pour saisie libre d'unité. */
export const UNITE_DEVIS_AUTRE = "__autre__";

export const UNITE_DEVIS_TEXTE_PERSONNALISE_LABEL = "Texte personnalisé…";

export function isUniteDevisPreset(unite?: string): boolean {
  if (!unite) return false;
  return UNITES_DEVIS.includes(unite as (typeof UNITES_DEVIS)[number]);
}

export function getUniteDevisSelectValue(unite?: string): string {
  if (unite && isUniteDevisPreset(unite)) return unite;
  if (!unite) return UNITE_DEVIS_AUTRE;
  return UNITE_DEVIS_AUTRE;
}

export function formatPrixUnitaireInputValue(prixUnitaire: number): string | number {
  return prixUnitaire === 0 ? "" : prixUnitaire;
}

export function parsePrixUnitaireInput(value: string): number {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
