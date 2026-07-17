import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import type {
  BibliothequeEntreprise,
  BibliothequeEntrepriseEntry,
  EntreprisePriceLibrary,
  EntreprisePriceLibraryEntry,
  EntreprisePriceReliability,
  EntreprisePriceSource,
  EntreprisePriceType,
  Fournisseur,
  FournisseurTarifLigne,
  Parametres,
  SalePriceMode,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

export const DEFAULT_MARKUP_COEFFICIENT = 1.65;
export const DEFAULT_SALE_PRICE_MODE: SalePriceMode = "coefficient";

export const DEFAULT_ENTREPRISE_PRICE_LIBRARY: EntreprisePriceLibrary = {
  entries: [],
  defaultMarkupCoefficient: DEFAULT_MARKUP_COEFFICIENT,
  defaultSalePriceMode: DEFAULT_SALE_PRICE_MODE,
};

export function inferPriceTypeFromCategory(
  category?: string,
  name?: string,
): EntreprisePriceType {
  const text = `${category ?? ""} ${name ?? ""}`.toLowerCase();
  if (/main.?d.?oeuvre|mo\b|pose|installation|dépose|depose/.test(text)) {
    return "labor";
  }
  if (/location|engin|échafaudage|echafaudage/.test(text)) {
    return "equipment";
  }
  if (/prestation|forfait|honoraire/.test(text)) {
    return "service";
  }
  return "material";
}

export function mapReliabilityFromEntry(
  entry: EntreprisePriceLibraryEntry,
): EntreprisePriceReliability {
  if (entry.isVerified) return "verified";
  if (entry.source === "history") return "history";
  if (entry.source === "public_price") return "public";
  if (entry.source === "mum_ai") return "estimated";
  if (
    entry.source === "import_pdf" ||
    entry.source === "import_excel" ||
    entry.source === "import_csv"
  ) {
    return entry.confidence >= 80 ? "imported" : "to_verify";
  }
  if (entry.confidence < 70) return "to_verify";
  return "imported";
}

export function getReliabilityLabel(level: EntreprisePriceReliability): string {
  switch (level) {
    case "verified":
      return "Vérifié";
    case "imported":
      return "Importé";
    case "history":
      return "Historique";
    case "public":
      return "Public";
    case "estimated":
      return "Estimé";
    default:
      return "À vérifier";
  }
}

export function getSourceLabel(
  source: EntreprisePriceSource,
  supplierName?: string,
  date?: string,
): string {
  const dateLabel = date
    ? new Date(date).toLocaleDateString("fr-FR")
    : undefined;

  switch (source) {
    case "manual":
      return "Prix issu de votre bibliothèque entreprise";
    case "import_pdf":
    case "import_excel":
    case "import_csv":
      return supplierName
        ? `Prix issu du tarif ${supplierName}${dateLabel ? ` importé le ${dateLabel}` : ""}`
        : `Prix importé${dateLabel ? ` le ${dateLabel}` : ""}`;
    case "history":
      return "Prix issu de l'historique chantier — à vérifier";
    case "public_price":
      return "Prix public fournisseur";
    case "appris":
      return "Prix appris depuis vos devis";
    case "mum_ai":
    default:
      return "Prix estimé par MUM IA — à vérifier";
  }
}

export function normalizeEntreprisePriceLibrary(
  partial?: EntreprisePriceLibrary | null,
  companyId = "",
): EntreprisePriceLibrary {
  const library = partial ?? DEFAULT_ENTREPRISE_PRICE_LIBRARY;
  const entries = Array.isArray(library.entries) ? library.entries : [];

  return {
    defaultMarkupCoefficient:
      typeof library.defaultMarkupCoefficient === "number" &&
      library.defaultMarkupCoefficient > 0
        ? library.defaultMarkupCoefficient
        : DEFAULT_MARKUP_COEFFICIENT,
    defaultSalePriceMode:
      library.defaultSalePriceMode === "manual" ? "manual" : DEFAULT_SALE_PRICE_MODE,
    entries: entries
      .filter((entry) => entry && typeof entry.name === "string")
      .map((entry) => ({
        id: entry.id || generateId(),
        companyId: entry.companyId || companyId,
        type: entry.type ?? inferPriceTypeFromCategory(entry.category, entry.name),
        name: entry.name.trim(),
        reference: entry.reference?.trim() || undefined,
        description: entry.description?.trim() || undefined,
        category: entry.category?.trim() || undefined,
        trade: entry.trade?.trim() || undefined,
        unit: entry.unit?.trim() || "u",
        supplierId: entry.supplierId || undefined,
        supplierName: entry.supplierName?.trim() || undefined,
        purchasePriceHT:
          typeof entry.purchasePriceHT === "number" && entry.purchasePriceHT >= 0
            ? entry.purchasePriceHT
            : undefined,
        salePriceHT:
          typeof entry.salePriceHT === "number" && entry.salePriceHT >= 0
            ? entry.salePriceHT
            : undefined,
        marginRate:
          typeof entry.marginRate === "number" && Number.isFinite(entry.marginRate)
            ? entry.marginRate
            : undefined,
        markupCoefficient:
          typeof entry.markupCoefficient === "number" && entry.markupCoefficient > 0
            ? entry.markupCoefficient
            : undefined,
        vatRate:
          typeof entry.vatRate === "number" && entry.vatRate >= 0
            ? entry.vatRate
            : undefined,
        source: entry.source ?? "manual",
        confidence:
          typeof entry.confidence === "number"
            ? Math.max(0, Math.min(100, entry.confidence))
            : entry.isVerified
              ? 98
              : 75,
        lastUpdatedAt: entry.lastUpdatedAt || new Date().toISOString(),
        isVerified: Boolean(entry.isVerified),
        isFavorite: Boolean(entry.isFavorite),
        notes: entry.notes?.trim() || undefined,
        normaliseKey: entry.normaliseKey || normalizeBibliothequeKey(entry.name),
        desactive: Boolean(entry.desactive),
        salePriceMode:
          entry.salePriceMode === "manual" ? "manual" : DEFAULT_SALE_PRICE_MODE,
      })),
  };
}

export function filterLibraryByCompany(
  library: EntreprisePriceLibrary,
  companyId: string,
): EntreprisePriceLibrary {
  if (!companyId) return library;
  return {
    ...library,
    entries: library.entries.filter(
      (entry) => !entry.companyId || entry.companyId === companyId,
    ),
  };
}

export function bibliothequeEntryToPriceEntry(
  entry: BibliothequeEntrepriseEntry,
  companyId: string,
): EntreprisePriceLibraryEntry {
  return {
    id: entry.id,
    companyId,
    type: inferPriceTypeFromCategory(entry.categorie, entry.designation),
    name: entry.designation,
    category: entry.categorie,
    unit: entry.unite,
    salePriceHT: entry.prixMoyenHT,
    vatRate: entry.tauxTVA,
    source: entry.source === "manuel" ? "manual" : "appris",
    confidence:
      entry.fiabilite ??
      (entry.source === "manuel" && entry.verrouille ? 98 : 85),
    lastUpdatedAt: entry.derniereUtilisation || new Date().toISOString(),
    isVerified: Boolean(entry.verrouille),
    isFavorite: false,
    normaliseKey: entry.normaliseKey,
    desactive: entry.desactive,
    salePriceMode: "manual",
  };
}

export function tarifToPriceEntry(
  tarif: FournisseurTarifLigne,
  fournisseur: Fournisseur | undefined,
  companyId: string,
): EntreprisePriceLibraryEntry {
  const purchase =
    tarif.prixEntrepriseSaisi ?? tarif.prixRemise ?? tarif.prixPublic;
  const sourceMap: Record<FournisseurTarifLigne["sourceImport"], EntreprisePriceSource> =
    {
      pdf: "import_pdf",
      excel: "import_excel",
      csv: "import_csv",
      manuel: "manual",
      ia: "mum_ai",
    };

  return {
    id: `tarif-${tarif.id}`,
    companyId,
    type: "material",
    name: tarif.nomProduit,
    category: tarif.categorie,
    unit: tarif.unite ?? "u",
    supplierId: tarif.fournisseurId,
    supplierName: fournisseur?.nom,
    purchasePriceHT: typeof purchase === "number" ? purchase : undefined,
    salePriceHT: undefined,
    source: sourceMap[tarif.sourceImport] ?? "manual",
    confidence: tarif.aVerifier ? 55 : 82,
    lastUpdatedAt: tarif.dateImport,
    isVerified: !tarif.aVerifier,
    isFavorite: Boolean(fournisseur?.favori),
    normaliseKey: normalizeBibliothequeKey(tarif.nomProduit),
    desactive: false,
    salePriceMode: "coefficient",
  };
}

export function migrateToEntreprisePriceLibrary(input: {
  library?: EntreprisePriceLibrary | null;
  bibliotheque?: BibliothequeEntreprise | null;
  parametres: Parametres;
  companyId: string;
}): EntreprisePriceLibrary {
  const existing = normalizeEntreprisePriceLibrary(
    input.library,
    input.companyId,
  );
  if (existing.entries.length > 0) {
    return filterLibraryByCompany(existing, input.companyId);
  }

  const byKey = new Map<string, EntreprisePriceLibraryEntry>();

  for (const entry of input.bibliotheque?.entries ?? []) {
    if (entry.desactive) continue;
    const mapped = bibliothequeEntryToPriceEntry(entry, input.companyId);
    byKey.set(mapped.normaliseKey ?? mapped.name, mapped);
  }

  const fournisseurs = input.parametres.fournisseurs ?? [];
  for (const tarif of input.parametres.tarifsFournisseurs ?? []) {
    const fournisseur = fournisseurs.find((item) => item.id === tarif.fournisseurId);
    const mapped = tarifToPriceEntry(tarif, fournisseur, input.companyId);
    const key = mapped.normaliseKey ?? mapped.name;
    const current = byKey.get(key);
    if (!current || (mapped.purchasePriceHT && !current.purchasePriceHT)) {
      byKey.set(key, { ...current, ...mapped, id: current?.id ?? mapped.id });
    }
  }

  return normalizeEntreprisePriceLibrary(
    { ...existing, entries: [...byKey.values()] },
    input.companyId,
  );
}

export function priceEntryToBibliothequeEntry(
  entry: EntreprisePriceLibraryEntry,
): BibliothequeEntrepriseEntry | null {
  if (!entry.salePriceHT || entry.desactive) return null;
  return {
    id: entry.id,
    categorie: entry.category ?? "Autre",
    designation: entry.name,
    unite: entry.unit,
    prixMoyenHT: entry.salePriceHT,
    prixMinHT: entry.salePriceHT,
    prixMaxHT: entry.salePriceHT,
    tauxTVA: entry.vatRate,
    nombreUtilisations: 0,
    derniereUtilisation: entry.lastUpdatedAt.slice(0, 10),
    source: entry.source === "appris" ? "appris" : "manuel",
    fiabilite: entry.confidence,
    verrouille: entry.isVerified,
    desactive: entry.desactive,
    normaliseKey: entry.normaliseKey ?? normalizeBibliothequeKey(entry.name),
  };
}

export function syncBibliothequeFromPriceLibrary(
  bibliotheque: BibliothequeEntreprise,
  library: EntreprisePriceLibrary,
): BibliothequeEntreprise {
  const saleEntries = library.entries
    .map(priceEntryToBibliothequeEntry)
    .filter((entry): entry is BibliothequeEntrepriseEntry => Boolean(entry));

  if (saleEntries.length === 0) return bibliotheque;

  const merged = [...bibliotheque.entries];
  for (const entry of saleEntries) {
    const index = merged.findIndex(
      (item) => !item.desactive && item.normaliseKey === entry.normaliseKey,
    );
    if (index >= 0 && merged[index]?.verrouille) continue;
    if (index >= 0) {
      merged[index] = { ...merged[index], ...entry, id: merged[index].id };
    } else {
      merged.push(entry);
    }
  }

  return { ...bibliotheque, entries: merged };
}
