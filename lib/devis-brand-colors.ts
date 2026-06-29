import type { Parametres } from "@/lib/types";

export type DevisBrandColorId =
  | "bleu_batimum"
  | "noir"
  | "or"
  | "vert"
  | "rouge_brique"
  | "gris_premium";

export type DevisBrandColor = {
  id: DevisBrandColorId;
  label: string;
  hex: string;
  rgb: [number, number, number];
};

export const DEVIS_BRAND_COLORS: DevisBrandColor[] = [
  { id: "bleu_batimum", label: "Bleu Batimum", hex: "#2563EB", rgb: [37, 99, 235] },
  { id: "noir", label: "Noir", hex: "#111827", rgb: [17, 24, 39] },
  { id: "or", label: "Or", hex: "#B8860B", rgb: [184, 134, 11] },
  { id: "vert", label: "Vert", hex: "#15803D", rgb: [21, 128, 61] },
  { id: "rouge_brique", label: "Rouge brique", hex: "#B45309", rgb: [180, 83, 9] },
  { id: "gris_premium", label: "Gris premium", hex: "#4B5563", rgb: [75, 85, 99] },
];

export function resolveDevisBrandColor(
  parametres: Pick<Parametres, "couleurDevis">,
): DevisBrandColor {
  const found = DEVIS_BRAND_COLORS.find(
    (color) => color.id === parametres.couleurDevis,
  );
  return found ?? DEVIS_BRAND_COLORS[0];
}
