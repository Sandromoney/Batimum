import { buildFactureElectroniqueExport } from "@/lib/facture-electronique";
import type { Client, Facture, Parametres } from "@/lib/types";
import {
  applyTransmissionSubmissionToFacture,
  resolveParametresFacturationElectronique,
} from "./facture-transmission";
import {
  getPdpAdapter,
  isPdpProviderImplemented,
  listRegisteredPdpAdapters,
  PDP_PROVIDER_CATALOG,
} from "./pdp-registry";
import type {
  ElectronicInvoicePayload,
  ElectronicInvoiceServiceResult,
  PdpConfig,
  PdpConnectionResult,
  PdpSubmissionResult,
} from "./types";

function resolvePdpConfig(parametres: Parametres): PdpConfig {
  const fe = resolveParametresFacturationElectronique(parametres);
  return {
    providerId: fe.pdpProviderId ?? "",
    apiKey: fe.pdpApiKey,
    environnement: fe.pdpEnvironnement ?? "test",
    parametres,
  };
}

/**
 * Point d'entrée unique pour la facturation électronique.
 * Les connecteurs PDP s'enregistrent via `registerPdpAdapter` sans toucher au reste du SaaS.
 */
export class ElectronicInvoiceService {
  private static instance: ElectronicInvoiceService | null = null;

  static getInstance(): ElectronicInvoiceService {
    if (!ElectronicInvoiceService.instance) {
      ElectronicInvoiceService.instance = new ElectronicInvoiceService();
    }
    return ElectronicInvoiceService.instance;
  }

  listCatalogProviders() {
    return PDP_PROVIDER_CATALOG;
  }

  listImplementedProviders() {
    return listRegisteredPdpAdapters().filter((adapter) => adapter.implemented);
  }

  isProviderReady(providerId?: string): boolean {
    return isPdpProviderImplemented(providerId);
  }

  buildPayload(
    facture: Facture,
    client: Client | undefined,
    parametres: Parametres,
  ): ElectronicInvoicePayload {
    return {
      export: buildFactureElectroniqueExport({ facture, client, parametres }),
      facture,
      client,
      parametres,
    };
  }

  async testConnection(
    parametres: Parametres,
  ): Promise<ElectronicInvoiceServiceResult<PdpConnectionResult>> {
    const config = resolvePdpConfig(parametres);

    if (!config.providerId) {
      return {
        ok: false,
        error: "Sélectionnez une PDP dans les paramètres.",
        code: "PDP_NOT_SELECTED",
      };
    }

    const adapter = getPdpAdapter(config.providerId);
    if (!adapter) {
      return {
        ok: false,
        error: `Le connecteur « ${config.providerId} » n'est pas encore disponible. L'architecture est prête pour l'intégration.`,
        code: "PDP_NOT_IMPLEMENTED",
      };
    }

    if (!adapter.implemented) {
      return {
        ok: false,
        error: "Ce connecteur PDP est en cours de préparation.",
        code: "PDP_NOT_READY",
      };
    }

    try {
      const result = await adapter.testConnection(config);
      return { ok: true, data: result };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Échec du test de connexion PDP.",
        code: "PDP_TEST_FAILED",
      };
    }
  }

  async submitInvoice(
    facture: Facture,
    client: Client | undefined,
    parametres: Parametres,
  ): Promise<
    ElectronicInvoiceServiceResult<{
      facture: Facture;
      submission: PdpSubmissionResult;
    }>
  > {
    const config = resolvePdpConfig(parametres);

    if (!config.providerId) {
      return {
        ok: false,
        error: "Aucune PDP configurée.",
        code: "PDP_NOT_SELECTED",
      };
    }

    const adapter = getPdpAdapter(config.providerId);
    if (!adapter?.implemented) {
      return {
        ok: false,
        error:
          "Transmission PDP non disponible — export préparatoire uniquement pour le moment.",
        code: "PDP_NOT_IMPLEMENTED",
      };
    }

    const payload = this.buildPayload(facture, client, parametres);

    try {
      const submission = await adapter.submitInvoice(payload, config);
      const updatedFacture = applyTransmissionSubmissionToFacture(
        facture,
        submission,
        config.providerId,
      );
      return {
        ok: true,
        data: { facture: updatedFacture, submission },
      };
    } catch (error) {
      const failure: PdpSubmissionResult = {
        ok: false,
        statut: "erreur",
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de la transmission PDP.",
      };
      return {
        ok: true,
        data: {
          facture: applyTransmissionSubmissionToFacture(
            facture,
            failure,
            config.providerId,
          ),
          submission: failure,
        },
      };
    }
  }

  async refreshTransmissionStatus(
    facture: Facture,
    parametres: Parametres,
  ): Promise<ElectronicInvoiceServiceResult<Facture>> {
    const config = resolvePdpConfig(parametres);
    const transmissionId = facture.transmissionElectronique?.pdpTransmissionId;

    if (!transmissionId || !config.providerId) {
      return {
        ok: false,
        error: "Aucune transmission PDP à interroger.",
        code: "NO_TRANSMISSION",
      };
    }

    const adapter = getPdpAdapter(config.providerId);
    if (!adapter?.getTransmissionStatus) {
      return {
        ok: false,
        error: "Ce connecteur PDP ne supporte pas encore le suivi de statut.",
        code: "STATUS_NOT_SUPPORTED",
      };
    }

    try {
      const submission = await adapter.getTransmissionStatus(
        transmissionId,
        config,
      );
      return {
        ok: true,
        data: applyTransmissionSubmissionToFacture(
          facture,
          submission,
          config.providerId,
        ),
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible de récupérer le statut PDP.",
        code: "STATUS_FETCH_FAILED",
      };
    }
  }
}

export const electronicInvoiceService = ElectronicInvoiceService.getInstance();
