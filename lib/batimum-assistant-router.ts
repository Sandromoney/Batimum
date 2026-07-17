/**
 * Routeur d'intentions Batimum — une seule catégorie par message, jamais d'action par défaut.
 */

import { sanitizeClientName } from "@/lib/batimum-nlu";
import type { AppData } from "@/lib/types";

export type AssistantRouteIntent =
  | "conversation_simple"
  | "remerciement"
  | "confirmation"
  | "refus"
  | "correction"
  | "question_logiciel"
  | "question_btp"
  | "conseil_entreprise"
  | "action_client"
  | "action_devis"
  | "action_facture"
  | "action_chantier"
  | "action_planning"
  | "action_employe"
  | "action_fourniture"
  | "action_pilotage"
  | "hors_sujet"
  | "incompris";

export type RoutedMessage = {
  intent: AssistantRouteIntent;
  confidence: number;
  /** Intent legacy pour le pipeline existant (create_client, create_devis…). */
  actionKey?: string;
  reply?: string;
  needsAi?: boolean;
  needsClarification?: boolean;
};

export const INCOMPREHENSIBLE_REPLY =
  "Je n'ai pas assez d'informations pour être sûr. Pouvez-vous préciser ce que vous voulez faire ?";

export const OFF_TOPIC_REPLY =
  "Je suis spécialisé dans Batimum et la gestion de votre activité. Je ne peux pas répondre à cette demande.";

export const BTP_UNCERTAIN_REPLY =
  "Je ne peux pas confirmer avec certitude. Vérifiez auprès d'une source officielle ou d'un professionnel compétent.";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const CONVERSATION = /^(?:bonjour|salut|hello|coucou|bonsoir|bonne journee|bonne journée|bonne soiree|bonne soirée|a bientot|à bientôt|a demain|à demain|au revoir|a plus|à plus|ciao|hey)\b/;
