import { distanceKmBetween } from "@/lib/maps/geo";
import { inferEnseigneFromQuery } from "@/lib/fourniture/brand-normalization";

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
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
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
  url.searchParams.set("language", "fr");

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
  email?: string;
  ville: string;
  codePostal: string;
  adresse: string;
}> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,formatted_address,formatted_phone_number,international_phone_number,website,address_components,geometry",
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "fr");

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const data = (await response.json()) as {
    status: string;
    result?: {
      formatted_address?: string;
      formatted_phone_number?: string;
      international_phone_number?: string;
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
    telephone:
      result?.formatted_phone_number || result?.international_phone_number,
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
  locationBias?: { latitude: number; longitude: number };
}): Promise<{
  company: GeocodedLocation;
  depots: DepotPlaceResult[];
}> {
  const enseigne = inferEnseigneFromQuery(input.query);
  let company =
    (await geocodeAddress(input.companyAddress, input.apiKey)) ?? null;

  if (!company && input.locationBias) {
    company = {
      latitude: input.locationBias.latitude,
      longitude: input.locationBias.longitude,
      formattedAddress: input.companyAddress,
    };
  }

  if (!company) {
    throw new Error("Impossible de géocoder l'adresse de l'entreprise.");
  }

  const biasLat = input.locationBias?.latitude ?? company.latitude;
  const biasLng = input.locationBias?.longitude ?? company.longitude;
  const radiusMeters = Math.min(
    Math.round((input.maxDistanceKm ?? 50) * 1000),
    50_000,
  );

  // Text Search autour de l'entreprise — variantes d'enseigne (Point P, CEDEO…).
  const searchUrl = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json",
  );
  searchUrl.searchParams.set("query", `${enseigne} matériaux`);
  searchUrl.searchParams.set("location", `${biasLat},${biasLng}`);
  searchUrl.searchParams.set("radius", String(radiusMeters));
  searchUrl.searchParams.set("key", input.apiKey);
  searchUrl.searchParams.set("language", "fr");
  searchUrl.searchParams.set("region", "fr");

  const response = await fetch(searchUrl.toString(), {
    next: { revalidate: 300 },
  });
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
    // Repli sans « matériaux » si le status échoue pour autre raison.
    throw new Error(`Recherche Google Places : ${data.status}`);
  }

  let rawResults = data.results ?? [];

  // Si trop peu de résultats, 2ᵉ passe avec la requête brute.
  if (rawResults.length < 3) {
    const fallbackUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
    );
    fallbackUrl.searchParams.set("query", enseigne);
    fallbackUrl.searchParams.set("location", `${biasLat},${biasLng}`);
    fallbackUrl.searchParams.set("radius", String(radiusMeters));
    fallbackUrl.searchParams.set("key", input.apiKey);
    fallbackUrl.searchParams.set("language", "fr");
    fallbackUrl.searchParams.set("region", "fr");
    const fallbackResponse = await fetch(fallbackUrl.toString(), {
      next: { revalidate: 300 },
    });
    const fallbackData = (await fallbackResponse.json()) as typeof data;
    if (fallbackData.status === "OK" && fallbackData.results?.length) {
      const seen = new Set(rawResults.map((r) => r.place_id));
      for (const item of fallbackData.results) {
        if (!seen.has(item.place_id)) rawResults.push(item);
      }
    }
  }

  rawResults = rawResults.slice(0, input.maxResults ?? 16);
  const depots: DepotPlaceResult[] = [];

  for (const place of rawResults) {
    if (!place.geometry?.location) continue;
    const lat = place.geometry.location.lat;
    const lng = place.geometry.location.lng;
    const distanceKm = distanceKmBetween(biasLat, biasLng, lat, lng);
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
