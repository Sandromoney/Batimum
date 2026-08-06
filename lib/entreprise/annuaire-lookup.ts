import { formatNatureJuridique } from "@/lib/entreprise/nature-juridique";
import {
  computeFrenchTvaIntracomFromSiren,
  formatSirenSiretDisplay,
  type SirenSiretKind,
  validateSirenSiretInput,
} from "@/lib/entreprise/siren-siret";

export const ANNUAIRE_ENTREPRISES_URL =
  "https://recherche-entreprises.api.gouv.fr/search";

/** Pas de clé API — service public data.gouv / Annuaire des Entreprises. */
export const ANNUAIRE_REQUIRES_API_KEY = false;

const TIMEOUT_MS = 12_000;
const MAX_ETABLISSEMENTS = 40;

export type EstablishmentStatus = "actif" | "ferme";

export type OfficialEstablishment = {
  siret: string;
  siretDisplay: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  isSiege: boolean;
  status: EstablishmentStatus;
  tradeName: string | null;
  apeCode: string | null;
  activityLabel: string | null;
  dateCreation: string | null;
};

export type OfficialCompanyLookup = {
  companyName: string | null;
  tradeName: string | null;
  siren: string;
  sirenDisplay: string;
  legalForm: string | null;
  legalFormCode: string | null;
  apeCode: string | null;
  activityLabel: string | null;
  dateCreation: string | null;
  companyStatus: EstablishmentStatus;
  diffusionPartielle: boolean;
  nombreEtablissements: number | null;
  nombreEtablissementsOuverts: number | null;
  establishments: OfficialEstablishment[];
  /** Présélection : siège si disponible, sinon premier établissement. */
  preselectedSiret: string | null;
};

export type LookupSuccess = {
  ok: true;
  queryKind: SirenSiretKind;
  query: string;
  company: OfficialCompanyLookup;
  checkedAt: string;
};

export type LookupFailure = {
  ok: false;
  error: string;
  code:
    | "invalid"
    | "not_found"
    | "unavailable"
    | "timeout"
    | "partial_diffusion"
    | "unknown";
  allowManual: true;
};

export type LookupResult = LookupSuccess | LookupFailure;

type AnnuaireEtablissement = {
  siret?: string;
  adresse?: string | null;
  numero_voie?: string | null;
  type_voie?: string | null;
  libelle_voie?: string | null;
  complement_adresse?: string | null;
  code_postal?: string | null;
  libelle_commune?: string | null;
  libelle_commune_etranger?: string | null;
  libelle_pays_etranger?: string | null;
  code_pays_etranger?: string | null;
  etat_administratif?: string | null;
  est_siege?: boolean;
  nom_commercial?: string | null;
  liste_enseignes?: string[] | null;
  activite_principale?: string | null;
  date_creation?: string | null;
  statut_diffusion_etablissement?: string | null;
};

type AnnuaireEntreprise = {
  siren?: string;
  nom_complet?: string | null;
  nom_raison_sociale?: string | null;
  sigle?: string | null;
  etat_administratif?: string | null;
  nature_juridique?: string | null;
  activite_principale?: string | null;
  libelle_activite_principale?: string | null;
  date_creation?: string | null;
  statut_diffusion?: string | null;
  nombre_etablissements?: number | null;
  nombre_etablissements_ouverts?: number | null;
  siege?: AnnuaireEtablissement | null;
  matching_etablissements?: AnnuaireEtablissement[] | null;
};

type AnnuaireResponse = {
  results?: AnnuaireEntreprise[];
  total_results?: number;
};

function toStatus(code?: string | null): EstablishmentStatus {
  return code === "C" ? "ferme" : "actif";
}

