import { getClientDisplayName } from "@/lib/clients";
import { calculateSaasMetrics } from "@/lib/saas-calculations";
import type { AssistantUnderstandRequestPayload } from "@/lib/batimum-assistant-understand";
import type { AssistantSessionContext } from "@/lib/batimum-assistant-types";
import type { AppData } from "@/lib/types";

const MAX_CLIENT_NAMES = 12;
const MAX_EMPLOYEES = 12;
const MAX_DEVIS = 8;
const MAX_CHANTIERS = 10;
const MAX_FACTURES = 8;

/** Contexte minimal envoyé à OpenAI — aucune donnée sensible inutile. */
export function buildAssistantAppContext(
  data: AppData,
  session?: AssistantSessionContext,
) {
  const payload = buildAssistantUnderstandPayload(data, session);
  return {
    today: new Date().toISOString().slice(0, 10),
    client_count: data.clients.length,
    recent_clients: payload.knownClients,
    recent_devis: payload.knownQuotes,
    recent_chantiers: payload.knownSites,
    recent_employes: payload.knownEmployees,
    recent_factures: payload.knownInvoices,
    dashboard_stats: payload.dashboardStats,
    last_client_id: session?.last_client_id,
    last_client_name: session?.last_client_name,
    pending_intent: session?.pending_intent,
    pending_data: session?.pending_data,
    missing_fields: session?.missing_fields,
  };
}

export function buildAssistantUnderstandPayload(
  data: AppData,
  session?: AssistantSessionContext,
  options?: {
    message?: string;
    currentPage?: string;
    conversationHistory?: AssistantUnderstandRequestPayload["conversationHistory"];
  },
): AssistantUnderstandRequestPayload {
  const referenceDate = new Date();
  const metrics = calculateSaasMetrics(data, referenceDate);

  const knownClients = [...data.clients]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, MAX_CLIENT_NAMES)
    .map((client) => ({
      id: client.id,
      name: getClientDisplayName(client),
    }));

  const knownEmployees = [...data.employes]
    .slice(0, MAX_EMPLOYEES)
    .map((employe) => ({
      id: employe.id,
      name: `${employe.prenom} ${employe.nom}`.trim(),
    }));

  const activeChantiers = data.chantiers.filter((c) =>
    ["en_cours", "planifie", "en_retard", "retard_demarrage"].includes(c.statut),
  );

  const knownSites = [...(activeChantiers.length ? activeChantiers : data.chantiers)]
    .slice(-MAX_CHANTIERS)
    .map((chantier) => {
      const client = data.clients.find((item) => item.id === chantier.clientId);
      return {
        id: chantier.id,
        name: chantier.nom,
        client: client ? getClientDisplayName(client) : null,
        statut: chantier.statut,
      };
    });

  const knownQuotes = [...data.devis]
    .slice(-MAX_DEVIS)
    .map((devis) => {
      const client = data.clients.find((item) => item.id === devis.clientId);
      return {
        numero: devis.numero,
        titre: devis.titre,
        client: client ? getClientDisplayName(client) : null,
      };
    });

  const knownInvoices = [...data.factures]
    .slice(-MAX_FACTURES)
    .map((facture) => {
      const client = data.clients.find((item) => item.id === facture.clientId);
      return {
        numero: facture.numero,
        statut: facture.statut,
        client: client ? getClientDisplayName(client) : null,
      };
    });

  return {
    message: options?.message ?? "",
    currentPage: options?.currentPage,
    conversationHistory: options?.conversationHistory ?? session?.recent_messages,
    activeWorkflow: session
      ? {
          pending_intent: session.pending_intent,
          pending_data: session.pending_data,
          missing_fields: session.missing_fields,
          awaiting_answer: session.awaiting_answer,
        }
      : undefined,
    knownClients,
    knownEmployees,
    knownSites,
    knownQuotes,
    knownInvoices,
    dashboardStats: {
      client_count: data.clients.length,
      devis_count: data.devis.length,
      chantier_count: data.chantiers.length,
      facture_count: data.factures.length,
      chiffre_affaires_mensuel: metrics.chiffreAffairesMensuel,
      factures_impayees: metrics.facturesImpayees,
      devis_a_relancer: metrics.devisEnvoye,
    },
  };
}

export function buildDefaultClarificationQuestion(
  intent: string,
  missingFields: string[],
): string {
  if (missingFields.includes("nom") || missingFields.includes("clientName")) {
    return "Quel nom souhaitez-vous donner au client ?";
  }
  if (missingFields.includes("client")) {
    return "Pour quel client ?";
  }
  if (missingFields.includes("employe") || missingFields.includes("employee")) {
    return "Quel employé souhaitez-vous affecter ?";
  }
  if (missingFields.includes("chantier") || missingFields.includes("site")) {
    return "Sur quel chantier ?";
  }
  if (missingFields.includes("date") || missingFields.includes("startDate")) {
    return "Quelle date souhaitez-vous ?";
  }
  if (missingFields.includes("endDate")) {
    return "Jusqu'à quelle date ?";
  }
  if (missingFields.includes("heure")) {
    return "À quelle heure ?";
  }
  if (missingFields.includes("type_chantier")) {
    return "Quel type de travaux (ex. salle de bain, cuisine) ?";
  }
  return "Pouvez-vous préciser votre demande ?";
}
