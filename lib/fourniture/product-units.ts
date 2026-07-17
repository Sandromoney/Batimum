export type ProductUnitOption = {
  id: string;
  label: string;
  abbr: string;
};

export const PRODUCT_UNIT_OPTIONS: ProductUnitOption[] = [
  { id: "u", label: "unité", abbr: "u" },
  { id: "m2", label: "m²", abbr: "m²" },
  { id: "ml", label: "mètre linéaire", abbr: "ml" },
  { id: "m3", label: "m³", abbr: "m³" },
  { id: "kg", label: "kg", abbr: "kg" },
  { id: "L", label: "litre", abbr: "L" },
  { id: "sac", label: "sac", abbr: "sac" },
  { id: "carton", label: "carton", abbr: "carton" },
  { id: "palette", label: "palette", abbr: "palette" },
  { id: "rouleau", label: "rouleau", abbr: "rouleau" },
  { id: "lot", label: "lot", abbr: "lot" },
  { id: "forfait", label: "forfait", abbr: "forfait" },
  { id: "h", label: "heure", abbr: "h" },
  { id: "j", label: "jour", abbr: "j" },
];

export function findUnitOption(value: string): ProductUnitOption | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return PRODUCT_UNIT_OPTIONS.find(
    (option) =>
      option.id.toLowerCase() === normalized ||
      option.abbr.toLowerCase() === normalized ||
      option.label.toLowerCase() === normalized,
  );
}

/** Affiche l'abréviation propre pour le tableau. */
export function formatUnitAbbr(value: string | undefined): string {
  if (!value?.trim()) return "—";
  const found = findUnitOption(value);
  return found?.abbr ?? value.trim();
}

export function unitStorageValue(
  optionId: string | "other",
  customValue: string,
): string {
  if (optionId === "other") return customValue.trim();
  return findUnitOption(optionId)?.abbr ?? optionId;
}
