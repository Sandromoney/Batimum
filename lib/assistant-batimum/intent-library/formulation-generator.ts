import { normalizeAssistantText } from "@/lib/assistant-batimum/normalize";
import {
  getFullIntentCatalog,
  type IntentCatalogEntry,
} from "@/lib/assistant-batimum/intent-library/intent-catalog";
import {
  ACTION_VERBS,
  BTP_TRADES,
  CONVERSATION_PHRASES,
  COUNT_PREFIXES,
  ENTITY_LABELS,
  LIST_PREFIXES,
  POLITE_PREFIXES,
  RENTABILITY_SYNONYMS,
} from "@/lib/assistant-batimum/intent-library/synonym-banks";

export type GeneratedFormulations = Record<string, string[]>;

function unique(phrases: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of phrases) {
    const n = normalizeAssistantText(p);
    if (!n || n.length < 2 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function entityLabels(entity?: string): string[] {
  if (!entity) return [];
  return ENTITY_LABELS[entity] ?? [entity];
}

function generateCount(entry: IntentCatalogEntry): string[] {
  const labels = entityLabels(entry.entity);
  const phrases: string[] = [];
  for (const label of labels) {
    for (const prefix of COUNT_PREFIXES) {
      phrases.push(`${prefix}${label}`);
      phrases.push(`${prefix}${label} enregistres`);
      phrases.push(`${prefix}${label} dans batimum`);
    }
    phrases.push(`mes ${label}`);
    phrases.push(`total ${label}`);
    phrases.push(`stats ${label}`);
  }
  return phrases;
}

function generateList(entry: IntentCatalogEntry): string[] {
  const labels = entityLabels(entry.entity);
  const phrases: string[] = [];
  for (const label of labels) {
    for (const prefix of LIST_PREFIXES) {
      phrases.push(`${prefix}${label}`);
    }
    if (entry.id.includes("unpaid") || entry.id.includes("impay")) {
      phrases.push("factures impayees", "impayes", "qui me doit", "factures non payees");
    }
    if (entry.id.includes("relanc")) {
      phrases.push("devis a relancer", "quels devis relancer", "relancer devis");
    }
    if (entry.id.includes("retard") || entry.id.includes("late")) {
      phrases.push("chantiers en retard", "retard chantier", "quels chantiers en retard");
    }
    if (entry.id.includes("rentab") || entry.id.includes("profit") || entry.id.includes("best")) {
      for (const syn of RENTABILITY_SYNONYMS) {
        phrases.push(`${syn} ${label}`);
        phrases.push(`quel ${label} ${syn}`);
      }
    }
    if (entry.id.includes("revenue") || entry.id.includes("ca")) {
      phrases.push("ca du mois", "chiffre d affaires", "combien encaisse", "ca encaisse");
    }
    if (entry.id.includes("profit") || entry.id.includes("benefice")) {
      phrases.push("benefice du mois", "combien gagne ce mois", "marge du mois");
    }
    if (entry.id.includes("planning_today")) {
      phrases.push("planning aujourd hui", "rdv aujourd hui", "agenda aujourd hui");
    }
    if (entry.id.includes("planning_tomorrow")) {
      phrases.push("planning demain", "rdv demain");
    }
  }
  return phrases;
}

function generateCreate(entry: IntentCatalogEntry): string[] {
  const labels = entityLabels(entry.entity);
  const phrases: string[] = [...entry.templates];
  for (const label of labels) {
    for (const verb of ACTION_VERBS.slice(0, 14)) {
      for (const polite of POLITE_PREFIXES.slice(0, 6)) {
        phrases.push(`${polite}${verb} ${label}`);
        phrases.push(`${polite}${verb} un ${label}`);
        phrases.push(`${polite}${verb} une ${label}`);
        phrases.push(`${polite}${verb} un nouveau ${label}`);
      }
    }
    phrases.push(`nouveau ${label}`);
    phrases.push(`nouvelle ${label}`);
    phrases.push(`on va creer un ${label}`);
    phrases.push(`j aimerais un ${label}`);
  }
  for (const trade of BTP_TRADES.slice(0, 15)) {
    phrases.push(`devis ${trade}`);
    phrases.push(`prepare un devis ${trade}`);
    phrases.push(`chiffrer ${trade}`);
  }
  return phrases;
}

function generateSearch(entry: IntentCatalogEntry): string[] {
  const labels = entityLabels(entry.entity);
  const phrases: string[] = [];
  for (const label of labels) {
    phrases.push(`cherche ${label}`, `trouve ${label}`, `recherche ${label}`, `ouvre ${label}`);
    phrases.push(`affiche ${label} martin`, `client martin`, `fiche ${label}`);
  }
  return phrases;
}

function generateAdvice(entry: IntentCatalogEntry): string[] {
  const phrases = [...entry.templates];
  phrases.push(
    "comment ameliorer mon entreprise",
    "conseil activite",
    "analyse mon activite",
    "que faire pour gagner plus",
    "comment gagner du temps",
    "comment ameliorer mes relances",
    "comment augmenter ma marge",
    "quel est un bon taux de marge",
    "comment organiser un chantier",
  );
  for (const trade of BTP_TRADES) {
    phrases.push(`conseil ${trade}`, `prix ${trade}`, `comment ${trade}`);
  }
  return phrases;
}

function generateNavigate(entry: IntentCatalogEntry): string[] {
  const phrases = [...entry.templates];
  phrases.push("ouvre la page", "va sur", "montre moi le module", "c est quoi cette page");
  return phrases;
}

function generateForEntry(entry: IntentCatalogEntry): string[] {
  let phrases = [...entry.templates];
  switch (entry.generate) {
    case "count":
      phrases = [...phrases, ...generateCount(entry)];
      break;
    case "list":
      phrases = [...phrases, ...generateList(entry)];
      break;
    case "create":
      phrases = [...phrases, ...generateCreate(entry)];
      break;
    case "search":
      phrases = [...phrases, ...generateSearch(entry)];
      break;
    case "advice":
      phrases = [...phrases, ...generateAdvice(entry)];
      break;
    case "navigate":
      phrases = [...phrases, ...generateNavigate(entry)];
      break;
    case "analyze":
      phrases = [...phrases, ...generateList(entry), ...generateAdvice(entry)];
      break;
    default:
      break;
  }
  if (entry.domain === "conversation") {
    phrases = [...phrases, ...CONVERSATION_PHRASES];
  }
  return unique(phrases).slice(0, 45);
}

let cachedFormulations: GeneratedFormulations | null = null;

/** Génère 5000+ formulations pour toutes les intentions du catalogue. */
export function buildGeneratedFormulations(): GeneratedFormulations {
  if (cachedFormulations) return cachedFormulations;

  const catalog = getFullIntentCatalog();
  const result: GeneratedFormulations = {};

  for (const entry of catalog) {
    const existing = result[entry.id] ?? [];
    result[entry.id] = unique([...existing, ...generateForEntry(entry)]);
  }

  // Enrichissement croisé synonymes rentabilité → best_chantier_type
  const rentabilityPhrases = RENTABILITY_SYNONYMS.flatMap((syn) => [
    `${syn} type chantier`,
    `sur quel type de chantier je ${syn}`,
    `mon entreprise ${syn} sur quoi`,
  ]);
  result.best_chantier_type = unique([
    ...(result.best_chantier_type ?? []),
    ...rentabilityPhrases,
  ]);

  cachedFormulations = result;
  return result;
}

export function getFormulationStats(): {
  intentCount: number;
  totalFormulations: number;
  minPerIntent: number;
  maxPerIntent: number;
} {
  const forms = buildGeneratedFormulations();
  const counts = Object.values(forms).map((a) => a.length);
  const total = counts.reduce((s, n) => s + n, 0);
  return {
    intentCount: Object.keys(forms).length,
    totalFormulations: total,
    minPerIntent: Math.min(...counts),
    maxPerIntent: Math.max(...counts),
  };
}

export function getFormulationsForIntent(intentId: string): string[] {
  return buildGeneratedFormulations()[intentId] ?? [];
}
