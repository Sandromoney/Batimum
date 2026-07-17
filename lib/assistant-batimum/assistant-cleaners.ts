import { deduplicateConsecutiveTokens, sanitizeClientName } from "@/lib/batimum-nlu";
import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import { isForbiddenEntityValue } from "@/lib/assistant-batimum/v1-charter";

const PARASITE_PHRASES = [
  /qui\s+s['']?appelle/gi,
  /qui\s+s\s+appelle/gi,
  /\bs['']?appelle\b/gi,
  /\bs\s+appelle\b/gi,
  /\bsappelle\b/gi,
  /\bsappel\b/gi,
  /appel[eé]e?\b/gi,
  /nomm[eé]e?\b/gi,
  /avec\s+le\s+nom\b/gi,
  /au\s+nom\s+de\b/gi,
  /si\s+possible\b/gi,
  /(?:je\s+)?(?:veux|veut|voudrais|aimerais|souhaite)\b/gi,
  /(?:peux[- ]?tu|tu\s+peux|pourrais[- ]?tu)\b/gi,
  /(?:cree|creer|crée|créer|ajoute|ajouter|enregistre|enregistrer)\b/gi,
  /(?:un\s+)?(?:nouveau|nouvelle)\s+client\b/gi,
  /\bclient\b/gi,
  /\bentreprise\b/gi,
  /(?:monsieur|madame|m\.|mme\.?|mr\.?)\b/gi,
  /(?:le\s+)?client\s+c['']est\b/gi,
  /^c['']est\s+/gi,
  /^mets\s+/gi,
  /^mettre\s+/gi,
];

const PARASITE_WORDS = new Set(
  [
    "je",
    "veux",
    "veut",
    "voudrais",
    "aimerais",
    "si",
    "possible",
    "peux",
    "tu",
    "cree",
    "creer",
    "crée",
    "créer",
    "ajoute",
    "ajouter",
    "nouveau",
    "nouvelle",
    "client",
    "un",
    "une",
    "le",
    "la",
    "qui",
    "sappelle",
    "sappel",
    "appelle",
    "appel",
    "appele",
    "appelé",
    "appelée",
    "nomme",
    "nommé",
    "nommée",
    "nom",
    "avec",
    "entreprise",
    "monsieur",
    "madame",
    "m",
    "mme",
    "mr",
  ].map((w) => normalizeAssistantText(w)),
);

const FORBIDDEN_IN_RESULT = [
  "sappelle",
  "sappel",
  "appelle",
  "client",
  "nouveau",
  "creer",
  "cree",
  "crée",
  "ajoute",
  "qui",
];

function capitalizeToken(token: string): string {
  if (/^(sci|sarl|sas|eurl|sa|sasu)$/i.test(token)) {
    return token.toUpperCase();
  }
  if (token === token.toUpperCase() && token.length <= 3) return token;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function formatName(tokens: string[]): string {
  return tokens.map(capitalizeToken).join(" ").trim();
}

/** Supprime les doublons consécutifs ou évidents (SCI SCI, Sandro Sandro). */
export function dedupeWords(text: string): string {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const result: string[] = [];

  for (const token of tokens) {
    const key = normalizeAssistantText(token);
    const prev = result[result.length - 1];
    if (prev && normalizeAssistantText(prev) === key) continue;
    if (
      key === "sci" &&
      result.some((t) => normalizeAssistantText(t) === "sci")
    ) {
      continue;
    }
    result.push(token);
  }

  return result.join(" ").trim();
}

function stripParasitePhrases(text: string): string {
  let t = text.trim();
  for (const phrase of PARASITE_PHRASES) {
    t = t.replace(phrase, " ");
  }
  return t.replace(/\s+/g, " ").trim();
}

function stripParasiteTokens(text: string): string {
  const tokens = text
    .trim()
    .split(/\s+/)
    .filter((tok) => {
      const key = normalizeAssistantText(tok.replace(/['']/g, ""));
      return key.length > 0 && !PARASITE_WORDS.has(key);
    });
  return tokens.join(" ").trim();
}

function isValidExtractedName(name: string): boolean {
  if (!name || name.trim().length < 2) return false;
  const n = normalizeAssistantText(name);
  if (FORBIDDEN_IN_RESULT.some((bad) => n.includes(bad))) return false;
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => /^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9''.-]*$/i.test(t));
}

