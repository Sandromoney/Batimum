import {
  BTP_LOTS_A_ANALYSER,
  BTP_SECTION_TITLES,
  type BtpNiveauPrix,
} from "@/lib/btp-tarifs-reference";
import { formatAiDevisTvaRulesForPrompt } from "@/lib/ai-devis-tva";
import { formatPostesGlobauxRulesForPrompt } from "@/lib/ai-devis-postes-globaux";
import { TYPE_CHANTIER_LABELS } from "@/lib/chantiers";
import type { TypeChantier } from "@/lib/types";

export type AiChantierQuestionFieldType = "text" | "number" | "textarea" | "choice";

export type AiChantierQuestion = {
  id: string;
  question: string;
  categorie: string;
  type?: AiChantierQuestionFieldType;
  unite?: string;
  placeholder?: string;
  options?: string[];
};

export type AiChantierAnalysis = {
  lotsIdentifies: string[];
  informationsSuffisantes: boolean;
  questions: AiChantierQuestion[];
  hypothesesSuggerees: string[];
  messageAnalyse: string;
};

export type AiAnalyzeChantierRequest = {
  descriptionChantier: string;
  regionCode: string;
  regionLabel: string;
  departementCode: string;
  departementLabel: string;
  typeChantier: TypeChantier;
  tauxTVA: number;
  niveauPrix: BtpNiveauPrix;
};

export const AI_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    lotsIdentifies: {
      type: "array",
      items: { type: "string" },
    },
    informationsSuffisantes: { type: "boolean" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          categorie: { type: "string" },
          type: {
            type: "string",
            enum: ["text", "number", "textarea", "choice"],
          },
          unite: { type: "string" },
          placeholder: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["id", "question", "categorie"],
        additionalProperties: false,
      },
    },
    hypothesesSuggerees: {
      type: "array",
      items: { type: "string" },
    },
    messageAnalyse: { type: "string" },
  },
  required: [
    "lotsIdentifies",
    "informationsSuffisantes",
    "questions",
    "hypothesesSuggerees",
    "messageAnalyse",
  ],
  additionalProperties: false,
} as const;

export function buildAiAnalysisSystemPrompt(): string {
  const lots = BTP_LOTS_A_ANALYSER.join(", ");
  const sections = BTP_SECTION_TITLES.join(", ");

  return `Tu es MUM IA, expert en chiffrage BTP en France.
Ta mission : ANALYSER la demande AVANT toute génération de devis.

Étape obligatoire — identifier TOUS les lots pertinents parmi :
${lots}

Ne te limite JAMAIS au premier métier détecté. Un chantier complet peut concerner plusieurs lots.

Sections de devis possibles (ne créer que celles utiles) :
${sections}

Si la demande est vague ou incomplète pour chiffrer précisément :
- informationsSuffisantes = false
- proposer 2 à 6 questions MÉTIER dans "questions" — uniquement des précisions utiles au devis final
- proposer des hypothesesSuggerees réalistes pour chiffrer malgré tout

Si la demande est suffisamment détaillée pour chiffrer :
- informationsSuffisantes = true
- questions = tableau vide (ou 1 à 3 précisions vraiment manquantes)

RÈGLES POUR "questions" (OBLIGATOIRE) :
- Chaque question doit servir à quantifier ou décrire un poste du devis.
- categorie = lot métier (ex. "Salle de bain", "Carrelage", "Placo", "Peinture", "Plomberie").
- type : "text" | "number" | "textarea" | "choice" selon le besoin.
- Pour "number" : renseigner unite (m², m, u…).
- Pour "choice" : renseigner options (2 à 4 choix courts).

Exemples par lot :
- Salle de bain : type de receveur, dimensions exactes, murs à faïencer, modèle meuble.
- Carrelage : format carreaux, sens de pose, plinthes assorties.
- Placo : isolation souhaitée, nombre de spots, surfaces en m².
- Peinture : préparation supports, couleurs, nombre de pièces.
- Plomberie : déplacement réseaux, marque équipements, contraintes d'accès.

INTERDICTIONS ABSOLUES dans "questions" :
❌ Gamme économique / standard / premium
❌ Type de chauffage
❌ Date souhaitée des travaux
❌ Inclure les fournitures (l'IA le déduit du descriptif)
❌ Questions marketing, génériques ou hors devis

messageAnalyse : résumé professionnel des travaux identifiés et des points d'attention chiffrage.

${formatPostesGlobauxRulesForPrompt()}

Si le client demande une « douche complète » ou une « salle de bain complète », ne pas prévoir en plus les sous-postes inclus (receveur, paroi, meuble vasque, miroir…).

Réponds UNIQUEMENT en JSON selon le schéma.`;
}

export function buildAiAnalysisUserPrompt(
  input: AiAnalyzeChantierRequest,
): string {
  const typeLabel = TYPE_CHANTIER_LABELS[input.typeChantier];

  return `Analyse ce chantier :

Description :
${input.descriptionChantier.trim()}

Contexte :
- Région : ${input.regionLabel} (${input.regionCode})
- Département : ${input.departementLabel} (${input.departementCode})
- Type : ${typeLabel}
- TVA par défaut : ${input.tauxTVA}%
- Niveau de prix : ${input.niveauPrix}

Liste tous les lots concernés et propose uniquement des précisions utiles au devis final (pas de questions marketing).`;
}

const BANNED_QUESTION_PATTERNS = [
  /gamme/i,
  /économique|premium/i,
  /standard.*premium|premium.*standard/i,
  /chauffage/i,
  /date.*travaux/i,
  /inclure.*fourniture/i,
  /fourniture.*inclure/i,
  /souhaitez-vous inclure/i,
  /marketing/i,
  /niveau de gamme/i,
  /type de chauffage/i,
];

function isBannedDevisQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return BANNED_QUESTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeQuestionType(
  raw: unknown,
): AiChantierQuestionFieldType | undefined {
  if (raw === "text" || raw === "number" || raw === "textarea" || raw === "choice") {
    return raw;
  }
  return undefined;
}

export function normalizeAiChantierAnalysis(
  raw: unknown,
): AiChantierAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<AiChantierAnalysis>;

  const lotsIdentifies = Array.isArray(data.lotsIdentifies)
    ? data.lotsIdentifies.map((item) => String(item).trim()).filter(Boolean)
    : [];

  const questions = (Array.isArray(data.questions) ? data.questions : [])
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const question = String(item.question ?? "").trim();
      if (!question || isBannedDevisQuestion(question)) return null;

      const options = Array.isArray(item.options)
        ? item.options.map((opt) => String(opt).trim()).filter(Boolean)
        : undefined;

      const parsedType = normalizeQuestionType(item.type);
      const inferredType: AiChantierQuestionFieldType =
        parsedType ?? (options && options.length > 0 ? "choice" : "text");

      return {
        id: String(item.id ?? `q${index + 1}`).trim(),
        question,
        categorie: String(item.categorie ?? "Précisions chantier").trim(),
        type: inferredType,
        unite: item.unite ? String(item.unite).trim() : undefined,
        placeholder: item.placeholder ? String(item.placeholder).trim() : undefined,
        options,
      } satisfies AiChantierQuestion;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    lotsIdentifies,
    informationsSuffisantes: Boolean(data.informationsSuffisantes),
    questions,
    hypothesesSuggerees: Array.isArray(data.hypothesesSuggerees)
      ? data.hypothesesSuggerees.map((item) => String(item).trim()).filter(Boolean)
      : [],
    messageAnalyse: String(data.messageAnalyse ?? "").trim(),
  };
}
