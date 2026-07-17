import { manualTarifProvider } from "@/lib/supplier-price/providers/manual-tarif-provider";
import { publicApiProvider } from "@/lib/supplier-price/providers/public-api-provider";
import type {
  SupplierPriceContext,
  SupplierPriceProvider,
  SupplierPriceQuery,
  SupplierPriceResult,
} from "@/lib/supplier-price/types";
import { isFournisseurActive } from "@/lib/fourniture/helpers";
import type { Fournisseur, FournisseurTarifLigne, Parametres } from "@/lib/types";

export const SUPPLIER_PRICE_PROVIDERS: SupplierPriceProvider[] = [
  manualTarifProvider,
  publicApiProvider,
];

export function buildSupplierPriceContext(parametres: Parametres): SupplierPriceContext {
  const fournisseurs = (parametres.fournisseurs ?? []).filter(isFournisseurActive);
  const activeIds = new Set(fournisseurs.map((item) => item.id));
  return {
    parametres,
    fournisseurs,
    tarifs: (parametres.tarifsFournisseurs ?? []).filter((line) =>
      activeIds.has(line.fournisseurId),
    ),
  };
}

export function resolveSupplierPrices(
  query: SupplierPriceQuery,
  context: SupplierPriceContext,
): SupplierPriceResult[] {
  const byFournisseur = new Map<string, SupplierPriceResult>();

  for (const provider of SUPPLIER_PRICE_PROVIDERS) {
    for (const result of provider.lookupAll(query, context)) {
      const existing = byFournisseur.get(result.fournisseurId);
      if (!existing || (result.disponible && !existing.disponible)) {
        byFournisseur.set(result.fournisseurId, result);
      }
    }
  }

  return [...byFournisseur.values()].sort((a, b) => {
    const priceA = a.prixEstimeUnitaire ?? Number.POSITIVE_INFINITY;
    const priceB = b.prixEstimeUnitaire ?? Number.POSITIVE_INFINITY;
    return priceA - priceB;
  });
}

export function resolveBestSupplierPrice(
  query: SupplierPriceQuery,
  context: SupplierPriceContext,
): SupplierPriceResult | null {
  return resolveSupplierPrices(query, context)[0] ?? null;
}

export type { Fournisseur, FournisseurTarifLigne, SupplierPriceResult };
