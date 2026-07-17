/**
 * Compréhension du langage naturel pour l'assistant Batimum.
 * Analyse sémantique (verbes d'action, objets métier, formulations polies)
 * + extraction d'entités par pipeline linguistique — pas de simple match mot-clé.
 */

export type BatimumActionIntent =
  | "create_client"
  | "create_chantier"
  | "create_devis"
  | "create_facture"
  | "create_appointment"
  | "search_client"
  | "search_devis"
  | "search_chantier"
  | "show_unpaid_invoices"
  | "show_devis_to_follow_up"
  | "open_planning";

export type BatimumEntities = {
  clientName?: string;
  chantierName?: string;
  devisReference?: string;
  date?: string;
  time?: string;
  description?: string;
};

export type NluUnderstanding = {
  intent: BatimumActionIntent | null;
  confidence: number;
  entities: BatimumEntities;
  missingSlots: string[];
  reasoning: string;
};

const INTENT_LABELS: Record<BatimumActionIntent, string> = {
  create_client: "Créer un client",
  create_chantier: "Créer un chantier",
  create_devis: "Créer un devis",
  create_facture: "Créer une facture",
  create_appointment: "Créer un rendez-vous",
  search_client: "Rechercher un client",
  search_devis: "Rechercher un devis",
  search_chantier: "Rechercher un chantier",
  show_unpaid_invoices: "Afficher les factures impayées",
  show_devis_to_follow_up: "Afficher les devis à relancer",
  open_planning: "Ouvrir le planning",
};

export function getIntentLabel(intent: BatimumActionIntent): string {
  return INTENT_LABELS[intent];
}

const STOP_WORDS = new Set([
  "un",
  "une",
  "le",
  "la",
  "les",
  "des",
  "du",
  "de",
  "d",
  "qui",
  "que",
  "qu",
  "ce",
  "cette",
  "mon",
  "ma",
  "mes",
  "nouveau",
  "nouvelle",
  "nouveaux",
  "nouvelles",
  "client",
  "clients",
  "stp",
  "svp",
  "merci",
  "sil",
  "plait",
  "svp.",
]);

const CIVILITY_PATTERN =
  /^(?:monsieur|madame|m\.|mme\.?|mr\.?|mme|mlle\.?|mademoiselle)\s+/i;

type IntentSignal = {
  intent: BatimumActionIntent;
  weight: number;
  pattern: RegExp;
};

