export {
  DEFAULT_ENTREPRISE_PRICE_LIBRARY,
  DEFAULT_MARKUP_COEFFICIENT,
  DEFAULT_SALE_PRICE_MODE,
  bibliothequeEntryToPriceEntry,
  filterLibraryByCompany,
  getReliabilityLabel,
  getSourceLabel,
  inferPriceTypeFromCategory,
  mapReliabilityFromEntry,
  migrateToEntreprisePriceLibrary,
  normalizeEntreprisePriceLibrary,
  priceEntryToBibliothequeEntry,
  syncBibliothequeFromPriceLibrary,
  tarifToPriceEntry,
} from "@/lib/entreprise-price-library/normalize";

export {
  applyPurchasePriceChange,
  applySalePriceChange,
  computeMarginRate,
  computeSaleFromCoefficient,
} from "@/lib/entreprise-price-library/margin";

export {
  disablePriceEntry,
  getActivePriceEntries,
  togglePriceEntryVerified,
  upsertPriceEntry,
  type UpsertPriceEntryInput,
} from "@/lib/entreprise-price-library/crud";

export {
  formatPriceResolutionForDevisLine,
  resolveEntreprisePrice,
  type EntreprisePriceResolution,
} from "@/lib/entreprise-price-library/resolve";

export {
  learnPriceLibraryFromChantier,
  learnPriceLibraryFromDevisLigne,
} from "@/lib/entreprise-price-library/history";

export {
  buildImportPreviewRows,
  previewRowsToPriceEntries,
  previewRowsToTarifLignes,
  type ImportPreviewAction,
  type ImportPreviewRow,
} from "@/lib/entreprise-price-library/import";

import { migrateToEntreprisePriceLibrary } from "@/lib/entreprise-price-library/normalize";

export function ensureEntreprisePriceLibraryForApp(input: {
  parametres: import("@/lib/types").Parametres;
  bibliotheque?: import("@/lib/types").BibliothequeEntreprise | null;
  companyId: string;
}): import("@/lib/types").EntreprisePriceLibrary {
  return migrateToEntreprisePriceLibrary({
    library: input.parametres.entreprisePriceLibrary,
    bibliotheque: input.bibliotheque,
    parametres: input.parametres,
    companyId: input.companyId,
  });
}
