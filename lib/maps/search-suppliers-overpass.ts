import { distanceKmBetween } from "@/lib/maps/geo";
import { isInFrance } from "@/lib/maps/france-bounds";
import { requestOverpassViaHttps } from "@/lib/maps/overpass-http";
import {
  logSupplierSearch,
  logSupplierSearchError,
} from "@/lib/maps/supplier-search-logger";
import {
  getSearchCache,
  setSearchCache,
} from "@/lib/maps/search-cache";
import {
  buildOverpassPattern,
  inferEnseigneFromQuery,
  KNOWN_SUPPLIER_BRANDS,
} from "@/lib/fourniture/brand-normalization";
import { extractContactFromOsmTags } from "@/lib/maps/supplier-contact";

const KNOWN_BRANDS = KNOWN_SUPPLIER_BRANDS;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;

const OVERPASS_TIMEOUT_MS = 15_000;
const OVERPASS_USER_AGENT = "Batimum/1.0 (+https://batimum.fr; supplier-search)";
const DEFAULT_RADIUS_METERS = 30_000;
const MAX_RESULTS = 20;

const RETRY_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

export type SupplierSearchResult = {
  osmId: string;
  osmType: "node" | "way" | "relation";
  name: string;
  brand: string;
  operator?: string;
  address: string;
  city: string;
  postcode: string;
  phone?: string;
  website?: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

export type SupplierSearchOutcome = {
  results: SupplierSearchResult[];
  endpoint?: string;
  rawElementCount: number;
  normalizedCount: number;
  fromCache: boolean;
  overpassQuery: string;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
  remark?: string;
};

export { inferEnseigneFromQuery, buildOverpassPattern };

export class SupplierOverpassError extends Error {
  constructor(
    message: string,
    public readonly endpoint?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "SupplierOverpassError";
  }
}

function buildSupplierSearchCacheKey(input: {
  enseigne: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}): string {
  const brand = input.enseigne.trim().toLowerCase().replace(/\s+/g, " ");
  return `suppliers:v3:${brand}:${input.latitude.toFixed(4)}:${input.longitude.toFixed(4)}:${input.radiusMeters}`;
}

function getCoordinates(element: OverpassElement): { lat: number; lon: number } | null {
  if (element.type === "node") {
    if (typeof element.lat === "number" && typeof element.lon === "number") {
      return { lat: element.lat, lon: element.lon };
    }
    return null;
  }

  if (element.center) {
    return { lat: element.center.lat, lon: element.center.lon };
  }

  return null;
}

function buildAddress(tags: Record<string, string>): string {
  if (tags["addr:full"]?.trim()) return tags["addr:full"].trim();

  const streetLine = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ")
    .trim();

  const cityLine = [tags["addr:postcode"], tags["addr:city"] ?? tags["addr:town"]]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [streetLine, cityLine].filter(Boolean).join(", ");
}

function parseElement(
  element: OverpassElement,
  enseigne: string,
  companyLat: number,
  companyLon: number,
): SupplierSearchResult | null {
  const coords = getCoordinates(element);
  const tags = element.tags ?? {};
  if (!coords) return null;
  if (!isInFrance(coords.lat, coords.lon)) return null;

  const name = tags.name?.trim() || tags.brand?.trim() || tags.operator?.trim();
  if (!name) return null;

  const brand = tags.brand?.trim() || "";
  const operator = tags.operator?.trim() || undefined;
  const contact = extractContactFromOsmTags(tags);

  return {
    osmId: `${element.type}/${element.id}`,
    osmType: element.type,
    name,
    brand: brand || operator || enseigne,
    operator,
    address: buildAddress(tags),
    city: tags["addr:city"]?.trim() || tags["addr:town"]?.trim() || "",
    postcode: tags["addr:postcode"]?.trim() || "",
    phone: contact.phone,
    website: contact.website,
    latitude: coords.lat,
    longitude: coords.lon,
    distanceKm: distanceKmBetween(
      companyLat,
      companyLon,
      coords.lat,
      coords.lon,
    ),
  };
}

export function buildOverpassQuery(
  lat: number,
  lon: number,
  radiusMeters: number,
  pattern: string,
): string {
  const around = `around:${radiusMeters},${lat},${lon}`;
  const timeoutSeconds = radiusMeters > 30_000 ? 45 : 25;

  return `[out:json][timeout:${timeoutSeconds}];
(
  nwr(${around})["name"~"${pattern}",i];
  nwr(${around})["brand"~"${pattern}",i];
  nwr(${around})["operator"~"${pattern}",i];
);
out center tags;`;
}

async function postOverpass(
  endpoint: string,
  overpassQuery: string,
): Promise<{ status: number; text: string }> {
  const body = `data=${encodeURIComponent(overpassQuery)}`;
  const allowInsecure =
    process.env.OVERPASS_INSECURE_TLS === "true" ||
    process.env.NODE_ENV === "development";

  // undici fetch ne permet pas rejectUnauthorized — utiliser HTTPS natif si TLS souple requis
  if (allowInsecure) {
    return requestOverpassViaHttps(
      endpoint,
      body,
      OVERPASS_TIMEOUT_MS,
      OVERPASS_USER_AGENT,
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
          "User-Agent": OVERPASS_USER_AGENT,
        },
        body,
        cache: "no-store",
        signal: controller.signal,
      });

      return {
        status: response.status,
        text: await response.text(),
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (fetchError) {
    logSupplierSearch(
      "errorMessage",
      `fetch() échoué sur ${endpoint}: ${
        fetchError instanceof Error ? fetchError.message : String(fetchError)
      }`,
    );
    logSupplierSearch("errorMessage", "Tentative fallback HTTPS node…");

    return requestOverpassViaHttps(
      endpoint,
      body,
      OVERPASS_TIMEOUT_MS,
      OVERPASS_USER_AGENT,
    );
  }
}

async function fetchOverpass(overpassQuery: string): Promise<{
  data: OverpassResponse;
  endpoint: string;
  status: number;
}> {
  let lastError: SupplierOverpassError | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    logSupplierSearch("endpoint", endpoint);
    logSupplierSearch("overpassQuery", overpassQuery);

    try {
      const { status, text } = await postOverpass(endpoint, overpassQuery);
      logSupplierSearch("httpStatus", status);
      logSupplierSearch("responsePreview", text.slice(0, 400));

      if (!status || RETRY_HTTP_STATUSES.has(status)) {
        lastError = new SupplierOverpassError(
          `Overpass HTTP ${status || "unknown"}`,
          endpoint,
          status,
        );
        continue;
      }

      if (status < 200 || status >= 300) {
        lastError = new SupplierOverpassError(`Overpass HTTP ${status}`, endpoint, status);
        continue;
      }

      let data: OverpassResponse;
      try {
        data = JSON.parse(text) as OverpassResponse;
      } catch {
        lastError = new SupplierOverpassError("Réponse Overpass non JSON", endpoint, status);
        continue;
      }

      if (data.remark && !Array.isArray(data.elements)) {
        lastError = new SupplierOverpassError(data.remark, endpoint, status);
        continue;
      }

      if (!Array.isArray(data.elements)) {
        lastError = new SupplierOverpassError("Réponse Overpass invalide", endpoint, status);
        continue;
      }

      logSupplierSearch("rawElements", data.elements.length);
      return { data, endpoint, status };
    } catch (error) {
      logSupplierSearchError(error);
      const message =
        error instanceof Error
          ? error.name === "AbortError"
            ? `Timeout Overpass (${OVERPASS_TIMEOUT_MS}ms)`
            : error.message
          : "Overpass indisponible";
      lastError = new SupplierOverpassError(message, endpoint);
    }
  }

  throw lastError ?? new SupplierOverpassError("Tous les endpoints Overpass ont échoué");
}

