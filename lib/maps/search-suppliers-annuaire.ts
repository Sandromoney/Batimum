import { distanceKmBetween } from "@/lib/maps/geo";
import { isInFrance } from "@/lib/maps/france-bounds";
import { geocodeFrenchAddress } from "@/lib/maps/geocode-french-address";
import { httpsRequest } from "@/lib/maps/overpass-http";
import {
  getDepartmentCode,
  normalizeSupplierBrandQuery,
  normalizeSupplierQuery,
  stripAccents,
} from "@/lib/fourniture/brand-normalization";
import {
  getSearchCache,
  setSearchCache,
} from "@/lib/maps/search-cache";
import { logSupplierSearch } from "@/lib/maps/supplier-search-logger";
import type { SupplierSearchResult } from "@/lib/maps/supplier-search-types";

const ANNUAIRE_URL = "https://recherche-entreprises.api.gouv.fr/search";
const TIMEOUT_MS = 12_000;
const MAX_RESULTS = 20;

type AnnuaireEtablissement = {
  siret?: string;
  adresse?: string;
  code_postal?: string;
  libelle_commune?: string;
  latitude?: string;
  longitude?: string;
  etat_administratif?: string;
  est_siege?: boolean;
  nom_commercial?: string | null;
};

type AnnuaireEntreprise = {
  siren?: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  etat_administratif?: string;
  siege?: AnnuaireEtablissement;
  matching_etablissements?: AnnuaireEtablissement[];
};

type AnnuaireResponse = {
  results?: AnnuaireEntreprise[];
};

function buildCacheKey(input: {
  query: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  codePostal?: string;
}): string {
  const q = normalizeSupplierQuery(normalizeSupplierBrandQuery(input.query));
  return `annuaire:v2:${q}:${input.latitude.toFixed(4)}:${input.longitude.toFixed(4)}:${input.radiusKm}:${input.codePostal ?? ""}`;
}

function parseStreetAddress(raw: string): string {
  const trimmed = raw.trim();
  const withoutCpCity = trimmed
    .replace(/\b\d{5}\b\s+[A-ZÀ-Ü][A-ZÀ-Ü\s-]+$/i, "")
    .trim();
  return withoutCpCity || trimmed;
}

function brandMatchesQuery(brandName: string, query: string): boolean {
  const brandNorm = normalizeSupplierQuery(brandName);
  const queryNorm = normalizeSupplierQuery(normalizeSupplierBrandQuery(query));
  if (!brandNorm || !queryNorm) return false;
  return brandNorm.includes(queryNorm) || queryNorm.includes(brandNorm);
}

async function toSupplierResult(
  etab: AnnuaireEtablissement,
  company: AnnuaireEntreprise,
  query: string,
  companyLat: number,
  companyLon: number,
): Promise<SupplierSearchResult | null> {
  if (etab.etat_administratif && etab.etat_administratif !== "A") {
    return null;
  }

  const brandName =
    normalizeSupplierBrandQuery(query) ||
    company.nom_complet?.trim() ||
    company.nom_raison_sociale?.trim() ||
    "";
  const city = etab.libelle_commune?.trim() || "";
  const postcode = etab.code_postal?.trim() || "";
  const rawAddress = etab.adresse?.trim() || "";
  const street = parseStreetAddress(rawAddress);

  let latitude = Number(etab.latitude);
  let longitude = Number(etab.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const geocoded = await geocodeFrenchAddress({
      adresse: street,
      codePostal: postcode,
      ville: city,
    });
    if (!geocoded) return null;
    latitude = geocoded.latitude;
    longitude = geocoded.longitude;
  }

  if (!isInFrance(latitude, longitude)) return null;

  const distanceKm = distanceKmBetween(companyLat, companyLon, latitude, longitude);
  const displayName = city ? `${brandName} ${city}` : brandName;
  const siret = etab.siret?.trim();

  return {
    id: siret ? `siret/${siret}` : `annuaire/${company.siren ?? "unknown"}`,
    externalId: siret,
    name: displayName,
    displayName: rawAddress ? `${displayName}, ${rawAddress}` : displayName,
    address: street,
    city,
    postcode,
    latitude,
    longitude,
    distanceKm,
    phoneSource: "unavailable",
    websiteSource: "unavailable",
    source: "annuaire_entreprises",
  };
}

