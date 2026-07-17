export type MumIaContextSource =
  | "devis"
  | "facture"
  | "chantier"
  | "client"
  | "pilotage"
  | "planning"
  | "dashboard";

export type MumIaContextPayload = {
  source: MumIaContextSource;
  entityId?: string;
  entityLabel?: string;
  description?: string;
  typeChantier?: string;
  suggestedPrompts?: string[];
  returnHref?: string;
  extra?: Record<string, unknown>;
};

export const MUM_IA_CONTEXT_KEY = "batimum-mum-ia-context";
export const MUM_IA_DRAFT_KEY = "batimum-mum-ia-draft";

export function saveMumIaContext(context: MumIaContextPayload) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(MUM_IA_CONTEXT_KEY, JSON.stringify(context));
}

export function loadMumIaContext(): MumIaContextPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MUM_IA_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MumIaContextPayload;
  } catch {
    return null;
  }
}

export function clearMumIaContext() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(MUM_IA_CONTEXT_KEY);
}

export function buildMumIaContextDraft(
  context: MumIaContextPayload,
  userPrompt?: string,
): Record<string, unknown> {
  const description =
    userPrompt?.trim() ||
    context.description?.trim() ||
    context.suggestedPrompts?.[0] ||
    "";

  return {
    description,
    typeChantier: context.typeChantier,
    contextSource: context.source,
    contextEntityId: context.entityId,
    contextEntityLabel: context.entityLabel,
    additionalPrecisions: context.extra
      ? JSON.stringify(context.extra, null, 2)
      : undefined,
  };
}

export const DEFAULT_PROMPTS_BY_SOURCE: Record<
  MumIaContextSource,
  string[]
> = {
  devis: [
    "Améliore cette description.",
    "Complète les lignes manquantes.",
    "Vérifie la cohérence des prix.",
  ],
  facture: [
    "Rédige un mail de relance pour cette facture.",
    "Propose un texte d'accompagnement professionnel.",
  ],
  chantier: [
    "Analyse ce chantier.",
    "Estime le matériel restant à commander.",
    "Propose un planning de fin de chantier.",
  ],
  client: [
    "Prépare un mail de relance.",
    "Rédige un message de suivi professionnel.",
  ],
  pilotage: [
    "Analyse la rentabilité de mes chantiers en cours.",
    "Quels chantiers nécessitent mon attention ?",
  ],
  planning: [
    "Optimise le planning de la semaine.",
    "Propose une organisation des équipes.",
  ],
  dashboard: [
    "Que dois-je prioriser aujourd'hui ?",
    "Résume mon activité de la semaine.",
  ],
};

export function getMumIaSuggestedPrompts(
  source: MumIaContextSource,
  custom?: string[],
): string[] {
  return custom?.length ? custom : DEFAULT_PROMPTS_BY_SOURCE[source];
}
