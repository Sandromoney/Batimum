import { normalizeBibliothequeKey } from "@/lib/bibliotheque-entreprise";

const VAT_20_KEYWORDS = [
  "evacuation gravats",
  "benne",
  "nettoyage fin chantier",
  "nettoyage fin",
  "protection chantier",
  "protection sols",
  "deplacement chantier",
  "installation chantier",
];

const VAT_55_KEYWORDS = [
  "isolation combles",
  "combles perdus",
  "laine minerale",
  "laine de verre",
  "isolation energetique",
  "isolation thermique",
  "sous rampant",
];

function normalizeVatRate(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 20;
  return Math.round(value * 10) / 10;
}

function lineText(designation: string, description: string): string {
  return `${designation} ${description}`;
}

function corpusNormalized(corpus: string): string {
  return normalizeBibliothequeKey(corpus);
}

export function userExplicitlyRequestsVat55(corpus: string): boolean {
  const n = corpusNormalized(corpus);
  return (
    n.includes("tva 5 5") ||
    n.includes("5 5 %") ||
    n.includes("5 5%") ||
    (n.includes("5 5") && (n.includes("isolation") || n.includes("energie"))) ||
    n.includes("tva reduite energie")
  );
}

export function userExplicitlyRequestsVat20(corpus: string): boolean {
  const n = corpusNormalized(corpus);
  return (
    n.includes("tva 20") ||
    n.includes("20 %") ||
    n.includes("20%") ||
    n.includes("fourniture") && n.includes("20")
  );
}

export function isClearlyStandard20VatLine(designation: string, description: string): boolean {
  const text = normalizeBibliothequeKey(lineText(designation, description));
  return VAT_20_KEYWORDS.some((kw) => text.includes(normalizeBibliothequeKey(kw)));
}

export function isClearlyEligibleVat55(designation: string, description: string): boolean {
  const text = normalizeBibliothequeKey(lineText(designation, description));
  return VAT_55_KEYWORDS.some((kw) => text.includes(normalizeBibliothequeKey(kw)));
}

/**
 * TVA d'une ligne MUM IA :
 * - Par défaut : TVA générale choisie par l'utilisateur (ex. 10 %).
 * - 20 % ou 5,5 % uniquement si demande explicite ou poste clairement hors TVA réduite.
 * - Dans le doute : TVA générale utilisateur.
 */
export function resolveLigneTauxTVA(params: {
  designation: string;
  description: string;
  defaultTva: number;
  corpus?: string;
}): number {
  const defaultTva = normalizeVatRate(params.defaultTva);
  const corpus = params.corpus ?? "";
  const { designation, description } = params;

  if (userExplicitlyRequestsVat55(corpus) && isClearlyEligibleVat55(designation, description)) {
    return 5.5;
  }

  if (isClearlyStandard20VatLine(designation, description)) {
    return 20;
  }

  if (
    userExplicitlyRequestsVat20(corpus) &&
    isClearlyStandard20VatLine(designation, description)
  ) {
    return 20;
  }

  return defaultTva;
}

export function formatAiDevisTvaRulesForPrompt(defaultTva: number): string {
  const rate = normalizeVatRate(defaultTva);
  return [
    "RÈGLES TVA (OBLIGATOIRE) :",
    `TVA par défaut pour TOUTES les lignes : ${rate} % (choix utilisateur).`,
    `Appliquer ${rate} % à chaque ligne sauf exception ci-dessous.`,
    "Exceptions autorisées :",
    "- 20 % : évacuation gravats, benne, nettoyage fin de chantier, protection chantier, déplacement chantier (hors TVA réduite).",
    "- 5,5 % : isolation énergétique UNIQUEMENT si le client demande explicitement la TVA 5,5 %.",
    "- 20 % sur d'autres postes UNIQUEMENT si le client le demande explicitement.",
    "Dans le doute → toujours " + rate + " %.",
    "Ne pas appliquer 20 % par défaut sur plomberie, carrelage, peinture, placo, électricité en rénovation.",
  ].join("\n");
}

export type AiDevisTvaLigne = {
  designation: string;
  description: string;
  tauxTVA: number;
};

export function applyTvaRulesToLigne<T extends AiDevisTvaLigne>(
  ligne: T,
  defaultTva: number,
  corpus: string,
): T {
  return {
    ...ligne,
    tauxTVA: resolveLigneTauxTVA({
      designation: ligne.designation,
      description: ligne.description,
      defaultTva,
      corpus,
    }),
  };
}
