import { getLigneDesignation, isSectionLigne } from "@/lib/devis-lignes";
import { getActiveBibliothequeEntries, normalizeBibliothequeEntreprise } from "@/lib/bibliotheque-entreprise";
import { matchesSearchQuery } from "@/lib/search-text-match";
import type { AppData, BibliothequeEntrepriseEntry } from "@/lib/types";

export type DevisLigneSuggestion = {
  id: string;
  designation: string;
  unite: string;
  prixUnitaireHT: number;
  tauxTVA?: number;
  categorie?: string;
  source: "bibliotheque" | "historique";
  nombreUtilisations?: number;
};

function matchesQuery(suggestion: DevisLigneSuggestion, query: string): boolean {
  const haystack = [
    suggestion.designation,
    suggestion.categorie ?? "",
    suggestion.unite,
  ].join(" ");
  return matchesSearchQuery(haystack, query);
}

export function buildDevisLigneSuggestions(
  data: AppData,
  query: string,
  limit = 8,
): DevisLigneSuggestion[] {
  const q = query.trim();
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
    nombreUtilisations: entry.nombreUtilisations ?? 1,
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
          nombreUtilisations: 1,
        });
      } else {
        const existing = historiqueMap.get(key)!;
        existing.nombreUtilisations = (existing.nombreUtilisations ?? 1) + 1;
      }
    }
  }

  const merged = [...fromBibliotheque, ...historiqueMap.values()]
    .filter((item) => matchesQuery(item, q))
    .sort(
      (a, b) =>
        (b.nombreUtilisations ?? 0) - (a.nombreUtilisations ?? 0) ||
        (a.source === "bibliotheque" ? -1 : 1),
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
