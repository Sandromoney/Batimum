import { devisTotal } from "./data";
import { canTransformDevisToFacture } from "./factures";
import {
  applyProgressiveFactureFields,
  buildProgressiveBillingContext,
  finalizeProgressiveFactureCreation,
  resolveDevisTotalTTC,
  type CreateFactureResult,
} from "./factures-progressive";
import { markFactureCreated } from "./facture-statut";
import { getClientAddress } from "./clients";
import {
  buildUpdatedLignesSituation,
  computeSituationMontantFromLignes,
  getDevisLignesFacturables,
  validateLigneSituationTargets,
} from "./commande-situation";
import {
  generateNextNumeroCommande,
  generateNextNumeroFacture,
} from "./parametres";
import type {
  AcompteMode,
  Chantier,
  Client,
  Commande,
  Devis,
  Facture,
  Parametres,
  SituationMode,
  StatutCommande,
  TypeFacture,
} from "./types";
import { generateId } from "./utils";

export const COMMANDE_STATUT_LABELS: Record<StatutCommande, string> = {
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

export const COMMANDE_STATUTS: StatutCommande[] = [
  "en_cours",
  "terminee",
  "annulee",
];

export function canCreateCommandeFromDevis(devis: Devis): boolean {
  return canTransformDevisToFacture(devis);
}

export function findCommandeByDevisId(
  commandes: Commande[],
  devisId: string,
): Commande | undefined {
  return commandes.find((commande) => commande.devisId === devisId);
}

export function findChantierForDevis(
  chantiers: Chantier[],
  devis: Devis,
): Chantier | undefined {
  return (
    chantiers.find((chantier) => chantier.devisId === devis.id) ??
    chantiers.find((chantier) => chantier.clientId === devis.clientId)
  );
}

export function getCommandeFactures(
  factures: Facture[],
  commande: Commande,
): Facture[] {
  return factures.filter(
    (facture) =>
      facture.commandeLieId === commande.id ||
      facture.devisLieId === commande.devisId ||
      facture.devisSourceId === commande.devisId,
  );
}

export type CreateCommandeFromDevisInput = {
  devis: Devis;
  chantiers: Chantier[];
  commandes: Commande[];
  defaultTva?: number;
  parametres?: Parametres;
};

export function createCommandeFromDevis({
  devis,
  chantiers,
  commandes,
  defaultTva = 0,
  parametres,
}: CreateCommandeFromDevisInput): Commande | null {
  if (!canCreateCommandeFromDevis(devis)) return null;
  if (findCommandeByDevisId(commandes, devis.id)) return null;

  const chantier = findChantierForDevis(chantiers, devis);
  const montantTTC = resolveDevisTotalTTC(devis, defaultTva);
  if (!(montantTTC > 0)) return null;

  const today = new Date().toISOString().slice(0, 10);

  return {
    id: generateId(),
    numero: generateNextNumeroCommande(commandes, parametres),
    devisId: devis.id,
    clientId: devis.clientId,
    chantierId: chantier?.id,
    statut: "en_cours",
    dateCreation: today,
    montantTTC,
    montantHT: devis.montantHT ?? devisTotal(devis),
    devisNumero: devis.numero,
    devisTitre: devis.titre,
    lignesSituation: getDevisLignesFacturables(devis).map((ligne) => ({
      ligneDevisId: ligne.id,
      pourcentageFacture: 0,
    })),
  };
}

function addDaysISO(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export type CreateFactureFromCommandeInput = {
  commande: Commande;
  devis: Devis;
  client?: Client;
  factures: Facture[];
  chantiers: Chantier[];
  type: Extract<TypeFacture, "acompte" | "situation" | "solde">;
  defaultTva?: number;
  echeanceJours?: number;
  parametres?: Parametres;
  acompteMode?: AcompteMode;
  acompteValeur?: number;
  situationMode?: SituationMode;
  pourcentageAvancement?: number;
  situationQuantitePourcentage?: number;
  situationMontantLibre?: number;
  ligneSituationTargets?: Record<string, number>;
};

export function createFactureFromCommande({
  commande,
  devis,
  client,
  factures,
  chantiers,
  type,
  defaultTva = 0,
  echeanceJours = 30,
  parametres,
  acompteMode = "pourcentage",
  acompteValeur = 30,
  situationMode = "pourcentage",
  pourcentageAvancement = 50,
  situationQuantitePourcentage = 50,
  situationMontantLibre = 0,
  ligneSituationTargets,
}: CreateFactureFromCommandeInput): CreateFactureResult {
  if (commande.statut === "annulee") {
    return { ok: false, error: "La commande est annulée." };
  }

  const chantier =
    (commande.chantierId
      ? chantiers.find((item) => item.id === commande.chantierId)
      : undefined) ?? findChantierForDevis(chantiers, devis);

  const totalProjetTTC = resolveDevisTotalTTC(devis, defaultTva);
  if (!(totalProjetTTC > 0)) {
    return { ok: false, error: "Le montant du devis doit être supérieur à 0." };
  }

  const ctx = buildProgressiveBillingContext(factures, {
    devisId: devis.id,
    chantierId: chantier?.id,
    totalProjetTTC,
  });

  if (type === "solde" && ctx.resteAFacturer <= 0) {
    return { ok: false, error: "Aucun reste à facturer pour le solde." };
  }

  let ligneSituationError: string | null = null;

  const today = new Date().toISOString().slice(0, 10);
  const tauxTVA = devis.tauxTVA ?? defaultTva;

  const draft: Facture = {
    id: generateId(),
    numero: generateNextNumeroFacture(factures, parametres),
    clientId: commande.clientId,
    chantierId: chantier?.id,
    chantierLieId: chantier?.id,
    devisLieId: devis.id,
    commandeLieId: commande.id,
    typeFacture: type,
    montant: 0,
    tauxTVA,
    statut: "brouillon",
    dateEmission: today,
    dateEcheance: addDaysISO(today, echeanceJours),
    adresse: getClientAddress(client),
    descriptionChantier: devis.titre,
    acompteMode,
    acompteValeur,
    situationMode,
    pourcentageAvancement,
    situationQuantitePourcentage,
    situationMontantLibre,
  };

  if (type === "situation" && ligneSituationTargets) {
    ligneSituationError = validateLigneSituationTargets({
      devis,
      commande,
      targetPourcentages: ligneSituationTargets,
      defaultTva,
      resteAFacturer: ctx.resteAFacturer,
    });
    if (ligneSituationError) {
      return { ok: false, error: ligneSituationError };
    }

    const ligneSituation = computeSituationMontantFromLignes({
      devis,
      commande,
      targetPourcentages: ligneSituationTargets,
      defaultTva,
    });
    draft.situationMode = "montant";
    draft.situationMontantLibre = ligneSituation.montantTTC;
    draft.pourcentageAvancement = ligneSituation.pourcentageGlobal;
  }

  const facture = applyProgressiveFactureFields(draft, ctx, totalProjetTTC);
  const finalized = finalizeProgressiveFactureCreation(facture, ctx, {
    ligneSituationError,
  });

  if (!finalized.ok) return finalized;

  return {
    ok: true,
    facture: markFactureCreated(finalized.facture),
  };
}

export function applyLigneSituationAfterFacture(
  commande: Commande,
  targetPourcentages: Record<string, number>,
): Commande {
  return {
    ...commande,
    lignesSituation: buildUpdatedLignesSituation(commande, targetPourcentages),
  };
}
