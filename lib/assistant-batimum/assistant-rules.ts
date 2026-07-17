/**
 * Briefing strict — règles de cohérence de l'assistant Batimum.
 * Chaque message est classé AVANT toute réponse ou action.
 */
import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import { cleanClientName } from "@/lib/assistant-batimum/assistant-cleaners";
import type { AssistantBrainContext, AssistantIntent } from "@/lib/assistant-batimum/assistant-types";
import { hasActionVerb, isCountQuestion } from "@/lib/assistant-batimum/assistant-action-detector";
import { isAwaitingAnswer } from "@/lib/assistant-batimum/assistant-short-answer";
import { V1_OUT_OF_SCOPE_REPLY, v1QuestionForField } from "@/lib/assistant-batimum/v1-charter";

/** Règle n°2 — une seule catégorie par message. */
export type MessageCategory =
  | "politesse"
  | "question_logiciel"
  | "action"
  | "reponse_en_cours"
  | "correction"
  | "question_btp"
  | "hors_sujet"
  | "incompris";

export const OFF_TOPIC_REPLY = V1_OUT_OF_SCOPE_REPLY;

export const CAREFUL_REPLY =
  "Je n'ai pas assez d'informations pour être sûr. Pouvez-vous préciser ?";

const CONVERSATION_INTENTS = new Set<AssistantIntent>([
  "greeting",
  "thanks",
  "small_talk",
  "ack",
  "ready",
  "farewell",
]);

const NO_ACTION_FOLLOW_UP = new Set<AssistantIntent>([
  ...CONVERSATION_INTENTS,
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
  "out_of_scope",
]);

const GREETING = /^(?:bonjour|salut|hello|coucou|bonsoir|hey|allo|bjr)\b/i;
const FAREWELL =
  /^(?:bonne journee|bonne journée|bonne soiree|bonne soirée|a bientot|à bientôt|a demain|à demain|au revoir)\b/i;
const THANKS = /^(?:merci|thanks|remercie|bcp|merci beaucoup)/i;
const SMALL_TALK = /^(?:ca va|ça va|comment ca va|comment ça va|comment allez[- ]vous)\s*\??$/i;
const READY =
  /\b(?:t['']?es\s+pret|tu\s+es\s+pret|pret\s+a\s+travaill|etes[- ]vous\s+pret)\b/i;
