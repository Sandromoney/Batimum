import type { AssistantAnalysis, AssistantBrainContext } from "@/lib/assistant-batimum/assistant-types";
import type { AppData } from "@/lib/types";

export type ReasoningSubject =
  | "clients"
  | "employes"
  | "planning"
  | "factures"
  | "chantiers"
  | "commandes"
  | "devis"
  | "pilotage"
  | "entreprise"
  | "parametres"
  | "mum_ia"
  | "emails"
  | "fournitures"
  | "statistiques"
  | "analyse"
  | "conversation";

export type ReasoningCertaintyLevel =
  | "certain_100"
  | "very_high_95"
  | "confirm_90"
  | "ask_one_question_80"
  | "reformulate_70"
  | "ask_precision_60"
  | "rephrase_below_60";

export type ReasoningPlan = {
  intent: string;
  subject: ReasoningSubject;
  entities: Record<string, unknown>;
  confidence: number;
  certaintyLevel: ReasoningCertaintyLevel;
  toolAction?: string;
};

export type ReasoningVerification = {
  checks: Array<{ id: string; ok: boolean; detail?: string }>;
  allPassed: boolean;
};

export type ReasoningTrace = {
  analysis: {
    isAction: boolean;
    isInformation: boolean;
    isCorrection: boolean;
    isConversation: boolean;
  };
  context: {
    recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
    currentPath?: string;
    active: {
      client?: string;
      devis?: string;
      chantier?: string;
      employe?: string;
      planning?: string;
      facture?: string;
      commande?: string;
      fourniture?: string;
    };
  };
  subject: ReasoningSubject;
  plan: ReasoningPlan;
  verification: ReasoningVerification;
};

function inferSubject(intent: string, module: string): ReasoningSubject {
  const value = `${intent} ${module}`.toLowerCase();
  if (value.includes("client")) return "clients";
  if (value.includes("employ")) return "employes";
  if (value.includes("planning") || value.includes("rendez")) return "planning";
  if (value.includes("facture")) return "factures";
  if (value.includes("chantier")) return "chantiers";
  if (value.includes("commande")) return "commandes";
  if (value.includes("devis") || value.includes("quote")) return "devis";
  if (value.includes("pilotage") || value.includes("dashboard")) return "pilotage";
  if (value.includes("param")) return "parametres";
  if (value.includes("mum")) return "mum_ia";
  if (value.includes("email")) return "emails";
  if (value.includes("fourniture") || value.includes("mater")) return "fournitures";
  if (value.includes("stat")) return "statistiques";
  if (value.includes("anal")) return "analyse";
  return "conversation";
}

function certaintyLevel(confidence: number): ReasoningCertaintyLevel {
  if (confidence >= 1) return "certain_100";
  if (confidence >= 0.95) return "very_high_95";
  if (confidence >= 0.9) return "confirm_90";
  if (confidence >= 0.8) return "ask_one_question_80";
  if (confidence >= 0.7) return "reformulate_70";
  if (confidence >= 0.6) return "ask_precision_60";
  return "rephrase_below_60";
}

function inferToolAction(analysis: AssistantAnalysis): string | undefined {
  const intent = analysis.intent.toLowerCase();
  if (intent.includes("create_client")) return "createClient()";
  if (intent.includes("create_devis")) return "createQuote()";
  if (intent.includes("create_chantier")) return "createChantier()";
  if (intent.includes("create_facture")) return "createInvoice()";
  if (intent.includes("create_rendez")) return "planEmployee()";
  if (intent.includes("modify")) return "updateData()";
  if (intent.includes("delete")) return "deleteData()";
  if (intent.includes("search")) return "searchCustomer()";
  if (intent.includes("monthly") || intent.includes("dashboard")) return "analyzeCompany()";
  return undefined;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findEmployeIdByName(appData: AppData, name?: string): string | undefined {
  const q = normalize(name ?? "");
  if (!q) return undefined;
  for (const employe of appData.employes) {
    const full = normalize(`${employe.prenom} ${employe.nom}`);
    if (full === q || full.includes(q) || q.includes(full)) return employe.id;
  }
  return undefined;
}

function findChantierByName(appData: AppData, chantier?: string) {
  const q = normalize(chantier ?? "");
  if (!q) return undefined;
  return appData.chantiers.find((c) => {
    const n = normalize(c.nom);
    return n === q || n.includes(q) || q.includes(n);
  });
}

function toIsoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return undefined;
}

function buildDateRange(data: Record<string, unknown>): { start?: string; end?: string } {
  const start = toIsoDate(String(data.date_debut ?? data.date ?? ""));
  const end = toIsoDate(String(data.date_fin ?? data.date ?? ""));
  return { start, end };
}

