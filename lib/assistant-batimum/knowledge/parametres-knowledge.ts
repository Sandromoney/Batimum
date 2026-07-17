import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";

export const PARAMETRES_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "parametres_tva",
    domain: "parametres",
    actionType: "answer",
    priority: 85,
    confidence: 0.82,
    patterns: [/changer.*tva/, /modifier.*tva/, /taux.*tva.*entreprise/],
    keywords: ["tva", "changer", "paramètres", "taux"],
    answer: (ctx) => ({
      text: `TVA par défaut de l'entreprise : ${ctx.data.parametres.tva ?? 20} %. Modifiez-la dans Paramètres.`,
      navigateTo: "/parametres",
    }),
  },
  {
    id: "parametres_abonnement",
    domain: "parametres",
    actionType: "answer",
    priority: 82,
    confidence: 0.8,
    patterns: [/abonnement/, /mon compte/, /souscription/],
    keywords: ["abonnement", "compte", "souscription"],
    answer: () => ({
      text: "Gérez votre abonnement dans Paramètres ou via la page Abonnement.",
      navigateTo: "/parametres",
    }),
  },
  {
    id: "parametres_entreprise",
    domain: "parametres",
    actionType: "answer",
    priority: 80,
    confidence: 0.78,
    patterns: [/modifier.*entreprise/, /logo/, /signature.*entreprise/],
    keywords: ["entreprise", "logo", "signature", "paramètres"],
    answer: () => ({
      text: "Modifiez les informations de votre entreprise dans Paramètres.",
      navigateTo: "/parametres",
    }),
  },
];
