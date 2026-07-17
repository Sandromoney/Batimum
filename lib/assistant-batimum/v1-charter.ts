/**
 * Batimum Assistant — charte V1 (copilote fiable, périmètre limité).
 * Source unique pour messages, politesse, garde-fous et intents autorisés.
 */
import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import type { AssistantIntent } from "@/lib/assistant-batimum/assistant-types";
import type { BatimumAssistantIntent } from "@/lib/batimum-assistant-types";

// ——— Messages standards ———

export const V1_OUT_OF_SCOPE_REPLY =
  "Je suis spécialisé dans Batimum et la gestion de votre activité. Je ne peux pas répondre à cette demande.";

export const V1_ACTION_UNAVAILABLE_REPLY =
  "Je ne peux pas encore réaliser cette action.";

export const V1_UNCERTAIN_REPLY =
  "Je n'ai pas assez d'informations pour être sûr. Pouvez-vous préciser ?";

export const V1_CANCEL_REPLY = "D'accord, j'annule cette action.";

export const V1_NO_PENDING_CONFIRM_REPLY =
  "Je n'ai pas d'action en attente à confirmer.";

export const V1_MULTI_ACTION_REPLY =
  "Commençons par la première étape. Je traite une action à la fois.";

// ——— Politesse (aucune action) ———

const GREETING = /^(?:bonjour|bonsoir|salut|hello|coucou|hey|allo|bjr)\b/i;
const FAREWELL =
  /^(?:bonne journee|bonne journée|bonne soiree|bonne soirée|a bientot|à bientôt|au revoir)\s*[!?.]*$/i;
const THANKS = /^(?:merci(?:\s+beaucoup)?|thanks|remercie|bcp)\s*[!?.]*$/i;
const SMALL_TALK =
  /^(?:ca va|ça va|comment ca va|comment ça va|comment allez[- ]vous)\s*\??$/i;

export const V1_POLITENESS_REPLIES: Record<string, string> = {
  greeting: "Bonjour. Comment puis-je vous aider sur Batimum ?",
  evening: "Bonsoir. Comment puis-je vous aider sur Batimum ?",
  farewell: "Bonne journée.",
  thanks: "Avec plaisir.",
  small_talk: "Très bien, merci.",
};

/** Mots/phrases qui ne doivent jamais être interprétés comme entités (employé, client, nom…). */
export const V1_FORBIDDEN_ENTITY_TOKENS = new Set([
  "ca va",
  "ça va",
  "comment ca va",
  "comment ça va",
  "j aimerais",
  "j'aimerais",
  "je voudrais",
  "je veux",
  "merci",
  "bonjour",
  "bonsoir",
  "salut",
  "oui",
  "non",
  "ok",
  "parfait",
  "nickel",
  "d accord",
  "d'accord",
  "confirme",
  "annule",
]);

export function isForbiddenEntityValue(raw?: string): boolean {
  if (!raw?.trim()) return true;
  const n = normalizeAssistantText(raw);
  if (V1_FORBIDDEN_ENTITY_TOKENS.has(n)) return true;
  if (/^(?:j\s+)?aimerais\b/.test(n)) return true;
  if (/^(?:je\s+)?voudrais\b/.test(n)) return true;
  return false;
}

export function sanitizeV1EntityValue(raw?: string): string | undefined {
  if (!raw?.trim() || isForbiddenEntityValue(raw)) return undefined;
  return raw.trim();
}

export type PolitenessKind = "greeting" | "evening" | "farewell" | "thanks" | "small_talk" | null;

export function detectPoliteness(message: string): PolitenessKind {
  const n = normalizeAssistantText(message.trim());
  if (!n) return null;
  if (SMALL_TALK.test(n)) return "small_talk";
  if (THANKS.test(n)) return "thanks";
  if (FAREWELL.test(n)) return "farewell";
  if (/^bonsoir\b/.test(n)) return "evening";
  if (GREETING.test(n)) return "greeting";
  return null;
}