async function annuaireRequest(params: URLSearchParams): Promise<AnnuaireEntreprise[]> {
  const url = `${ANNUAIRE_URL}?${params.toString()}`;
  logSupplierSearch("annuaireUrl", url);

  const { status, text } = await httpsRequest({
    url,
    method: "GET",
    timeoutMs: TIMEOUT_MS,
    headers: { Accept: "application/json" },
  });

  if (status < 200 || status >= 300) {
    throw new Error(`Annuaire entreprises HTTP ${status}`);
  }

  const data = JSON.parse(text) as AnnuaireResponse;
  return data.results ?? [];
}

function collectEstablishments(
  companies: AnnuaireEntreprise[],
  query: string,
): Array<{ company: AnnuaireEntreprise; etab: AnnuaireEtablissement }> {
  const items: Array<{ company: AnnuaireEntreprise; etab: AnnuaireEtablissement }> = [];

  for (const company of companies) {
    const brandName = company.nom_complet ?? company.nom_raison_sociale ?? "";
    if (!brandMatchesQuery(brandName, query)) continue;

    const etabs = [
      ...(company.matching_etablissements ?? []),
      ...(company.siege ? [company.siege] : []),
    ];

    const seenSiret = new Set<string>();
    for (const etab of etabs) {
      const siret = etab.siret?.trim();
      if (siret && seenSiret.has(siret)) continue;
      if (siret) seenSiret.add(siret);
      items.push({ company, etab });
    }
  }

  return items;
}

export async function searchSuppliersAnnuaire(input: {
  query: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  ville?: string;
  codePostal?: string;
}): Promise<{
  results: SupplierSearchResult[];
  queriesTried: string[];
  rawCount: number;
  fromCache: boolean;
}> {
  const cacheKey = buildCacheKey(input);
  const cached = getSearchCache<{
    results: SupplierSearchResult[];
    queriesTried: string[];
    rawCount: number;
  }>(cacheKey);

  if (cached) {
    return { ...cached, fromCache: true };
  }

  const brand = normalizeSupplierBrandQuery(input.query);
  const brandAscii = stripAccents(brand);
  const dept = input.codePostal ? getDepartmentCode(input.codePostal) : null;

  const queries: Array<{ q: string; code_postal?: string; departement?: string }> = [
    { q: brandAscii, code_postal: input.codePostal },
    { q: brand, code_postal: input.codePostal },
    { q: brandAscii, departement: dept ?? undefined },
    { q: `${brandAscii} ${input.ville ?? ""}`.trim() },
  ];

  const queriesTried: string[] = [];
  const rawEstablishments: Array<{
    company: AnnuaireEntreprise;
    etab: AnnuaireEtablissement;
  }> = [];

  for (const queryDef of queries) {
    if (!queryDef.q) continue;

    const params = new URLSearchParams({
      q: queryDef.q,
      per_page: "10",
    });
    if (queryDef.code_postal) params.set("code_postal", queryDef.code_postal);
    if (queryDef.departement) params.set("departement", queryDef.departement);

    const label = params.toString();
    queriesTried.push(label);
    logSupplierSearch("annuaireQuery", label);

    try {
      const companies = await annuaireRequest(params);
      const batch = collectEstablishments(companies, input.query);
      rawEstablishments.push(...batch);
      if (batch.length > 0) break;
    } catch (error) {
      logSupplierSearch(
        "annuaireError",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const results: SupplierSearchResult[] = [];
  const seen = new Set<string>();

  for (const { company, etab } of rawEstablishments) {
    const parsed = await toSupplierResult(
      etab,
      company,
      input.query,
      input.latitude,
      input.longitude,
    );
    if (!parsed) continue;
    if (parsed.distanceKm > input.radiusKm) continue;
    if (seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    results.push(parsed);
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  const limited = results.slice(0, MAX_RESULTS);

  setSearchCache(cacheKey, {
    results: limited,
    queriesTried,
    rawCount: rawEstablishments.length,
  });

  return {
    results: limited,
    queriesTried,
    rawCount: rawEstablishments.length,
    fromCache: false,
  };
}