const REMERCIEMENT = /^(?:merci|thanks|remercie|bcp|merci beaucoup)/;
const CA_VA = /^(?:ca va|ça va|comment ca va|comment ça va|comment allez[- ]vous)\s*\??$/;
const ACK = /^(?:ok|parfait|nickel|super|compris|tres bien|très bien|d'?accord)\s*[!?.]*$/;
const CONFIRM = /^(?:oui|confirme|confirmer|valide|vas[- ]?y|c'?est bon|go)\b/;
const REFUS = /^(?:non|annule|annuler|stop|pas ça|pas ca)\b/;
const CORRECTION = /^(?:non\s+)?(?:pas\s+)?(?:juste|plutôt|plutot|seulement)\s+/;

const HORS_SUJET = [
  /\b(coupe du monde|championnat|psg|om|football)\b/,
  /\b(capitale du|geographie|géographie)\b/,
  /\b(recette|gateau|gâteau|cuisine gastronomique)\b/,
  /\b(politique|élection|election|président)\b/,
  /\b(blague|raconte une histoire|raconte[- ]moi)\b/,
  /\b(devoirs?|dissertation|maths? scolaire)\b/,
  /\b(médecin|medecin|maladie|sympt[oô]me)\b/,
  /\b(film|série|serie|netflix)\b/,
];

const ACTION_RULES: Array<{
  intent: AssistantRouteIntent;
  actionKey: string;
  pattern: RegExp;
  unavailable?: boolean;
}> = [
  { intent: "action_client", actionKey: "create_client", pattern: /cr[eé]e.*client|nouveau client|ajoute.*client|ajouter.*client/ },
  { intent: "action_client", actionKey: "open_client", pattern: /ouvr.*client|affiche.*client|fiche client/ },
  { intent: "action_client", actionKey: "search_client", pattern: /cherch.*client|trouv.*client/ },
  { intent: "action_devis", actionKey: "create_devis", pattern: /cr[eé]e.*devis|nouveau devis|pr[eé]par.*devis|fais.*devis|faire.*devis/ },
  { intent: "action_devis", actionKey: "open_devis", pattern: /ouvr.*devis|affiche.*devis/ },
  { intent: "action_devis", actionKey: "mail_prepare", pattern: /mail|email|r[eé]dig.*message|pr[eé]par.*mail/ },
  {
    intent: "action_devis",
    actionKey: "relance",
    pattern: /(?:pr[eé]par|fais|lance|envoie).{0,30}relanc|relanc.*(?:monsieur|madame|client|pour\s+)/i,
  },
  { intent: "action_facture", actionKey: "create_facture", pattern: /cr[eé]e.*facture|nouvelle facture|fais.*facture/, unavailable: true },
  { intent: "action_chantier", actionKey: "create_chantier", pattern: /cr[eé]e.*chantier|nouveau chantier|ajoute.*chantier/ },
  { intent: "action_planning", actionKey: "create_rdv", pattern: /(?:rdv|rendez[- ]vous|planning|ajoute.*rendez)/ },
  { intent: "action_employe", actionKey: "create_employe", pattern: /cr[eé]e.*(?:salari|employ)|nouvel employ|nouveau employ|nouvel employe/, unavailable: true },
  { intent: "action_fourniture", actionKey: "create_fourniture", pattern: /cr[eé]e.*fourniture|ajoute.*fourniture|nouvelle fourniture/, unavailable: true },
  { intent: "action_pilotage", actionKey: "show_unpaid", pattern: /factures?\s+impay|impay/ },
  { intent: "action_pilotage", actionKey: "chantiers_retard", pattern: /chantier.*retard|retard.*chantier|quels? chantiers.*retard/ },
];

const LOGICIEL_QUESTION = [
  /\b(combien|gagn|chiffre|ca |revenu|encaisse)/,
  /\b(impay|facture.*retard|encours|quelles? factures)/,
  /\b(devis.*relanc|relanc.*devis|devis en attente|quels? devis)/,
  /\b(chantier.*retard|retard.*chantier|quels? chantiers)/,
  /\b(meilleur.*client|top client|client.*plus de devis)/,
  /\b(meilleur.*salari|employ[eé].*travaill|salari[eé].*travaill)/,
  /\b(rentabilit|marge|pilotage|budget|analys)/,
  /\b(statistique|tableau de bord|aujourd.?hui|priorit)/,
  /\b(devis.*brouillon|brouillon.*devis|combien.*devis)/,
  /\b(type.*chantier.*marche|chantier.*marche le mieux)/,
];

const BTP_QUESTION = [
  /\b(dtu|norme nf|norme nfp|hauteur.*pose)\b/,
  /\b(quelle tva|taux de tva|tva.*r[eé]nov)/,
  /\b(combien co[uû]te|prix moyen|tarif moyen)\b/,
  /\b(organisation.*chantier|main[- ]d.?oeuvre|mat[eé]riaux?)\b/,
];

const CONSEIL = /\b(conseil|recommand|prioris|que faire|strat[eé]gie|mieux vendre)\b/;

const UNAVAILABLE_REPLIES: Record<string, string> = {
  create_employe:
    "J'ai bien compris que vous souhaitez créer un nouvel employé.\n\nCette fonctionnalité sera bientôt disponible dans Batimum. Je pourrai ensuite préparer automatiquement sa fiche salarié.",
  create_fourniture:
    "J'ai bien compris que vous souhaitez ajouter une fourniture.\n\nCette fonctionnalité n'est pas encore disponible dans Batimum.",
  create_facture:
    "J'ai bien compris que vous souhaitez créer une facture.\n\nCette fonctionnalité n'est pas encore disponible via l'assistant pour le moment.",
};

function conversationReply(message: string): string {
  const n = normalize(message);
  if (CA_VA.test(n)) {
    return "Très bien, prêt à vous aider à piloter Batimum.";
  }
  if (/^(?:bonjour|salut|hello|coucou|bonsoir)/.test(n)) {
    return "Bonjour ! Je peux vous aider à créer un devis, retrouver un client, organiser un chantier ou analyser votre activité.";
  }
  if (/bonne journee|bonne journée|bonne soiree|a bientot|à bientôt|au revoir/.test(n)) {
    return "À bientôt ! Je reste disponible pour vos devis, clients et chantiers.";
  }
  if (/aide|que peux|comment utiliser/.test(n)) {
    return "Je peux répondre sur vos chiffres, lister les devis à relancer, préparer des devis ou RDV, et exécuter des actions après votre confirmation.";
  }
  return "Je suis là pour vous aider. Que souhaitez-vous faire ?";
}

/** Détecte une réponse de continuation dans un flux en cours. */
export function parseContinuationSlot(
  message: string,
): { field: string; value: string } | null {
  const trimmed = message.trim();
  const pourClient = trimmed.match(/^(?:pour\s+)?(?:le\s+)?client\s+(.+)/i);
  if (pourClient?.[1]) {
    return { field: "client", value: sanitizeClientName(pourClient[1]) };
  }
  if (/^salle de bain/i.test(trimmed)) {
    return { field: "type_chantier", value: "salle de bain" };
  }
  if (/^cuisine\b/i.test(trimmed)) {
    return { field: "type_chantier", value: "cuisine" };
  }
  if (/^r[eé]nov/i.test(trimmed)) {
    return { field: "type_chantier", value: "rénovation" };
  }
  const nameOnly = trimmed.match(/^[A-Za-zÀ-ÿ][\wÀ-ÿ' -]{1,40}$/);
  if (nameOnly && !CONFIRM.test(normalize(trimmed)) && !REFUS.test(normalize(trimmed))) {
    return { field: "nom_complet", value: sanitizeClientName(trimmed) };
  }
  return null;
}

export function routeAssistantMessage(
  message: string,
  options?: { hasPendingAction?: boolean; hasPendingIntent?: boolean },
): RoutedMessage {
  const trimmed = message.trim();
  const n = normalize(trimmed);

  if (!trimmed) {
    return { intent: "incompris", confidence: 1, reply: INCOMPREHENSIBLE_REPLY };
  }

  if (options?.hasPendingIntent) {
    const continuation = parseContinuationSlot(message);
    if (continuation) {
      return { intent: "conversation_simple", confidence: 0.88 };
    }
  }

  if (CONFIRM.test(n)) {
    if (options?.hasPendingAction) {
      return { intent: "confirmation", confidence: 0.98 };
    }
    return {
      intent: "confirmation",
      confidence: 0.9,
      reply: "Parfait, dites-moi ce que vous voulez faire ensuite.",
    };
  }
  if (
    CORRECTION.test(n) ||
    /^non\s+pour/.test(n) ||
    /non\s+pas\s+.+\s+juste\s+/i.test(trimmed)
  ) {
    return { intent: "correction", confidence: 0.9 };
  }
  if (REFUS.test(n)) {
    if (options?.hasPendingAction) {
      return { intent: "refus", confidence: 0.95 };
    }
    return {
      intent: "refus",
      confidence: 0.9,
      reply: "D'accord, que souhaitez-vous modifier ?",
    };
  }

  if (REMERCIEMENT.test(n)) {
    return { intent: "remerciement", confidence: 0.98, reply: "Avec plaisir." };
  }
  if (CA_VA.test(n) || CONVERSATION.test(n)) {
    return {
      intent: "conversation_simple",
      confidence: 0.98,
      reply: conversationReply(trimmed),
    };
  }
  if (ACK.test(n)) {
    return {
      intent: "conversation_simple",
      confidence: 0.9,
      reply: "Parfait, dites-moi ce que vous voulez faire ensuite.",
    };
  }

  for (const pattern of HORS_SUJET) {
    if (pattern.test(n)) {
      return { intent: "hors_sujet", confidence: 0.95, reply: OFF_TOPIC_REPLY };
    }
  }

  if (CONSEIL.test(n)) {
    return { intent: "conseil_entreprise", confidence: 0.8, needsAi: true };
  }

  for (const pattern of LOGICIEL_QUESTION) {
    if (pattern.test(n)) {
      return { intent: "question_logiciel", confidence: 0.88 };
    }
  }

  for (const pattern of BTP_QUESTION) {
    if (pattern.test(n)) {
      return {
        intent: "question_btp",
        confidence: 0.75,
        needsAi: /dtu|norme|hauteur/i.test(n),
      };
    }
  }

  for (const rule of ACTION_RULES) {
    if (rule.pattern.test(n)) {
      if (rule.unavailable) {
        return {
          intent: rule.intent,
          actionKey: rule.actionKey,
          confidence: 0.92,
          reply: UNAVAILABLE_REPLIES[rule.actionKey],
        };
      }
      const needsAi = rule.actionKey === "mail_prepare";
      return {
        intent: rule.intent,
        actionKey: rule.actionKey,
        confidence: 0.9,
        needsAi,
      };
    }
  }

  if (n.length < 4) {
    return { intent: "incompris", confidence: 0.2, reply: INCOMPREHENSIBLE_REPLY };
  }

  if (n.length < 12 && !/\d/.test(n)) {
    return {
      intent: "incompris",
      confidence: 0.45,
      reply: INCOMPREHENSIBLE_REPLY,
      needsClarification: true,
    };
  }

  return {
    intent: "incompris",
    confidence: 0.35,
    reply: INCOMPREHENSIBLE_REPLY,
    needsAi: true,
  };
}

export function shouldUseAiForRoute(route: RoutedMessage): boolean {
  if (route.needsAi) return true;
  if (route.confidence < 0.6 && route.intent === "incompris") return true;
  return false;
}

export function isLocalRoute(route: RoutedMessage): boolean {
  if (route.reply) return true;
  if (
    [
      "conversation_simple",
      "remerciement",
      "confirmation",
      "refus",
      "correction",
      "hors_sujet",
      "incompris",
      "question_logiciel",
      "question_btp",
    ].includes(route.intent)
  ) {
    return true;
  }
  if (route.intent.startsWith("action_") && route.actionKey && UNAVAILABLE_REPLIES[route.actionKey]) {
    return true;
  }
  return false;
}
