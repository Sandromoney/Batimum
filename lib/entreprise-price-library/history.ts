import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import { upsertPriceEntry } from "@/lib/entreprise-price-library/crud";
import { computeMarginRate } from "@/lib/entreprise-price-library/margin";
import {
  inferPriceTypeFromCategory,
  normalizeEntreprisePriceLibrary,
} from "@/lib/entreprise-price-library/normalize";
import type {
  AchatChantier,
  Chantier,
  Devis,
  EntreprisePriceLibrary,
  LigneDevis,
} from "@/lib/types";

function isMaterialAchat(achat: AchatChantier): boolean {
  return achat.categorie === "materiaux" || achat.categorie === "autre";
}

export function learnPriceLibraryFromChantier(input: {
  library: EntreprisePriceLibrary;
  chantier: Chantier;
  devis?: Devis;
  companyId: string;
}): EntreprisePriceLibrary {
  if (input.chantier.statut !== "termine") {
    return input.library;
  }

  let next = normalizeEntreprisePriceLibrary(input.library, input.companyId);

  for (const achat of input.chantier.achats ?? []) {
    if (!isMaterialAchat(achat) || achat.montantHT <= 0) continue;

    next = upsertPriceEntry(next, {
      companyId: input.companyId,
      name: achat.libelle,
      category: achat.categorie,
      type: inferPriceTypeFromCategory(achat.categorie, achat.libelle),
      unit: "u",
      supplierName: achat.fournisseur,
      purchasePriceHT: achat.montantHT,
      source: "history",
      confidence: 72,
      isVerified: false,
      notes: `Appris depuis chantier ${input.chantier.nom}`,
    });
  }

  if (input.devis) {
    for (const ligne of input.devis.lignes) {
      if ((ligne.typeLigne ?? "ligne") === "section") continue;
      const designation = ligne.designation || ligne.description;
      if (!designation || typeof ligne.prixUnitaire !== "number") continue;

      const purchase =
        typeof ligne.prixAchatHT === "number" ? ligne.prixAchatHT : undefined;
      const sale = ligne.prixUnitaire;
      const margin =
        purchase && sale > 0 ? computeMarginRate(purchase, sale) : undefined;

      const key = normalizeBibliothequeKey(designation);
      const existing = next.entries.find(
        (entry) => !entry.desactive && entry.normaliseKey === key && entry.isVerified,
      );
      if (existing) continue;

      next = upsertPriceEntry(next, {
        companyId: input.companyId,
        name: designation,
        unit: ligne.unite ?? "u",
        purchasePriceHT: purchase,
        salePriceHT: sale,
        marginRate: margin,
        vatRate: ligne.tauxTVA,
        source: "history",
        confidence: 70,
        isVerified: false,
        notes: `Appris depuis chantier terminé ${input.chantier.nom}`,
        salePriceMode: "manual",
      });
    }
  }

  return next;
}

export function learnPriceLibraryFromDevisLigne(
  library: EntreprisePriceLibrary,
  ligne: LigneDevis,
  companyId: string,
): EntreprisePriceLibrary {
  const designation = ligne.designation || ligne.description;
  if (!designation || typeof ligne.prixUnitaire !== "number") return library;

  return upsertPriceEntry(library, {
    companyId,
    name: designation,
    unit: ligne.unite ?? "u",
    purchasePriceHT: ligne.prixAchatHT,
    salePriceHT: ligne.prixUnitaire,
    marginRate:
      typeof ligne.prixAchatHT === "number" && ligne.prixUnitaire > 0
        ? computeMarginRate(ligne.prixAchatHT, ligne.prixUnitaire)
        : undefined,
    vatRate: ligne.tauxTVA,
    source: "appris",
    confidence: 82,
    isVerified: false,
    salePriceMode: "manual",
  });
}
