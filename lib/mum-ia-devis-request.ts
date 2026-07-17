export const MUM_IA_INSUFFICIENT_INFO_MESSAGE =
  "Impossible d'analyser cette demande. Décrivez le chantier avec quelques informations (travaux, pièces concernées, dimensions ou prestations souhaitées).";

export const MUM_IA_EMPTY_DESCRIPTION_MESSAGE =
  "Décrivez votre chantier pour lancer l'analyse MUM IA.";

const FLUFF_WORDS = new Set([
  "devis",
  "bonjour",
  "bonsoir",
  "salut",
  "hello",
  "coucou",
  "merci",
  "maison",
  "travaux",
  "test",
  "aide",
  "bon",
  "bjr",
  "slt",
  "chantier",
  "prix",
  "combien",
  "ca",
  "coute",
  "cout",
  "estimation",
  "estimer",
  "chiffrer",
  "chiffrage",
  "devi",
  "hey",
  "hi",
  "ok",
  "oui",
  "non",
]);

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[\s,;.!?\-–—/\\]+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
}

function isTrulyUnexploitable(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return true;

  const meaningful = tokens.filter(
    (word) => word.length >= 3 && !FLUFF_WORDS.has(word),
  );
  const nonFluff = tokens.filter((word) => !FLUFF_WORDS.has(word));

  if (tokens.length === 1 && FLUFF_WORDS.has(tokens[0]!)) return true;
  if (nonFluff.length === 0) return true;
  if (meaningful.length === 0 && trimmed.length < 10) return true;

  return false;
}

export function isValidMumIaDevisRequest(description: string): boolean {
  return validateMumIaDevisRequest(description).valid;
}

export function validateMumIaDevisRequest(description: string): {
  valid: boolean;
  tone?: "neutral" | "error";
  message?: string;
} {
  const trimmed = description.trim();

  if (!trimmed) {
    return {
      valid: false,
      tone: "neutral",
      message: MUM_IA_EMPTY_DESCRIPTION_MESSAGE,
    };
  }

  if (isTrulyUnexploitable(trimmed)) {
    return {
      valid: false,
      tone: "error",
      message: MUM_IA_INSUFFICIENT_INFO_MESSAGE,
    };
  }

  return { valid: true };
}

export function isAnalysisClearlyUnexploitable(analysis: {
  informationsSuffisantes: boolean;
  lotsIdentifies: string[];
  questions: unknown[];
}): boolean {
  return (
    !analysis.informationsSuffisantes &&
    analysis.lotsIdentifies.length === 0 &&
    analysis.questions.length === 0
  );
}
