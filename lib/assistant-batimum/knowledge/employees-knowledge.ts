import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";

export const EMPLOYEES_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "count_employes",
    domain: "employes",
    actionType: "answer",
    priority: 100,
    confidence: 0.9,
    patterns: [/combien.*(?:employ|salari|ouvrier)/, /nombre.*(?:employ|salari)/],
    keywords: ["employés", "salariés", "combien", "ouvriers"],
    answer: (ctx) => ({
      text: `Vous avez ${ctx.data.employes.length} employé(s) enregistré(s).`,
      navigateTo: "/parametres",
    }),
  },
  {
    id: "create_employe",
    domain: "employes",
    actionType: "prepare_action",
    priority: 95,
    confidence: 0.92,
    patterns: [
      /cr[eé]e.*(?:salari|employ|ouvrier)/,
      /nouvel employ/,
      /nouveau employ/,
      /nouvel ouvrier/,
      /ajoute.*salari/,
    ],
    keywords: ["employé", "salarié", "ouvrier", "créer", "ajouter"],
  },
];
