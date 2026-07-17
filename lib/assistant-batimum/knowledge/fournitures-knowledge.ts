import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";
import { MSG_NO_DATA } from "@/lib/assistant-batimum/knowledge/helpers";

export const FOURNITURES_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "count_fournitures",
    domain: "fournitures",
    actionType: "answer",
    priority: 100,
    confidence: 0.9,
    patterns: [/combien.*fourniture/, /nombre.*fourniture/],
    keywords: ["fournitures", "combien", "nombre", "bibliothèque"],
    answer: (ctx) => {
      const n = ctx.data.bibliothequeEntreprise?.entries?.length ?? 0;
      return { text: `Vous avez ${n} fourniture(s) dans votre bibliothèque entreprise.` };
    },
  },
  {
    id: "search_fourniture",
    domain: "fournitures",
    actionType: "answer",
    priority: 88,
    confidence: 0.84,
    patterns: [/cherch.*fourniture/, /trouv.*fourniture/, /prix.*fourniture/],
    keywords: ["fourniture", "chercher", "prix", "matériau"],
    answer: (ctx) => {
      const entries = ctx.data.bibliothequeEntreprise?.entries ?? [];
      if (!entries.length) {
        return { text: MSG_NO_DATA, navigateTo: "/parametres/bibliotheque" };
      }
      return {
        text: `${entries.length} article(s) dans votre bibliothèque. Ouvrez la bibliothèque pour rechercher.`,
        navigateTo: "/parametres/bibliotheque",
      };
    },
  },
  {
    id: "create_fourniture",
    domain: "fournitures",
    actionType: "prepare_action",
    priority: 90,
    confidence: 0.88,
    patterns: [/cr[eé]e.*fourniture/, /ajoute.*fourniture/],
    keywords: ["fourniture", "créer", "ajouter"],
    unavailable: true,
    unavailableReply:
      "J'ai compris que vous souhaitez ajouter une fourniture. Cette fonctionnalité n'est pas encore disponible via l'assistant.",
  },
];
