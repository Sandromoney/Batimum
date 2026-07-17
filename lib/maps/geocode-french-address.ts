import { httpsRequest } from "@/lib/maps/overpass-http";

type AdresseFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    label?: string;
    score?: number;
  };
};

/** Géocode une adresse française via l'API Adresse officielle. */
export async function geocodeFrenchAddress(input: {
  adresse: string;
  codePostal?: string;
  ville?: string;
}): Promise<{ latitude: number; longitude: number; label: string } | null> {
  const parts = [input.adresse, input.codePostal, input.ville]
    .map((part) => part?.trim())
    .filter(Boolean);
  const query = parts.join(" ");
  if (!query) return null;

  const url = new URL("https://api-adresse.data.gouv.fr/search/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");

  try {
    const { status, text } = await httpsRequest({
      url: url.toString(),
      method: "GET",
      timeoutMs: 8_000,
      headers: { Accept: "application/json" },
    });

    if (status < 200 || status >= 300) return null;

    const data = JSON.parse(text) as { features?: AdresseFeature[] };
    const feature = data.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;

    const score = feature.properties?.score ?? 0;
    if (score < 0.4) return null;

    const [longitude, latitude] = coords;
    return {
      latitude,
      longitude,
      label: feature.properties?.label?.trim() || query,
    };
  } catch {
    return null;
  }
}
