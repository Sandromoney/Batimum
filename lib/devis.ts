import type { Client, Devis, Parametres, StatutDevis } from "./types";
import { generateNextNumeroDevis as buildNumeroDevis } from "./parametres";
import { getClientAddress, isClientAddressComplete } from "./clients";
import { getDevisDisplayStatut, markDevisCreated } from "./devis-statut";
import { generateId } from "./utils";
import { createSectionLigne } from "./devis-lignes";

export { generateNextNumeroDevis } from "./parametres";

export const DEVIS_STATUTS: StatutDevis[] = [
  "brouillon",
  "envoye",
  "signe",
  "en_attente",
  "en_retard",
  "accepte",
  "refuse",
  "expire",
  "archive",
];

export const DEVIS_STATUT_LABELS: Record<StatutDevis, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  signe: "Signé",
  en_attente: "En attente",
  en_retard: "En retard",
  expire: "Expiré",
  archive: "Archivé",
};

export function countDevisByStatut(devis: Devis[]): Record<StatutDevis, number> {
  return {
    brouillon: devis.filter((d) => d.statut === "brouillon").length,
    envoye: devis.filter((d) => d.statut === "envoye").length,
    accepte: devis.filter((d) => d.statut === "accepte").length,
    refuse: devis.filter((d) => d.statut === "refuse").length,
    signe: devis.filter((d) => d.statut === "signe").length,
    en_attente: devis.filter((d) => d.statut === "en_attente").length,
    en_retard: devis.filter((d) => d.statut === "en_retard").length,
    expire: devis.filter((d) => d.statut === "expire").length,
    archive: devis.filter((d) => d.statut === "archive").length,
  };
}

export function countDevisByDisplayStatut(
  devis: Devis[],
): Record<StatutDevis, number> {
  const counts = {
    brouillon: 0,
    envoye: 0,
    accepte: 0,
    refuse: 0,
    signe: 0,
    en_attente: 0,
    en_retard: 0,
    expire: 0,
    archive: 0,
  } satisfies Record<StatutDevis, number>;

  devis.forEach((item) => {
    counts[getDevisDisplayStatut(item)] += 1;
  });

  return counts;
}

export type CreateDevisBrouillonInput = {
  clientId?: string;
  montantHT?: number;
  dateDevis?: string;
  tauxTVA?: number;
};

export function calculateMontantTTC(montantHT: number, tauxTVA = 0): number {
  return Math.round(montantHT * (1 + tauxTVA / 100) * 100) / 100;
}

export function createDevisBrouillon(
  clients: Client[],
  existingDevis: Devis[],
  input: CreateDevisBrouillonInput = {},
  parametres?: Parametres,
): Devis {
  const numero = buildNumeroDevis(existingDevis, parametres);
  const today = new Date().toISOString().slice(0, 10);
  const clientId = input.clientId ?? clients[0]?.id ?? "";
  const client = clients.find((item) => item.id === clientId);
  const tauxTVA = input.tauxTVA ?? 0;
  const dateDevis = input.dateDevis ?? today;

  return markDevisCreated(
    {
      id: generateId(),
      numero,
      clientId,
      titre: `Devis ${numero}`,
      statut: "brouillon",
      date: dateDevis,
      dateCreation: today,
      dateDevis,
      montantHT: 0,
      montantTTC: 0,
      tauxTVA,
      validiteJours: 30,
      lignes: [createSectionLigne()],
      adresseChantier: isClientAddressComplete(client)
        ? getClientAddress(client)
        : undefined,
    },
    parametres?.utilisateur,
  );
}

/** Duplique un devis en nouveau brouillon (nouvelle version). */
export function duplicateDevis(
  source: Devis,
  existingDevis: Devis[],
  parametres?: Parametres,
  options?: { titreSuffix?: string },
): Devis {
  const numero = buildNumeroDevis(existingDevis, parametres);
  const today = new Date().toISOString().slice(0, 10);
  const suffix = options?.titreSuffix ?? "(copie)";
  const titre =
    source.titre.includes(suffix) || source.titre.includes("(copie)")
      ? source.titre
      : `${source.titre} ${suffix}`;

  return markDevisCreated(
    {
      ...source,
      id: generateId(),
      numero,
      titre,
      statut: "brouillon",
      date: today,
      dateCreation: today,
      dateDevis: today,
      signature: undefined,
      nomSignataire: undefined,
      signedBy: undefined,
      dateSignature: undefined,
      signedAt: undefined,
      sentAt: undefined,
      clientIp: undefined,
      signatureId: undefined,
      signedPdfBase64: undefined,
      signedPdfGeneratedAt: undefined,
      refusedAt: undefined,
      refusedBy: undefined,
      refusalReason: undefined,
      historique: undefined,
      lignes: source.lignes.map((ligne) => ({
        ...ligne,
        id: generateId(),
      })),
    },
    parametres?.utilisateur,
  );
}