const INTENT_SIGNALS: IntentSignal[] = [
  {
    intent: "create_client",
    weight: 12,
    pattern:
      /(?:cr[eé]e|cr[eé]er|ajoute|ajouter|enregistre|enregistrer|inscris|inscrire).{0,40}\bclient\b/i,
  },
  {
    intent: "create_client",
    weight: 11,
    pattern: /\bnouveau\s+client\b/i,
  },
  {
    intent: "create_client",
    weight: 10,
    pattern: /\bj['']ai\s+un\s+(?:nouveau\s+)?client\b/i,
  },
  {
    intent: "create_client",
    weight: 9,
    pattern: /\bajoute.{0,30}\bcomme\s+client\b/i,
  },
  {
    intent: "create_client",
    weight: 8,
    pattern:
      /(?:peux|pourrais).{0,20}(?:cr[eé]e|cr[eé]er).{0,30}(?:monsieur|madame|m\.|mme)/i,
  },
  {
    intent: "create_client",
    weight: 7,
    pattern:
      /(?:cr[eé]e|cr[eé]er)\s+(?:monsieur|madame|m\.|mme\.?|mr\.?)\s+[A-ZÀ-ÿ]/i,
  },
  {
    intent: "create_chantier",
    weight: 10,
    pattern: /(?:cr[eé]e|nouveau|ajoute).{0,30}\bchantier\b/i,
  },
  {
    intent: "create_devis",
    weight: 10,
    pattern: /(?:cr[eé]e|nouveau|pr[eé]par|fais|faire).{0,30}\bdevis\b/i,
  },
  {
    intent: "create_facture",
    weight: 10,
    pattern: /(?:cr[eé]e|nouvelle?).{0,30}\bfacture\b/i,
  },
  {
    intent: "create_appointment",
    weight: 10,
    pattern: /(?:cr[eé]e|nouveau|ajoute|ajouter).{0,40}(?:rdv|rendez[- ]vous)/i,
  },
  {
    intent: "create_appointment",
    weight: 9,
    pattern: /\bajoute\s+un\s+rendez[- ]vous\b/i,
  },
  {
    intent: "search_client",
    weight: 9,
    pattern: /(?:cherch|trouv).{0,20}\bclient\b/i,
  },
  {
    intent: "search_devis",
    weight: 9,
    pattern: /(?:cherch|trouv).{0,20}\bdevis\b/i,
  },
  {
    intent: "search_chantier",
    weight: 9,
    pattern: /(?:cherch|trouv).{0,20}\bchantier\b/i,
  },
  {
    intent: "show_unpaid_invoices",
    weight: 9,
    pattern: /\bfactures?\s+impay/i,
  },
  {
    intent: "show_devis_to_follow_up",
    weight: 9,
    pattern: /\bdevis\b.{0,20}(?:relanc|suiv)/i,
  },
  {
    intent: "open_planning",
    weight: 8,
    pattern: /(?:ouvr|affiche|voir).{0,20}\bplanning\b/i,
  },
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeApostrophes(text: string): string {
  return text.replace(/[\u2018\u2019\u2032`´]/g, "'");
}

function stripTrailingPunctuation(text: string): string {
  return text.replace(/[.?!,;:]+$/g, "").trim();
}

function stripPolitePrefix(text: string): string {
  return text
    .replace(
      /^(?:peux[- ]tu|pourrais[- ]tu|est-ce que tu peux|tu peux|j'aimerais que tu|je voudrais que tu|je veux que tu)\s+/i,
      "",
    )
    .replace(/^(?:je (?:voudrais|veux|souhaite)|j'aimerais)\s+/i, "")
    .trim();
}

function stripCivility(text: string): string {
  return text.replace(CIVILITY_PATTERN, "").trim();
}

function deduplicateTokens(tokens: string[]): string[] {
  const result: string[] = [];
  for (const token of tokens) {
    const prev = result[result.length - 1];
    if (prev && normalize(prev) === normalize(token)) continue;
    result.push(token);
  }
  return result;
}

/** Supprime les mots identiques consécutifs dans un texte libre. */
export function deduplicateConsecutiveTokens(text: string): string {
  return deduplicateTokens(text.trim().split(/\s+/).filter(Boolean)).join(" ");
}

function isNameToken(token: string): boolean {
  return (
    /^[A-Za-zÀ-ÿ][a-zàâäéèêëîïôöùûüÿç'-]*$/.test(token) &&
    token.length >= 2 &&
    !STOP_WORDS.has(normalize(token))
  );
}

function isParasiteNameToken(token: string): boolean {
  const normalized = normalize(token.replace(/['']/g, ""));
  if (STOP_WORDS.has(normalize(token))) return true;
  if (
    [
      "qui",
      "appelle",
      "sappelle",
      "nomme",
      "nommee",
      "nommé",
      "nommée",
      "avec",
      "nom",
      "entreprise",
      "client",
      "nouveau",
      "nouvelle",
    ].includes(normalized)
  ) {
    return true;
  }
  if (/^s.?appelle$/i.test(normalized)) return true;
  return false;
}

function looksLikeClientName(text: string): boolean {
  const cleaned = stripCivility(stripTrailingPunctuation(text));
  if (!cleaned || cleaned.length < 2) return false;
  const tokens = cleaned
    .split(/\s+/)
    .filter((token) => token.length > 0 && !isParasiteNameToken(token));
  if (tokens.length === 0) return false;
  return tokens.every(
    (token) =>
      /^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9''.-]*$/i.test(token) && token.length >= 2,
  );
}

/** Nettoie un nom client extrait du langage naturel. */
export function sanitizeClientName(raw: string): string {
  let name = normalizeApostrophes(stripTrailingPunctuation(raw.trim()));

  const leadingFillers = [
    /^(?:qui\s+)?s['']appelle\s+/i,
    /^nomm[eé]\s+/i,
    /^appel[eé]\s+/i,
    /^avec\s+le\s+nom\s+/i,
    /^(?:c['']est|il s['']agit de)\s+/i,
  ];
  for (const pattern of leadingFillers) {
    name = name.replace(pattern, "");
  }

  name = stripCivility(name);
  name = name.replace(/\s+comme\s+client.*$/i, "");
  name = name.replace(/\s+en\s+tant\s+que\s+client.*$/i, "");
  name = name.replace(/\s+pour\s+(?:mon|ma|mes)\s+entreprise.*$/i, "");

  let tokens = name.split(/\s+/).filter((token) => token.length > 0);
  while (tokens.length > 0 && isParasiteNameToken(tokens[0])) {
    tokens.shift();
  }

  tokens = tokens.filter((token) => !isParasiteNameToken(token));

  const deduped = deduplicateTokens(tokens);

  return deduped
    .map((token) => {
      if (/^(sci|sarl|sas|eurl|sa)$/i.test(token)) {
        return token.toUpperCase();
      }
      if (token === token.toUpperCase() && token.length <= 3) {
        return token;
      }
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(" ")
    .trim();
}

function cleanExtractedName(raw: string): string {
  return sanitizeClientName(raw);
}

type NameExtractionRule = {
  pattern: RegExp;
  group: number;
};

const CLIENT_NAME_RULES: NameExtractionRule[] = [
  {
    pattern:
      /cr[eé]e[r]?\s+(?:un\s+)?(?:nouveau\s+)?client\s+qui\s+s[''\u2019]appelle\s+(.+)/i,
    group: 1,
  },
  {
    pattern:
      /cr[eé]e[r]?\s+(?:un\s+)?(?:nouveau\s+)?client\s+avec\s+le\s+nom\s+(.+)/i,
    group: 1,
  },
  {
    pattern:
      /cr[eé]e[r]?\s+(?:un\s+)?(?:nouveau\s+)?client\s+nomm[eé]\s+(.+)/i,
    group: 1,
  },
  {
    pattern:
      /cr[eé]e[r]?\s+(?:un\s+)?(?:nouveau\s+)?client\s+appel[eé]\s+(.+)/i,
    group: 1,
  },
  {
    pattern: /ajoute[r]?\s+(?:un\s+)?(?:nouveau\s+)?client\s+nomm[eé]\s+(.+)/i,
    group: 1,
  },
  {
    pattern: /ajoute[r]?\s+(?:l[''])?entreprise\s+(.+)/i,
    group: 1,
  },
  {
    pattern: /ajoute[r]?\s+(?:un\s+)?(?:nouveau\s+)?client\s+(.+)/i,
    group: 1,
  },
  {
    pattern: /ajoute[r]?\s+(.+?)\s+comme\s+client/i,
    group: 1,
  },
  {
    pattern: /ajoute[r]?\s+(.+?)\s+en\s+tant\s+que\s+client/i,
    group: 1,
  },
  {
    pattern: /nouveau\s+client\s+(.+)/i,
    group: 1,
  },
  {
    pattern: /j['']ai\s+un\s+(?:nouveau\s+)?client\s+(.+)/i,
    group: 1,
  },
  {
    pattern: /enregistre[r]?\s+(?:un\s+)?(?:nouveau\s+)?client\s+(.+)/i,
    group: 1,
  },
  {
    pattern:
      /(?:cr[eé]e[r]?|ajoute[r]?)\s+(?:un\s+)?client\s+(?:monsieur|madame|m\.|mme\.?|mr\.?)\s+(.+)/i,
    group: 1,
  },
  {
    pattern:
      /(?:cr[eé]e[r]?|ajoute[r]?)\s+(?:monsieur|madame|m\.|mme\.?|mr\.?)\s+(.+)/i,
    group: 1,
  },
  {
    pattern: /cr[eé]e[r]?\s+(?:un\s+)?(?:nouveau\s+)?client\s+(.+)/i,
    group: 1,
  },
];

function extractClientName(text: string): string | undefined {
  const prepared = normalizeApostrophes(stripPolitePrefix(text));

  for (const rule of CLIENT_NAME_RULES) {
    const match = prepared.match(rule.pattern);
    if (!match?.[rule.group]) continue;
    const cleaned = cleanExtractedName(match[rule.group]);
    if (cleaned.length >= 2 && looksLikeClientName(cleaned)) {
      return cleaned;
    }
  }

  if (
    /\b(?:cr[eé]e|ajoute|enregistre|nouveau\s+client|j['']ai\s+un\s+client)\b/i.test(
      prepared,
    )
  ) {
    const afterClient = prepared.match(
      /(?:client|comme\s+client|nouveau\s+client)\s+(?:qui\s+s[''\u2019]?appelle\s+|nomm[eé]\s+|appel[eé]\s+|avec\s+le\s+nom\s+)?(.+)/i,
    );
    if (afterClient?.[1]) {
      const cleaned = cleanExtractedName(afterClient[1]);
      if (cleaned.length >= 2 && looksLikeClientName(cleaned)) {
        return cleaned;
      }
    }
  }

  return undefined;
}

function scoreIntents(text: string): Map<BatimumActionIntent, number> {
  const scores = new Map<BatimumActionIntent, number>();

  for (const signal of INTENT_SIGNALS) {
    if (signal.pattern.test(text)) {
      scores.set(signal.intent, (scores.get(signal.intent) ?? 0) + signal.weight);
    }
  }

  const normalized = normalize(text);
  if (
    /\b(?:cr[eé]e|ajoute|enregistre)\b/.test(normalized) &&
    looksLikeClientName(text.replace(/.*(?:cr[eé]e|ajoute|enregistre)\s+(?:un\s+)?/i, ""))
  ) {
    scores.set("create_client", (scores.get("create_client") ?? 0) + 6);
  }

  return scores;
}

function pickBestIntent(
  scores: Map<BatimumActionIntent, number>,
): { intent: BatimumActionIntent | null; confidence: number } {
  let best: BatimumActionIntent | null = null;
  let bestScore = 0;

  for (const [intent, score] of scores) {
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }

  if (!best || bestScore < 6) {
    return { intent: null, confidence: 0 };
  }

  const confidence = Math.min(0.98, 0.55 + bestScore / 30);
  return { intent: best, confidence };
}

function extractEntities(
  intent: BatimumActionIntent,
  text: string,
): BatimumEntities {
  const entities: BatimumEntities = {};

  if (intent === "create_client") {
    const clientName = extractClientName(text);
    if (clientName) entities.clientName = clientName;
  }

  return entities;
}

function findMissingSlots(
  intent: BatimumActionIntent,
  entities: BatimumEntities,
): string[] {
  switch (intent) {
    case "create_client":
      return entities.clientName ? [] : ["clientName"];
    default:
      return [];
  }
}

/**
 * Étape 1 : comprendre l'intention et extraire les entités d'une phrase naturelle.
 */
export function understandNaturalLanguage(text: string): NluUnderstanding {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      intent: null,
      confidence: 0,
      entities: {},
      missingSlots: [],
      reasoning: "Message vide",
    };
  }

  const scores = scoreIntents(trimmed);
  const { intent, confidence } = pickBestIntent(scores);

  if (!intent) {
    return {
      intent: null,
      confidence: 0,
      entities: {},
      missingSlots: [],
      reasoning: "Aucune intention actionnable détectée",
    };
  }

  const entities = extractEntities(intent, trimmed);
  const missingSlots = findMissingSlots(intent, entities);

  return {
    intent,
    confidence,
    entities,
    missingSlots,
    reasoning: `Intention ${intent} (confiance ${Math.round(confidence * 100)} %)`,
  };
}

export function splitClientName(fullName: string): { prenom: string; nom: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { prenom: parts[0], nom: parts[0] };
  }
  return {
    prenom: parts[0],
    nom: parts.slice(1).join(" "),
  };
}
