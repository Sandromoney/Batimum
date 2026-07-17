import { normalizeSearchText } from "@/lib/search-text-match";
import type { StatutDevis, StatutFacture } from "@/lib/types";

export type SearchIntent = {
  rawQuery: string;
  tokens: string[];
  statutDevis?: StatutDevis[];
  statutFacture?: StatutFacture[];
  month?: number;
  year?: number;
  metierHints: string[];
  clientHint?: string;
  chantierHint?: string;
};

const MONTH_NAMES: Record<string, number> = {
  janvier: 1,
  jan: 1,
  fevrier: 2,
  fev: 2,
  february: 2,
  mars: 3,
  mar: 3,
  avril: 4,
  avr: 4,
  mai: 5,
  juin: 6,
  jun: 6,
  juillet: 7,
  juil: 7,
  jul: 7,
  aout: 8,
  août: 8,
  aou: 8,
  septembre: 9,
  sep: 9,
  octobre: 10,
  oct: 10,
  novembre: 11,
  nov: 11,
  decembre: 12,
  décembre: 12,
  dec: 12,
};

const METIER_KEYWORDS: Record<string, string[]> = {
  placo: ["placo", "plaque", "cloison", "ba13"],
  plomberie: ["plomberie", "plombier", "plomb"],
  carrelage: ["carrelage", "carreleur", "faience", "faïence"],
  peinture: ["peinture", "peintre"],
  sdb: ["salle de bain", "sdb", "douche"],
  renovation: ["renovation", "rénovation"],
};

const DEVIS_STATUT_PHRASES: { pattern: RegExp; statuts: StatutDevis[] }[] = [
  { pattern: /devis\s+refus/i, statuts: ["refuse"] },
  { pattern: /refus[eé]s?/i, statuts: ["refuse"] },
  { pattern: /devis\s+sign/i, statuts: ["signe"] },
  { pattern: /sign[eé]s?/i, statuts: ["signe"] },
  { pattern: /brouillon/i, statuts: ["brouillon"] },
  { pattern: /en\s+attente/i, statuts: ["en_attente", "envoye"] },
  { pattern: /a\s+relancer|à\s+relancer/i, statuts: ["envoye", "en_attente", "en_retard"] },
];

const FACTURE_STATUT_PHRASES: { pattern: RegExp; statuts: StatutFacture[] }[] = [
  { pattern: /impay/i, statuts: ["envoyee", "en_attente", "en_retard"] },
  { pattern: /en\s+retard/i, statuts: ["en_retard"] },
  { pattern: /pay[eé]e?s?/i, statuts: ["payee"] },
];

export function parseSearchIntent(query: string): SearchIntent {
  const normalized = normalizeSearchText(query);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const intent: SearchIntent = {
    rawQuery: query.trim(),
    tokens,
    metierHints: [],
  };

  for (const { pattern, statuts } of DEVIS_STATUT_PHRASES) {
    if (pattern.test(normalized)) {
      intent.statutDevis = statuts;
      break;
    }
  }

  for (const { pattern, statuts } of FACTURE_STATUT_PHRASES) {
    if (pattern.test(normalized)) {
      intent.statutFacture = statuts;
      break;
    }
  }

  for (const [metier, keywords] of Object.entries(METIER_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(normalizeSearchText(kw)))) {
      intent.metierHints.push(metier);
    }
  }

  for (const token of tokens) {
    const month = MONTH_NAMES[token];
    if (month) {
      intent.month = month;
      break;
    }
  }

  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    intent.year = Number(yearMatch[1]);
  }

  const clientMatch = normalized.match(/(?:client|chez)\s+(.+)/);
  if (clientMatch?.[1]) {
    intent.clientHint = clientMatch[1].trim();
  }

  if (normalized.includes("chantier")) {
    const withoutChantier = normalized.replace(/\bchantiers?\b/g, "").trim();
    if (withoutChantier) intent.chantierHint = withoutChantier;
  }

  return intent;
}

export function scoreSearchMatch(
  haystack: string,
  query: string,
  intent: SearchIntent,
): number {
  const normalizedHay = normalizeSearchText(haystack);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery || normalizedQuery.length < 2) return 0;

  let score = 0;
  const tokens = intent.tokens.filter(
    (t) => !MONTH_NAMES[t] && !/^(devis|facture|client|chantier|chez)$/.test(t),
  );

  if (normalizedHay === normalizedQuery) score += 100;
  if (normalizedHay.startsWith(normalizedQuery)) score += 40;
  if (normalizedHay.includes(normalizedQuery)) score += 25;

  for (const token of tokens) {
    if (normalizedHay.includes(token)) score += 12;
    const words = normalizedHay.split(/\s+/);
    if (words.some((w) => w.startsWith(token))) score += 6;
  }

  for (const metier of intent.metierHints) {
    const keywords = METIER_KEYWORDS[metier] ?? [];
    if (keywords.some((kw) => normalizedHay.includes(normalizeSearchText(kw)))) {
      score += 15;
    }
  }

  return score;
}

export function matchesMonthFilter(
  dateIso: string | undefined,
  intent: SearchIntent,
): boolean {
  if (!intent.month && !intent.year) return true;
  if (!dateIso) return false;
  const date = new Date(`${dateIso}T12:00:00`);
  if (intent.month && date.getMonth() + 1 !== intent.month) return false;
  if (intent.year && date.getFullYear() !== intent.year) return false;
  return true;
}
