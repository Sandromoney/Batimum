import type { Parametres } from "@/lib/types";
import { hexToRgb, normalizeHex } from "@/lib/color-picker-utils";

export type DevisBrandColorId =
  | "bleu_batimum"
  | "bleu_nuit"
  | "or"
  | "vert"
  | "orange"
  | "gris_premium"
  | "personnalise"
  /** @deprecated Alias conservé pour compatibilité */
  | "noir"
  /** @deprecated Alias conservé pour compatibilité */
  | "rouge_brique";

export type DevisBrandColor = {
  id: DevisBrandColorId;
  label: string;
  hex: string;
  rgb: [number, number, number];
};

export const DEVIS_BRAND_COLORS: DevisBrandColor[] = [
  { id: "bleu_batimum", label: "Bleu Batimum", hex: "#2563EB", rgb: [37, 99, 235] },
  { id: "bleu_nuit", label: "Bleu nuit", hex: "#0F172A", rgb: [15, 23, 42] },
  { id: "or", label: "Or", hex: "#B8860B", rgb: [184, 134, 11] },
  { id: "vert", label: "Vert", hex: "#15803D", rgb: [21, 128, 61] },
  { id: "orange", label: "Orange", hex: "#EA580C", rgb: [234, 88, 12] },
  { id: "gris_premium", label: "Gris premium", hex: "#4B5563", rgb: [75, 85, 99] },
];

const LEGACY_COLOR_IDS: Record<string, DevisBrandColorId> = {
  noir: "bleu_nuit",
  rouge_brique: "orange",
};

export function normalizeDevisBrandColorId(
  id: DevisBrandColorId | string | undefined,
): DevisBrandColorId {
  if (!id) return "bleu_batimum";
  if (id in LEGACY_COLOR_IDS) return LEGACY_COLOR_IDS[id];
  if (DEVIS_BRAND_COLORS.some((color) => color.id === id)) {
    return id as DevisBrandColorId;
  }
  if (id === "personnalise") return "personnalise";
  return "bleu_batimum";
}

export function resolveDevisBrandHex(
  parametres: Pick<Parametres, "couleurDevis" | "couleurDevisCustom">,
): string {
  const id = normalizeDevisBrandColorId(parametres.couleurDevis);
  if (id === "personnalise" && parametres.couleurDevisCustom) {
    return normalizeHex(parametres.couleurDevisCustom) ?? DEVIS_BRAND_COLORS[0].hex;
  }
  const found = DEVIS_BRAND_COLORS.find((color) => color.id === id);
  return found?.hex ?? DEVIS_BRAND_COLORS[0].hex;
}

export function resolveDevisBrandColor(
  parametres: Pick<Parametres, "couleurDevis" | "couleurDevisCustom">,
): DevisBrandColor {
  const id = normalizeDevisBrandColorId(parametres.couleurDevis);
  if (id === "personnalise" && parametres.couleurDevisCustom) {
    const rgb = hexToRgb(parametres.couleurDevisCustom);
    if (rgb) {
      const hex = normalizeHex(parametres.couleurDevisCustom)!;
      return { id: "personnalise", label: "Personnalisée", hex, rgb };
    }
  }
  const found = DEVIS_BRAND_COLORS.find((color) => color.id === id);
  return found ?? DEVIS_BRAND_COLORS[0];
}

export function getPresetById(id: DevisBrandColorId): DevisBrandColor | undefined {
  const normalized = normalizeDevisBrandColorId(id);
  if (normalized === "personnalise") return undefined;
  return DEVIS_BRAND_COLORS.find((color) => color.id === normalized);
}
