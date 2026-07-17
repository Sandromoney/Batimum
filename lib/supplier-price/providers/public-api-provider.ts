import type {
  SupplierPriceContext,
  SupplierPriceProvider,
  SupplierPriceQuery,
  SupplierPriceResult,
} from "@/lib/supplier-price/types";

/** Connecteur extensible pour les prix publics fournisseurs (API, flux catalogue). */
export const publicApiProvider: SupplierPriceProvider = {
  id: "public_api",
  label: "Prix publics fournisseur (API)",

  lookup(): SupplierPriceResult | null {
    return null;
  },

  lookupAll(): SupplierPriceResult[] {
    return [];
  },
};

export function isPublicApiProviderEnabled(_context: SupplierPriceContext): boolean {
  return false;
}
