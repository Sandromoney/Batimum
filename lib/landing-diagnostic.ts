export type PainId =
  | "devis"
  | "equipes"
  | "chantiers"
  | "rentabilite"
  | "admin"
  | "clients";

export type AnswerOption = {
  id: string;
  label: string;
  pains?: PainId[];
};

export type Question =
  | {
      id: string;
      kind: "single";
      prompt: string;
      hint?: string;
      options: AnswerOption[];
    }
  | {
      id: string;
      kind: "multi";
      prompt: string;
      hint?: string;
      options: AnswerOption[];
      minSelect?: number;
    };

export const PAIN_LABELS: Record<PainId, string> = {
  devis: "Création des devis",
  equipes: "Organisation des équipes",
  chantiers: "Suivi des chantiers",
  rentabilite: "Rentabilité",
  admin: "Administratif & relances",
  clients: "Suivi clients",
};

export const QUESTIONS: Question[] = [
  {
    id: "size",
    kind: "single",
    prompt: "Combien de salariés avez-vous ?",
    hint: "Y compris vous, sur le terrain ou au bureau.",
    options: [
      { id: "solo", label: "Je travaille seul" },
      { id: "2-4", label: "2 à 4" },
      { id: "5-9", label: "5 à 9" },
      { id: "10+", label: "10 ou plus" },
    ],
  },
  {
    id: "quotes",
    kind: "single",
    prompt: "Combien de devis réalisez-vous chaque mois ?",
    options: [
      { id: "lt5", label: "Moins de 5", pains: ["devis"] },
      { id: "5-15", label: "5 à 15", pains: ["devis"] },
      { id: "15-30", label: "15 à 30", pains: ["devis", "admin"] },
      { id: "30+", label: "Plus de 30", pains: ["devis", "admin", "clients"] },
    ],
  },
  {
    id: "biggest",
    kind: "single",
    prompt: "Quelle est aujourd’hui votre plus grosse difficulté ?",
    options: [
      {
        id: "devis",
        label: "Préparer et envoyer les devis",
        pains: ["devis"],
      },
      {
        id: "planning",
        label: "Organiser les équipes",
        pains: ["equipes"],
      },
      {
        id: "chantiers",
        label: "Suivre les chantiers",
        pains: ["chantiers"],
      },
      {
        id: "marges",
        label: "Savoir ce qui est vraiment rentable",
        pains: ["rentabilite"],
      },
      {
        id: "admin",
        label: "L’administratif qui s’accumule",
        pains: ["admin", "clients"],
      },
    ],
  },
  {
    id: "redo",
    kind: "single",
    prompt: "Vous arrive-t-il de refaire un devis déjà commencé ?",
    options: [
      { id: "often", label: "Oui, souvent", pains: ["devis"] },
      { id: "sometimes", label: "Oui, de temps en temps", pains: ["devis"] },
      { id: "rare", label: "Rarement" },
      { id: "never", label: "Presque jamais" },
    ],
  },
  {
    id: "evenings",
    kind: "single",
    prompt: "Passez-vous encore vos soirées à terminer de l’administratif ?",
    options: [
      { id: "yes", label: "Oui, trop souvent", pains: ["admin", "devis"] },
      { id: "sometimes", label: "Parfois", pains: ["admin"] },
      { id: "no", label: "Non, plus vraiment" },
    ],
  },
  {
    id: "situations",
    kind: "multi",
    prompt: "Vous est-il déjà arrivé…",
    hint: "Cochez tout ce qui vous parle. Puis continuez.",
    minSelect: 1,
    options: [
      {
        id: "relance",
        label: "D’oublier une relance client",
        pains: ["clients", "admin"],
      },
      {
        id: "search",
        label: "De chercher un devis plusieurs minutes",
        pains: ["devis", "clients"],
      },
      {
        id: "call",
        label: "De rappeler un salarié juste pour savoir où il est",
        pains: ["equipes", "chantiers"],
      },
      {
        id: "margin",
        label: "De découvrir trop tard qu’un chantier n’était plus rentable",
        pains: ["rentabilite", "chantiers"],
      },
    ],
  },
];

/** Agrège les réponses et retourne jusqu’à 4 axes prioritaires. */
export function collectPains(
  answers: Record<string, string | string[]>,
): PainId[] {
  const scores = new Map<PainId, number>();
  const bump = (id: PainId, n = 1) => {
    scores.set(id, (scores.get(id) ?? 0) + n);
  };

  for (const q of QUESTIONS) {
    const raw = answers[q.id];
    if (raw == null) continue;
    const selected = Array.isArray(raw) ? raw : [raw];
    for (const optId of selected) {
      const opt = q.options.find((o) => o.id === optId);
      opt?.pains?.forEach((p) => bump(p, q.id === "biggest" ? 2 : 1));
    }
  }

  if (scores.size === 0) {
    return ["devis", "chantiers", "rentabilite"];
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([id]) => id);
}
