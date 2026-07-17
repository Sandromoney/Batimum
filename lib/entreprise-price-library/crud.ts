import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import {
  applyPurchasePriceChange,
  applySalePriceChange,
} from "@/lib/entreprise-price-library/margin";
import {
  DEFAULT_ENTREPRISE_PRICE_LIBRARY,
  inferPriceTypeFromCategory,
  normalizeEntreprisePriceLibrary,
} from "@/lib/entreprise-price-library/normalize";
import type {
  EntreprisePriceLibrary,
  EntreprisePriceLibraryEntry,
  EntreprisePriceSource,
  EntreprisePriceType,
  SalePriceMode,
} from "@/lib/types";
import { generateId } from "@/lib/utils";

export type UpsertPriceEntryInput = {
  id?: string;
  companyId: string;
  type?: EntreprisePriceType;
  name: string;
  reference?: string;
  description?: string;
  category?: string;
  trade?: string;
  unit?: string;
  supplierId?: string;
  supplierName?: string;
  purchasePriceHT?: number;
  salePriceHT?: number;
  marginRate?: number;
  markupCoefficient?: number;
  vatRate?: number;
  source?: EntreprisePriceSource;
  confidence?: number;
  isVerified?: boolean;
  isFavorite?: boolean;
  notes?: string;
  salePriceMode?: SalePriceMode;
};

export function upsertPriceEntry(
  library: EntreprisePriceLibrary,
  input: UpsertPriceEntryInput,
): EntreprisePriceLibrary {
  const normalized = normalizeEntreprisePriceLibrary(library, input.companyId);
  const existingIndex = input.id
    ? normalized.entries.findIndex((entry) => entry.id === input.id)
    : normalized.entries.findIndex(
        (entry) =>
          !entry.desactive &&
          entry.normaliseKey === normalizeBibliothequeKey(input.name) &&
          entry.supplierId === input.supplierId,
      );

  const existing = existingIndex >= 0 ? normalized.entries[existingIndex] : undefined;
  const salePriceMode =
    input.salePriceMode ??
    existing?.salePriceMode ??
    normalized.defaultSalePriceMode ??
    "coefficient";

  const purchasePriceHT = input.purchasePriceHT ?? existing?.purchasePriceHT;
  let salePriceHT = input.salePriceHT ?? existing?.salePriceHT;
  let marginRate = input.marginRate ?? existing?.marginRate;
  let markupCoefficient =
    input.markupCoefficient ??
    existing?.markupCoefficient ??
    normalized.defaultMarkupCoefficient;

  if (typeof purchasePriceHT === "number" && input.purchasePriceHT !== undefined) {
    const computed = applyPurchasePriceChange({
      purchasePriceHT,
      salePriceMode,
      markupCoefficient,
      marginRate,
      currentSalePriceHT: salePriceHT,
    });
    salePriceHT = computed.salePriceHT;
    marginRate = computed.marginRate;
    markupCoefficient = computed.markupCoefficient;
  } else if (typeof salePriceHT === "number" && input.salePriceHT !== undefined) {
    const computed = applySalePriceChange({ purchasePriceHT, salePriceHT });
    marginRate = computed.marginRate ?? marginRate;
    markupCoefficient = computed.markupCoefficient ?? markupCoefficient;
  }

  const nextEntry: EntreprisePriceLibraryEntry = {
    id: existing?.id ?? input.id ?? generateId(),
    companyId: input.companyId,
    type:
      input.type ??
      existing?.type ??
      inferPriceTypeFromCategory(input.category, input.name),
    name: input.name.trim(),
    reference: input.reference?.trim() || existing?.reference,
    description: input.description?.trim() || existing?.description,
    category: input.category?.trim() || existing?.category,
    trade: input.trade?.trim() || existing?.trade,
    unit: input.unit?.trim() || existing?.unit || "u",
    supplierId: input.supplierId ?? existing?.supplierId,
    supplierName: input.supplierName?.trim() || existing?.supplierName,
    purchasePriceHT,
    salePriceHT,
    marginRate,
    markupCoefficient,
    vatRate: input.vatRate ?? existing?.vatRate,
    source: input.source ?? existing?.source ?? "manual",
    confidence:
      input.confidence ??
      (input.isVerified ? 98 : existing?.confidence ?? 80),
    lastUpdatedAt: new Date().toISOString(),
    isVerified: input.isVerified ?? existing?.isVerified ?? false,
    isFavorite: input.isFavorite ?? existing?.isFavorite ?? false,
    notes: input.notes?.trim() || existing?.notes,
    normaliseKey: normalizeBibliothequeKey(input.name),
    desactive: false,
    salePriceMode,
  };

  const entries = [...normalized.entries];
  if (existingIndex >= 0) {
    if (entries[existingIndex]?.isVerified && input.source !== "manual") {
      return normalized;
    }
    entries[existingIndex] = nextEntry;
  } else {
    entries.unshift(nextEntry);
  }

  return normalizeEntreprisePriceLibrary(
    { ...normalized, entries },
    input.companyId,
  );
}

export function disablePriceEntry(
  library: EntreprisePriceLibrary,
  entryId: string,
  companyId: string,
): EntreprisePriceLibrary {
  const normalized = normalizeEntreprisePriceLibrary(library, companyId);
  return {
    ...normalized,
    entries: normalized.entries.map((entry) =>
      entry.id === entryId ? { ...entry, desactive: true } : entry,
    ),
  };
}

export function togglePriceEntryVerified(
  library: EntreprisePriceLibrary,
  entryId: string,
  companyId: string,
  isVerified: boolean,
): EntreprisePriceLibrary {
  const normalized = normalizeEntreprisePriceLibrary(library, companyId);
  return {
    ...normalized,
    entries: normalized.entries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            isVerified,
            confidence: isVerified ? 98 : Math.min(entry.confidence, 75),
            lastUpdatedAt: new Date().toISOString(),
          }
        : entry,
    ),
  };
}

export function getActivePriceEntries(
  library: EntreprisePriceLibrary | undefined,
  companyId: string,
): EntreprisePriceLibraryEntry[] {
  return normalizeEntreprisePriceLibrary(
    library ?? DEFAULT_ENTREPRISE_PRICE_LIBRARY,
    companyId,
  ).entries.filter((entry) => !entry.desactive);
}
