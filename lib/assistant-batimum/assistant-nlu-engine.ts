import { isForbiddenEntityValue } from "@/lib/assistant-batimum/v1-charter";
import { cleanClientName, extractClientName } from "@/lib/assistant-batimum/assistant-cleaners";
import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import type { AssistantBrainContext, AssistantIntent } from "@/lib/assistant-batimum/assistant-types";
import {
  NLU_ABBREVIATIONS,
  NLU_TONE_PATTERNS,
  NLU_VERB_SYNONYMS,
} from "@/lib/assistant-batimum/nlu-lexicon";

export type NluResolution = {
  intent: AssistantIntent;
  module: string;
  confidence: number;
  data?: Record<string, unknown>;
};

const VERB_FAMILIES = {
  create: new RegExp(`\\b(?:${NLU_VERB_SYNONYMS.create.join("|")}|nouveau|nouvelle)\\b`),
  modify: new RegExp(`\\b(?:${NLU_VERB_SYNONYMS.modify.join("|")}|reporter)\\b`),
  delete: new RegExp(`\\b(?:${NLU_VERB_SYNONYMS.delete.join("|")})\\b`),
  assign: new RegExp(`\\b(?:${NLU_VERB_SYNONYMS.assign.join("|")}|planifier)\\b`),
  search: new RegExp(`\\b(?:${NLU_VERB_SYNONYMS.search.join("|")}|montre)\\b`),
  analyze: new RegExp(`\\b(?:${NLU_VERB_SYNONYMS.analyze.join("|")})\\b`),
  relance: new RegExp(`\\b(?:${NLU_VERB_SYNONYMS.relance.join("|")})\\b`),
} as const;

function expandAbbreviations(input: string): string {
  return input
    .split(/\s+/)
    .map((w) => NLU_ABBREVIATIONS[w.toLowerCase()] ?? w)
    .join(" ");
}

function detectTone(message: string): string {
  if (NLU_TONE_PATTERNS.urgency.test(message)) return "urgence";
  if (NLU_TONE_PATTERNS.correction.test(message)) return "correction";
  if (NLU_TONE_PATTERNS.question.test(message)) return "question";
  if (NLU_TONE_PATTERNS.thanks.test(message)) return "remerciement";
  return "demande";
}

function extractDateRange(message: string): Record<string, string> {
  const out: Record<string, string> = {};
  const range = message.match(/\bdu\s+(.+?)\s+au\s+(.+?)(?:$|[,.;])/i);
  if (range?.[1] && range?.[2]) {
    out.date_debut = range[1].trim();
    out.date_fin = range[2].trim();
    return out;
  }
  const single = message.match(/\b(?:le|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain)\s+(.+)?/i);
  if (single?.[0]) out.date = single[0].trim();
  return out;
}

function extractEmploye(message: string): string | undefined {
  const m =
    message.match(/\b(?:mets?|affecte|place|envoie|prevoir|positionne)\s+(.+?)\s+(?:sur|dessus|au)\b/i) ??
    message.match(/\b(?:employe|salari[ée]?|ouvrier)\s+(.+?)\b/i);
  if (m?.[1]) return cleanClientName(m[1]);
  return undefined;
}

function extractChantier(message: string): string | undefined {
  const m = message.match(/\b(?:sur|au)\s+(?:le\s+)?(?:chantier\s+)?(.+?)(?:\s+du\s+|\s+au\s+|$)/i);
  if (m?.[1]) return cleanClientName(m[1]);
  return undefined;
}

function resolveImperfectAssign(
  normalizedMessage: string,
  context: AssistantBrainContext,
): NluResolution | null {
  const parts = normalizedMessage.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 6) return null;
  const hasDay = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain)\b/.test(
    normalizedMessage,
  );
  if (!hasDay) return null;
  const first = cleanClientName(parts[0] ?? "");
  const second = cleanClientName(parts[1] ?? "");
  if (!first || !second) return null;
  if (isForbiddenEntityValue(first) || isForbiddenEntityValue(second)) return null;
  const data: Record<string, unknown> = {
    operation: "assign_employee",
    employe: first,
    chantier: second || context.memory?.currentChantier,
  };
  Object.assign(data, extractDateRange(normalizedMessage));
  return { intent: "modify_data", module: "planning", confidence: 0.86, data };
}

function inferCurrentContext(context: AssistantBrainContext): Record<string, unknown> {
  const memory = context.memory;
  const pending = context.session?.pending_data ?? {};
  return {
    currentClient:
      (memory?.currentClient ?? pending.client ?? context.session?.last_client_name) || undefined,
    currentChantier: (memory?.currentChantier ?? pending.chantier) || undefined,
    currentDevis: (memory?.currentDevis ?? pending.devis) || undefined,
  };
}

