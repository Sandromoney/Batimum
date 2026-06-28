import {
  FRANCE_REGIONS,
  getRegionByCode,
  type FranceRegion,
} from "@/lib/france-regions";
import type { BibliothequeEntreprise, Parametres } from "@/lib/types";

export type EntrepriseLocalisation = {
  regionCode: string;
  regionLabel: string;
  departementCode: string;
  departementLabel: string;
  ville?: string;
  source: "code_postal" | "departement_principal" | "texte" | "region_principale";
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findRegionByDepartementCode(code: string): {
  region: FranceRegion;
  departementLabel: string;
} | null {
  for (const region of FRANCE_REGIONS) {
    const dept = region.departements.find((item) => item.code === code);
    if (dept) {
      return { region, departementLabel: dept.label };
    }
  }
  return null;
}

function departementFromCodePostal(codePostal: string): string | null {
  const cp = codePostal.replace(/\s/g, "").toUpperCase();
  if (!cp) return null;

  if (/^20[0-9]{3}$/.test(cp)) {
    const num = Number(cp.slice(0, 3));
    return num >= 202 ? "2B" : "2A";
  }

  if (/^\d{5}$/.test(cp)) {
    const prefix2 = cp.slice(0, 2);
    const match = findRegionByDepartementCode(prefix2);
    if (match) return prefix2;
  }

  return null;
}

function findDepartementInText(text: string): {
  region: FranceRegion;
  departementCode: string;
  departementLabel: string;
} | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  for (const region of FRANCE_REGIONS) {
    for (const dept of region.departements) {
      const deptNorm = normalizeText(dept.label);
      if (deptNorm.length >= 3 && normalized.includes(deptNorm)) {
        return {
          region,
          departementCode: dept.code,
          departementLabel: dept.label,
        };
      }
    }
  }

  return null;
}

function findRegionInText(text: string): FranceRegion | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  return (
    FRANCE_REGIONS.find((region) => {
      const label = normalizeText(region.label);
      return label.length >= 4 && normalized.includes(label);
    }) ?? null
  );
}

/**
 * Déduit région et département depuis l'adresse entreprise (paramètres)
 * et éventuellement la bibliothèque MUM IA (département principal).
 */
export function resolveEntrepriseLocalisation(
  parametres: Parametres,
  bibliotheque?: BibliothequeEntreprise | null,
): EntrepriseLocalisation | null {
  const ville = parametres.ville?.trim() || undefined;
  const codePostal = parametres.codePostal?.trim() || "";
  const corpus = [parametres.adresse, ville, codePostal, parametres.pays]
    .filter(Boolean)
    .join(" ");

  const fromCp = codePostal ? departementFromCodePostal(codePostal) : null;
  if (fromCp) {
    const match = findRegionByDepartementCode(fromCp);
    if (match) {
      return {
        regionCode: match.region.code,
        regionLabel: match.region.label,
        departementCode: fromCp,
        departementLabel: match.departementLabel,
        ville,
        source: "code_postal",
      };
    }
  }

  const deptPrincipal = bibliotheque?.departementPrincipal?.trim();
  if (deptPrincipal) {
    const match = findRegionByDepartementCode(deptPrincipal.toUpperCase());
    if (match) {
      return {
        regionCode: match.region.code,
        regionLabel: match.region.label,
        departementCode: deptPrincipal.toUpperCase(),
        departementLabel: match.departementLabel,
        ville,
        source: "departement_principal",
      };
    }
  }

  const fromText = findDepartementInText(corpus);
  if (fromText) {
    return {
      regionCode: fromText.region.code,
      regionLabel: fromText.region.label,
      departementCode: fromText.departementCode,
      departementLabel: fromText.departementLabel,
      ville,
      source: "texte",
    };
  }

  const regionLabel = bibliotheque?.regionPrincipale?.trim();
  if (regionLabel) {
    const region = FRANCE_REGIONS.find(
      (item) => normalizeText(item.label) === normalizeText(regionLabel),
    );
    if (region) {
      const dept =
        (deptPrincipal &&
          region.departements.find((item) => item.code === deptPrincipal.toUpperCase())) ??
        region.departements[0];
      if (dept) {
        return {
          regionCode: region.code,
          regionLabel: region.label,
          departementCode: dept.code,
          departementLabel: dept.label,
          ville,
          source: "region_principale",
        };
      }
    }
  }

  const regionFromText = findRegionInText(corpus);
  if (regionFromText) {
    const dept = regionFromText.departements[0];
    return {
      regionCode: regionFromText.code,
      regionLabel: regionFromText.label,
      departementCode: dept.code,
      departementLabel: dept.label,
      ville,
      source: "texte",
    };
  }

  return null;
}

export function formatEntrepriseLocalisationHint(loc: EntrepriseLocalisation): string {
  const parts = [
    loc.ville,
    `${loc.departementLabel} (${loc.departementCode})`,
    loc.regionLabel,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function isValidRegionDepartementPair(
  regionCode: string,
  departementCode: string,
): boolean {
  const region = getRegionByCode(regionCode);
  return Boolean(region?.departements.some((dept) => dept.code === departementCode));
}
