import type { Fournisseur, FournisseurTarifLigne, Parametres } from "@/lib/types";
import { formatDistanceKm } from "@/lib/maps/geo";

export function buildCompanyAddress(parametres: Parametres): string {
  return [
    parametres.adresse,
    parametres.codePostal,
    parametres.ville,
    parametres.pays ?? "France",
  ]
    .filter(Boolean)
    .join(", ");
}

export function isFournisseurArchived(fournisseur: Fournisseur): boolean {
  return fournisseur.status === "archived";
}

export function isFournisseurActive(fournisseur: Fournisseur): boolean {
  return !isFournisseurArchived(fournisseur);
}

export function filterFournisseursForCompany(
  fournisseurs: Fournisseur[],
  companyId: string,
  options?: { includeArchived?: boolean },
): Fournisseur[] {
  const includeArchived = options?.includeArchived ?? true;
  return fournisseurs.filter((item) => {
    if (companyId && item.companyId && item.companyId !== companyId) {
      return false;
    }
    if (!includeArchived && isFournisseurArchived(item)) {
      return false;
    }
    return true;
  });
}

/** Fournisseurs actifs uniquement (sélections Produits, MUM IA, comparatif actif). */
export function filterActiveFournisseursForCompany(
  fournisseurs: Fournisseur[],
  companyId: string,
): Fournisseur[] {
  return filterFournisseursForCompany(fournisseurs, companyId, {
    includeArchived: false,
  });
}

export function countTarifsForFournisseur(
  tarifs: FournisseurTarifLigne[],
  fournisseurId: string,
): number {
  return tarifs.filter((line) => line.fournisseurId === fournisseurId).length;
}

export function getFournisseurDepotLabel(fournisseur: Fournisseur): string {
  return fournisseur.nomDepot?.trim() || fournisseur.nom || "Dépôt";
}

export function getFournisseurEnseigneLabel(fournisseur: Fournisseur): string {
  return fournisseur.enseigne?.trim() || fournisseur.nom || "Fournisseur";
}

export function formatFournisseurDistance(fournisseur: Fournisseur): string {
  return formatDistanceKm(fournisseur.distanceKm);
}

export function getFournisseurStatusLabel(
  fournisseur: Fournisseur,
): "Actif" | "Archivé" {
  return isFournisseurArchived(fournisseur) ? "Archivé" : "Actif";
}