/** Nettoie un nom déjà extrait. */
export function cleanClientName(raw: string): string {
  const sciLes = raw.trim().match(/^(sci)\s+(les)\s+(.+)$/i);
  if (sciLes) {
    const rest = stripParasiteTokens(stripParasitePhrases(sciLes[3]));
    return formatName(
      dedupeWords(`SCI ${sciLes[2]} ${rest}`).split(/\s+/).filter(Boolean),
    );
  }

  let name = stripParasitePhrases(raw);
  name = stripParasiteTokens(name);
  name = dedupeWords(name);
  name = sanitizeClientName(deduplicateConsecutiveTokens(name));

  if (!isValidExtractedName(name)) return "";
  if (isForbiddenEntityValue(name)) return "";
  return name;
}

const EXTRACTION_PATTERNS: RegExp[] = [
  /client\s+qui\s+s['']?appelle\s+(.+)/i,
  /client\s+qui\s+s\s+appelle\s+(.+)/i,
  /qui\s+s['']?appelle\s+(.+)/i,
  /client\s+nomm[eé]\s+(.+)/i,
  /client\s+appel[eé]\s+(.+)/i,
  /ajoute\s+l['']entreprise\s+(.+)/i,
  /ajoute\s+l\s+entreprise\s+(.+)/i,
  /nouveau\s+client\s+(.+)/i,
  /(?:cr[eé]e|ajoute)\s+(?:un\s+)?(?:nouveau\s+)?client\s+(.+)/i,
  /(?:cr[eé]e|ajoute)\s+client\s+(.+)/i,
  /le\s+client\s+c['']est\s+(.+)/i,
  /^mets\s+(.+)/i,
  /(?:monsieur|madame|m\.|mme\.?|mr\.?)\s+(.+)/i,
];

/**
 * Extrait le nom client d'une phrase — résultat sans mots parasites.
 */
export function extractClientName(message: string): string | undefined {
  for (const pattern of EXTRACTION_PATTERNS) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const cleaned = cleanClientName(match[1]);
      if (cleaned.length >= 2) return cleaned;
    }
  }

  if (
    /\b(?:client|entreprise)\b/i.test(message) &&
    /\b(?:cree|creer|crée|créer|ajoute|ajouter|nouveau|mets)\b/i.test(message)
  ) {
    let tail = message;
    const tailMatch = message.match(
      /(?:client|entreprise)\s+(?:qui\s+s['']?appelle\s+)?(.+)/i,
    );
    if (tailMatch?.[1]) tail = tailMatch[1];
    const cleaned = cleanClientName(tail);
    if (cleaned.length >= 2) return cleaned;
  }

  return undefined;
}

/** Extrait un nom selon le type d'entité (client, employé…). */
export function extractNameFromMessage(
  message: string,
  entityType: "client" | "employe" | "chantier" | "fourniture" = "client",
): string | undefined {
  if (entityType === "employe") {
    return extractEmployeName(message);
  }
  return extractClientName(message);
}

/** @deprecated Utiliser extractNameFromMessage */
export function extractClientNameFromMessage(message: string): string | undefined {
  return extractClientName(message);
}

export function extractDevisReference(message: string): string | undefined {
  return message.match(/\bD?EV?-?\d{4,}\b/i)?.[0];
}

export function extractChantierType(message: string): string | undefined {
  const n = normalizeAssistantText(message);
  if (/salle de bain|sdb/.test(n)) return "salle de bain";
  if (/cuisine/.test(n)) return "cuisine";
  if (/placo|platre|plâtre/.test(n)) return "placo";
  if (/carrelage/.test(n)) return "carrelage";
  if (/extension/.test(n)) return "extension";
  if (/renov|rénov/.test(n)) return "rénovation";
  return undefined;
}

export function extractEmployeName(message: string): string | undefined {
  const match = message.match(/(?:salari[eé]|employ[eé]|ouvrier)\s+(.+)/i);
  if (!match?.[1]) return undefined;
  return cleanClientName(match[1]);
}

export { sanitizeClientName, deduplicateConsecutiveTokens };
