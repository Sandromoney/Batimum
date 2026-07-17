import type { GeocodedLocation } from "@/lib/maps/depot-types";

type AdresseFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    label?: string;
    city?: string;
    postcode?: string;
  };
};

export async function geocodeFrenchAddress(
  address: string,
): Promise<GeocodedLocation | null> {
  const url = new URL("https://api-adresse.data.gouv.fr/search/");
  url.searchParams.set("q", address);
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { features?: AdresseFeature[] };
  const feature = data.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const [longitude, latitude] = coords;
  const props = feature.properties ?? {};

  return {
    latitude,
    longitude,
    formattedAddress: props.label?.trim() || address,
  };
}
