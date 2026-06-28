export const BATIMUM_PRICE_LIBRARY_VERSION = "V3";

export const BATIMUM_CATEGORIES = [
  "Dépose",
  "Plomberie",
  "Électricité",
  "Placo",
  "Isolation",
  "Carrelage",
  "Peinture",
  "Sols",
  "Menuiserie",
  "Maçonnerie",
  "Extérieur",
  "Nettoyage",
] as const;

export type BatimumCategory = (typeof BATIMUM_CATEGORIES)[number];

/** @deprecated Alias — utiliser BATIMUM_CATEGORIES */
export const BATIMUM_CORPS_ETAT = BATIMUM_CATEGORIES;
/** @deprecated Alias — utiliser BatimumCategory */
export type BatimumCorpsEtat = BatimumCategory;

export type BatimumPriceLibraryEntry = {
  id: string;
  category: BatimumCategory;
  /** Alias rétrocompatibilité */
  corpsEtat: BatimumCategory;
  label: string;
  unit: string;
  minPrice: number;
  defaultPrice: number;
  maxPrice: number;
  confidence: number;
  notes: string;
  keywords: string[];
  catalogueId?: string;
  suggestionOnly?: boolean;
  forceForfait?: boolean;
  minForfaitHT?: number;
  tvaHabituelle?: number;
};
