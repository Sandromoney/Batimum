/**
 * Normalisation de l'extraction IA d'une facture fournisseur (PDF).
 * Ne jamais inventer de montant : champs absents → null.
 */

export type FactureFournisseurExtraction = {
  fournisseur: string | null;
  date: string | null;
  montantHT: number | null;
  tauxTVA: number | null;
  montantTVA: number | null;
  montantTTC: number | null;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value
      .replace(/\s/g, "")
      .replace("€", "")
      .replace(",", ".")
      .trim();
    if (!normalized) return null;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDate(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;
  const fr = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (fr) {
    const day = fr[1]!.padStart(2, "0");
    const month = fr[2]!.padStart(2, "0");
    let year = fr[3]!;
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

export const FACTURE_FOURNISSEUR_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    fournisseur: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
    montantHT: { type: ["number", "null"] },
    tauxTVA: { type: ["number", "null"] },
    montantTVA: { type: ["number", "null"] },
    montantTTC: { type: ["number", "null"] },
  },
  required: [
    "fournisseur",
    "date",
    "montantHT",
    "tauxTVA",
    "montantTVA",
    "montantTTC",
  ],
} as const;

export function normalizeFactureFournisseurExtraction(
  raw: unknown,
): FactureFournisseurExtraction {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  let montantHT = asNumber(obj.montantHT);
  let montantTTC = asNumber(obj.montantTTC);
  let montantTVA = asNumber(obj.montantTVA);
  let tauxTVA = asNumber(obj.tauxTVA);

  if (montantHT != null && montantTTC != null && montantTVA == null) {
    montantTVA = Math.round((montantTTC - montantHT) * 100) / 100;
  }
  if (
    montantHT != null &&
    montantTTC != null &&
    montantHT > 0 &&
    tauxTVA == null
  ) {
    tauxTVA = Math.round(((montantTTC / montantHT - 1) * 100) * 100) / 100;
  }
  if (montantHT != null && tauxTVA != null && montantTTC == null) {
    montantTTC = Math.round(montantHT * (1 + tauxTVA / 100) * 100) / 100;
  }
  if (montantTTC != null && tauxTVA != null && montantHT == null && tauxTVA > 0) {
    montantHT = Math.round((montantTTC / (1 + tauxTVA / 100)) * 100) / 100;
  }
  if (montantHT != null && montantTTC != null && montantTVA == null) {
    montantTVA = Math.round((montantTTC - montantHT) * 100) / 100;
  }

  return {
    fournisseur: asString(obj.fournisseur),
    date: normalizeDate(obj.date),
    montantHT,
    tauxTVA,
    montantTVA,
    montantTTC,
  };
}
