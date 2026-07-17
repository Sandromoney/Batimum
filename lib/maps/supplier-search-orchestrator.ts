import { isInFrance } from "@/lib/maps/france-bounds";
import { distanceKmBetween } from "@/lib/maps/geo";
import {
  normalizeForBrandMatch,
  normalizeSupplierBrandQuery,
} from "@/lib/fourniture/brand-normalization";
import { mergeSupplierSearchResults } from "@/lib/maps/supplier-search-dedupe";
import { pickPreferredContactField } from "@/lib/maps/supplier-contact";
import type {
  SupplierSearchOutcome,
  SupplierSearchResult,
} from "@/lib/maps/supplier-search-types";
import { logSupplierSearch } from "@/lib/maps/supplier-search-logger";
import { searchSuppliersAnnuaire } from "@/lib/maps/search-suppliers-annuaire";
import { searchSuppliersNominatim } from "@/lib/maps/search-suppliers-nominatim";
import { searchSuppliersOverpass } from "@/lib/maps/search-suppliers-overpass";

const MAX_RESULTS = 20;

function mapOverpassResults(
  items: Awaited<ReturnType<typeof searchSuppliersOverpass>>["results"],
): SupplierSearchResult[] {
  return items.map((item) => ({
    id: item.osmId,
    name: item.name,
    displayName: item.name,
    address: item.address,
    city: item.city,
    postcode: item.postcode,
    phone: item.phone,
    website: item.website,
    phoneSource: item.phone ? ("openstreetmap" as const) : ("unavailable" as const),
    websiteSource: item.website
      ? ("openstreetmap" as const)
      : ("unavailable" as const),
    latitude: item.latitude,
    longitude: item.longitude,
    distanceKm: item.distanceKm,
    source: "openstreetmap" as const,
  }));
}

function normalizeAddress(value: string): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Écarte les résultats hors enseigne (ex. Aftral pour une recherche Point.P). */
function resultMatchesSupplierQuery(
  result: SupplierSearchResult,
  query: string,
): boolean {
  const needle = normalizeForBrandMatch(normalizeSupplierBrandQuery(query));
  if (!needle || needle.length < 3) return true;

  const haystack = normalizeForBrandMatch(
    `${result.name} ${result.displayName ?? ""}`,
  );
  if (!haystack) return false;

  return haystack.includes(needle) || needle.includes(haystack);
}

function isSameEstablishment(
  depot: SupplierSearchResult,
  candidate: SupplierSearchResult,
): boolean {
  if (
    depot.externalId &&
    candidate.externalId &&
    depot.externalId === candidate.externalId
  ) {
    return true;
  }

  const depotAddr = normalizeAddress(depot.address);
  const candAddr = normalizeAddress(candidate.address);
  const sameCity =
    normalizeAddress(depot.city) === normalizeAddress(candidate.city) &&
    Boolean(normalizeAddress(depot.city));

  if (depotAddr && candAddr && depotAddr === candAddr && sameCity) {
    return true;
  }

  const km = distanceKmBetween(
    depot.latitude,
    depot.longitude,
    candidate.latitude,
    candidate.longitude,
  );

  if (km < 0.1 && sameCity) return true;

  if (
    depotAddr.length >= 8 &&
    candAddr.length >= 8 &&
    (depotAddr.includes(candAddr) || candAddr.includes(depotAddr)) &&
    depot.postcode &&
    depot.postcode === candidate.postcode
  ) {
    return true;
  }

  const sameName =
    normalizeForBrandMatch(depot.name) &&
    normalizeForBrandMatch(depot.name) === normalizeForBrandMatch(candidate.name);
  return Boolean(sameName && sameCity && km < 0.15);
}

