import { getClientDisplayName } from "@/lib/clients";
import type { AssistantAnalysis } from "@/lib/assistant-batimum/assistant-types";
import type { AssistantPendingAction } from "@/lib/batimum-assistant-orchestrator";
import type { AssistantAiData } from "@/lib/batimum-assistant-types";
import type { AppData, Chantier, Employe } from "@/lib/types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function similarity(a: string, b: string): number {
  const aa = normalize(a);
  const bb = normalize(b);
  if (!aa || !bb) return 0;
  if (aa === bb) return 1;
  if (aa.includes(bb) || bb.includes(aa)) return 0.92;
  const aaTokens = aa.split(/\s+/);
  const bbTokens = bb.split(/\s+/);
  const shared = aaTokens.filter((t) => bbTokens.some((u) => u.includes(t) || t.includes(u)));
  if (shared.length > 0) return 0.8 + shared.length * 0.05;
  return 0;
}

export function isPlanningAssignMessage(message: string): boolean {
  const n = normalize(message);
  return (
    /\b(met|mets|affecte|affecter|place|planifie|planifier|envoie|envoyer)\b/.test(n) &&
    /\b(sur|chantier|planning|dessus)\b/.test(n)
  );
}

export function isPlanningAssignAnalysis(analysis: Pick<AssistantAnalysis, "intent" | "data">): boolean {
  const data = analysis.data as Record<string, unknown>;
  return (
    analysis.intent === "modify_data" &&
    String(data.operation ?? "") === "assign_employee"
  );
}

export function isPlanningAssignLlmIntent(intent: string): boolean {
  return intent === "assign_employee";
}

function findEmployeCandidates(appData: AppData, query?: string): Employe[] {
  if (!query?.trim()) return [];
  const q = normalize(query);
  return appData.employes.filter((employe) => {
    const full = normalize(`${employe.prenom} ${employe.nom}`);
    return (
      full === q ||
      full.includes(q) ||
      q.includes(full) ||
      normalize(employe.prenom).includes(q) ||
      normalize(employe.nom).includes(q)
    );
  });
}

function findChantierCandidates(appData: AppData, query?: string): Chantier[] {
  if (!query?.trim()) return [];
  const q = normalize(query);
  return appData.chantiers.filter((chantier) => {
    const nom = normalize(chantier.nom);
    const client = appData.clients.find((c) => c.id === chantier.clientId);
    const clientName = client ? normalize(getClientDisplayName(client)) : "";
    return (
      nom === q ||
      nom.includes(q) ||
      q.includes(nom) ||
      clientName.includes(q) ||
      q.split(/\s+/).some((token) => token.length > 2 && (nom.includes(token) || clientName.includes(token)))
    );
  });
}

function bestEmployeName(candidates: Employe[]): string | undefined {
  if (!candidates.length) return undefined;
  const employe = candidates[0];
  return `${employe.prenom} ${employe.nom}`.trim();
}

function bestChantierName(candidates: Chantier[]): string | undefined {
  return candidates[0]?.nom;
}

export type PlanningAssignResolution =
  | {
      status: "ok";
      data: AssistantAiData;
    }
  | {
      status: "missing_employe";
      data: AssistantAiData;
      message: string;
    }
  | {
      status: "missing_chantier";
      data: AssistantAiData;
      message: string;
    }
  | {
      status: "employe_not_found";
      data: AssistantAiData;
      message: string;
    }
  | {
      status: "chantier_not_found";
      data: AssistantAiData;
      message: string;
    }
  | {
      status: "chantier_disambiguation";
      data: AssistantAiData;
      message: string;
      candidates: Array<{ id: string; name: string }>;
    };

export function resolvePlanningAssignEntities(
  raw: AssistantAiData,
  appData: AppData,
): PlanningAssignResolution {
  const data: AssistantAiData = {
    ...raw,
    operation: "assign_employee",
  };

  const employeQuery = data.employe?.trim();
  const chantierQuery = data.chantier?.trim();

  if (!employeQuery) {
    return {
      status: "missing_employe",
      data,
      message: "Quel employé souhaitez-vous affecter ?",
    };
  }

  if (!chantierQuery) {
    return {
      status: "missing_chantier",
      data,
      message: `Sur quel chantier souhaitez-vous affecter ${employeQuery} ?`,
    };
  }

  const employeCandidates = findEmployeCandidates(appData, employeQuery);
  if (employeCandidates.length === 0) {
    return {
      status: "employe_not_found",
      data,
      message: `Je n'ai pas trouvé l'employé ${employeQuery}. Voulez-vous le créer ou choisir un autre employé ?`,
    };
  }

  const resolvedEmploye = bestEmployeName(employeCandidates);
  if (resolvedEmploye) data.employe = resolvedEmploye;

  const chantierCandidates = findChantierCandidates(appData, chantierQuery);
  if (chantierCandidates.length === 0) {
    return {
      status: "chantier_not_found",
      data,
      message: `Je n'ai pas trouvé de chantier correspondant à « ${chantierQuery} ». Voulez-vous choisir un chantier existant ou en créer un ?`,
    };
  }

  if (chantierCandidates.length > 1) {
    const exact = chantierCandidates.filter((c) => normalize(c.nom) === normalize(chantierQuery));
    if (exact.length === 1) {
      data.chantier = exact[0].nom;
      return { status: "ok", data };
    }

    const scored = chantierCandidates
      .map((c) => ({ chantier: c, score: similarity(chantierQuery, c.nom) }))
      .sort((a, b) => b.score - a.score);
    if (scored[0] && scored[1] && scored[0].score - scored[1].score >= 0.12) {
      data.chantier = scored[0].chantier.nom;
      return { status: "ok", data };
    }

    const candidates = chantierCandidates.slice(0, 6).map((c) => ({
      id: c.id,
      name: c.nom,
    }));
    return {
      status: "chantier_disambiguation",
      data,
      message: `J'ai trouvé plusieurs chantiers liés à « ${chantierQuery} ». Lequel souhaitez-vous utiliser ?\n\n${candidates.map((c, i) => `${i + 1}. ${c.name}`).join("\n")}`,
      candidates,
    };
  }

  data.chantier = bestChantierName(chantierCandidates);
  return { status: "ok", data };
}

export function buildPlanningAssignSummary(data: AssistantAiData): string {
  const employe = data.employe ?? "Employé";
  const chantier = data.chantier ?? "chantier";
  const debut = data.date_debut ? ` du ${data.date_debut}` : "";
  const fin = data.date_fin ? ` au ${data.date_fin}` : "";
  return `Je vais affecter ${employe} au chantier ${chantier}${debut}${fin}.`;
}

export function buildPlanningAssignPendingAction(
  data: AssistantAiData,
  confidence = 0.95,
): AssistantPendingAction {
  return {
    intent: "assign_employee",
    data: { ...data, operation: "assign_employee" },
    securityGuard: {
      approved: confidence >= 0.95,
      confidence,
      source: "copilot",
    },
    editableFields: [
      ...(data.employe
        ? [{ key: "employe" as const, label: "Employé", value: data.employe }]
        : []),
      ...(data.chantier
        ? [{ key: "chantier" as const, label: "Chantier", value: data.chantier }]
        : []),
      ...(data.date_debut
        ? [{ key: "date_debut" as const, label: "Début", value: data.date_debut }]
        : []),
      ...(data.date_fin
        ? [{ key: "date_fin" as const, label: "Fin", value: data.date_fin }]
        : []),
    ],
  };
}
