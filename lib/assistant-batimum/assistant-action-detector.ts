import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import { isSoftwareListQuestion } from "@/lib/assistant-batimum/assistant-rules";
import type {
  AssistantBrainContext,
  AssistantIntent,
} from "@/lib/assistant-batimum/assistant-types";
import type { AssistantSessionContext } from "@/lib/batimum-assistant-types";

const ACTION_VERB =
  /\b(?:cree|creer|crée|créer|ajoute|ajouter|nouveau|nouvelle|nouvel|enregistre|enregistrer|prepare|prépare|préparer|preparer|faire|fais|fais[- ]?moi|ouvre|ouvrir|cherch|cherche|modifier|supprime|supprimer|relance|relancer|planifie|planifier|deplace|déplace|déplacer|mets|mettre)\b/i;

export type DetectedAction = {
  intent: AssistantIntent;
  module: string;
  confidence: number;
};

const TOPIC_TO_CREATE_INTENT: Record<string, AssistantIntent> = {
  client: "create_client",
  clients: "create_client",
  devis: "create_devis",
  facture: "create_facture",
  factures: "create_facture",
  chantier: "create_chantier",
  chantiers: "create_chantier",
  employe: "create_employe",
  employes: "create_employe",
  employé: "create_employe",
  employés: "create_employe",
  salarie: "create_employe",
  salarié: "create_employe",
  fourniture: "create_fourniture",
  fournitures: "create_fourniture",
  rendez_vous: "create_rendez_vous",
  rdv: "create_rendez_vous",
  commande: "create_commande",
  commandes: "create_commande",
};

const INTENT_MODULE: Partial<Record<AssistantIntent, string>> = {
  create_client: "clients",
  create_devis: "devis",
  create_facture: "factures",
  create_chantier: "chantiers",
  create_employe: "employes",
  create_fourniture: "fournitures",
  create_rendez_vous: "planning",
  create_commande: "commandes",
  search_client: "clients",
  search_devis: "devis",
  search_chantier: "chantiers",
};

export function hasActionVerb(message: string): boolean {
  return ACTION_VERB.test(normalizeAssistantText(message));
}

export function isCountQuestion(message: string): boolean {
  const n = normalizeAssistantText(message);
  return (
    /\b(?:combien|nombre)\b/.test(n) ||
    /\bmes\s+(?:clients?|devis|factures?|chantiers?|employes?|employés?|salaries?|salariés?)\s*$/i.test(
      n,
    )
  );
}

/** Infère le sujet récent (client, devis…) depuis la session. */
export function inferTopicFromContext(
  session?: AssistantSessionContext,
): string | null {
  if (session?.last_topic) return session.last_topic;

  const recent = session?.recent_messages ?? [];
  for (let i = recent.length - 1; i >= 0; i--) {
    const n = normalizeAssistantText(recent[i].content);
    if (/\bclients?\b/.test(n)) return "client";
    if (/\bdevis\b/.test(n)) return "devis";
    if (/\bfactures?\b/.test(n)) return "facture";
    if (/\bchantiers?\b/.test(n)) return "chantier";
    if (/\b(?:employes?|employés?|salaries?|salariés?)\b/.test(n)) return "employe";
    if (/\bfournitures?\b/.test(n)) return "fourniture";
    if (/\b(?:rdv|rendez[- ]?vous)\b/.test(n)) return "rendez_vous";
  }
  return null;
}

export function topicFromAnswerIntent(intent: string): string | undefined {
  if (intent === "count_clients") return "client";
  if (intent === "count_devis") return "devis";
  if (intent === "count_factures") return "facture";
  if (intent === "count_chantiers") return "chantier";
  if (intent === "count_employes") return "employe";
  if (intent === "count_fournitures") return "fourniture";
  if (intent === "count_commandes") return "commande";
  return undefined;
}

