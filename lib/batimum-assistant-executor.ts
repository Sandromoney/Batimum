import {
  assignEmployeeToSite,
  createClient as createClientTool,
} from "@/lib/batimum-assistant-tools";
import { getClientDisplayName } from "@/lib/clients";
import { TYPE_CHANTIER_LABELS, createEtapesForType } from "@/lib/chantiers";
import { markChantierCreated } from "@/lib/chantier-statut";
import { createDevisBrouillon } from "@/lib/devis";
import { findClientCandidates } from "@/lib/batimum-assistant-brain";
import { buildTodayInsightCards } from "@/lib/batimum-insights";
import { getDevisDisplayStatut } from "@/lib/devis-statut";
import { isFacturePayee } from "@/lib/facture-statut";
import {
  formatToolValidationError,
  resolveToolForIntent,
  validateToolCall,
} from "@/lib/assistant-batimum/tools-engine";
import type {
  AssistantAiData,
  BatimumAssistantIntent,
} from "@/lib/batimum-assistant-types";
import type { AppData, Client, TypeChantier } from "@/lib/types";
import { formatCurrency, generateId } from "@/lib/utils";

export type AssistantFollowUpAction = {
  id: string;
  label: string;
  kind: "navigate" | "create_devis" | "create_appointment";
  href?: string;
};