const ACK = /^(?:ok|parfait|nickel|super|compris|tres bien|très bien|d'?accord)\s*[!?.]*$/i;

const SOFTWARE_Q =
  /\b(?:combien|nombre|quel(?:le)?s?|liste|montre|affiche|total|stats?|ca|chiffre|benefice|bénéfice|marge|rentabilite|rentabilité|impay\w*|retard|planning|rdv|rendez[- ]?vous)\b/i;

export function isSoftwareListQuestion(message: string): boolean {
  const n = normalizeAssistantText(message);
  if (!SOFTWARE_Q.test(n)) return false;
  if (
    /\bquels?\b/.test(n) &&
    /\b(?:devis|factures?|chantiers?|clients?|impay)\b/.test(n)
  ) {
    return true;
  }
  return !hasActionVerb(message);
}

const HORS_SUJET = [
  /\b(blague|raconte une histoire|raconte[- ]moi)\b/,
  /\b(politique|election|élection|president|président)\b/,
  /\b(medecin|médecin|maladie|sympt[oô]me)\b/,
  /\b(recette|gateau|gâteau)\b/,
  /\b(devoirs?|dissertation)\b/,
  /\b(film|netflix|football|psg)\b/,
];

const BTP_Q =
  /\b(?:dtu|tva|debours|débours|marge|prix au m2|tarif|norme nf)\b/i;

export function isConversationIntent(intent: AssistantIntent): boolean {
  return CONVERSATION_INTENTS.has(intent);
}

/** Règle n°1 — pas de proposition d'action non demandée. */
export function shouldAppendFollowUp(intent: AssistantIntent): boolean {
  return !NO_ACTION_FOLLOW_UP.has(intent);
}

export function appendFollowUp(intent: AssistantIntent, text: string): string {
  if (!shouldAppendFollowUp(intent)) return text;
  if (/\?\s*$/.test(text.trim())) return text;
  return `${text.trim()} Que souhaitez-vous faire ensuite ?`;
}

export function classifyMessageCategory(
  message: string,
  context: AssistantBrainContext = {},
): MessageCategory {
  const n = normalizeAssistantText(message.trim());
  if (!n) return "incompris";

  if (isAwaitingAnswer(context) || context.session?.missing_fields?.length) {
    return "reponse_en_cours";
  }

  if (HORS_SUJET.some((p) => p.test(n))) return "hors_sujet";
  if (extractUserCorrection(message)) return "correction";

  if (
    GREETING.test(n) ||
    THANKS.test(n) ||
    SMALL_TALK.test(n) ||
    ACK.test(n) ||
    FAREWELL.test(n) ||
    READY.test(n)
  ) {
    return "politesse";
  }

  if (
    hasActionVerb(message) &&
    !isSoftwareListQuestion(message) &&
    !isCountQuestion(message)
  ) {
    return "action";
  }

  if (SOFTWARE_Q.test(n) || isCountQuestion(message) || isSoftwareListQuestion(message)) {
    return "question_logiciel";
  }

  if (hasActionVerb(message) || /\bnouveau\s+\w+/i.test(n)) {
    if (!isCountQuestion(message) || hasActionVerb(message)) {
      return "action";
    }
  }

  if (BTP_Q.test(n)) return "question_btp";

  return "incompris";
}

/** Règle n°9 — corrections utilisateur. */
export function extractUserCorrection(
  message: string,
): Record<string, string> | null {
  const trimmed = message.trim();
  const n = normalizeAssistantText(trimmed);

  const nonPasJuste = trimmed.match(/non\s+pas\s+.+?\s+juste\s+(.+)/i);
  if (nonPasJuste?.[1]) {
    const nom = cleanClientName(nonPasJuste[1]);
    if (nom) return { nom };
  }

  const pourMatch = trimmed.match(/^non\s+(?:pour|chez)\s+(.+)/i);
  if (pourMatch?.[1]) {
    const client = cleanClientName(pourMatch[1]);
    if (client.length >= 2) return { client };
  }

  const dateMatch = trimmed.match(
    /(?:pas\s+\w+[,]?\s+)?(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|apr[eè]s[- ]?demain)/i,
  );
  if (/pas\s+/i.test(n) && dateMatch?.[1]) {
    return { date: dateMatch[1].toLowerCase() };
  }

  const heureMatch = trimmed.match(
    /(?:mets|mettre|plutot|plutôt)\s+(\d{1,2})[:hH]?(\d{2})?\s+(?:au lieu|a la place)/i,
  );
  if (heureMatch) {
    const h = Math.min(23, Number(heureMatch[1]));
    const m = heureMatch[2] ? Math.min(59, Number(heureMatch[2])) : 0;
    return { heure: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
  }

  const justMatch = trimmed.match(
    /(?:non\s+)?(?:pas\s+)?(?:juste|plutot|plutôt|seulement)\s+(.+)/i,
  );
  if (justMatch?.[1] && /non|pas/.test(n)) {
    const value = cleanClientName(justMatch[1]);
    if (value.length >= 1) return { nom: value };
  }

  return null;
}

/** Règle n°10 — questions ciblées par intention / champ manquant. */
export function targetedFieldQuestion(
  intent: AssistantIntent,
  field: string,
  data?: Record<string, unknown>,
): string {
  if (intent === "create_client" && field === "nom") {
    return "Quel est le nom du client à créer ?";
  }
  if (intent === "create_devis" && field === "client") {
    return "Pour quel client souhaitez-vous préparer ce devis ?";
  }
  if (intent === "create_devis" && field === "type_chantier") {
    return "Quel type de travaux souhaitez-vous chiffrer ?";
  }
  if (intent === "create_devis" && field === "mum_ia_choice") {
    const type = data?.type_chantier ?? "travaux";
    const client = data?.client ?? "ce client";
    return `Très bien, devis ${type} pour ${client}. Voulez-vous le préparer avec MUM IA ?`;
  }
  if (intent === "create_chantier" && field === "client") {
    return "Pour quel client souhaitez-vous créer ce chantier ?";
  }
  if (intent === "create_chantier" && field === "chantier") {
    return "Quel nom souhaitez-vous donner au chantier ?";
  }
  if (intent === "create_rendez_vous" && field === "client") {
    return "Pour quel client ?";
  }
  if (intent === "create_rendez_vous" && field === "date") {
    return "Quelle date ?";
  }
  if (intent === "create_rendez_vous" && field === "heure") {
    return "Quelle heure ?";
  }
  if (intent === "create_employe" && field === "nom") {
    return "Quel est le nom de l'employé à créer ?";
  }
  if (intent === "create_fourniture" && field === "nom") {
    return "Quelle fourniture souhaitez-vous ajouter ?";
  }
  if (intent === "modify_data" && field === "employe") {
    return "Quel employé souhaitez-vous affecter ?";
  }
  if (intent === "modify_data" && field === "chantier") {
    const employe = data?.employe ? String(data.employe) : "cet employé";
    return `Sur quel chantier souhaitez-vous affecter ${employe} ?`;
  }
  if (intent === "create_client" && field === "telephone") {
    return "Quel est le numéro de téléphone ?";
  }
  if (intent === "create_client" && field === "email") {
    return "Quelle est l'adresse email ?";
  }
  if (intent === "create_client" && field === "ville") {
    return v1QuestionForField("ville");
  }
  return v1QuestionForField(field);
}

/** Détecte une intention conversationnelle pure (règle n°7). */
export function matchConversationIntent(message: string): AssistantIntent | null {
  const n = normalizeAssistantText(message.trim());
  if (GREETING.test(n)) return "greeting";
  if (FAREWELL.test(n)) return "farewell";
  if (THANKS.test(n)) return "thanks";
  if (SMALL_TALK.test(n)) return "small_talk";
  if (READY.test(n)) return "ready";
  if (ACK.test(n)) return "ack";
  return null;
}
