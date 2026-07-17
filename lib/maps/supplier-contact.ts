/**
 * Extraction et normalisation téléphone / site web fournisseurs.
 * Ne jamais inventer : uniquement les valeurs présentes dans la source.
 */

export type SupplierContactFieldSource =
  | "openstreetmap"
  | "entreprise_public_data"
  | "manual"
  | "unavailable";

export type ExtractedContact = {
  phone?: string;
  website?: string;
  phoneSource: SupplierContactFieldSource;
  websiteSource: SupplierContactFieldSource;
};

type TagBag = Record<string, string | undefined> | undefined;

function firstNonEmpty(
  tags: TagBag,
  keys: string[],
): string | undefined {
  if (!tags) return undefined;
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Priorité téléphone OSM : contact:phone → phone → contact:mobile → mobile */
export function extractPhoneFromTags(tags: TagBag): string | undefined {
  return firstNonEmpty(tags, [
    "contact:phone",
    "phone",
    "contact:mobile",
    "mobile",
  ]);
}

/** Priorité site OSM : contact:website → website → url */
export function extractWebsiteFromTags(tags: TagBag): string | undefined {
  return firstNonEmpty(tags, ["contact:website", "website", "url"]);
}

/**
 * Normalise un numéro français sans inventer de chiffres.
 * Conserve +33 si présent ; sinon format national lisible.
 * Retourne undefined si trop ambigu.
 */
export function normalizeFrenchPhone(raw: string | undefined | null): string | undefined {
  if (!raw?.trim()) return undefined;

  const original = raw.trim();
  // Plusieurs numéros séparés : garder le premier segment clair
  const firstSegment = original.split(/[;|/]/)[0]?.trim() ?? original;

  const digitsAndPlus = firstSegment.replace(/[^\d+]/g, "");
  if (!digitsAndPlus) return undefined;

  let digits = digitsAndPlus.replace(/\D/g, "");
  const hadPlus33 =
    digitsAndPlus.startsWith("+33") ||
    digitsAndPlus.startsWith("0033") ||
    (digits.startsWith("33") && digits.length >= 11);

  if (digits.startsWith("0033")) digits = digits.slice(4);
  else if (digits.startsWith("33") && digits.length >= 11) digits = digits.slice(2);

  // National : 0XXXXXXXXX (10 chiffres) ou international 9 chiffres après 33
  if (digits.length === 9 && hadPlus33) {
    digits = `0${digits}`;
  }

  if (digits.length !== 10 || !digits.startsWith("0")) {
    // Ambigu : ne pas reformater, retourner tel quel si ça ressemble à un numéro
    const cleaned = firstSegment.replace(/\s+/g, " ").trim();
    return /\d{6,}/.test(cleaned) ? cleaned : undefined;
  }

  const groups = [
    digits.slice(0, 2),
    digits.slice(2, 4),
    digits.slice(4, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ];

  if (hadPlus33 || original.includes("+33")) {
    return `+33 ${digits.slice(1, 2)} ${groups.slice(1).join(" ")}`.replace(
      /\s+/g,
      " ",
    );
  }

  return groups.join(" ");
}

/**
 * Normalise une URL : ajoute https:// si besoin, refuse les invalides.
 */
export function normalizeWebsite(raw: string | undefined | null): string | undefined {
  if (!raw?.trim()) return undefined;

  let value = raw.trim();
  // Refuser emails / javascript / fragments non-URL
  if (value.includes("@") && !value.includes("/")) return undefined;
  if (/^(javascript|mailto|tel):/i.test(value)) return undefined;

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  try {
    const url = new URL(value);
    if (!url.hostname || !url.hostname.includes(".")) return undefined;
    // Nettoyage trailing slash unique sur racine
    const href = url.href.replace(/\/$/, "");
    return href || undefined;
  } catch {
    return undefined;
  }
}

export function extractContactFromOsmTags(
  tags: TagBag,
  source: "openstreetmap" = "openstreetmap",
): ExtractedContact {
  const phone = normalizeFrenchPhone(extractPhoneFromTags(tags));
  const website = normalizeWebsite(extractWebsiteFromTags(tags));

  return {
    phone,
    website,
    phoneSource: phone ? source : "unavailable",
    websiteSource: website ? source : "unavailable",
  };
}

export function contactFromKnownValues(input: {
  phone?: string | null;
  website?: string | null;
  phoneSource?: SupplierContactFieldSource;
  websiteSource?: SupplierContactFieldSource;
}): ExtractedContact {
  const phone = normalizeFrenchPhone(input.phone ?? undefined);
  const website = normalizeWebsite(input.website ?? undefined);

  return {
    phone,
    website,
    phoneSource: phone
      ? (input.phoneSource && input.phoneSource !== "unavailable"
          ? input.phoneSource
          : "openstreetmap")
      : "unavailable",
    websiteSource: website
      ? (input.websiteSource && input.websiteSource !== "unavailable"
          ? input.websiteSource
          : "openstreetmap")
      : "unavailable",
  };
}

/** Priorité de source pour fusion (plus élevé = préféré). */
export function contactSourcePriority(
  source: SupplierContactFieldSource | undefined,
): number {
  switch (source) {
    case "manual":
      return 40;
    case "openstreetmap":
      return 30;
    case "entreprise_public_data":
      return 20;
    default:
      return 0;
  }
}

export function pickPreferredContactField(
  current: { value?: string; source?: SupplierContactFieldSource },
  candidate: { value?: string; source?: SupplierContactFieldSource },
): { value?: string; source: SupplierContactFieldSource } {
  const curVal = current.value?.trim();
  const candVal = candidate.value?.trim();

  if (curVal && !candVal) {
    return {
      value: curVal,
      source: current.source ?? "unavailable",
    };
  }
  if (!curVal && candVal) {
    return {
      value: candVal,
      source: candidate.source ?? "unavailable",
    };
  }
  if (!curVal && !candVal) {
    return { source: "unavailable" };
  }

  // Les deux présents : ne jamais écraser manual sans confirmation (manual gagne)
  const curPrio = contactSourcePriority(current.source);
  const candPrio = contactSourcePriority(candidate.source);
  if (candPrio > curPrio) {
    return {
      value: candVal,
      source: candidate.source ?? "unavailable",
    };
  }
  return {
    value: curVal,
    source: current.source ?? "unavailable",
  };
}

export function formatWebsiteHref(url: string): string {
  const normalized = normalizeWebsite(url);
  return normalized ?? "";
}
