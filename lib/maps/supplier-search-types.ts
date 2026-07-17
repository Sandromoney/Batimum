import type { SupplierContactFieldSource } from "@/lib/maps/supplier-contact";

export type SupplierSearchSource =
  | "openstreetmap"
  | "nominatim"
  | "annuaire_entreprises"
  | "manual";

export type SupplierSearchResult = {
  id: string;
  name: string;
  displayName: string;
  address: string;
  city: string;
  postcode: string;
  phone?: string;
  website?: string;
  phoneSource?: SupplierContactFieldSource;
  websiteSource?: SupplierContactFieldSource;
  latitude: number;
  longitude: number;
  distanceKm: number;
  source: SupplierSearchSource;
  /** SIRET ou identifiant externe (Annuaire des Entreprises). */
  externalId?: string;
};

export type SupplierSearchDebug = {
  passesTried: string[];
  rawCountBeforeDedup: number;
  countAfterDedup: number;
  sourcesUsed: string[];
};

export type SupplierSearchOutcome = {
  results: SupplierSearchResult[];
  debug: SupplierSearchDebug;
};
