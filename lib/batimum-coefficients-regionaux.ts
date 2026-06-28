export type RegionalCoefficientInput = {
  regionCode: string;
  departementCode: string;
  ville?: string;
  /** Surcharge manuelle depuis Paramètres > MUM IA */
  coefficientManuel?: number | null;
};

const IDF_DEPARTEMENTS = new Set([
  "75",
  "77",
  "78",
  "91",
  "92",
  "93",
  "94",
  "95",
]);

/** Occitanie — grandes villes (Toulouse, Montpellier, Nîmes, Perpignan…). */
const OCCITANIE_GRANDES_VILLES = new Set(["31", "34", "30", "66", "11"]);

/** Tarn / Aveyron — zone de référence ×1,00 */
const TARN_AVEYRON = new Set(["81", "12"]);

/** Grandes métropoles hors IDF, PACA et Occitanie déjà traités. */
const METROPOLE_DEPARTEMENTS = new Set([
  "69",
  "13",
  "59",
  "33",
  "44",
  "67",
  "06",
  "35",
  "76",
  "38",
  "45",
  "21",
]);

/** Zones rurales peu tendues — ×0,95 */
const RURAL_DEPARTEMENTS = new Set([
  "15",
  "19",
  "23",
  "48",
  "52",
  "55",
  "70",
  "88",
  "90",
  "46",
  "05",
  "04",
  "09",
  "43",
  "07",
  "39",
  "58",
  "71",
  "03",
  "63",
]);

function normalizeVille(ville?: string): string {
  if (!ville) return "";
  return ville
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isParisIntraMuros(departementCode: string, ville?: string): boolean {
  if (departementCode === "75") return true;
  const v = normalizeVille(ville);
  return v === "paris" || v.startsWith("paris ");
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Coefficients régionaux Batimum Standard V1.
 * prix_régional = prix_standard_V1 × coefficient
 */
export function getRegionalCoefficient(input: RegionalCoefficientInput): number {
  if (
    input.coefficientManuel != null &&
    Number.isFinite(input.coefficientManuel) &&
    input.coefficientManuel > 0
  ) {
    return round2(input.coefficientManuel);
  }

  const dept = String(input.departementCode ?? "")
    .trim()
    .toUpperCase();
  const region = String(input.regionCode ?? "").trim().toUpperCase();

  if (isParisIntraMuros(dept, input.ville)) return 1.3;

  if (IDF_DEPARTEMENTS.has(dept)) return 1.25;

  if (region === "PAC") return 1.15;

  if (TARN_AVEYRON.has(dept)) return 1;

  if (region === "OCC" && OCCITANIE_GRANDES_VILLES.has(dept)) return 1.05;
  if (OCCITANIE_GRANDES_VILLES.has(dept)) return 1.05;

  if (METROPOLE_DEPARTEMENTS.has(dept)) return 1.1;

  if (RURAL_DEPARTEMENTS.has(dept)) return 0.95;

  return 1;
}

export function formatRegionalCoefficientLabel(
  input: RegionalCoefficientInput,
): string {
  const coef = getRegionalCoefficient(input);
  const manual =
    input.coefficientManuel != null && input.coefficientManuel > 0
      ? " (manuel)"
      : "";
  return `×${coef}${manual}`;
}

export const REGIONAL_COEFFICIENT_LEGEND = [
  "Zones rurales peu tendues : ×0,95",
  "Tarn / Aveyron : ×1,00",
  "Occitanie grandes villes : ×1,05",
  "Grandes métropoles : ×1,10",
  "PACA : ×1,15",
  "Île-de-France : ×1,25",
  "Paris intra-muros : ×1,30",
].join("\n");
