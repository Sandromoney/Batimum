import {
  calculerPrixEstimeEntreprise,
  findTarifLigne,
  fournisseurCouvreFamille,
  inferFamilleProduit,
} from "@/lib/fournisseur-utils";
import type { Fournisseur } from "@/lib/types";
import type {
  SupplierPriceContext,
  SupplierPriceProvider,
  SupplierPriceQuery,
  SupplierPriceResult,
} from "@/lib/supplier-price/types";

function buildResult(
  fournisseur: Fournisseur,
  query: SupplierPriceQuery,
  tarif: ReturnType<typeof findTarifLigne>,
  providerId: string,
): SupplierPriceResult | null {
  const famille = query.famille ?? inferFamilleProduit(query.designation);
  const prix = calculerPrixEstimeEntreprise(fournisseur, famille, tarif);

  if (prix.source === "none") {
    return {
      fournisseurId: fournisseur.id,
      fournisseurNom: fournisseur.nom,
      reference: tarif?.reference,
      nomProduit: tarif?.nomProduit,
      remisePourcent: prix.remisePourcent,
      source: "none",
      disponible: false,
      aVerifier: tarif?.aVerifier,
      providerId,
    };
  }

  return {
    fournisseurId: fournisseur.id,
    fournisseurNom: fournisseur.nom,
    reference: tarif?.reference,
    nomProduit: tarif?.nomProduit ?? query.designation,
    prixPublic: prix.prixPublic,
    prixRemise: prix.prixRemise,
    prixEstimeUnitaire: prix.prixRemise,
    remisePourcent: prix.remisePourcent,
    source: prix.source,
    dateMiseAJour: prix.dateMiseAJour,
    disponible: typeof prix.prixRemise === "number",
    aVerifier: prix.aVerifier,
    providerId,
  };
}

export const manualTarifProvider: SupplierPriceProvider = {
  id: "manual_tarif",
  label: "Tarifs importés / saisis",

  lookup(query, context) {
    const results = this.lookupAll(query, context);
    return results[0] ?? null;
  },

  lookupAll(query, context) {
    const famille = query.famille ?? inferFamilleProduit(query.designation);
    const fournisseurs = query.fournisseurId
      ? context.fournisseurs.filter((item) => item.id === query.fournisseurId)
      : context.fournisseurs;

    return fournisseurs
      .filter((fournisseur) => fournisseurCouvreFamille(fournisseur, famille))
      .map((fournisseur) => {
        const tarif = findTarifLigne(
          context.tarifs,
          fournisseur.id,
          query.designation,
          query.reference,
        );
        return buildResult(fournisseur, query, tarif, this.id);
      })
      .filter((item): item is SupplierPriceResult => Boolean(item));
  },
};

export const importTarifProvider: SupplierPriceProvider = manualTarifProvider;