function buildAddressLine1(etab: AnnuaireEtablissement): string | null {
  const parts = [etab.numero_voie, etab.type_voie, etab.libelle_voie]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);
  if (parts.length > 0) return parts.join(" ");

  const raw = (etab.adresse ?? "").trim();
  if (!raw) return null;
  const withoutCpCity = raw
    .replace(/\b\d{5}\b\s+[A-ZÀ-Ü0-9][A-ZÀ-Ü0-9\s'-]*$/i, "")
    .trim();
  return withoutCpCity || raw;
}

function tradeNameFromEtab(etab: AnnuaireEtablissement): string | null {
  const enseigne = etab.liste_enseignes?.find((item) => item?.trim());
  if (enseigne?.trim()) return enseigne.trim();
  const commercial = etab.nom_commercial?.trim();
  return commercial || null;
}

function mapEstablishment(etab: AnnuaireEtablissement): OfficialEstablishment | null {
  const siret = (etab.siret ?? "").replace(/\D/g, "");
  if (siret.length !== 14) return null;

  const city =
    etab.libelle_commune?.trim() ||
    etab.libelle_commune_etranger?.trim() ||
    null;
  const country = etab.libelle_pays_etranger?.trim() || "France";

  return {
    siret,
    siretDisplay: formatSirenSiretDisplay(siret),
    addressLine1: buildAddressLine1(etab),
    addressLine2: etab.complement_adresse?.trim() || null,
    postalCode: etab.code_postal?.trim() || null,
    city,
    country,
    isSiege: Boolean(etab.est_siege),
    status: toStatus(etab.etat_administratif),
    tradeName: tradeNameFromEtab(etab),
    apeCode: etab.activite_principale?.trim() || null,
    activityLabel: null,
    dateCreation: etab.date_creation?.trim() || null,
  };
}

function dedupeEstablishments(
  items: OfficialEstablishment[],
): OfficialEstablishment[] {
  const seen = new Set<string>();
  const out: OfficialEstablishment[] = [];
  for (const item of items) {
    if (seen.has(item.siret)) continue;
    seen.add(item.siret);
    out.push(item);
  }
  return out;
}

function sortEstablishments(
  items: OfficialEstablishment[],
): OfficialEstablishment[] {
  return [...items].sort((a, b) => {
    if (a.isSiege !== b.isSiege) return a.isSiege ? -1 : 1;
    if (a.status !== b.status) return a.status === "actif" ? -1 : 1;
    return a.siret.localeCompare(b.siret);
  });
}

async function fetchAnnuaire(
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<AnnuaireResponse> {
  const url = new URL(ANNUAIRE_ENTREPRISES_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      const err = new Error(`annuaire_http_${response.status}`);
      (err as Error & { code?: string }).code = "unavailable";
      throw err;
    }
    return (await response.json()) as AnnuaireResponse;
  } catch (error) {
    if (
      (error instanceof Error && error.name === "AbortError") ||
      signal?.aborted
    ) {
      const err = new Error("timeout");
      (err as Error & { code?: string }).code = "timeout";
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

function findCompanyBySiren(
  results: AnnuaireEntreprise[],
  siren: string,
): AnnuaireEntreprise | null {
  return (
    results.find((item) => (item.siren ?? "").replace(/\D/g, "") === siren) ??
    null
  );
}

function collectEstablishments(
  company: AnnuaireEntreprise,
  preferSiret?: string,
): OfficialEstablishment[] {
  const mapped: OfficialEstablishment[] = [];
  if (company.siege) {
    const siege = mapEstablishment({ ...company.siege, est_siege: true });
    if (siege) mapped.push(siege);
  }
  for (const etab of company.matching_etablissements ?? []) {
    const mappedEtab = mapEstablishment(etab);
    if (mappedEtab) mapped.push(mappedEtab);
  }

  let list = sortEstablishments(dedupeEstablishments(mapped));

  if (preferSiret) {
    const exact = list.find((item) => item.siret === preferSiret);
    if (!exact) {
      // SIRET demandé mais hors matching : si le siège match, déjà inclus ;
      // sinon on ne fabrique pas d'établissement fantôme.
    } else {
      list = [exact, ...list.filter((item) => item.siret !== preferSiret)];
    }
  }

  return list.slice(0, MAX_ETABLISSEMENTS);
}

function buildCompanyPayload(
  company: AnnuaireEntreprise,
  establishments: OfficialEstablishment[],
  preferSiret?: string,
): OfficialCompanyLookup {
  const siren = (company.siren ?? "").replace(/\D/g, "");
  const siege = establishments.find((item) => item.isSiege) ?? null;
  const preferred =
    (preferSiret
      ? establishments.find((item) => item.siret === preferSiret)
      : null) ??
    siege ??
    establishments[0] ??
    null;

  const diffusion = (company.statut_diffusion ?? "O").toUpperCase();
  const companyName =
    company.nom_raison_sociale?.trim() ||
    company.nom_complet?.trim() ||
    null;

  const apeCode =
    preferred?.apeCode ||
    company.activite_principale?.trim() ||
    null;

  const activityLabel =
    company.libelle_activite_principale?.trim() || null;

  const tradeName =
    preferred?.tradeName ||
    company.sigle?.trim() ||
    null;

  return {
    companyName,
    tradeName,
    siren,
    sirenDisplay: formatSirenSiretDisplay(siren),
    legalForm: formatNatureJuridique(company.nature_juridique),
    legalFormCode: company.nature_juridique?.trim() || null,
    apeCode,
    activityLabel,
    dateCreation: company.date_creation?.trim() || null,
    companyStatus: toStatus(company.etat_administratif),
    diffusionPartielle: diffusion === "P",
    nombreEtablissements:
      typeof company.nombre_etablissements === "number"
        ? company.nombre_etablissements
        : null,
    nombreEtablissementsOuverts:
      typeof company.nombre_etablissements_ouverts === "number"
        ? company.nombre_etablissements_ouverts
        : null,
    establishments,
    preselectedSiret: preferred?.siret ?? null,
  };
}

/**
 * Interroge l'API Recherche d'entreprises (officielle, sans clé).
 * - SIRET : établissement exact (+ contexte unité légale)
 * - SIREN : unité légale + siège ; si plusieurs établissements, élargit via
 *   une recherche complémentaire sur la raison sociale (matching_etablissements)
 */
export async function lookupOfficialCompany(
  rawQuery: string,
  options?: { signal?: AbortSignal },
): Promise<LookupResult> {
  const validation = validateSirenSiretInput(rawQuery);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error,
      code: "invalid",
      allowManual: true,
    };
  }

  const { digits, kind } = validation;
  const siren = digits.slice(0, 9);
  const preferSiret = kind === "siret" ? digits : undefined;

  try {
    const primary = await fetchAnnuaire(
      { q: digits, per_page: "5" },
      options?.signal,
    );

    let company = findCompanyBySiren(primary.results ?? [], siren);

    if (!company && kind === "siret") {
      // Certains SIRET ne matchent que via le SIREN
      const bySiren = await fetchAnnuaire(
        { q: siren, per_page: "1" },
        options?.signal,
      );
      company = findCompanyBySiren(bySiren.results ?? [], siren);
    }

    if (!company) {
      return {
        ok: false,
        error: "Aucune entreprise trouvée pour ce numéro dans le répertoire officiel.",
        code: "not_found",
        allowManual: true,
      };
    }

    if ((company.statut_diffusion ?? "O").toUpperCase() === "P") {
      // Diffusion partielle : on peut quand même renvoyer le peu d'info disponible
      // mais on signale le cas côté client.
    }

    let establishments = collectEstablishments(company, preferSiret);

    const openCount =
      typeof company.nombre_etablissements_ouverts === "number"
        ? company.nombre_etablissements_ouverts
        : establishments.length;

    // SIREN avec plusieurs établissements : enrichir via raison sociale
    if (
      kind === "siren" &&
      openCount > 1 &&
      establishments.length <= 1
    ) {
      const name =
        company.nom_raison_sociale?.trim() ||
        company.nom_complet?.trim() ||
        "";
      if (name) {
        try {
          const enriched = await fetchAnnuaire(
            {
              q: name,
              per_page: "1",
              limite_matching_etablissements: String(MAX_ETABLISSEMENTS),
            },
            options?.signal,
          );
          const same = findCompanyBySiren(enriched.results ?? [], siren);
          if (same) {
            establishments = collectEstablishments(same, preferSiret);
          }
        } catch {
          // Enrichissement optionnel — on garde au moins le siège
        }
      }
    }

    // Pour un SIRET précis absent de matching, rechercher par SIRET seul
    if (preferSiret && !establishments.some((e) => e.siret === preferSiret)) {
      try {
        const bySiret = await fetchAnnuaire(
          { q: preferSiret, per_page: "5" },
          options?.signal,
        );
        const same = findCompanyBySiren(bySiret.results ?? [], siren);
        if (same) {
          establishments = collectEstablishments(same, preferSiret);
        }
      } catch {
        // ignore
      }
    }

    if (establishments.length === 0) {
      return {
        ok: false,
        error:
          "Entreprise trouvée, mais aucun établissement public n'est disponible. Vous pouvez saisir les informations manuellement.",
        code: "partial_diffusion",
        allowManual: true,
      };
    }

    // Si SIRET demandé mais toujours absent : erreur claire
    if (preferSiret && !establishments.some((e) => e.siret === preferSiret)) {
      return {
        ok: false,
        error:
          "Ce SIRET est introuvable dans le répertoire officiel. Vérifiez le numéro ou saisissez les informations manuellement.",
        code: "not_found",
        allowManual: true,
      };
    }

    // Pour SIRET : ne renvoyer que l'établissement ciblé (+ garder liste = [celui-ci])
    if (preferSiret) {
      const exact = establishments.find((e) => e.siret === preferSiret);
      if (exact) {
        establishments = [exact];
      }
    }

    const payload = buildCompanyPayload(company, establishments, preferSiret);

    return {
      ok: true,
      queryKind: kind,
      query: digits,
      company: payload,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const code = (error as Error & { code?: string })?.code;
    if (code === "timeout") {
      return {
        ok: false,
        error:
          "Le service officiel met trop de temps à répondre. Vous pouvez saisir les informations manuellement.",
        code: "timeout",
        allowManual: true,
      };
    }
    return {
      ok: false,
      error:
        "Le répertoire officiel des entreprises est temporairement indisponible. Vous pouvez saisir les informations manuellement.",
      code: "unavailable",
      allowManual: true,
    };
  }
}

/** Champs Batimum dérivés d'un établissement sélectionné. */
export type CompanyPrefillFields = {
  entreprise: string;
  enseigne: string;
  siren: string;
  siret: string;
  formeJuridique: string;
  codeApe: string;
  libelleActivite: string;
  adresse: string;
  adresseComplement: string;
  codePostal: string;
  ville: string;
  pays: string;
  /** TVA FR dérivée du SIREN (modifiable ensuite). */
  tvaIntracom: string;
  dateCreationEntreprise: string;
  establishmentStatus: EstablishmentStatus;
  isSiege: boolean;
  officialDataLastCheckedAt: string;
  officialDataSource: string;
  officialDataVerificationStatus: "verified" | "manual" | "partial";
};

export function toPrefillFields(
  company: OfficialCompanyLookup,
  establishment: OfficialEstablishment,
  checkedAt: string,
): CompanyPrefillFields {
  return {
    entreprise: company.companyName ?? "",
    enseigne: establishment.tradeName || company.tradeName || "",
    siren: company.siren,
    siret: establishment.siret,
    formeJuridique: company.legalForm ?? "",
    codeApe: establishment.apeCode || company.apeCode || "",
    libelleActivite: establishment.activityLabel || company.activityLabel || "",
    adresse: establishment.addressLine1 ?? "",
    adresseComplement: establishment.addressLine2 ?? "",
    codePostal: establishment.postalCode ?? "",
    ville: establishment.city ?? "",
    pays: establishment.country ?? "France",
    tvaIntracom: computeFrenchTvaIntracomFromSiren(company.siren),
    dateCreationEntreprise:
      establishment.dateCreation || company.dateCreation || "",
    establishmentStatus: establishment.status,
    isSiege: establishment.isSiege,
    officialDataLastCheckedAt: checkedAt,
    officialDataSource: "recherche-entreprises.api.gouv.fr",
    officialDataVerificationStatus:
      establishment.status === "ferme" ? "partial" : "verified",
  };
}
