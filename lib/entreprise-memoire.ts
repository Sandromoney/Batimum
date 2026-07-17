import {
  getActiveBibliothequeEntries,
  normalizeBibliothequeEntreprise,
} from "@/lib/bibliotheque-entreprise";
import { getLigneDesignation, isSectionLigne } from "@/lib/devis-lignes";
import { buildDataFingerprint, getCachedValue } from "@/lib/insights-cache";
import type { AppData, BibliothequeEntrepriseEntry, TypeChantier } from "@/lib/types";

export type EntrepriseMemoireItem = {
  id: string;
  designation: string;
  unite: string;
  prixMoyenHT: number;
  categorie: string;
  nombreUtilisations: number;
  source: "bibliotheque" | "historique";
};

export type EntrepriseMemoireResume = {
  topMateriaux: EntrepriseMemoireItem[];
  topPrestations: EntrepriseMemoireItem[];
  fournisseursFavoris: { nom: string; count: number }[];
  coefficientMargeMoyen: number | null;
};

function collectHistoriqueUsage(data: AppData): Map<string, EntrepriseMemoireItem> {
  const map = new Map<string, EntrepriseMemoireItem>();

  for (const devis of data.devis) {
    for (const ligne of devis.lignes) {
      if (isSectionLigne(ligne)) continue;
      const designation = getLigneDesignation(ligne).trim();
      if (!designation) continue;
      const key = designation.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.nombreUtilisations += 1;
        continue;
      }
      map.set(key, {
        id: `hist-${key}`,
        designation,
        unite: ligne.unite || "u",
        prixMoyenHT: Number(ligne.prixUnitaire) || 0,
        categorie: "Historique",
        nombreUtilisations: 1,
        source: "historique",
      });
    }
  }

  return map;
}

export function buildEntrepriseMemoireResume(data: AppData): EntrepriseMemoireResume {
  const fingerprint = buildDataFingerprint([
    data.devis.length,
    data.bibliothequeEntreprise?.entries?.length ?? 0,
  ]);

  return getCachedValue("entreprise-memoire", fingerprint, () => {
    const bibliotheque = normalizeBibliothequeEntreprise(data.bibliothequeEntreprise);
    const historique = collectHistoriqueUsage(data);

    const fromBibliotheque: EntrepriseMemoireItem[] = getActiveBibliothequeEntries(
      bibliotheque,
    ).map((entry: BibliothequeEntrepriseEntry) => ({
      id: entry.id,
      designation: entry.designation,
      unite: entry.unite,
      prixMoyenHT: entry.prixMoyenHT,
      categorie: entry.categorie,
      nombreUtilisations: entry.nombreUtilisations ?? 1,
      source: "bibliotheque" as const,
    }));

    const merged = new Map<string, EntrepriseMemoireItem>();
    for (const item of fromBibliotheque) {
      const key = item.designation.toLowerCase();
      const hist = historique.get(key);
      merged.set(key, {
        ...item,
        nombreUtilisations: Math.max(
          item.nombreUtilisations,
          hist?.nombreUtilisations ?? 0,
        ),
      });
      historique.delete(key);
    }
    for (const item of historique.values()) {
      merged.set(item.designation.toLowerCase(), item);
    }

    const all = [...merged.values()].sort(
      (a, b) => b.nombreUtilisations - a.nombreUtilisations,
    );

    const materiauxKeywords =
      /ba13|placo|geberit|wc|carrelage|rail|isolant|colle|peinture|robinet|sanitaire|placostil|douche|ba15|montant|vis|cheville/i;
    const topMateriaux = all
      .filter((item) => materiauxKeywords.test(item.designation))
      .slice(0, 8);
    const topPrestations = all
      .filter((item) => !materiauxKeywords.test(item.designation))
      .slice(0, 8);

    const fournisseurCounts = new Map<string, number>();
    for (const entry of fromBibliotheque) {
      const categorie = entry.categorie?.trim();
      if (!categorie) continue;
      fournisseurCounts.set(
        categorie,
        (fournisseurCounts.get(categorie) ?? 0) + entry.nombreUtilisations,
      );
    }

    const fournisseursFavoris = [...fournisseurCounts.entries()]
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    let margeSum = 0;
    let margeCount = 0;
    for (const devis of data.devis) {
      for (const ligne of devis.lignes) {
        if (isSectionLigne(ligne)) continue;
        const achat = ligne.prixAchatHT ?? 0;
        if (achat <= 0 || ligne.prixUnitaire <= 0) continue;
        margeSum += ((ligne.prixUnitaire - achat) / ligne.prixUnitaire) * 100;
        margeCount += 1;
      }
    }

    return {
      topMateriaux,
      topPrestations,
      fournisseursFavoris,
      coefficientMargeMoyen:
        margeCount > 0 ? Math.round((margeSum / margeCount) * 10) / 10 : null,
    };
  });
}

export function getProactiveDevisSuggestions(
  data: AppData,
  options: { typeChantier?: TypeChantier; limit?: number } = {},
): EntrepriseMemoireItem[] {
  const limit = options.limit ?? 6;
  const resume = buildEntrepriseMemoireResume(data);
  const pool = [...resume.topMateriaux, ...resume.topPrestations];

  if (options.typeChantier) {
    const typeHints: Partial<Record<TypeChantier, RegExp>> = {
      salle_de_bain: /sdb|salle de bain|douche|wc|carrel/i,
      cuisine: /cuisine|évier|evier|plan de travail/i,
      renovation: /dépose|depose|protection|plomb|placo|ba13|peinture|carrel/i,
      maison_neuve: /maison neuve|construction/i,
      extension: /extension|agrandissement/i,
    };
    const hint = typeHints[options.typeChantier];
    if (hint) {
      const filtered = pool.filter((item) => hint.test(item.designation));
      if (filtered.length > 0) {
        return filtered.slice(0, limit);
      }
    }
  }

  return pool.slice(0, limit);
}
