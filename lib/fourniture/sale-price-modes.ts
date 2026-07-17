import { roundPrice, ttcFromHt } from "@/lib/fournisseur-prix-utils";

export type SalePriceMode = "manual" | "coefficient" | "margin";

export type SalePriceComputation = {
  prixVenteHT?: number;
  prixVenteTTC?: number;
  prixAchatTTC?: number;
  margeEuro?: number;
  margePourcent?: number;
};

/** Marge % sur le prix d'achat HT (formule produit). */
export function computePurchaseMargin(
  prixAchatHT: number | undefined,
  prixVenteHT: number | undefined,
): { margeEuro?: number; margePourcent?: number } {
  if (
    prixAchatHT == null ||
    prixVenteHT == null ||
    !Number.isFinite(prixAchatHT) ||
    !Number.isFinite(prixVenteHT) ||
    prixAchatHT <= 0
  ) {
    return {};
  }
  const margeEuro = roundPrice(prixVenteHT - prixAchatHT);
  const margePourcent = roundPrice((margeEuro / prixAchatHT) * 100);
  return { margeEuro, margePourcent };
}

export function computeSaleFromMode(input: {
  prixAchatHT?: number;
  tauxTVA: number;
  mode: SalePriceMode;
  prixVenteHTManuel?: number;
  coefficient?: number;
  margeSouhaiteePourcent?: number;
}): SalePriceComputation {
  const { prixAchatHT, tauxTVA, mode } = input;
  const prixAchatTTC =
    prixAchatHT != null && prixAchatHT > 0
      ? ttcFromHt(prixAchatHT, tauxTVA)
      : undefined;

  let prixVenteHT: number | undefined;

  if (mode === "manual") {
    prixVenteHT =
      input.prixVenteHTManuel != null && input.prixVenteHTManuel > 0
        ? roundPrice(input.prixVenteHTManuel)
        : undefined;
  } else if (
    mode === "coefficient" &&
    prixAchatHT != null &&
    prixAchatHT > 0 &&
    input.coefficient != null &&
    input.coefficient > 0
  ) {
    prixVenteHT = roundPrice(prixAchatHT * input.coefficient);
  } else if (
    mode === "margin" &&
    prixAchatHT != null &&
    prixAchatHT > 0 &&
    input.margeSouhaiteePourcent != null &&
    Number.isFinite(input.margeSouhaiteePourcent)
  ) {
    prixVenteHT = roundPrice(
      prixAchatHT * (1 + input.margeSouhaiteePourcent / 100),
    );
  }

  const prixVenteTTC =
    prixVenteHT != null ? ttcFromHt(prixVenteHT, tauxTVA) : undefined;
  const margins = computePurchaseMargin(prixAchatHT, prixVenteHT);

  return {
    prixAchatTTC,
    prixVenteHT,
    prixVenteTTC,
    ...margins,
  };
}

export function isValidPurchasePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