function enrichWithAnnuaireMatches(
  depots: SupplierSearchResult[],
  annuaireResults: SupplierSearchResult[],
): { results: SupplierSearchResult[]; enrichedCount: number } {
  if (annuaireResults.length === 0) {
    return { results: depots, enrichedCount: 0 };
  }

  let enrichedCount = 0;
  const results = depots.map((depot) => {
    const needsFill =
      !depot.phone || !depot.website || !depot.externalId || !depot.address?.trim();
    if (!needsFill) return depot;

    const match = annuaireResults.find((candidate) =>
      isSameEstablishment(depot, candidate),
    );
    if (!match) return depot;

    enrichedCount += 1;

    const phone = pickPreferredContactField(
      {
        value: depot.phone,
        source: depot.phoneSource ?? (depot.phone ? "openstreetmap" : "unavailable"),
      },
      {
        value: match.phone,
        source: match.phone ? "entreprise_public_data" : "unavailable",
      },
    );

    const website = pickPreferredContactField(
      {
        value: depot.website,
        source:
          depot.websiteSource ??
          (depot.website ? "openstreetmap" : "unavailable"),
      },
      {
        value: match.website,
        source: match.website ? "entreprise_public_data" : "unavailable",
      },
    );

    return {
      ...depot,
      address: depot.address?.trim() || match.address,
      city: depot.city?.trim() || match.city,
      postcode: depot.postcode?.trim() || match.postcode,
      externalId: depot.externalId || match.externalId,
      phone: phone.value,
      website: website.value,
      phoneSource: phone.source,
      websiteSource: website.source,
    };
  });

  return { results, enrichedCount };
}

export async function searchSuppliers(input: {
  query: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  ville?: string;
  codePostal?: string;
}): Promise<SupplierSearchOutcome> {
  const passesTried: string[] = [];
  const sourcesUsed = new Set<string>();
  const batches: SupplierSearchResult[][] = [];

  const annuaireEarly = searchSuppliersAnnuaire(input);

  const nominatim = await searchSuppliersNominatim(input);
  passesTried.push(...nominatim.passesTried.map((p) => `nominatim:${p}`));
  if (nominatim.results.length > 0) {
    sourcesUsed.add("nominatim");
    batches.push(nominatim.results);
  }

  let annuaireResults: SupplierSearchResult[] = [];
  let annuaireQueries: string[] = [];

  if (nominatim.results.length === 0) {
    logSupplierSearch("fallback", "overpass+annuaire_entreprises (parallel)");

    const overpassPromise = searchSuppliersOverpass({
      query: input.query,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: Math.round(input.radiusKm * 1000),
    })
      .then((overpass) => mapOverpassResults(overpass.results))
      .catch((error) => {
        logSupplierSearch(
          "overpassError",
          error instanceof Error ? error.message : String(error),
        );
        return [] as SupplierSearchResult[];
      });

    const [overpassMapped, annuaire] = await Promise.all([
      overpassPromise,
      annuaireEarly,
    ]);

    annuaireResults = annuaire.results;
    annuaireQueries = annuaire.queriesTried;

    passesTried.push("overpass:primary");
    if (overpassMapped.length > 0) {
      sourcesUsed.add("openstreetmap");
      batches.push(overpassMapped);
    }

    passesTried.push(...annuaireQueries.map((q) => `annuaire:${q}`));
    if (annuaireResults.length > 0) {
      sourcesUsed.add("annuaire_entreprises");
      batches.push(annuaireResults);
    }
  } else {
    const annuaire = await annuaireEarly;
    annuaireResults = annuaire.results;
    annuaireQueries = annuaire.queriesTried;
    passesTried.push(...annuaireQueries.map((q) => `enrich:${q}`));
  }

  const rawCountBeforeDedup = batches.flat().length;

  let merged = mergeSupplierSearchResults(batches)
    .filter((item) => isInFrance(item.latitude, item.longitude))
    .filter((item) => item.distanceKm <= input.radiusKm)
    .filter((item) => resultMatchesSupplierQuery(item, input.query));

  if (annuaireResults.length > 0 && merged.length > 0) {
    const { results, enrichedCount } = enrichWithAnnuaireMatches(
      merged,
      annuaireResults,
    );
    merged = results;
    if (enrichedCount > 0) {
      sourcesUsed.add("annuaire_entreprises");
      logSupplierSearch("enrichmentMatched", enrichedCount);
    }
  }

  const limited = merged.slice(0, MAX_RESULTS);

  return {
    results: limited,
    debug: {
      passesTried,
      rawCountBeforeDedup,
      countAfterDedup: limited.length,
      sourcesUsed: [...sourcesUsed],
    },
  };
}