export type AssistantExecutionOutcome = {
  success: boolean;
  message: string;
  clientId?: string;
  clientName?: string;
  devisId?: string;
  chantierId?: string;
  planningId?: string;
  navigateTo?: string;
  followUps?: AssistantFollowUpAction[];
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function addDaysISO(days: number, reference = new Date()) {
  const date = new Date(reference);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolveAssistantDate(
  raw?: string,
  reference = new Date(),
): string | undefined {
  if (!raw?.trim()) return undefined;
  const value = raw.trim();
  const n = normalize(value);
  if (n === "demain") return addDaysISO(1, reference);
  if (n === "apres-demain" || n === "après-demain") return addDaysISO(2, reference);
  if (n.includes("aujourd")) return addDaysISO(0, reference);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const fr = value.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (fr) {
    const day = fr[1].padStart(2, "0");
    const month = fr[2].padStart(2, "0");
    const year = fr[3]
      ? fr[3].length === 2
        ? `20${fr[3]}`
        : fr[3]
      : String(reference.getFullYear());
    return `${year}-${month}-${day}`;
  }
  return undefined;
}

export function resolveAssistantTime(raw?: string): string {
  if (!raw?.trim()) return "09:00";
  const match = raw.trim().match(/^(\d{1,2})(?:[:h](\d{2}))?$/);
  if (!match) return "09:00";
  const hours = Math.min(23, Number(match[1]));
  const minutes = match[2] ? Math.min(59, Number(match[2])) : 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function mapAssistantTypeChantier(raw?: string): TypeChantier {
  const n = normalize(raw ?? "");
  if (n.includes("salle") && n.includes("bain")) return "salle_de_bain";
  if (n.includes("cuisine")) return "cuisine";
  if (n.includes("extension") || n.includes("agrand")) return "extension";
  if (n.includes("maison") && n.includes("neuve")) return "maison_neuve";
  if (n.includes("renov") || n.includes("rénov")) return "renovation";
  return "renovation";
}

export function findClientByAssistantQuery(
  data: AppData,
  query?: string,
  preferredClientId?: string,
): Client | undefined {
  if (preferredClientId) {
    const preferred = data.clients.find((client) => client.id === preferredClientId);
    if (preferred) return preferred;
  }
  if (!query?.trim()) return undefined;
  const q = normalize(query);
  return data.clients.find((client) => {
    const display = normalize(getClientDisplayName(client));
    return (
      display === q ||
      display.includes(q) ||
      normalize(client.nom ?? "").includes(q) ||
      normalize(client.prenom ?? "").includes(q)
    );
  });
}

function clientFollowUps(clientId: string): AssistantFollowUpAction[] {
  return [
    { id: "open-client", label: "Ouvrir la fiche client", kind: "navigate", href: "/clients" },
    {
      id: "create-devis",
      label: "Créer un devis pour ce client",
      kind: "create_devis",
    },
    {
      id: "create-rdv",
      label: "Créer un rendez-vous",
      kind: "create_appointment",
    },
  ];
}

export function resolveExecutionIntent(
  intent: BatimumAssistantIntent,
  data: AssistantAiData,
): BatimumAssistantIntent {
  if (data.operation === "assign_employee" || intent === "assign_employee") {
    return "assign_employee";
  }
  return intent;
}

export function executeAssistantIntent(
  intent: BatimumAssistantIntent,
  data: AssistantAiData,
  appData: AppData,
  options?: {
    preferredClientId?: string;
    preferredClientName?: string;
    securityGuard?: {
      approved: boolean;
      confidence: number;
      source: "copilot" | "orchestrator";
    };
  },
): { nextData: AppData; outcome: AssistantExecutionOutcome } {
  const executableIntent = resolveExecutionIntent(intent, data);

  if (!options?.securityGuard?.approved || options.securityGuard.confidence < 0.95) {
    return {
      nextData: appData,
      outcome: {
        success: false,
        message:
          "Exécution bloquée pour sécurité. Merci de reformuler ou de reconfirmer votre action.",
      },
    };
  }

  const tool = resolveToolForIntent(executableIntent, data);
  if (!tool) {
    return {
      nextData: appData,
      outcome: {
        success: false,
        message: "Aucun outil Batimum compatible n'a été trouvé pour cette action.",
      },
    };
  }
  const validation = validateToolCall(tool, data, appData);
  if (!validation.ok) {
    return {
      nextData: appData,
      outcome: {
        success: false,
        message: formatToolValidationError(tool, validation),
      },
    };
  }

  switch (executableIntent) {
    case "assign_employee":
      return executeAssignEmployee(data, appData);
    case "create_client":
      return executeCreateClient(data, appData);
    case "search_client":
      return executeSearchClient(data, appData);
    case "create_appointment":
      return executeCreateAppointment(data, appData, options);
    case "create_quote":
      return executeCreateQuote(data, appData, options);
    case "create_chantier":
      return executeCreateChantier(data, appData, options);
    case "show_unpaid_invoices":
      return executeShowUnpaidInvoices(appData);
    case "show_quotes_to_follow_up":
      return executeShowQuotesToFollowUp(appData);
    case "analyze_dashboard":
      return executeAnalyzeDashboard(appData);
    default:
      return {
        nextData: appData,
        outcome: {
          success: false,
          message: "Je comprends votre demande, mais cette action n'est pas encore disponible.",
        },
      };
  }
}

function executeAssignEmployee(
  data: AssistantAiData,
  appData: AppData,
): { nextData: AppData; outcome: AssistantExecutionOutcome } {
  const { nextData, result } = assignEmployeeToSite(appData, data);

  return {
    nextData,
    outcome: {
      success: result.success && result.verified,
      message: result.message,
      chantierId: result.chantierId,
      planningId: result.affectationId,
      navigateTo: result.navigateTo,
      followUps: result.success
        ? [
            {
              id: "open-planning",
              label: "Voir le planning",
              kind: "navigate",
              href: "/planning",
            },
          ]
        : undefined,
    },
  };
}

function executeCreateClient(
  data: AssistantAiData,
  appData: AppData,
): { nextData: AppData; outcome: AssistantExecutionOutcome } {
  const fullName = data.nom?.trim();
  if (!fullName) {
    return {
      nextData: appData,
      outcome: { success: false, message: "Nom du client manquant." },
    };
  }

  const existing = findClientCandidates(appData, fullName);
  const exact = existing.filter(
    (c) => normalize(getClientDisplayName(c)) === normalize(fullName),
  );
  if (exact.length > 0) {
    const names = exact.map((c) => getClientDisplayName(c)).join(", ");
    return {
      nextData: appData,
      outcome: {
        success: false,
        message: `Un client similaire existe déjà : ${names}. Souhaitez-vous l'utiliser plutôt que d'en créer un nouveau ?`,
        clientId: exact[0]?.id,
        clientName: exact[0] ? getClientDisplayName(exact[0]) : undefined,
      },
    };
  }

  const { nextData, result } = createClientTool(appData, data);
  return {
    nextData,
    outcome: {
      success: result.success && result.verified,
      message: result.message,
      clientId: result.clientId,
      clientName: result.clientName,
      navigateTo: result.navigateTo,
      followUps: result.clientId ? clientFollowUps(result.clientId) : undefined,
    },
  };
}

function executeSearchClient(
  data: AssistantAiData,
  appData: AppData,
): { nextData: AppData; outcome: AssistantExecutionOutcome } {
  const query = data.client ?? data.nom;
  if (!query) {
    return {
      nextData: appData,
      outcome: {
        success: true,
        message: "Voici la liste de vos clients.",
        navigateTo: "/clients",
      },
    };
  }

  const matches = appData.clients.filter((client) => {
    const display = normalize(getClientDisplayName(client));
    const q = normalize(query);
    return display.includes(q);
  });

  if (matches.length === 0) {
    return {
      nextData: appData,
      outcome: {
        success: true,
        message: `Aucun client trouvé pour « ${query} ».`,
        navigateTo: "/clients",
      },
    };
  }

  const lines = matches
    .slice(0, 5)
    .map((client) => `• ${getClientDisplayName(client)}`)
    .join("\n");

  return {
    nextData: appData,
    outcome: {
      success: true,
      message: `Client${matches.length > 1 ? "s" : ""} trouvé${matches.length > 1 ? "s" : ""} :\n${lines}`,
      clientId: matches[0]?.id,
      clientName: matches[0] ? getClientDisplayName(matches[0]) : undefined,
      navigateTo: "/clients",
      followUps: matches[0]
        ? clientFollowUps(matches[0].id)
        : undefined,
    },
  };
}

function executeCreateAppointment(
  data: AssistantAiData,
  appData: AppData,
  options?: { preferredClientId?: string },
): { nextData: AppData; outcome: AssistantExecutionOutcome } {
  const client = findClientByAssistantQuery(
    appData,
    data.client ?? data.nom,
    options?.preferredClientId,
  );
  const date = resolveAssistantDate(data.date) ?? addDaysISO(1);
  const heureDebut = resolveAssistantTime(data.heure);
  const [h, m] = heureDebut.split(":").map(Number);
  const heureFin = `${String(Math.min(23, h + 2)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const clientName = client ? getClientDisplayName(client) : data.client ?? "Client";
  const event = {
    id: generateId(),
    titre: `RDV — ${clientName}`,
    date,
    heureDebut,
    heureFin,
    type: "rendez_vous_client" as const,
    chantierId: undefined,
    employeIds: [] as string[],
  };

  return {
    nextData: { ...appData, planning: [...appData.planning, event] },
    outcome: {
      success: true,
      message: `Rendez-vous planifié le ${date} à ${heureDebut} pour ${clientName}.`,
      planningId: event.id,
      clientId: client?.id,
      clientName: client ? getClientDisplayName(client) : undefined,
      navigateTo: "/planning",
      followUps: client
        ? [
            { id: "open-planning", label: "Ouvrir le planning", kind: "navigate", href: "/planning" },
            ...clientFollowUps(client.id).slice(1),
          ]
        : [{ id: "open-planning", label: "Ouvrir le planning", kind: "navigate", href: "/planning" }],
    },
  };
}

function executeCreateQuote(
  data: AssistantAiData,
  appData: AppData,
  options?: { preferredClientId?: string },
): { nextData: AppData; outcome: AssistantExecutionOutcome } {
  const client = findClientByAssistantQuery(
    appData,
    data.client ?? data.nom,
    options?.preferredClientId,
  );
  const typeChantier = mapAssistantTypeChantier(data.type_chantier);
  const typeLabel = TYPE_CHANTIER_LABELS[typeChantier];
  const clientName = client ? getClientDisplayName(client) : data.client;
  const titre = clientName
    ? `Devis ${typeLabel} — ${clientName}`
    : `Devis ${typeLabel}`;

  const devis = createDevisBrouillon(
    appData.clients,
    appData.devis,
    { clientId: client?.id },
    appData.parametres,
  );
  const enriched = {
    ...devis,
    titre,
    descriptionChantier: data.description ?? data.type_chantier ?? "",
    typeChantier,
    clientId: client?.id ?? devis.clientId,
  };

  return {
    nextData: { ...appData, devis: [...appData.devis, enriched] },
    outcome: {
      success: true,
      message: `Devis brouillon créé${clientName ? ` pour ${clientName}` : ""}.`,
      devisId: enriched.id,
      clientId: client?.id,
      clientName: client ? getClientDisplayName(client) : undefined,
      navigateTo: `/devis/${enriched.id}`,
      followUps: [
        { id: "open-devis", label: "Ouvrir le devis", kind: "navigate", href: `/devis/${enriched.id}` },
        ...(client
          ? [{ id: "open-client", label: "Ouvrir la fiche client", kind: "navigate" as const, href: "/clients" }]
          : []),
      ],
    },
  };
}

function executeCreateChantier(
  data: AssistantAiData,
  appData: AppData,
  options?: { preferredClientId?: string },
): { nextData: AppData; outcome: AssistantExecutionOutcome } {
  const client = findClientByAssistantQuery(
    appData,
    data.client ?? data.nom,
    options?.preferredClientId,
  );
  const typeChantier = mapAssistantTypeChantier(data.type_chantier);
  const typeLabel = TYPE_CHANTIER_LABELS[typeChantier];
  const clientName = client ? getClientDisplayName(client) : data.client;
  const nom =
    data.chantier?.trim() ||
    (clientName ? `${typeLabel} — ${clientName}` : typeLabel);
  const today = new Date().toISOString().slice(0, 10);

  const chantier = markChantierCreated({
    id: generateId(),
    nom,
    clientId: client?.id ?? "",
    adresse: "",
    statut: "planifie",
    type: typeChantier,
    etapes: createEtapesForType(typeChantier),
    dateDebut: today,
    dateFin: "",
    budget: 0,
  });

  return {
    nextData: { ...appData, chantiers: [...appData.chantiers, chantier] },
    outcome: {
      success: true,
      message: `Chantier « ${nom} » créé.`,
      chantierId: chantier.id,
      clientId: client?.id,
      clientName: client ? getClientDisplayName(client) : undefined,
      navigateTo: `/chantiers/${chantier.id}`,
      followUps: [
        {
          id: "open-chantier",
          label: "Ouvrir le chantier",
          kind: "navigate",
          href: `/chantiers/${chantier.id}`,
        },
      ],
    },
  };
}

function executeShowUnpaidInvoices(
  appData: AppData,
): { nextData: AppData; outcome: AssistantExecutionOutcome } {
  const impayees = appData.factures.filter((facture) => !isFacturePayee(facture));
  const total = impayees.reduce((sum, facture) => sum + (facture.montantTTC ?? 0), 0);
  return {
    nextData: appData,
    outcome: {
      success: true,
      message: `${impayees.length} facture${impayees.length > 1 ? "s" : ""} impayée${impayees.length > 1 ? "s" : ""} pour un total de ${formatCurrency(total)}.`,
      navigateTo: "/factures",
      followUps: [
        { id: "open-factures", label: "Voir les factures", kind: "navigate", href: "/factures" },
      ],
    },
  };
}

function executeShowQuotesToFollowUp(
  appData: AppData,
): { nextData: AppData; outcome: AssistantExecutionOutcome } {
  const toFollow = appData.devis.filter((devis) => {
    const statut = getDevisDisplayStatut(devis);
    return ["envoye", "en_attente", "en_retard", "accepte"].includes(statut);
  });
  return {
    nextData: appData,
    outcome: {
      success: true,
      message: `${toFollow.length} devis à suivre ou à relancer.`,
      navigateTo: "/devis",
      followUps: [
        { id: "open-devis", label: "Voir les devis", kind: "navigate", href: "/devis" },
      ],
    },
  };
}

function executeAnalyzeDashboard(
  appData: AppData,
): { nextData: AppData; outcome: AssistantExecutionOutcome } {
  const cards = buildTodayInsightCards(appData);
  const actionable = cards.filter((card) => card.id !== "all-clear");
  const summary =
    actionable.length > 0
      ? actionable
          .slice(0, 4)
          .map((card) => `• ${card.title}`)
          .join("\n")
      : "Tout est sous contrôle aujourd'hui.";

  return {
    nextData: appData,
    outcome: {
      success: true,
      message: `Synthèse de votre activité :\n${summary}`,
      navigateTo: "/pilotage",
      followUps: [
        { id: "open-pilotage", label: "Ouvrir le pilotage", kind: "navigate", href: "/pilotage" },
        { id: "open-dashboard", label: "Voir le tableau de bord", kind: "navigate", href: "/dashboard" },
      ],
    },
  };
}