export function replyPoliteness(kind: PolitenessKind): string | null {
  if (!kind) return null;
  return V1_POLITENESS_REPLIES[kind] ?? null;
}

export function isPolitenessOnlyMessage(message: string): boolean {
  return detectPoliteness(message) !== null;
}

// ——— Confirmations explicites uniquement (V1) ———

/** « merci », « parfait », « d'accord » ne sont PAS des confirmations. */
export const V1_EXPLICIT_CONFIRM =
  /^(?:oui(?:\s+|$)|ok(?:\s+|$)|vas[- ]?y|c'?est bon|confirme(?:r)?|valide(?:r)?|go)\b/i;

export const V1_EXPLICIT_CANCEL =
  /^(?:non(?:\s+|$)?|annule(?:r)?|stop|laisse tomber|oublie|pas maintenant)\s*[!?.]*$/i;

// ——— Intents V1 ———

/** Réponses / stats pilotage autorisées en V1. */
export const V1_ANSWER_INTENTS = new Set<AssistantIntent>([
  "count_clients",
  "count_devis",
  "count_factures",
  "count_chantiers",
  "count_employes",
  "show_unpaid_invoices",
  "show_quotes_to_follow_up",
  "show_late_chantiers",
  "monthly_revenue",
  "monthly_profit",
  "best_chantier_type",
  "chantier_profitability",
  "employee_performance",
  "analyze_dashboard",
  "search_client",
  "search_devis",
  "open_client",
  "open_devis",
  "open_chantier",
  "open_facture",
  "open_planning",
  "greeting",
  "thanks",
  "small_talk",
  "ack",
  "farewell",
  "help_capabilities",
  "out_of_scope",
  "unknown",
  "conversation",
]);

/** Actions exécutables après confirmation en V1. */
export const V1_ACTION_INTENTS = new Set<AssistantIntent>([
  "create_client",
  "create_devis",
  "create_chantier",
  "create_facture",
  "create_rendez_vous",
  "modify_data",
  "search_client",
]);

export const V1_EXECUTABLE_API_INTENTS = new Set<BatimumAssistantIntent>([
  "create_client",
  "search_client",
  "create_quote",
  "create_chantier",
  "create_appointment",
  "assign_employee",
  "show_unpaid_invoices",
  "show_quotes_to_follow_up",
  "analyze_dashboard",
]);

/** Sous-opérations planning V1 réellement implémentées. */
export const V1_PLANNING_OPERATIONS = new Set(["assign_employee"]);

export function isV1ExecutableApiIntent(intent: BatimumAssistantIntent): boolean {
  return V1_EXECUTABLE_API_INTENTS.has(intent);
}

export function isV1BrainIntentAllowed(intent: AssistantIntent): boolean {
  return V1_ANSWER_INTENTS.has(intent) || V1_ACTION_INTENTS.has(intent);
}

export function v1UnavailableActionReply(intent?: string): string {
  if (!intent || intent === "unknown") return V1_UNCERTAIN_REPLY;
  return V1_ACTION_UNAVAILABLE_REPLY;
}

/** Une seule question par champ — libellés courts. */
export const V1_FIELD_QUESTIONS: Record<string, string> = {
  nom: "Quel est le nom du client ?",
  nom_complet: "Quel est le nom complet du client ?",
  client: "Quel client ?",
  telephone: "Quel est le numéro de téléphone ?",
  email: "Quelle est l'adresse email ?",
  ville: "Dans quelle ville ?",
  adresse: "Quelle est l'adresse ?",
  date: "À quelle date ?",
  heure: "À quelle heure ?",
  chantier: "Quel chantier ?",
  employe: "Quel employé ?",
  date_debut: "Quelle est la date de début ?",
  date_fin: "Quelle est la date de fin ?",
  type_chantier: "Quel type de travaux ?",
  clarification: "Pouvez-vous préciser ?",
};

export function v1QuestionForField(field: string): string {
  return V1_FIELD_QUESTIONS[field] ?? V1_UNCERTAIN_REPLY;
}
