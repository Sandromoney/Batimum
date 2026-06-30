import { getLigneDesignation, isSectionLigne } from "@/lib/devis-lignes";
import { getActiveBibliothequeEntries, normalizeBibliothequeEntreprise } from "@/lib/bibliotheque-entreprise";
import type { AppData, BibliothequeEntrepriseEntry } from "@/lib/types";

export type DevisLigneSuggestion = {
  id: string;
  designation: string;
  unite: string;
  prixUnitaireHT: number;
  tauxTVA?: number;
  categorie?: string;
  source: "bibliotheque" | "historique";
};

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(suggestion: DevisLigneSuggestion, query: string): boolean {
  if (!query) return true;
  const haystack = [
    suggestion.designation,
    suggestion.categorie ?? "",
    suggestion.unite,
  ]
    .join(" ")
    .toLowerCase();
  return query.split(/\s+/).every((token) => haystack.includes(token));
}

export function buildDevisLigneSuggestions(
  data: AppData,
  query: string,
  limit = 8,
): DevisLigneSuggestion[] {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];

  const bibliotheque = normalizeBibliothequeEntreprise(data.bibliothequeEntreprise);
  const fromBibliotheque: DevisLigneSuggestion[] = getActiveBibliothequeEntries(
    bibliotheque,
  ).map((entry: BibliothequeEntrepriseEntry) => ({
    id: `bib-${entry.id}`,
    designation: entry.designation,
    unite: entry.unite,
    prixUnitaireHT: entry.prixMoyenHT,
    tauxTVA: entry.tauxTVA,
    categorie: entry.categorie,
    source: "bibliotheque" as const,
  }));

  const historiqueMap = new Map<string, DevisLigneSuggestion>();
  for (const devis of data.devis) {
    for (const ligne of devis.lignes) {
      if (isSectionLigne(ligne)) continue;
      const designation = getLigneDesignation(ligne).trim();
      if (!designation) continue;
      const key = designation.toLowerCase();
      if (!historiqueMap.has(key)) {
        historiqueMap.set(key, {
          id: `hist-${key}`,
          designation,
          unite: ligne.unite || "u",
          prixUnitaireHT: Number(ligne.prixUnitaire) || 0,
          tauxTVA: ligne.tauxTVA,
          source: "historique",
        });
      }
    }
  }

  const merged = [...fromBibliotheque, ...historiqueMap.values()].filter((item) =>
    matchesQuery(item, q),
  );

  const seen = new Set<string>();
  const unique: DevisLigneSuggestion[] = [];
  for (const item of merged) {
    const key = item.designation.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= limit) break;
  }

  return unique;
}
