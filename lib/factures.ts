import { resolveDevisChantierAddress } from "./clients";
import { computeDevisTvaRecap } from "./devis-tva";
import { isTvaClassique } from "./parametres";
import {
  applyProgressiveFactureFields,
  buildProgressiveBillingContext,
  finalizeProgressiveFactureCreation,
  findFactureClassiqueByDevisId,
  resolveDevisTotalTTC,
  validateFactureMontantAgainstDevis,
  type CreateFactureResult,
} from "./factures-progressive";
import { generateNextNumeroFacture as buildNumeroFacture } from "./parametres";
import { markFactureCreated } from "./facture-statut";
import type {
  AcompteMode,
  Chantier,
  Client,
  Devis,
  Facture,
  Parametres,
  SituationMode,
  TypeFacture,
} from "./types";
import { generateId } from "./utils";

export {
  TYPE_FACTURE_LABELS,
  TYPES_FACTURE,
  applyProgressiveFactureFields,
  BILLING_EXCEEDS_RESTE_MESSAGE,
  buildProgressiveBillingContext,
  type CreateFactureResult,
  finalizeProgressiveFactureCreation,
  findFactureClassiqueByDevisId,
  getDevisPourcentageDejaFacture,
  getFactureChantierLieId,
  getFactureDevisLieId,
  getFacturesLiees,
  getMontantFactureTTC,
  normalizeTypeFacture,
  resolveDevisTotalTTC,
  resolveTotalProjetTTC,
  validateFactureMontantAgainstDevis,
  validateSituationPourcentageAvancement,
} from "./factures-progressive";

const DEVIS_STATUTS_FACTURABLES = ["accepte", "signe"] as const;

export function canTransformDevisToFacture(devis: Devis): boolean {
  return DEVIS_STATUTS_FACTURABLES.includes(
    devis.statut as (typeof DEVIS_STATUTS_FACTURABLES)[number],
  );
}

/** @deprecated Préférer findFactureClassiqueByDevisId — conservé pour compatibilité devis. */
export function findFactureByDevisId(
  factures: Facture[],
  devisId: string,
): Facture | undefined {
  return findFactureClassiqueByDevisId(factures, devisId);
}

export { generateNextNumeroFacture } from "./parametres";