export async function searchSuppliersOverpass(input: {
  query: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}): Promise<SupplierSearchOutcome> {
  const enseigne = inferEnseigneFromQuery(input.query);
  const radiusMeters = input.radiusMeters ?? DEFAULT_RADIUS_METERS;
  const pattern = buildOverpassPattern(input.query);
  const overpassQuery = buildOverpassQuery(
    input.latitude,
    input.longitude,
    radiusMeters,
    pattern,
  );

  logSupplierSearch("query", input.query);
  logSupplierSearch("latitude", input.latitude);
  logSupplierSearch("longitude", input.longitude);
  logSupplierSearch("radius", radiusMeters);

  const cacheKey = buildSupplierSearchCacheKey({
    enseigne,
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMeters,
  });

  const cached = getSearchCache<SupplierSearchResult[]>(cacheKey);
  if (cached) {
    logSupplierSearch("rawElements", cached.length);
    logSupplierSearch("normalizedResults", cached.length);
    return {
      results: cached,
      rawElementCount: cached.length,
      normalizedCount: cached.length,
      fromCache: true,
      overpassQuery,
    };
  }

  const { data, endpoint } = await fetchOverpass(overpassQuery);
  const rawElementCount = data.elements?.length ?? 0;

  const seen = new Set<string>();
  const results: SupplierSearchResult[] = [];

  for (const element of data.elements ?? []) {
    const parsed = parseElement(
      element,
      enseigne,
      input.latitude,
      input.longitude,
    );
    if (!parsed) continue;

    const dedupeKey = parsed.osmId;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    results.push(parsed);
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  const limited = results.slice(0, MAX_RESULTS);

  logSupplierSearch("normalizedResults", limited.length);

  setSearchCache(cacheKey, limited);

  return {
    results: limited,
    endpoint,
    rawElementCount,
    normalizedCount: limited.length,
    fromCache: false,
    overpassQuery,
  };
}

/** @deprecated compat places-search */
export async function searchSuppliersOverpassLegacy(input: {
  query: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}): Promise<Array<{
  osmId: string;
  osmType: "node" | "way" | "relation";
  name: string;
  brand: string;
  address: string;
  city: string;
  postcode: string;
  phone?: string;
  website?: string;
  latitude: number;
  longitude: number;
}>> {
  const outcome = await searchSuppliersOverpass(input);
  return outcome.results.map(({ distanceKm: _, operator: __, ...item }) => ({
    osmId: item.osmId,
    osmType: item.osmType,
    name: item.name,
    brand: item.brand,
    address: item.address,
    city: item.city,
    postcode: item.postcode,
    phone: item.phone,
    website: item.website,
    latitude: item.latitude,
    longitude: item.longitude,
  }));
}
