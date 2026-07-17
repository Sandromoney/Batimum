import { distanceKmBetween } from "@/lib/maps/geo";
import { normalizeForBrandMatch } from "@/lib/fourniture/brand-normalization";
import {
  pickPreferredContactField,
  type SupplierContactFieldSource,
} from "@/lib/maps/supplier-contact";
import type { SupplierSearchResult } from "@/lib/maps/supplier-search-types";

function normalizeAddress(value: string): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceToContactSource(
  source: SupplierSearchResult["source"],
): SupplierContactFieldSource {
  if (source === "annuaire_entreprises") return "entreprise_public_data";
  if (source === "manual") return "manual";
  return "openstreetmap";
}

function completenessScore(item: SupplierSearchResult): number {
  const addressLen = (item.address ?? "").trim().length;
  const nameLen = (item.name ?? "").trim().length;
  const phoneScore = item.phone ? 40 : 0;
  const websiteScore = item.website ? 40 : 0;
  const externalScore = item.externalId ? 30 : 0;
  const addressScore = Math.min(60, addressLen / 2);
  const nameScore = Math.min(20, nameLen / 4);
  return phoneScore + websiteScore + externalScore + addressScore + nameScore;
}

function areDuplicates(a: SupplierSearchResult, b: SupplierSearchResult): boolean {
  if (a.id === b.id || (a.externalId && a.externalId === b.externalId)) {
    return true;
  }

  const sameAddress =
    normalizeAddress(a.address) &&
    normalizeAddress(a.address) === normalizeAddress(b.address) &&
    normalizeAddress(a.city) === normalizeAddress(b.city);
  if (sameAddress) return true;

  const km = distanceKmBetween(a.latitude, a.longitude, b.latitude, b.longitude);
  if (km < 0.1) return true;

  const sameNameCity =
    Boolean(normalizeForBrandMatch(a.name)) &&
    normalizeForBrandMatch(a.name) === normalizeForBrandMatch(b.name) &&
    Boolean(normalizeAddress(a.city)) &&
    normalizeAddress(a.city) === normalizeAddress(b.city);
  return sameNameCity && km < 0.1;
}

function mergeContactFields(
  current: SupplierSearchResult,
  candidate: SupplierSearchResult,
): Pick<
  SupplierSearchResult,
  "phone" | "website" | "phoneSource" | "websiteSource"
> {
  const phone = pickPreferredContactField(
    {
      value: current.phone,
      source:
        current.phoneSource ??
        (current.phone ? sourceToContactSource(current.source) : "unavailable"),
    },
    {
      value: candidate.phone,
      source:
        candidate.phoneSource ??
        (candidate.phone
          ? sourceToContactSource(candidate.source)
          : "unavailable"),
    },
  );

  const website = pickPreferredContactField(
    {
      value: current.website,
      source:
        current.websiteSource ??
        (current.website
          ? sourceToContactSource(current.source)
          : "unavailable"),
    },
    {
      value: candidate.website,
      source:
        candidate.websiteSource ??
        (candidate.website
          ? sourceToContactSource(candidate.source)
          : "unavailable"),
    },
  );

  return {
    phone: phone.value,
    website: website.value,
    phoneSource: phone.source,
    websiteSource: website.source,
  };
}

function mergeTwoResults(
  current: SupplierSearchResult,
  candidate: SupplierSearchResult,
): SupplierSearchResult {
  const preferCandidate = completenessScore(candidate) > completenessScore(current);
  const base = preferCandidate ? candidate : current;
  const other = preferCandidate ? current : candidate;
  const contacts = mergeContactFields(current, candidate);

  return {
    ...base,
    address: base.address?.trim() || other.address,
    city: base.city?.trim() || other.city,
    postcode: base.postcode?.trim() || other.postcode,
    externalId: base.externalId || other.externalId,
    displayName: base.displayName?.trim() || other.displayName,
    distanceKm: Math.min(current.distanceKm, candidate.distanceKm),
    ...contacts,
  };
}

/** Fusionne et déduplique les résultats multi-sources (contacts par champ). */
export function mergeSupplierSearchResults(
  batches: SupplierSearchResult[][],
): SupplierSearchResult[] {
  const flat = batches.flat();
  const groups: SupplierSearchResult[] = [];

  for (const item of flat) {
    const normalized: SupplierSearchResult = {
      ...item,
      phoneSource:
        item.phoneSource ??
        (item.phone ? sourceToContactSource(item.source) : "unavailable"),
      websiteSource:
        item.websiteSource ??
        (item.website ? sourceToContactSource(item.source) : "unavailable"),
    };

    let matchedIndex = -1;
    for (let i = 0; i < groups.length; i++) {
      if (areDuplicates(groups[i], normalized)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      groups.push(normalized);
    } else {
      groups[matchedIndex] = mergeTwoResults(groups[matchedIndex], normalized);
    }
  }

  groups.sort((a, b) => a.distanceKm - b.distanceKm);
  return groups;
}
