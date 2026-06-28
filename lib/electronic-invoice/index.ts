export { ElectronicInvoiceService, electronicInvoiceService } from "./electronic-invoice-service";
export type { PdpAdapter } from "./pdp-adapter";
export {
  getPdpAdapter,
  getPdpProviderLabel,
  isPdpProviderImplemented,
  listRegisteredPdpAdapters,
  PDP_PROVIDER_CATALOG,
  registerPdpAdapter,
  unregisterPdpAdapter,
} from "./pdp-registry";
export {
  applyTransmissionSubmissionToFacture,
  appendTransmissionHistorique,
  createEmptyFactureTransmission,
  getFacturePdpLabel,
  getPdpConnexionStatutLabel,
  getTransmissionStatutLabel,
  mergeParametresFacturationElectronique,
  normalizeFacture,
  normalizeFactureTransmission,
  resolveParametresFacturationElectronique,
} from "./facture-transmission";
export type {
  ElectronicInvoicePayload,
  ElectronicInvoiceServiceResult,
  PdpConfig,
  PdpConnectionResult,
  PdpSubmissionResult,
} from "./types";
