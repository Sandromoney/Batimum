import { filterFournisseursForCompany } from "@/lib/fourniture/helpers";
import type { OsmDepotResult } from "@/lib/maps/depot-types";
import type { Fournisseur } from "@/lib/types";

export type OsmElementType = "node" | "way" | "relation";

export function parseOsmType(osmId: string): OsmElementType | undefined {
  const [type] = osmId.split("/");
  if (type === "node" || type === "way" || type === "relation") {
    return type;
  }
  return undefined;
}

export function getFournisseurOsmId(fournisseur: Fournisseur): string | undefined {
  const osmId = fournisseur.osmId?.trim();
  if (osmId) return osmId;

  if (
    fournisseur.source === "openstreetmap" ||
    fournisseur.source === "osm"
  ) {
    return fournisseur.placeId?.trim() || undefined;
  }

  return undefined;
}

export function normalizeFournisseur(fournisseur: Fournisseur): Fournisseur {
  const osmId = getFournisseurOsmId(fournisseur);
  const createdAt =
    fournisseur.createdAt?.trim() ||
    fournisseur.dateAjout?.trim() ||
    new Date().toISOString();
  const source =
    fournisseur.source === "osm" ? "openstreetmap" : fournisseur.source;

  return {
    ...fournisseur,
    osmId,
    osmType: fournisseur.osmType ?? (osmId ? parseOsmType(osmId) : undefined),
    placeId: osmId ?? fournisseur.placeId,
    createdAt,
    updatedAt: fournisseur.updatedAt?.trim() || createdAt,
    dateAjout: fournisseur.dateAjout?.trim() || createdAt,
    source,
    status: fournisseur.status === "archived" ? "archived" : "active",
  };
}

export function touchFournisseurUpdated(fournisseur: Fournisseur): Fournisseur {
  return {
    ...normalizeFournisseur(fournisseur),
    updatedAt: new Date().toISOString(),
  };
}

export function findFournisseurByOsmId(
  fournisseurs: Fournisseur[],
  companyId: string,
  osmId: string,
): Fournisseur | undefined {
  const normalizedOsmId = osmId.trim();
  if (!normalizedOsmId) return undefined;

  return filterFournisseursForCompany(fournisseurs, companyId).find(
    (item) => getFournisseurOsmId(item) === normalizedOsmId,
  );
}

export function isOsmIdAlreadyRegistered(
  fournisseurs: Fournisseur[],
  companyId: string,
  osmId: string,
): boolean {
  return findFournisseurByOsmId(fournisseurs, companyId, osmId) != null;
}

export function filterUnregisteredDepots(
  depots: OsmDepotResult[],
  fournisseurs: Fournisseur[],
  companyId: string,
): OsmDepotResult[] {
  const registeredOsmIds = new Set(
    filterFournisseursForCompany(fournisseurs, companyId)
      .map(getFournisseurOsmId)
      .filter((value): value is string => Boolean(value)),
  );

  return depots.filter((depot) => !registeredOsmIds.has(depot.osmId));
}

export function buildFournisseurFromDepot(input: {
  id: string;
  companyId: string;
  enseigne: string;
  nomDepot: string;
  adresseDepot: string;
  ville: string;
  codePostal: string;
  latitude: number;
  longitude: number;
  telephone?: string;
  siteWeb?: string;
  phoneSource?: Fournisseur["phoneSource"];
  websiteSource?: Fournisseur["websiteSource"];
  phoneVerified?: boolean;
  websiteVerified?: boolean;
  email?: string;
  commentaireInterne?: string;
  osmId: string;
  osmType?: OsmElementType;
  distanceKm?: number;
  now?: string;
}): Fournisseur {
  const now = input.now ?? new Date().toISOString();
  const osmType = input.osmType ?? parseOsmType(input.osmId);
  const isAnnuaire = input.osmId.trim().startsWith("siret/");

  return normalizeFournisseur({
    id: input.id,
    companyId: input.companyId,
    nom: input.enseigne,
    enseigne: input.enseigne,
    nomDepot: input.nomDepot,
    adresseDepot: input.adresseDepot,
    ville: input.ville,
    codePostal: input.codePostal,
    latitude: input.latitude,
    longitude: input.longitude,
    distanceKm: input.distanceKm,
    telephone: input.telephone,
    email: input.email,
    siteWeb: input.siteWeb,
    phoneSource: input.telephone
      ? (input.phoneSource ?? (isAnnuaire ? "entreprise_public_data" : "openstreetmap"))
      : "unavailable",
    websiteSource: input.siteWeb
      ? (input.websiteSource ?? (isAnnuaire ? "entreprise_public_data" : "openstreetmap"))
      : "unavailable",
    phoneVerified: input.phoneVerified ?? false,
    websiteVerified: input.websiteVerified ?? false,
    commentaireInterne: input.commentaireInterne,
    osmId: input.osmId,
    osmType,
    placeId: input.osmId,
    source: isAnnuaire ? "annuaire_entreprises" : "openstreetmap",
    createdAt: now,
    updatedAt: now,
    dateAjout: now,
    familles: [],
  });
}

export function buildFournisseurManual(input: {
  id: string;
  companyId: string;
  nom: string;
  nomDepot: string;
  adresseDepot: string;
  ville: string;
  codePostal: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  commentaireInterne?: string;
  now?: string;
}): Fournisseur {
  const now = input.now ?? new Date().toISOString();

  return normalizeFournisseur({
    id: input.id,
    companyId: input.companyId,
    nom: input.nom,
    enseigne: input.nom,
    nomDepot: input.nomDepot,
    adresseDepot: input.adresseDepot,
    ville: input.ville,
    codePostal: input.codePostal,
    telephone: input.telephone,
    email: input.email,
    siteWeb: input.siteWeb,
    phoneSource: input.telephone ? "manual" : "unavailable",
    websiteSource: input.siteWeb ? "manual" : "unavailable",
    phoneVerified: Boolean(input.telephone?.trim()),
    websiteVerified: Boolean(input.siteWeb?.trim()),
    commentaireInterne: input.commentaireInterne,
    source: "manual",
    createdAt: now,
    updatedAt: now,
    dateAjout: now,
    familles: [],
  });
}
