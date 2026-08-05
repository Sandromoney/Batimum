/**
 * Libellés officiels INSEE des formes juridiques (codes nature_juridique).
 * Source : nomenclature INSEE — uniquement pour affichage humain.
 * Si le code est inconnu, on renvoie null (jamais inventé).
 */
const NATURE_JURIDIQUE_LABELS: Record<string, string> = {
  "1000": "Entrepreneur individuel",
  "5499": "SARL",
  "5410": "SARL à associé unique (EURL)",
  "5710": "SAS",
  "5720": "SASU",
  "5599": "SA à conseil d'administration",
  "5510": "SA à directoire",
  "5202": "Société en nom collectif",
  "5308": "Société en commandite simple",
  "5800": "Société civile",
  "6540": "SCI",
  "9220": "Association déclarée",
  "9210": "Association non déclarée",
  "7210": "Commune",
  "7229": "Autre collectivité territoriale",
  "7340": "Établissement public",
  "7389": "Autre personne morale de droit public",
};

export function labelNatureJuridique(code?: string | null): string | null {
  if (!code) return null;
  const trimmed = String(code).trim();
  return NATURE_JURIDIQUE_LABELS[trimmed] ?? null;
}

/** Affiche le libellé connu, sinon le code brut (donnée API), sinon null. */
export function formatNatureJuridique(code?: string | null): string | null {
  if (!code) return null;
  const label = labelNatureJuridique(code);
  if (label) return label;
  const trimmed = String(code).trim();
  return trimmed || null;
}
