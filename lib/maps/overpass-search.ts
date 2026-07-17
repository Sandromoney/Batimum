import { distanceKmBetween } from "@/lib/maps/geo";
import type { OsmDepotResult } from "@/lib/maps/depot-types";

const KNOWN_BRANDS = [
  "Point.P",
  "CEDEO",
  "Gedimat",
  "BigMat",
  "Rexel",
  "Richardson",
  "Samse",
] as const;

const BRAND_OVERPASS_PATTERNS: Record<string, string[]> = {
  "Point.P": ["Point\\.?P", "Point P"],
  CEDEO: ["CEDEO"],
  Gedimat: ["Gedimat"],
  BigMat: ["BigMat", "Big Mat"],
  Rexel: ["Rexel"],
  Richardson: ["Richardson"],
  Samse: ["Samse"],
};

export function inferEnseigneFromQuery(query: string): string {
  const normalized = query.toLowerCase().replace(/[\s.]+/g, "");
  for (const brand of KNOWN_BRANDS) {
    const brandNorm = brand.toLowerCase().replace(/\./g, "");
    if (normalized.includes(brandNorm) || brandNorm.includes(normalized)) {
      return brand;
    }
  }
  return query.trim();
}

function escapeOverpassRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildOverpassPattern(query: string): string {
  const enseigne = inferEnseigneFromQuery(query);
  const known = BRAND_OVERPASS_PATTERNS[enseigne];
  if (known?.length) {
    return known.join("|");
  }
  return escapeOverpassRegex(enseigne);
}

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
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function getCoordinates(element: OverpassElement): { lat: number; lon: number } | null {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.center) {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  return null;
}

function buildAddress(tags: Record<string, string>): string {
  if (tags["addr:full"]?.trim()) return tags["addr:full"].trim();

  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:place"],
  ].filter(Boolean);

  return parts.join(", ").trim();
}

function parseOsmElement(
  element: OverpassElement,
  enseigne: string,
  companyLat: number,
  companyLon: number,
): OsmDepotResult | null {
  const coords = getCoordinates(element);
  const tags = element.tags ?? {};
  if (!coords) return null;

  const name = tags.name?.trim() || tags.brand?.trim() || tags.operator?.trim();
  if (!name) return null;

  const adresse = buildAddress(tags);
  const ville = tags["addr:city"]?.trim() || tags["addr:town"]?.trim() || "";
  const codePostal = tags["addr:postcode"]?.trim() || "";

  return {
    osmId: `${element.type}/${element.id}`,
    name,
    enseigne: tags.brand?.trim() || tags.operator?.trim() || enseigne,
    adresse,
    ville,
    codePostal,
    latitude: coords.lat,
    longitude: coords.lon,
    distanceKm: distanceKmBetween(companyLat, companyLon, coords.lat, coords.lon),
    telephone: tags.phone?.trim() || tags["contact:phone"]?.trim() || undefined,
    siteWeb: tags.website?.trim() || tags["contact:website"]?.trim() || undefined,
  };
}

function buildOverpassQuery(lat: number, lon: number, radiusMeters: number, pattern: string): string {
  const around = `around:${radiusMeters},${lat},${lon}`;
  return `
[out:json][timeout:30];
(
  nwr(${around})["name"~"${pattern}",i];
  nwr(${around})["brand"~"${pattern}",i];
  nwr(${around})["operator"~"${pattern}",i];
);
out center tags;
`.trim();
}

async function fetchOverpass(query: string): Promise<OverpassResponse> {
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
      });

      if (!response.ok) {
        lastError = new Error(`Overpass HTTP ${response.status}`);
        continue;
      }

      const data = (await response.json()) as OverpassResponse;
      if (!Array.isArray(data.elements)) {
        lastError = new Error("Réponse Overpass invalide");
        continue;
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Overpass indisponible");
    }
  }

  throw lastError ?? new Error("Overpass indisponible");
}

export async function searchOsmDepotsNear(input: {
  query: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  maxResults?: number;
}): Promise<OsmDepotResult[]> {
  const pattern = buildOverpassPattern(input.query);
  const radiusMeters = Math.round(input.radiusKm * 1000);
  const enseigne = inferEnseigneFromQuery(input.query);
  const query = buildOverpassQuery(input.latitude, input.longitude, radiusMeters, pattern);

  const data = await fetchOverpass(query);
  const seen = new Set<string>();
  const depots: OsmDepotResult[] = [];

  for (const element of data.elements ?? []) {
    const parsed = parseOsmElement(
      element,
      enseigne,
      input.latitude,
      input.longitude,
    );
    if (!parsed || seen.has(parsed.osmId)) continue;
    seen.add(parsed.osmId);
    depots.push(parsed);
  }

  depots.sort((a, b) => a.distanceKm - b.distanceKm);
  return depots.slice(0, input.maxResults ?? 25);
}
