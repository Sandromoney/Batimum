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
        required: ["question"],
        additionalProperties: true,
      },
    },
    hypothesesSuggerees: {
      type: "array",
      items: { type: "string" },
    },
    messageAnalyse: { type: "string" },
  },
  required: ["lotsIdentifies", "informationsSuffisantes", "questions"],
  additionalProperties: true,
} as const;

export function buildAiAnalysisSystemPrompt(): string {
  const lots = BTP_LOTS_A_ANALYSER.join(", ");
  const sections = BTP_SECTION_TITLES.join(", ");

  return `Tu es MUM IA, expert en chiffrage BTP en France.
Ta mission : ANALYSER la demande AVANT toute génération de devis.

PRIORITÉ : analyser presque toujours dès qu'un métier, une pièce ou un type de travaux est mentionné, même si la description est incomplète.

Étape obligatoire — identifier TOUS les lots pertinents parmi :
${lots}

Ne te limite JAMAIS au premier métier détecté. Un chantier complet peut concerner plusieurs lots.

Sections de devis possibles (ne créer que celles utiles) :
${sections}

Si la demande évoque des travaux mais manque de précisions pour chiffrer :
- lotsIdentifies = tous les lots détectables
- informationsSuffisantes = false
- proposer 2 à 6 questions MÉTIER dans "questions" — uniquement des précisions utiles au devis final
- proposer des hypothesesSuggerees réalistes pour chiffrer malgré tout

Si la demande est suffisamment détaillée pour chiffrer :
- informationsSuffisantes = true
- questions = tableau vide (ou 1 à 3 précisions vraiment manquantes)

Refuse UNIQUEMENT si la description est vraiment inexploitable (salutation seule, mot vague isolé sans travaux, texte sans aucun sens).
Dans ce cas rare :
- lotsIdentifies = []
- informationsSuffisantes = false
- questions = []
- hypothesesSuggerees = []
- messageAnalyse = expliquer brièvement ce qu'il faut préciser (travaux, pièces, dimensions)

RÈGLES POUR "questions" (OBLIGATOIRE) :
- Chaque question doit servir à quantifier ou décrire un poste du devis.
- categorie = lot métier (ex. "Salle de bain", "Carrelage", "Placo", "Peinture", "Plomberie").
- type : "text" | "number" | "textarea" | "choice" selon le besoin.
- Pour "number" : renseigner unite (m², m, u…), sinon "".
- Pour "choice" : renseigner options (2 à 4 choix courts), sinon [].
- type obligatoire sur chaque question ("text" par défaut).
- placeholder : "" si non pertinent.

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

export type NormalizeAiAnalysisOutcome = {
  result: AiChantierAnalysis | null;
  missingFields: string[];
  warnings: string[];
};

export function normalizeAiChantierAnalysisDetailed(
  raw: unknown,
): NormalizeAiAnalysisOutcome {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== "object") {
    return {
      result: null,
      missingFields: ["root (JSON objet attendu)"],
      warnings,
    };
  }

  const data = raw as Partial<AiChantierAnalysis> & Record<string, unknown>;

  const lotsIdentifies = Array.isArray(data.lotsIdentifies)
    ? data.lotsIdentifies.map((item) => String(item).trim()).filter(Boolean)
    : Array.isArray(data.lots)
      ? (data.lots as unknown[]).map((item) => String(item).trim()).filter(Boolean)
      : [];

  if (!Array.isArray(data.lotsIdentifies) && !Array.isArray(data.lots)) {
    warnings.push("lotsIdentifies absent — tableau vide");
  }

  const questionsRaw = Array.isArray(data.questions) ? data.questions : [];
  if (!Array.isArray(data.questions)) {
    warnings.push("questions absent — tableau vide");
  }

  const questions = questionsRaw
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        warnings.push(`questions[${index}] ignorée (objet invalide)`);
        return null;
      }
      const question = String(
        (item as { question?: unknown }).question ??
          (item as { texte?: unknown }).texte ??
          "",
      ).trim();
      if (!question) {
        warnings.push(`questions[${index}].question absente — question ignorée`);
        return null;
      }
      if (isBannedDevisQuestion(question)) {
        warnings.push(`questions[${index}] filtrée (question interdite)`);
        return null;
      }

      const options = Array.isArray((item as { options?: unknown }).options)
        ? ((item as { options: unknown[] }).options)
            .map((opt) => String(opt).trim())
            .filter(Boolean)
        : undefined;

      const parsedType = normalizeQuestionType((item as { type?: unknown }).type);
      const inferredType: AiChantierQuestionFieldType =
        parsedType ?? (options && options.length > 0 ? "choice" : "text");

      return {
        id: String(
          (item as { id?: unknown }).id ?? `q${index + 1}`,
        ).trim(),
        question,
        categorie: String(
          (item as { categorie?: unknown }).categorie ?? "Précisions chantier",
        ).trim(),
        type: inferredType,
        unite: (item as { unite?: unknown }).unite
          ? String((item as { unite: unknown }).unite).trim()
          : undefined,
        placeholder: (item as { placeholder?: unknown }).placeholder
          ? String((item as { placeholder: unknown }).placeholder).trim()
          : undefined,
        options,
      } satisfies AiChantierQuestion;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Une analyse est exploitable si on a des lots OU un message OU des questions
  const messageAnalyse = String(
    data.messageAnalyse ?? data.resume ?? data.message ?? "",
  ).trim();

  if (
    lotsIdentifies.length === 0 &&
    questions.length === 0 &&
    !messageAnalyse
  ) {
    missingFields.push(
      "lotsIdentifies / questions / messageAnalyse (aucune information exploitable)",
    );
    return { result: null, missingFields, warnings };
  }

  return {
    result: {
      lotsIdentifies,
      informationsSuffisantes: Boolean(data.informationsSuffisantes),
      questions,
      hypothesesSuggerees: Array.isArray(data.hypothesesSuggerees)
        ? data.hypothesesSuggerees.map((item) => String(item).trim()).filter(Boolean)
        : [],
      messageAnalyse,
    },
    missingFields,
    warnings,
  };
}

export function normalizeAiChantierAnalysis(
  raw: unknown,
): AiChantierAnalysis | null {
  return normalizeAiChantierAnalysisDetailed(raw).result;
}
