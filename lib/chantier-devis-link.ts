import type { Chantier, Client, Devis, EtapeChantier, LigneDevis } from "./types";
import { getClientAddress } from "./clients";
import { markChantierCreated } from "./chantier-statut";
import { inferCategoriePilotageFromTypeChantier } from "./pilotage/categories";
import { formatCurrency, generateId } from "./utils";

function ligneDevisMontant(ligne: LigneDevis): number {
  return ligne.quantite * ligne.prixUnitaire;
}

export function devisMontantHT(devis: Devis): number {
  if (devis.lignes.length === 0 && typeof devis.montantHT === "number") {
    return devis.montantHT;
  }
  return devis.lignes.reduce((sum, ligne) => sum + ligneDevisMontant(ligne), 0);
}

export function formatDevisSelectLabel(devis: Devis): string {
  return `${devis.numero} — ${devis.titre} — ${formatCurrency(devisMontantHT(devis))}`;
}

export function etapesFromDevisLignes(lignes: LigneDevis[]): EtapeChantier[] {
  return lignes
    .filter((ligne) => ligne.description.trim())
    .map((ligne) => ({
      id: generateId(),
      titre: ligne.description.trim(),
      fait: false,
      poids: 1,
    }));
}

/** Appliqué une seule fois à l’enregistrement d’un nouveau chantier. */
export function applyDevisLinkOnChantierCreate(
  chantier: Chantier,
  devis: Devis,
): Chantier {
  const etapes = etapesFromDevisLignes(devis.lignes);
  const budget = devisMontantHT(devis);

  return {
    ...chantier,
    nom: chantier.nom.trim() ? chantier.nom : devis.titre,
    adresse: devis.adresseChantier?.trim() || chantier.adresse,
    type: devis.typeChantier ?? chantier.type,
    typePersonnalise:
      devis.typeChantierPersonnalise?.trim() || chantier.typePersonnalise,
    dateDebut: devis.dateDebutTravauxEstimee || chantier.dateDebut,
    budget: budget > 0 ? budget : chantier.budget,
    devisId: devis.id,
    devisNumber: devis.numero,
    sourceDevisTitle: devis.titre,
    etapes: etapes.length > 0 ? etapes : chantier.etapes,
    categoriePilotage:
      devis.categoriePilotage ??
      inferCategoriePilotageFromTypeChantier(devis.typeChantier) ??
      chantier.categoriePilotage,
    categoriePilotagePersonnalise:
      devis.categoriePilotagePersonnalise ?? chantier.categoriePilotagePersonnalise,
    heuresPrevues: devis.pilotageMainOeuvre?.heuresPrevues ?? chantier.heuresPrevues,
    tauxHoraireInterne:
      devis.pilotageMainOeuvre?.tauxHoraireInterne ?? chantier.tauxHoraireInterne,
    employesPrevusIds:
      devis.pilotageMainOeuvre?.employesPrevusIds ?? chantier.employesPrevusIds,
  };
}

export function findChantierForDevisId(
  chantiers: Chantier[],
  devisId: string,
): Chantier | undefined {
  return chantiers.find((chantier) => chantier.devisId === devisId);
}

/** Crée un chantier « À planifier » depuis un devis signé. */
export function createChantierFromSignedDevis(
  devis: Devis,
  client: Client | undefined,
  chantiers: Chantier[],
): Chantier | null {
  if (devis.statut !== "signe") return null;
  if (findChantierForDevisId(chantiers, devis.id)) return null;

  const today = new Date().toISOString().slice(0, 10);
  const base: Chantier = {
    id: generateId(),
    nom: devis.titre || `Chantier ${devis.numero}`,
    clientId: devis.clientId,
    adresse: devis.adresseChantier?.trim() || getClientAddress(client),
    statut: "planifie",
    type: devis.typeChantier ?? "autre",
    typePersonnalise: devis.typeChantierPersonnalise ?? "",
    etapes: [],
    achats: [],
    dateDebut: devis.dateDebutTravauxEstimee ?? today,
    dateFin: "",
    budget: 0,
  };

  return markChantierCreated(applyDevisLinkOnChantierCreate(base, devis));
}
