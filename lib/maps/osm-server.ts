import { geocodeFrenchAddress } from "@/lib/maps/api-adresse";
import type { GeocodedLocation, OsmDepotResult } from "@/lib/maps/depot-types";
import { searchOsmDepotsNear } from "@/lib/maps/overpass-search";
import {
  buildDepotSearchCacheKey,
  getSearchCache,
  setSearchCache,
} from "@/lib/maps/search-cache";

export type { GeocodedLocation, OsmDepotResult } from "@/lib/maps/depot-types";
export { inferEnseigneFromQuery } from "@/lib/maps/overpass-search";

export async function searchDepotsNearCompany(input: {
  query: string;
  companyAddress: string;
  radiusKm?: number;
  maxResults?: number;
}): Promise<{
  company: GeocodedLocation;
  depots: OsmDepotResult[];
  radiusKm: number;
  fromCache: boolean;
}> {
  const radiusKm = input.radiusKm ?? 30;
  const company = await geocodeFrenchAddress(input.companyAddress);
  if (!company) {
    throw new Error(
      "Impossible de géocoder l'adresse de l'entreprise. Vérifiez Paramètres > Entreprise.",
    );
  }

  const cacheKey = buildDepotSearchCacheKey({
    query: input.query,
    latitude: company.latitude,
    longitude: company.longitude,
    radiusKm,
  });

  const cached = getSearchCache<OsmDepotResult[]>(cacheKey);
  if (cached) {
    return { company, depots: cached, radiusKm, fromCache: true };
  }

  const depots = await searchOsmDepotsNear({
    query: input.query,
    latitude: company.latitude,
    longitude: company.longitude,
    radiusKm,
    maxResults: input.maxResults,
  });

  setSearchCache(cacheKey, depots);

  return { company, depots, radiusKm, fromCache: false };
}

export async function geocodeAddress(address: string): Promise<GeocodedLocation | null> {
  return geocodeFrenchAddress(address);
}
