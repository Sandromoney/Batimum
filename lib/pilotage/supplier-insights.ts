/**
 * Insights fournisseurs pour le Pilotage — basés sur la bibliothèque de prix réelle.
 * Aucun écart inventé : uniquement des comparaisons entre prix HT enregistrés.
 */
import { getAccount } from "@/lib/account";
import { getActivePriceEntries } from "@/lib/entreprise-price-library";
import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";
import {
  filterActiveFournisseursForCompany,
  getFournisseurEnseigneLabel,
} from "@/lib/fourniture/helpers";
import type { AppData } from "@/lib/types";

export type PilotagePriceInsight = {
  id: string;
  productLabel: string;
  winnerName: string;
  loserName: string;
  deltaPct: number;
  message: string;
};

function resolveCompanyId(): string {
  return getAccount()?.supabaseUserId ?? "local";
}

/**
 * Compare les prix d'achat HT par produit normalisé entre fournisseurs actifs.
 * Retourne les écarts les plus marquants (max 5).
 */
export function buildSupplierPriceInsights(
  data: AppData,
): PilotagePriceInsight[] {
  const companyId = resolveCompanyId();
  const fournisseurs = filterActiveFournisseursForCompany(
    data.parametres.fournisseurs ?? [],
    companyId,
  );
  const fournisseurById = new Map(fournisseurs.map((f) => [f.id, f]));
  const entries = getActivePriceEntries(
    data.parametres.entreprisePriceLibrary,
    companyId,
  ).filter(
    (entry) =>
      entry.type === "material" &&
      entry.purchasePriceHT != null &&
      entry.purchasePriceHT > 0,
  );

  const groups = new Map<
    string,
    Array<{
      name: string;
      price: number;
      label: string;
    }>
  >();

  for (const entry of entries) {
    const key =
      entry.normaliseKey ||
      normalizeBibliothequeKey(entry.name) ||
      entry.name.toLowerCase().trim();
    if (!key) continue;

    const fournisseur = entry.supplierId
      ? fournisseurById.get(entry.supplierId)
      : undefined;
    const name =
      (fournisseur
        ? getFournisseurEnseigneLabel(fournisseur)
        : entry.supplierName) || "Fournisseur";

    const list = groups.get(key) ?? [];
    list.push({
      name,
      price: entry.purchasePriceHT!,
      label: entry.name,
    });
    groups.set(key, list);
  }

  const insights: PilotagePriceInsight[] = [];

  for (const [key, rows] of groups) {
    // Meilleur prix par enseigne (évite les doublons)
    const byBrand = new Map<string, { name: string; price: number; label: string }>();
    for (const row of rows) {
      const brandKey = row.name.toLowerCase();
      const current = byBrand.get(brandKey);
      if (!current || row.price < current.price) {
        byBrand.set(brandKey, row);
      }
    }
    const unique = [...byBrand.values()];
    if (unique.length < 2) continue;

    const sorted = [...unique].sort((a, b) => a.price - b.price);
    const winner = sorted[0];
    const loser = sorted[sorted.length - 1];
    if (winner.price <= 0 || loser.price <= winner.price) continue;

    const deltaPct = Math.round(
      ((loser.price - winner.price) / loser.price) * 100,
    );
    if (deltaPct < 2) continue;

    insights.push({
      id: key,
      productLabel: winner.label,
      winnerName: winner.name,
      loserName: loser.name,
      deltaPct,
      message: `${winner.name} est ${deltaPct} % moins cher que ${loser.name} sur « ${winner.label} ».`,
    });
  }

  return insights
    .sort((a, b) => b.deltaPct - a.deltaPct)
    .slice(0, 5);
}
