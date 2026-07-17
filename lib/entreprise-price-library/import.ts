import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import type {
  EntreprisePriceLibrary,
  EntreprisePriceLibraryEntry,
  EntreprisePriceSource,
  FournisseurTarifLigne,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

export type ImportPreviewAction = "create" | "update" | "ignore" | "verify";

export type ImportPreviewRow = {
  id: string;
  selected: boolean;
  reference?: string;
  detectedName: string;
  category?: string;
  unit?: string;
  conditionnement?: string;
  purchasePriceHT?: number;
  purchasePriceTTC?: number;
  publicPriceHT?: number;
  tva?: number;
  supplierId?: string;
  supplierName?: string;
  confidence: number;
  action: ImportPreviewAction;
  existingEntryId?: string;
  existingPurchasePriceHT?: number;
  source: EntreprisePriceSource;
  aVerifier: boolean;
  fichierImport?: string;
};

function refsMatch(a?: string, b?: string): boolean {
  const left = (a ?? "").trim().toLowerCase();
  const right = (b ?? "").trim().toLowerCase();
  return Boolean(left && right && left === right);
}

export function buildImportPreviewRows(input: {
  library: EntreprisePriceLibrary;
  companyId: string;
  supplierId?: string;
  supplierName?: string;
  source: EntreprisePriceSource;
  fichierImport?: string;
  existingTarifs?: FournisseurTarifLigne[];
  rows: Array<{
    nomProduit: string;
    reference?: string;
    categorie?: string;
    unite?: string;
    conditionnement?: string;
    prixPublic?: number;
    prixRemise?: number;
    tauxTVA?: number;
    aVerifier?: boolean;
  }>;
}): ImportPreviewRow[] {
  return input.rows.map((row) => {
    const key = normalizeBibliothequeKey(row.nomProduit);
    const existingLibrary = input.library.entries.find(
      (entry) =>
        !entry.desactive &&
        entry.supplierId === input.supplierId &&
        (refsMatch(entry.reference, row.reference) ||
          entry.normaliseKey === key),
    );

    const existingTarif = (input.existingTarifs ?? []).find(
      (line) =>
        line.fournisseurId === input.supplierId &&
        (refsMatch(line.reference, row.reference) ||
          normalizeBibliothequeKey(line.nomProduit) === key),
    );

    const purchasePriceHT = row.prixRemise ?? undefined;
    const publicPriceHT = row.prixPublic;
    const effectivePurchase = purchasePriceHT ?? publicPriceHT;
    const tva = row.tauxTVA ?? 20;
    const confidence = row.aVerifier ? 58 : 84;
    const existingPurchase =
      existingLibrary?.purchasePriceHT ??
      existingTarif?.prixEntrepriseSaisi ??
      existingTarif?.prixRemise;

    let action: ImportPreviewAction = "create";
    if (existingLibrary || existingTarif) {
      action = existingLibrary?.isVerified ? "ignore" : "update";
    }

    return {
      id: generateId(),
      selected: action !== "ignore",
      reference: row.reference,
      detectedName: row.nomProduit,
      category: row.categorie,
      unit: row.unite,
      conditionnement: row.conditionnement,
      purchasePriceHT: effectivePurchase,
      purchasePriceTTC:
        effectivePurchase != null
          ? Number((effectivePurchase * (1 + tva / 100)).toFixed(2))
          : undefined,
      publicPriceHT,
      tva,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      confidence,
      action,
      existingEntryId: existingLibrary?.id,
      existingPurchasePriceHT: existingPurchase,
      source: input.source,
      aVerifier: row.aVerifier ?? !effectivePurchase,
      fichierImport: input.fichierImport,
    };
  });
}

export function previewRowsToTarifLignes(
  rows: ImportPreviewRow[],
  fournisseurId: string,
  sourceImport: FournisseurTarifLigne["sourceImport"],
): FournisseurTarifLigne[] {
  return rows
    .filter((row) => row.selected && row.action !== "ignore")
    .map((row) => ({
      id: generateId(),
      fournisseurId,
      reference: row.reference,
      nomProduit: row.detectedName,
      categorie: row.category,
      unite: row.unit ?? "u",
      conditionnement: row.conditionnement,
      prixPublic: row.publicPriceHT,
      prixRemise: row.purchasePriceHT,
      prixEntrepriseSaisi: row.purchasePriceHT,
      tauxTVA: row.tva ?? 20,
      prixAchatTTC: row.purchasePriceTTC,
      dateImport: new Date().toISOString(),
      sourceImport,
      fichierImport: row.fichierImport,
      aVerifier: row.action === "verify" || row.aVerifier,
    }));
}

export function previewRowsToPriceEntries(
  rows: ImportPreviewRow[],
  companyId: string,
): EntreprisePriceLibraryEntry[] {
  return rows
    .filter((row) => row.selected && row.action !== "ignore")
    .map((row) => ({
      id: row.existingEntryId ?? generateId(),
      companyId,
      type: "material" as const,
      name: row.detectedName,
      reference: row.reference,
      category: row.category,
      unit: row.unit ?? "u",
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      purchasePriceHT: row.purchasePriceHT,
      vatRate: row.tva,
      source: row.source,
      confidence: row.confidence,
      lastUpdatedAt: new Date().toISOString(),
      isVerified: false,
      isFavorite: false,
      notes: row.fichierImport
        ? `Import fichier ${row.fichierImport}`
        : undefined,
      normaliseKey: normalizeBibliothequeKey(row.detectedName),
      desactive: false,
      salePriceMode: "coefficient" as const,
    }));
}
