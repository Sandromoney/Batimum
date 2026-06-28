import { generateNextNumeroAvoir } from "./parametres";
import { getMontantFactureTTC } from "./factures-progressive";
import type { Avoir, AvoirMode, Facture, Parametres, StatutFacture } from "./types";
import { generateId } from "./utils";

export function getAvoirsForFacture(
  avoirs: Avoir[] | undefined,
  factureId: string,
): Avoir[] {
  return (avoirs ?? []).filter((avoir) => avoir.factureId === factureId);
}

export function getTotalAvoirTTC(
  avoirs: Avoir[] | undefined,
  factureId: string,
): number {
  return getAvoirsForFacture(avoirs, factureId).reduce(
    (sum, avoir) => sum + avoir.montantTTC,
    0,
  );
}

export function computeFactureStatutApresAvoir(
  facture: Facture,
  totalAvoirTTC: number,
): StatutFacture {
  const montant = getMontantFactureTTC(facture);
  if (totalAvoirTTC >= montant - 0.01) return "avoir_total";
  if (totalAvoirTTC > 0) return "avoir_partiel";
  return facture.statutOrigine ?? facture.statut;
}

export function syncFactureAfterAvoir(
  facture: Facture,
  avoirs: Avoir[] | undefined,
): Facture {
  const totalAvoir = getTotalAvoirTTC(avoirs, facture.id);
  if (totalAvoir <= 0) {
    const restored =
      facture.statutOrigine &&
      facture.statutOrigine !== "avoir_partiel" &&
      facture.statutOrigine !== "avoir_total"
        ? facture.statutOrigine
        : facture.statut;
    return {
      ...facture,
      montantAvoirTTC: undefined,
      statutOrigine: undefined,
      statut: restored,
    };
  }

  const statutOrigine =
    facture.statutOrigine ??
    (facture.statut !== "avoir_partiel" && facture.statut !== "avoir_total"
      ? facture.statut
      : "envoyee");

  return {
    ...facture,
    statutOrigine,
    montantAvoirTTC: totalAvoir,
    statut: computeFactureStatutApresAvoir(facture, totalAvoir),
  };
}

export function createAvoirFromFacture(input: {
  facture: Facture;
  avoirs: Avoir[];
  parametres?: Parametres;
  mode: AvoirMode;
  montantPartielTTC?: number;
  motif?: string;
}): Avoir | null {
  const { facture, avoirs, mode, parametres } = input;
  const factureTTC = getMontantFactureTTC(facture);
  const dejaAvoir = getTotalAvoirTTC(avoirs, facture.id);
  const reste = Math.round((factureTTC - dejaAvoir) * 100) / 100;

  if (reste <= 0) return null;

  const montantTTC =
    mode === "total"
      ? reste
      : Math.round((input.montantPartielTTC ?? 0) * 100) / 100;

  if (!(montantTTC > 0) || montantTTC > reste + 0.01) return null;

  const tauxTVA = facture.tauxTVA ?? 0;
  const montantHT =
    tauxTVA > 0
      ? Math.round((montantTTC / (1 + tauxTVA / 100)) * 100) / 100
      : montantTTC;

  return {
    id: generateId(),
    numero: generateNextNumeroAvoir(avoirs, parametres),
    factureId: facture.id,
    factureNumero: facture.numero,
    clientId: facture.clientId,
    mode,
    montantHT,
    montantTTC,
    tauxTVA,
    motif: input.motif?.trim() || undefined,
    dateEmission: new Date().toISOString().slice(0, 10),
  };
}