function resolveAssignIntent(message: string, context: AssistantBrainContext): NluResolution | null {
  const n = normalizeAssistantText(message);
  if (!VERB_FAMILIES.assign.test(n) && !/\bdessus\b|\bcelui-ci\b|\bcelui-la\b/.test(n)) {
    return null;
  }
  if (!/\b(sur|au|chantier|planning|dessus)\b/.test(n)) return null;

  const ctx = inferCurrentContext(context);
  const data: Record<string, unknown> = { operation: "assign_employee" };

  const employeMatch =
    message.match(/\b(?:mets?|met|affecte|place|envoie|planifie)\s+(.+?)\s+(?:sur|au)\b/i) ??
    message.match(/\b(?:employe|salari[ée]?|ouvrier)\s+(.+?)\b/i);
  if (employeMatch?.[1]) data.employe = cleanClientName(employeMatch[1]);

  const chantierMatch =
    message.match(/\b(?:sur|au)\s+(?:le\s+)?(?:chantier\s+)?(.+?)(?:\s+du\s+|\s+de\s+|\s+au\s+|$)/i);
  if (chantierMatch?.[1]) data.chantier = cleanClientName(chantierMatch[1]);

  if (/\bdessus\b|\bcelui-ci\b|\bcelui-la\b/.test(n)) {
    data.chantier = data.chantier ?? ctx.currentChantier;
  }
  Object.assign(data, extractDateRange(message));

  return {
    intent: "modify_data",
    module: "planning",
    confidence: 0.93,
    data,
  };
}

/**
 * Résolution NLU verbe->intention->objets, orientée sens (pas simple mots-clés).
 */
export function resolveNaturalLanguageIntent(
  message: string,
  context: AssistantBrainContext,
): NluResolution | null {
  const expanded = expandAbbreviations(message);
  const n = normalizeAssistantText(expanded);
  if (!n) return null;

  const imperfect = resolveImperfectAssign(n, context);
  if (imperfect) return imperfect;

  const assign = resolveAssignIntent(expanded, context);
  if (assign) return assign;

  const create = VERB_FAMILIES.create.test(n);
  const search = VERB_FAMILIES.search.test(n);
  const analyze = VERB_FAMILIES.analyze.test(n);
  const relance = VERB_FAMILIES.relance.test(n);

  const name = extractClientName(expanded);
  const ctx = inferCurrentContext(context);
  const tone = detectTone(expanded);

  if (/\bclient\b/.test(n) && create) {
    return {
      intent: "create_client",
      module: "clients",
      confidence: 0.92,
      data: { nom: name ?? undefined, tone },
    };
  }
  if ((/\bdevis\b/.test(n) && (create || search)) || /^devis\s+/.test(n)) {
    const startsWithDevis = /^devis\s+/.test(n);
    return {
      intent: create || startsWithDevis ? "create_devis" : "search_devis",
      module: "devis",
      confidence: 0.9,
      data: { client: name ?? ctx.currentClient, tone },
    };
  }
  if (/\bchantier\b/.test(n) && create) {
    return { intent: "create_chantier", module: "chantiers", confidence: 0.9 };
  }
  if (/\bfacture\b/.test(n) && create) {
    return { intent: "create_facture", module: "factures", confidence: 0.9 };
  }
  if (/\b(?:rdv|rendez[- ]?vous|planning)\b/.test(n) && (create || VERB_FAMILIES.modify.test(n))) {
    return { intent: "create_rendez_vous", module: "planning", confidence: 0.86, data: { tone } };
  }
  if (/\bemploye|salari|ouvrier\b/.test(n) && create) {
    return { intent: "create_employe", module: "employes", confidence: 0.88 };
  }
  if (/\bfourniture|materiau|materiel\b/.test(n) && create) {
    return { intent: "create_fourniture", module: "fournitures", confidence: 0.86 };
  }
  if (/\bcommande\b/.test(n) && create) {
    return { intent: "create_commande", module: "commandes", confidence: 0.84 };
  }
  if (relance && /\bdevis\b/.test(n)) {
    return { intent: "show_quotes_to_follow_up", module: "devis", confidence: 0.9 };
  }
  if (relance && /\bfacture|impay/.test(n)) {
    return { intent: "show_unpaid_invoices", module: "factures", confidence: 0.9 };
  }
  if (analyze && /\b(?:ca|chiffre|benefice|bénéfice)\b/.test(n)) {
    return { intent: "monthly_revenue", module: "pilotage", confidence: 0.82 };
  }
  if (analyze && /\b(?:marge|rentabilite|rentabilité)\b/.test(n)) {
    return { intent: "monthly_profit", module: "pilotage", confidence: 0.82 };
  }

  if (VERB_FAMILIES.assign.test(n)) {
    const data: Record<string, unknown> = {
      operation: "assign_employee",
      employe: extractEmploye(expanded) ?? ctx.currentEmploye,
      chantier: extractChantier(expanded) ?? ctx.currentChantier,
      tone,
    };
    Object.assign(data, extractDateRange(expanded));
    return {
      intent: "modify_data",
      module: "planning",
      confidence: data.employe || data.chantier ? 0.88 : 0.76,
      data,
    };
  }

  return null;
}

export function resolveNaturalLanguageIntents(
  message: string,
  context: AssistantBrainContext,
): NluResolution[] {
  const expanded = expandAbbreviations(message);
  const segments = expanded
    .split(/\b(?:puis|ensuite|et puis|apres|après)\b/i)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length <= 1) {
    const single = resolveNaturalLanguageIntent(expanded, context);
    return single ? [single] : [];
  }

  const out: NluResolution[] = [];
  for (const segment of segments) {
    const r = resolveNaturalLanguageIntent(segment, context);
    if (r) out.push(r);
  }
  return out;
}

