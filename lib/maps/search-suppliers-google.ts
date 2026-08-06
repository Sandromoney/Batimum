import { distanceKmBetween } from "@/lib/maps/geo";
import { isInFrance } from "@/lib/maps/france-bounds";
import {
  buildSupplierSearchPasses,
  inferEnseigneFromQuery,
} from "@/lib/fourniture/brand-normalization";
import {
  getGoogleMapsServerKey,
  searchDepotsNearCompany,
} from "@/lib/maps/google-maps-server";
import type { SupplierSearchResult } from "@/lib/maps/supplier-search-types";
import { logSupplierSearch } from "@/lib/maps/supplier-search-logger";

export async function searchSuppliersGoogle(input: {
  query: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  ville?: string;
  codePostal?: string;
  companyAddress?: string;
}): Promise<{
  results: SupplierSearchResult[];
  passesTried: string[];
}> {
  const apiKey = getGoogleMapsServerKey();
  if (!apiKey) {
    return { results: [], passesTried: ["google:skipped-no-key"] };
  }

  const enseigne = inferEnseigneFromQuery(input.query);
  const companyAddress =
    input.companyAddress?.trim() ||
    [input.codePostal, input.ville].filter(Boolean).join(" ") ||
    `${input.latitude},${input.longitude}`;

  const passes = buildSupplierSearchPasses({
    query: enseigne,
    ville: input.ville,
    codePostal: input.codePostal,
  }).slice(0, 4);

  const passesTried: string[] = [];
  const byPlaceId = new Map<string, SupplierSearchResult>();

  for (const pass of passes.length > 0
    ? passes
    : [{ query: enseigne, bounded: false, label: "canonical" }]) {
    passesTried.push(`google:${pass.label}`);
    try {
      const { depots } = await searchDepotsNearCompany({
        query: pass.query,
        companyAddress,
        apiKey,
        maxResults: 16,
        maxDistanceKm: input.radiusKm,
        locationBias: {
          latitude: input.latitude,
          longitude: input.longitude,
        },
      });

      for (const depot of depots) {
        if (!isInFrance(depot.latitude, depot.longitude)) continue;
        const distanceKm = distanceKmBetween(
          input.latitude,
          input.longitude,
          depot.latitude,
          depot.longitude,
        );
        if (distanceKm > input.radiusKm) continue;

        const mapped: SupplierSearchResult = {
          id: `google:${depot.placeId}`,
          name: depot.name,
          displayName: depot.name,
          address: depot.adresse,
          city: depot.ville,
          postcode: depot.codePostal,
          phone: depot.telephone,
          website: depot.siteWeb,
          phoneSource: depot.telephone ? "google_places" : "unavailable",
          websiteSource: depot.siteWeb ? "google_places" : "unavailable",
          latitude: depot.latitude,
          longitude: depot.longitude,
          distanceKm,
          source: "google_places",
          externalId: depot.placeId,
        };
        if (!byPlaceId.has(depot.placeId)) {
          byPlaceId.set(depot.placeId, mapped);
        }
      }

      if (byPlaceId.size >= 8) break;
    } catch (error) {
      logSupplierSearch(
        "googlePlacesError",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const results = [...byPlaceId.values()].sort(
    (a, b) => a.distanceKm - b.distanceKm,
  );
  logSupplierSearch("googlePlacesCount", results.length);
  return { results, passesTried };
}
