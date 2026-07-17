import { distanceKmBetween } from "@/lib/maps/geo";
import { isInFrance } from "@/lib/maps/france-bounds";
import { httpsRequest } from "@/lib/maps/overpass-http";
import {
  getSearchCache,
  setSearchCache,
} from "@/lib/maps/search-cache";
import { logSupplierSearch } from "@/lib/maps/supplier-search-logger";
import {
  buildSupplierSearchPasses,
  normalizeSupplierBrandQuery,
} from "@/lib/fourniture/brand-normalization";
import { extractContactFromOsmTags } from "@/lib/maps/supplier-contact";
import type { SupplierSearchResult } from "@/lib/maps/supplier-search-types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Batimum/1.0 (btp-gestion; supplier-search; contact@batimum.fr)";
const TIMEOUT_MS = 10_000;
const MAX_RESULTS = 20;

type NominatimItem = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
  extratags?: Record<string, string | undefined>;
  namedetails?: {
    name?: string;
  };
};

function buildCacheKey(input: {
  query: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  ville?: string;
  codePostal?: string;
}): string {
  const q = normalizeSupplierBrandQuery(input.query).toLowerCase();
  return `nominatim:v4:${q}:${input.latitude.toFixed(4)}:${input.longitude.toFixed(4)}:${input.radiusKm}:${input.ville ?? ""}:${input.codePostal ?? ""}`;
}

function viewboxAround(lat: number, lon: number, radiusKm: number): string {
  const degLat = radiusKm / 111;
  const degLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const left = lon - degLon;
  const right = lon + degLon;
  const top = lat + degLat;
  const bottom = lat - degLat;
  return `${left},${top},${right},${bottom}`;
}

function buildAddress(item: NominatimItem): string {
  const house = item.address?.house_number?.trim();
  const road = item.address?.road?.trim();
  const street = [house, road].filter(Boolean).join(" ").trim();
  if (street) return street;

  const display = item.display_name?.trim() ?? "";
  const first = display.split(",")[0]?.trim();
  return first || "";
}

function buildCity(item: NominatimItem): string {
  return (
    item.address?.city?.trim() ||
    item.address?.town?.trim() ||
    item.address?.village?.trim() ||
    item.address?.municipality?.trim() ||
    ""
  );
}

function toResult(
  item: NominatimItem,
  companyLat: number,
  companyLon: number,
): SupplierSearchResult | null {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!isInFrance(latitude, longitude)) return null;

  const name =
    item.namedetails?.name?.trim() ||
    item.name?.trim() ||
    item.display_name?.trim() ||
    "";
  if (!name) return null;

  const osmType = item.osm_type ?? "node";
  const osmId = item.osm_id != null ? String(item.osm_id) : String(item.place_id ?? "");
  const id = osmId ? `${osmType}/${osmId}` : `nominatim/${item.place_id}`;
  const contact = extractContactFromOsmTags(item.extratags);

  return {
    id,
    name,
    displayName: item.display_name?.trim() || name,
    address: buildAddress(item),
    city: buildCity(item),
    postcode: item.address?.postcode?.trim() || "",
    phone: contact.phone,
    website: contact.website,
    phoneSource: contact.phoneSource,
    websiteSource: contact.websiteSource,
    latitude,
    longitude,
    distanceKm: distanceKmBetween(companyLat, companyLon, latitude, longitude),
    source: "nominatim",
  };
}

async function nominatimRequest(params: URLSearchParams): Promise<NominatimItem[]> {
  const url = `${NOMINATIM_URL}?${params.toString()}`;
  logSupplierSearch("nominatimUrl", url);

  const { status, text } = await httpsRequest({
    url,
    method: "GET",
    timeoutMs: TIMEOUT_MS,
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  logSupplierSearch("httpStatus", status);

  if (status < 200 || status >= 300) {
    throw new Error(`Nominatim HTTP ${status}`);
  }

  const data = JSON.parse(text) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("Réponse Nominatim invalide");
  }
  return data as NominatimItem[];
}

async function runPass(input: {
  passQuery: string;
  bounded: boolean;
  latitude: number;
  longitude: number;
  radiusKm: number;
}): Promise<SupplierSearchResult[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: input.passQuery,
    limit: "30",
    addressdetails: "1",
    extratags: "1",
    namedetails: "1",
    countrycodes: "fr",
    viewbox: viewboxAround(input.latitude, input.longitude, input.radiusKm),
    bounded: input.bounded ? "1" : "0",
  });

  const raw = await nominatimRequest(params);
  const results: SupplierSearchResult[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const parsed = toResult(item, input.latitude, input.longitude);
    if (!parsed) continue;
    if (parsed.distanceKm > input.radiusKm) continue;
    if (seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    results.push(parsed);
  }

  return results;
}

export async function searchSuppliersNominatim(input: {
  query: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  ville?: string;
  codePostal?: string;
}): Promise<{
  results: SupplierSearchResult[];
  passesTried: string[];
  rawCount: number;
  fromCache: boolean;
}> {
  const cacheKey = buildCacheKey(input);
  const cached = getSearchCache<{
    results: SupplierSearchResult[];
    passesTried: string[];
    rawCount: number;
  }>(cacheKey);

  if (cached) {
    logSupplierSearch("normalizedResults", cached.results.length);
    return { ...cached, fromCache: true };
  }

  const passes = buildSupplierSearchPasses({
    query: input.query,
    ville: input.ville,
    codePostal: input.codePostal,
  });

  const passesTried: string[] = [];
  const collected: SupplierSearchResult[] = [];
  let rawCount = 0;

  for (const pass of passes) {
    passesTried.push(`${pass.label}:${pass.query}`);
    logSupplierSearch("nominatimPass", passesTried[passesTried.length - 1]);

    try {
      const batch = await runPass({
        passQuery: pass.query,
        bounded: pass.bounded,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusKm: input.radiusKm,
      });
      rawCount += batch.length;
      collected.push(...batch);

      if (batch.length > 0) {
        logSupplierSearch("nominatimPassHit", pass.label);
        break;
      }
    } catch (error) {
      logSupplierSearch(
        "nominatimPassError",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const results = collected
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_RESULTS);

  logSupplierSearch("normalizedResults", results.length);
  setSearchCache(cacheKey, { results, passesTried, rawCount });

  return { results, passesTried, rawCount, fromCache: false };
}

/** @deprecated Utiliser supplier-search-types */
export type { SupplierSearchResult };
