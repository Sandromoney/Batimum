import { distanceKmBetween } from "@/lib/maps/geo";

export type GeocodedLocation = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

export type DepotPlaceResult = {
  placeId: string;
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
};

const KNOWN_BRANDS = [
  "Point.P",
  "CEDEO",
  "Gedimat",
  "BigMat",
  "Rexel",
  "Richardson",
] as const;

export function inferEnseigneFromQuery(query: string): string {
  const normalized = query.toLowerCase().replace(/\s+/g, "");
  for (const brand of KNOWN_BRANDS) {
    const brandNorm = brand.toLowerCase().replace(/\./g, "");
    if (normalized.includes(brandNorm) || brandNorm.includes(normalized)) {
      return brand;
    }
  }
  return query.trim();
}

function parseAddressComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
): { ville: string; codePostal: string } {
  let ville = "";
  let codePostal = "";
  for (const part of components) {
    if (part.types.includes("postal_code")) codePostal = part.long_name;
    if (part.types.includes("locality")) ville = part.long_name;
    if (!ville && part.types.includes("postal_town")) ville = part.long_name;
  }
  return { ville, codePostal };
}

export function getGoogleMapsServerKey(): string | undefined {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    undefined
  );
}

export async function geocodeAddress(
  address: string,
  apiKey: string,
): Promise<GeocodedLocation | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("region", "fr");

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const data = (await response.json()) as {
    status: string;
    results?: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };

  const result = data.results?.[0];
  if (data.status !== "OK" || !result) return null;

  return {
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<{
  telephone?: string;
  siteWeb?: string;
  ville: string;
  codePostal: string;
  adresse: string;
}> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,formatted_address,formatted_phone_number,website,address_components,geometry",
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "fr");

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const data = (await response.json()) as {
    status: string;
    result?: {
      formatted_address?: string;
      formatted_phone_number?: string;
      website?: string;
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    };
  };

  const result = data.result;
  const parsed = parseAddressComponents(result?.address_components ?? []);
  return {
    telephone: result?.formatted_phone_number,
    siteWeb: result?.website,
    ville: parsed.ville,
    codePostal: parsed.codePostal,
    adresse: result?.formatted_address ?? "",
  };
}

export async function searchDepotsNearCompany(input: {
  query: string;
  companyAddress: string;
  apiKey: string;
  maxResults?: number;
  maxDistanceKm?: number;
}): Promise<{
  company: GeocodedLocation;
  depots: DepotPlaceResult[];
}> {
  const company = await geocodeAddress(input.companyAddress, input.apiKey);
  if (!company) {
    throw new Error("Impossible de géocoder l'adresse de l'entreprise.");
  }

  const enseigne = inferEnseigneFromQuery(input.query);
  const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  searchUrl.searchParams.set("query", `${enseigne} ${input.companyAddress}`);
  searchUrl.searchParams.set(
    "location",
    `${company.latitude},${company.longitude}`,
  );
  searchUrl.searchParams.set("radius", "50000");
  searchUrl.searchParams.set("key", input.apiKey);
  searchUrl.searchParams.set("language", "fr");

  const response = await fetch(searchUrl.toString(), { next: { revalidate: 300 } });
  const data = (await response.json()) as {
    status: string;
    results?: Array<{
      place_id: string;
      name: string;
      formatted_address?: string;
      geometry?: { location: { lat: number; lng: number } };
    }>;
  };

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Recherche Google Places : ${data.status}`);
  }

  const rawResults = (data.results ?? []).slice(0, input.maxResults ?? 12);
  const depots: DepotPlaceResult[] = [];

  for (const place of rawResults) {
    if (!place.geometry?.location) continue;
    const lat = place.geometry.location.lat;
    const lng = place.geometry.location.lng;
    const distanceKm = distanceKmBetween(
      company.latitude,
      company.longitude,
      lat,
      lng,
    );
    if (distanceKm > (input.maxDistanceKm ?? 80)) continue;

    const details = await fetchPlaceDetails(place.place_id, input.apiKey);
    depots.push({
      placeId: place.place_id,
      name: place.name,
      enseigne,
      adresse: details.adresse || place.formatted_address || "",
      ville: details.ville,
      codePostal: details.codePostal,
      latitude: lat,
      longitude: lng,
      distanceKm,
      telephone: details.telephone,
      siteWeb: details.siteWeb,
    });
  }

  depots.sort((a, b) => a.distanceKm - b.distanceKm);
  return { company, depots };
}
