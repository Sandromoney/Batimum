import type { SalePriceMode } from "@/lib/types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeMarginRate(
  purchasePriceHT: number,
  salePriceHT: number,
): number {
  if (salePriceHT <= 0) return 0;
  return round2(((salePriceHT - purchasePriceHT) / salePriceHT) * 100);
}

export function computeSaleFromCoefficient(
  purchasePriceHT: number,
  coefficient: number,
): number {
  return round2(purchasePriceHT * coefficient);
}

export function computeSaleFromMargin(
  purchasePriceHT: number,
  marginRate: number,
): number {
  const rate = marginRate / 100;
  if (rate >= 1) return purchasePriceHT;
  return round2(purchasePriceHT / (1 - rate));
}

export function applyPurchasePriceChange(input: {
  purchasePriceHT: number;
  salePriceMode: SalePriceMode;
  markupCoefficient?: number;
  marginRate?: number;
  currentSalePriceHT?: number;
}): {
  salePriceHT: number;
  marginRate: number;
  markupCoefficient: number;
} {
  if (input.salePriceMode === "manual" && typeof input.currentSalePriceHT === "number") {
    const salePriceHT = input.currentSalePriceHT;
    const coefficient =
      input.purchasePriceHT > 0
        ? round2(salePriceHT / input.purchasePriceHT)
        : input.markupCoefficient ?? 1;
    return {
      salePriceHT,
      marginRate: computeMarginRate(input.purchasePriceHT, salePriceHT),
      markupCoefficient: coefficient,
    };
  }

  const coefficient = input.markupCoefficient ?? 1.65;
  const salePriceHT = computeSaleFromCoefficient(input.purchasePriceHT, coefficient);
  return {
    salePriceHT,
    marginRate: computeMarginRate(input.purchasePriceHT, salePriceHT),
    markupCoefficient: coefficient,
  };
}

export function applySalePriceChange(input: {
  purchasePriceHT?: number;
  salePriceHT: number;
}): {
  marginRate?: number;
  markupCoefficient?: number;
} {
  if (typeof input.purchasePriceHT !== "number" || input.purchasePriceHT <= 0) {
    return {};
  }
  return {
    marginRate: computeMarginRate(input.purchasePriceHT, input.salePriceHT),
    markupCoefficient: round2(input.salePriceHT / input.purchasePriceHT),
  };
}
