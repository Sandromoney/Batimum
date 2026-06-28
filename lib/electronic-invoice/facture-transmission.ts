import type {
  Facture,
  FactureTransmissionElectronique,
  FactureTransmissionHistoriqueEntry,
  PdpConnexionStatut,
  Parametres,
  ParametresFacturationElectronique,
  StatutTransmissionElectronique,
} from "@/lib/types";
import { generateId } from "@/lib/utils";
import type { PdpSubmissionResult } from "./types";
import { getPdpProviderLabel } from "./pdp-registry";

export const DEFAULT_TRANSMISSION_STATUT: StatutTransmissionElectronique =
  "non_transmis";

export function createEmptyFactureTransmission(): FactureTransmissionElectronique {
  return {
    statut: DEFAULT_TRANSMISSION_STATUT,
    historique: [],
  };
}

export function normalizeFactureTransmission(
  facture: Facture,
): FactureTransmissionElectronique {
  const current = facture.transmissionElectronique;
  if (!current) return createEmptyFactureTransmission();

  return {
    ...createEmptyFactureTransmission(),
    ...current,
    historique: Array.isArray(current.historique) ? current.historique : [],
  };
}

export function normalizeFacture(facture: Facture): Facture {
  return {
    ...facture,
    transmissionElectronique: normalizeFactureTransmission(facture),
  };
}

export function appendTransmissionHistorique(
  transmission: FactureTransmissionElectronique,
  entry: Omit<FactureTransmissionHistoriqueEntry, "id" | "date"> & {
    id?: string;
    date?: string;
  },
): FactureTransmissionElectronique {
  const historique: FactureTransmissionHistoriqueEntry[] = [
    ...(transmission.historique ?? []),
    {
      id: entry.id ?? generateId(),
      date: entry.date ?? new Date().toISOString(),
      statut: entry.statut,
      pdpTransmissionId: entry.pdpTransmissionId,
      pdpProviderId: entry.pdpProviderId,
      message: entry.message,
      identifiantFactureElectronique: entry.identifiantFactureElectronique,
      meta: entry.meta,
    },
  ];

  return { ...transmission, historique };
}

export function applyTransmissionSubmissionToFacture(
  facture: Facture,
  result: PdpSubmissionResult,
  pdpProviderId?: string,
): Facture {
  const base = normalizeFactureTransmission(facture);
  const now = new Date().toISOString();

  let next: FactureTransmissionElectronique = {
    ...base,
    statut: result.statut,
    pdpProviderId: pdpProviderId ?? base.pdpProviderId,
    pdpTransmissionId: result.pdpTransmissionId ?? base.pdpTransmissionId,
    identifiantFactureElectronique:
      result.identifiantFactureElectronique ?? base.identifiantFactureElectronique,
    dateTransmission: result.transmittedAt ?? base.dateTransmission,
    dateAcceptation: result.acceptedAt ?? base.dateAcceptation,
    dateRejet: result.rejectedAt ?? base.dateRejet,
    motifRejet: result.motifRejet ?? base.motifRejet,
  };

  next = appendTransmissionHistorique(next, {
    statut: result.statut,
    pdpTransmissionId: result.pdpTransmissionId,
    pdpProviderId,
    message: result.message,
    identifiantFactureElectronique: result.identifiantFactureElectronique,
    date: now,
  });

  const historique = [
    ...(facture.historique ?? []),
    {
      id: generateId(),
      type: "transmission_electronique" as const,
      label: `Transmission électronique : ${getTransmissionStatutLabel(result.statut)}`,
      date: now,
      meta: {
        statut: result.statut,
        pdpProviderId: pdpProviderId ?? "",
        identifiantFactureElectronique: result.identifiantFactureElectronique ?? "",
      },
    },
  ];

  return {
    ...facture,
    transmissionElectronique: next,
    historique,
  };
}

export function getTransmissionStatutLabel(
  statut: StatutTransmissionElectronique,
): string {
  const labels: Record<StatutTransmissionElectronique, string> = {
    non_transmis: "Non transmis",
    en_attente: "En attente",
    transmis: "Transmis",
    accepte: "Accepté",
    rejete: "Rejeté",
    erreur: "Erreur",
  };
  return labels[statut];
}

export function resolveParametresFacturationElectronique(
  parametres: Parametres,
): ParametresFacturationElectronique {
  const nested = parametres.facturationElectronique ?? {};
  const legacyProvider = parametres.plateformeDematerialisation?.trim();

  return {
    pdpProviderId: nested.pdpProviderId?.trim() || legacyProvider || "",
    pdpApiKey: nested.pdpApiKey?.trim() || "",
    pdpConnexionStatut: nested.pdpConnexionStatut ?? "non_configure",
    pdpEnvironnement: nested.pdpEnvironnement ?? "test",
    pdpDernierTestLe: nested.pdpDernierTestLe,
    pdpDernierTestMessage: nested.pdpDernierTestMessage,
  };
}

export function mergeParametresFacturationElectronique(
  parametres: Parametres,
  patch: Partial<ParametresFacturationElectronique>,
): Parametres {
  const current = resolveParametresFacturationElectronique(parametres);
  const next: ParametresFacturationElectronique = { ...current, ...patch };

  return {
    ...parametres,
    plateformeDematerialisation: next.pdpProviderId || "",
    facturationElectronique: next,
  };
}

export function getPdpConnexionStatutLabel(statut: PdpConnexionStatut): string {
  const labels: Record<PdpConnexionStatut, string> = {
    non_configure: "Non configurée",
    test_ok: "Test réussi",
    test_erreur: "Erreur en test",
    production_ok: "Production connectée",
    production_erreur: "Erreur en production",
  };
  return labels[statut];
}

export function getFacturePdpLabel(facture: Facture): string {
  return getPdpProviderLabel(facture.transmissionElectronique?.pdpProviderId);
}
