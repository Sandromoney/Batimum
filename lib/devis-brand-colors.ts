import type { Parametres } from "@/lib/types";

export type DevisBrandColorId =
  | "bleu_batimum"
  | "noir"
  | "or"
  | "vert"
  | "rouge_brique"
  | "gris_premium"
  | "personnalise";

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

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

export function resolveDevisBrandColor(
  parametres: Pick<Parametres, "couleurDevis" | "couleurDevisCustom">,
): DevisBrandColor {
  if (parametres.couleurDevis === "personnalise" && parametres.couleurDevisCustom) {
    const rgb = hexToRgb(parametres.couleurDevisCustom);
    if (rgb) {
      return {
        id: "personnalise",
        label: "Personnalisée",
        hex: `#${parametres.couleurDevisCustom.replace("#", "")}`,
        rgb,
      };
    }
  }

  const found = DEVIS_BRAND_COLORS.find(
    (color) => color.id === parametres.couleurDevis,
  );
  return found ?? DEVIS_BRAND_COLORS[0];
}
