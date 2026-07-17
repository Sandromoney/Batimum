import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";

export const COMMANDES_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "count_commandes",
    domain: "commandes",
    actionType: "answer",
    priority: 100,
    confidence: 0.9,
    patterns: [/combien.*commande/, /nombre.*commande/],
    keywords: ["commandes", "combien", "nombre"],
    answer: (ctx) => ({
      text: `Vous avez ${ctx.data.commandes.length} commande(s) enregistrée(s).`,
      navigateTo: "/commandes",
    }),
  },
];