function detectEntityAction(message: string): DetectedAction | null {
  const n = normalizeAssistantText(message);

  if (/^devis\s+/.test(n)) {
    return { intent: "create_devis", module: "devis", confidence: 0.9 };
  }

  if (!hasActionVerb(message) && !/\bnouveau\s+\w+/i.test(message)) {
    return null;
  }

  if (isCountQuestion(message) && !hasActionVerb(message)) {
    return null;
  }

  if (
    /\b(?:salari[eé]|employ[eé]|employes?|employés?|ouvrier)\b/.test(n) &&
    (hasActionVerb(message) || /\bnouvel\b/.test(n))
  ) {
    return { intent: "create_employe", module: "employes", confidence: 0.94 };
  }

  if (/\b(?:rdv|rendez[- ]?vous)\b/.test(n) && hasActionVerb(message)) {
    return { intent: "create_rendez_vous", module: "planning", confidence: 0.93 };
  }

  if (/\bdevis\b/.test(n) && (hasActionVerb(message) || /\bprepare\b/.test(n))) {
    return { intent: "create_devis", module: "devis", confidence: 0.94 };
  }

  if (/\bfactures?\b/.test(n) && hasActionVerb(message)) {
    return { intent: "create_facture", module: "factures", confidence: 0.93 };
  }

  if (/\bchantiers?\b/.test(n) && hasActionVerb(message)) {
    return { intent: "create_chantier", module: "chantiers", confidence: 0.93 };
  }

  if (/\bfournitures?\b/.test(n) && hasActionVerb(message)) {
    return { intent: "create_fourniture", module: "fournitures", confidence: 0.92 };
  }

  if (/\bcommandes?\b/.test(n) && hasActionVerb(message)) {
    return { intent: "create_commande", module: "commandes", confidence: 0.92 };
  }

  if (
    /\bclients?\b/.test(n) &&
    (hasActionVerb(message) || /\bnouveau\s+client\b/.test(n))
  ) {
    return { intent: "create_client", module: "clients", confidence: 0.95 };
  }

  if (/\bnouveau\s+client\b/.test(n)) {
    return { intent: "create_client", module: "clients", confidence: 0.96 };
  }

  if (/\b(?:cherche|chercher|ouvr|ouvre)\b/.test(n) && /\bclient\b/.test(n)) {
    return { intent: "search_client", module: "clients", confidence: 0.9 };
  }

  return null;
}

/** Résout « en créer un », « en ajouter un » via le contexte. */
export function detectPronounAction(
  message: string,
  context?: AssistantBrainContext,
): DetectedAction | null {
  const n = normalizeAssistantText(message);

  const pronounCreate =
    /\b(?:en|un)\s+(?:creer|cree|crée|créer|ajouter|ajoute)\s+(?:un|une)?\b/.test(n) ||
    /\b(?:veux|voudrais|aimerais)\s+en\s+(?:creer|cree|crée|créer|ajouter|ajoute)\b/.test(n) ||
    /\b(?:creer|cree|crée|créer|ajouter|ajoute)\s+en\s+un\b/.test(n);

  if (!pronounCreate) return null;

  const topic = inferTopicFromContext(context?.session);
  if (!topic) return null;

  const intent = TOPIC_TO_CREATE_INTENT[topic];
  if (!intent) return null;

  return {
    intent,
    module: INTENT_MODULE[intent] ?? "core",
    confidence: 0.92,
  };
}

/**
 * Détecte une intention d'action AVANT les statistiques.
 * Priorité absolue sur count_clients et autres réponses data.
 */
export function detectActionIntent(
  message: string,
  context?: AssistantBrainContext,
): DetectedAction | null {
  if (isSoftwareListQuestion(message)) return null;

  const pronoun = detectPronounAction(message, context);
  if (pronoun) return pronoun;

  const n = normalizeAssistantText(message);

  if (/^(?:non|mais)\b/.test(n) && (hasActionVerb(message) || pronoun)) {
    const entity = detectEntityAction(message.replace(/^(?:non|mais)\s+/i, ""));
    if (entity) return { ...entity, confidence: 0.91 };
  }

  return detectEntityAction(message);
}
