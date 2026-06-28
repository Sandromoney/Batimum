import type {
  PdpConfig,
  PdpConnectionResult,
  PdpSubmissionResult,
  ElectronicInvoicePayload,
} from "./types";

/**
 * Contrat d'un connecteur PDP.
 * Chaque fournisseur (Chorus Pro, Pennylane, etc.) implémentera cette interface
 * sans modifier le reste du SaaS.
 */
export interface PdpAdapter {
  /** Slug stable (ex. chorus-pro). */
  id: string;
  /** Libellé affiché dans les paramètres. */
  label: string;
  /** Indique si l'adaptateur est prêt pour la production. */
  readonly implemented: boolean;
  testConnection(config: PdpConfig): Promise<PdpConnectionResult>;
  submitInvoice(
    payload: ElectronicInvoicePayload,
    config: PdpConfig,
  ): Promise<PdpSubmissionResult>;
  getTransmissionStatus?(
    pdpTransmissionId: string,
    config: PdpConfig,
  ): Promise<PdpSubmissionResult>;
}
