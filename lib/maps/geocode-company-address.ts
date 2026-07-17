import "@/lib/stripe-tls-dev";

export type CompanyAddressInput = {
  adresse: string;
  codePostal: string;
  ville: string;
};

export type CompanyGeocodeResult = {
  latitude: number;
  longitude: number;
  label: string;
  score: number;
};

export const COMPANY_ADDRESS_EMPTY_MESSAGE =
  "Renseignez l'adresse de votre entreprise dans Paramètres > Entreprise.";

export const COMPANY_ADDRESS_UNRELIABLE_MESSAGE =
  "Impossible de localiser précisément l'adresse de votre entreprise. Vérifiez-la dans Paramètres > Entreprise.";

/** Score minimal accepté (API Adresse, échelle 0–1). */
const MIN_RELIABLE_SCORE = 0.5;

type AdresseFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    label?: string;
    score?: number;
  };
};

export function buildCompanyAddressQuery(input: CompanyAddressInput): string | null {
  const adresse = input.adresse.trim();
  const codePostal = input.codePostal.trim();
  const ville = input.ville.trim();

  if (!adresse || !codePostal || !ville) {
    return null;
  }

  return `${adresse}, ${codePostal} ${ville}`;
}

export function isCompanyAddressComplete(input: CompanyAddressInput): boolean {
  return buildCompanyAddressQuery(input) != null;
}

export async function geocodeCompanyAddress(
  input: CompanyAddressInput,
): Promise<CompanyGeocodeResult | null> {
  const query = buildCompanyAddressQuery(input);
  if (!query) return null;

  const url = new URL("https://api-adresse.data.gouv.fr/search/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { features?: AdresseFeature[] };
  const feature = data.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const score = feature.properties?.score ?? 0;
  if (score < MIN_RELIABLE_SCORE) return null;

  const [longitude, latitude] = coords;
  const label = feature.properties?.label?.trim() || query;

  return {
    latitude,
    longitude,
    label,
    score,
  };
}