function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function employeeDeclaredOnVacation(
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>,
  employeName?: string,
): boolean {
  const q = normalize(employeName ?? "");
  if (!q) return false;
  return recentMessages.some((m) => {
    if (m.role !== "user") return false;
    const n = normalize(m.content);
    return (
      (n.includes("vacances") || n.includes("conge")) &&
      (n.includes(q) || q.split(" ").every((part) => part && n.includes(part)))
    );
  });
}

export function buildReasoningTrace(
  analysis: AssistantAnalysis,
  context: AssistantBrainContext,
  appData: AppData,
): ReasoningTrace {
  const subject = inferSubject(analysis.intent, analysis.module);
  const plan: ReasoningPlan = {
    intent: analysis.intent,
    subject,
    entities: { ...(analysis.data ?? {}) },
    confidence: analysis.confidence,
    certaintyLevel: certaintyLevel(analysis.confidence),
    toolAction: inferToolAction(analysis),
  };

  const clientKnown = String((analysis.data as Record<string, unknown>).client ?? "").trim().length > 0;
  const chantierKnown = String((analysis.data as Record<string, unknown>).chantier ?? "").trim().length > 0;
  const employeKnown = String((analysis.data as Record<string, unknown>).employe ?? "").trim().length > 0;
  const data = analysis.data as Record<string, unknown>;
  const employeName = String(data.employe ?? "");
  const chantierName = String(data.chantier ?? "");
  const recentMessages = (context.session?.recent_messages ?? []).slice(-20);
  const employeId = findEmployeIdByName(appData, employeName);
  const chantier = findChantierByName(appData, chantierName);
  const { start, end } = buildDateRange(data);

  const conflict = employeId && start && end
    ? appData.planning.some((event) => {
        const ids = event.employeIds ?? [];
        if (!ids.includes(employeId)) return false;
        const evStart = event.date;
        const evEnd = event.date;
        return overlap(start, end, evStart, evEnd);
      })
    : false;

  const assignLikeAction =
    analysis.intent === "modify_data" &&
    String(data.operation ?? "").toLowerCase() === "assign_employee";

  const checks: ReasoningVerification["checks"] = [
    { id: "intent_identified", ok: analysis.intent !== "unknown" },
    { id: "missing_fields_resolved", ok: (analysis.missingFields?.length ?? 0) === 0 },
    {
      id: "confidence_secure",
      ok: analysis.confidence >= 0.95 || analysis.actionType !== "prepare_action",
      detail: analysis.confidence < 0.95 ? "confidence_too_low_for_execution" : undefined,
    },
    {
      id: "client_exists_or_not_required",
      ok: !clientKnown || appData.clients.some((c) => normalize(`${c.prenom ?? ""} ${c.nom}`.trim()).includes(normalize(String(data.client ?? "")))),
    },
    {
      id: "chantier_exists_or_not_required",
      ok: !chantierKnown || Boolean(chantier),
      detail: chantierKnown && !chantier ? "chantier_not_found" : undefined,
    },
    {
      id: "chantier_not_terminated_or_not_required",
      ok: !assignLikeAction || !chantier || chantier.statut !== "termine",
      detail: assignLikeAction && chantier?.statut === "termine" ? "chantier_terminated" : undefined,
    },
    {
      id: "employe_exists_or_not_required",
      ok: !employeKnown || Boolean(employeId),
      detail: employeKnown && !employeId ? "employe_not_found" : undefined,
    },
    {
      id: "employe_available_not_on_vacation",
      ok: !assignLikeAction || !employeeDeclaredOnVacation(recentMessages, employeName),
      detail:
        assignLikeAction && employeeDeclaredOnVacation(recentMessages, employeName)
          ? "employe_declared_on_vacation"
          : undefined,
    },
    {
      id: "planning_no_conflict",
      ok: !assignLikeAction || !conflict,
      detail: assignLikeAction && conflict ? "employee_planning_conflict" : undefined,
    },
  ];

  return {
    analysis: {
      isAction: analysis.actionType === "prepare_action" || analysis.actionType === "confirm",
      isInformation: analysis.actionType === "answer",
      isCorrection: analysis.intent === "correction",
      isConversation: analysis.module === "conversation",
    },
    context: {
      recentMessages,
      currentPath: context.currentPath,
      active: {
        client: context.memory?.currentClient,
        devis: context.memory?.currentDevis,
        chantier: context.memory?.currentChantier,
        employe: context.memory?.currentEmploye,
        planning: context.memory?.currentPlanning,
        facture: context.memory?.currentFacture,
        commande: context.memory?.currentCommande,
        fourniture: context.memory?.currentFourniture,
      },
    },
    subject,
    plan,
    verification: {
      checks,
      allPassed: checks.every((c) => c.ok),
    },
  };
}