function addDaysISO(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function factureMontantHT(facture: Facture): number {
  if (facture.lignes?.length) {
    return facture.lignes.reduce(
      (sum, ligne) => sum + ligne.quantite * ligne.prixUnitaire,
      0,
    );
  }
  if (typeof facture.montantHT === "number") return facture.montantHT;
  const taux = facture.tauxTVA ?? 0;
  if (taux > 0 && typeof facture.montantTTC === "number") {
    return Math.round((facture.montantTTC / (1 + taux / 100)) * 100) / 100;
  }
  if (typeof facture.montantTTC === "number") return facture.montantTTC;
  return facture.montant;
}

export type CreateFactureFromDevisInput = {
  devis: Devis;
  client?: Client;
  factures: Facture[];
  chantiers: Chantier[];
  defaultTva?: number;
  echeanceJours?: number;
  parametres?: Parametres;
};

/** Crée une facture à partir d’un devis accepté/signé. */
export function createFactureFromDevis({
  devis,
  client,
  factures,
  chantiers,
  defaultTva = 0,
  echeanceJours = 30,
  parametres,
}: CreateFactureFromDevisInput): CreateFactureResult {
  if (!canTransformDevisToFacture(devis)) {
    return { ok: false, error: "Le devis doit être accepté ou signé." };
  }
  if (findFactureClassiqueByDevisId(factures, devis.id)) {
    return { ok: false, error: "Une facture classique existe déjà pour ce devis." };
  }

  const tvaClassique = parametres ? isTvaClassique(parametres) : defaultTva > 0;
  const recap = computeDevisTvaRecap(devis, defaultTva, tvaClassique);
  const montantHT = recap.totalHT;
  const montantTTC = recap.totalTTC;
  const tauxTVA = devis.tauxTVA ?? defaultTva;

  if (!(montantTTC > 0)) {
    return { ok: false, error: "Le montant du devis doit être supérieur à 0." };
  }

  const chantier = findChantierForDevis(devis, chantiers);
  const totalProjetTTC = resolveDevisTotalTTC(devis, defaultTva);
  const ctx = buildProgressiveBillingContext(factures, {
    devisId: devis.id,
    chantierId: chantier?.id,
    totalProjetTTC,
  });

  const montantError = validateFactureMontantAgainstDevis(montantTTC, ctx);
  if (montantError) return { ok: false, error: montantError };

  const today = new Date().toISOString().slice(0, 10);
  const dateEmission = devis.dateDevis ?? devis.date ?? today;

  const facture = markFactureCreated({
    id: generateId(),
    numero: buildNumeroFacture(factures, parametres),
    clientId: devis.clientId,
    chantierId: chantier?.id,
    typeFacture: "classique",
    devisLieId: devis.id,
    chantierLieId: chantier?.id,
    montant: montantTTC,
    montantHT,
    montantTTC,
    tauxTVA,
    statut: "en_attente",
    dateEmission,
    dateEcheance: addDaysISO(dateEmission, echeanceJours),
    devisSourceId: devis.id,
    adresse: resolveDevisChantierAddress(devis, client),
    descriptionChantier: devis.titre,
    lignes: devis.lignes.map((ligne) => ({
      ...ligne,
      id: generateId(),
    })),
    totalDevisTTC: totalProjetTTC,
    montantDejaFacture: ctx.montantDejaFacture,
    resteAFacturer: Math.max(0, totalProjetTTC - ctx.montantDejaFacture - montantTTC),
  });

  return { ok: true, facture };
}

function findChantierForDevis(devis: Devis, chantiers: Chantier[]): Chantier | undefined {
  return (
    chantiers.find((chantier) => chantier.devisId === devis.id) ??
    chantiers.find((chantier) => chantier.clientId === devis.clientId)
  );
}

export type CreateFactureProgressiveFromDevisInput = {
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
};

/** Crée une facture d'acompte, de situation ou de solde depuis un devis accepté/signé. */
export function createFactureProgressiveFromDevis({
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
}: CreateFactureProgressiveFromDevisInput): CreateFactureResult {
  if (!canTransformDevisToFacture(devis)) {
    return { ok: false, error: "Le devis doit être accepté ou signé." };
  }

  const chantier = findChantierForDevis(devis, chantiers);
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

  const today = new Date().toISOString().slice(0, 10);
  const tauxTVA = devis.tauxTVA ?? defaultTva;
  const dateEmission = devis.dateDevis ?? devis.date ?? today;

  const draft: Facture = {
    id: generateId(),
    numero: buildNumeroFacture(factures, parametres),
    clientId: devis.clientId,
    chantierId: chantier?.id,
    chantierLieId: chantier?.id,
    devisLieId: devis.id,
    typeFacture: type,
    montant: 0,
    tauxTVA,
    statut: "brouillon",
    dateEmission,
    dateEcheance: addDaysISO(dateEmission, echeanceJours),
    adresse: resolveDevisChantierAddress(devis, client),
    descriptionChantier: devis.titre,
    acompteMode,
    acompteValeur,
    situationMode,
    pourcentageAvancement,
    situationQuantitePourcentage,
    situationMontantLibre,
  };

  const facture = applyProgressiveFactureFields(draft, ctx, totalProjetTTC);
  const finalized = finalizeProgressiveFactureCreation(facture, ctx, {
    situationPourcentage:
      situationMode === "quantite"
        ? situationQuantitePourcentage
        : pourcentageAvancement,
  });

  if (!finalized.ok) return finalized;

  return {
    ok: true,
    facture: markFactureCreated(finalized.facture),
  };
}
