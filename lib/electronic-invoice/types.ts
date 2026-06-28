import type {
  Client,
  Facture,
  Parametres,
  PdpEnvironnement,
  StatutTransmissionElectronique,
} from "@/lib/types";
import type { FactureElectroniqueExport } from "@/lib/facture-electronique";

export type PdpConfig = {
  providerId: string;
  apiKey?: string;
  environnement: PdpEnvironnement;
  parametres: Parametres;
};

export type PdpConnectionResult = {
  ok: boolean;
  statut: import("@/lib/types").PdpConnexionStatut;
  message: string;
  testedAt: string;
};

export type PdpSubmissionResult = {
  ok: boolean;
  statut: StatutTransmissionElectronique;
  pdpTransmissionId?: string;
  identifiantFactureElectronique?: string;
  message?: string;
  motifRejet?: string;
  transmittedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
};

export type ElectronicInvoicePayload = {
  export: FactureElectroniqueExport;
  facture: Facture;
  client?: Client;
  parametres: Parametres;
};

export type ElectronicInvoiceServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };
