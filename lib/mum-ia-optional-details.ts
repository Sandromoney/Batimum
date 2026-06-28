import type { AiChantierAnalysis, AiChantierQuestion } from "@/lib/ai-devis-analysis";

/** Champs standards utiles au chiffrage — jamais marketing. */
export type MumIaStandardDetails = {
  surfaceM2: string;
  hauteurSousPlafond: string;
  nombreFenetresPortes: string;
  accesChantier: string;
  protectionParticuliere: string;
  marqueModele: string;
  contraintesRemarques: string;
};

export const EMPTY_MUM_IA_STANDARD_DETAILS: MumIaStandardDetails = {
  surfaceM2: "",
  hauteurSousPlafond: "",
  nombreFenetresPortes: "",
  accesChantier: "",
  protectionParticuliere: "",
  marqueModele: "",
  contraintesRemarques: "",
};

export const MUM_IA_ACCES_CHANTIER_OPTIONS = [
  { value: "rdc", label: "RDC" },
  { value: "etage", label: "Étage" },
  { value: "escalier_etroit", label: "Escalier étroit" },
  { value: "ascenseur", label: "Ascenseur" },
] as const;

const STANDARD_FIELD_COUNT = Object.keys(EMPTY_MUM_IA_STANDARD_DETAILS).length;

export function countMumIaOptionalDetails(analysis: AiChantierAnalysis): number {
  return STANDARD_FIELD_COUNT + analysis.questions.length;
}

export function buildMumIaReponsesQuestions(
  standard: MumIaStandardDetails,
  questionAnswers: Record<string, string>,
): Record<string, string> {
  const reponses: Record<string, string> = {};

  for (const [id, value] of Object.entries(questionAnswers)) {
    const trimmed = value.trim();
    if (trimmed) reponses[id] = trimmed;
  }

  if (standard.surfaceM2.trim()) {
    reponses.surface_exacte = `${standard.surfaceM2.trim()} m²`;
  }
  if (standard.hauteurSousPlafond.trim()) {
    reponses.hauteur_sous_plafond = `${standard.hauteurSousPlafond.trim()} m`;
  }
  if (standard.nombreFenetresPortes.trim()) {
    reponses.nombre_fenetres_portes = standard.nombreFenetresPortes.trim();
  }
  if (standard.accesChantier) {
    const label =
      MUM_IA_ACCES_CHANTIER_OPTIONS.find((item) => item.value === standard.accesChantier)
        ?.label ?? standard.accesChantier;
    reponses.acces_chantier = label;
  }
  if (standard.protectionParticuliere.trim()) {
    reponses.protection_particuliere = standard.protectionParticuliere.trim();
  }
  if (standard.marqueModele.trim()) {
    reponses.marque_ou_modele = standard.marqueModele.trim();
  }
  if (standard.contraintesRemarques.trim()) {
    reponses.contraintes_remarques_client = standard.contraintesRemarques.trim();
  }

  return reponses;
}

export function groupQuestionsByCategory(
  questions: AiChantierQuestion[],
): { category: string; questions: AiChantierQuestion[] }[] {
  const map = new Map<string, AiChantierQuestion[]>();

  for (const question of questions) {
    const category = question.categorie.trim() || "Précisions chantier";
    const bucket = map.get(category) ?? [];
    bucket.push(question);
    map.set(category, bucket);
  }

  return [...map.entries()].map(([category, items]) => ({
    category,
    questions: items,
  }));
}
