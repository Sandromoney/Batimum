export type GeocodedLocation = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

export type SupplierContactFieldSource =
  | "openstreetmap"
  | "entreprise_public_data"
  | "manual"
  | "unavailable";

/** Dépôt trouvé via OpenStreetMap / Annuaire. */
export type OsmDepotResult = {
  osmId: string;
  osmType?: "node" | "way" | "relation";
  name: string;
  enseigne: string;
  adresse: string;
  ville: string;
  codePostal: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  telephone?: string;
  siteWeb?: string;
  phoneSource?: SupplierContactFieldSource;
  websiteSource?: SupplierContactFieldSource;
};

/** @deprecated Utiliser OsmDepotResult — conservé pour compatibilité imports. */
export type DepotPlaceResult = OsmDepotResult & { placeId: string };

export function toDepotPlaceResult(depot: OsmDepotResult): DepotPlaceResult {
  return { ...depot, placeId: depot.osmId };
}
