import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";

export const MUM_IA_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "explain_mum_ia",
    domain: "mum-ia",
    actionType: "answer",
    priority: 95,
    confidence: 0.9,
    patterns: [/mum ia/, /qu'?est[- ]ce que mum/, /explique.*mum/, /ia devis/],
    keywords: ["mum", "ia", "intelligence", "devis", "générer"],
    answer: () => ({
      text: "MUM IA génère des devis détaillés à partir d'une description de chantier. L'Assistant Batimum répond à vos questions sur l'activité et prépare des actions simples. Pour un devis complet, utilisez MUM IA dans l'éditeur de devis.",
      navigateTo: "/parametres/mum-ia",
    }),
  },
  {
    id: "mum_ia_difference",
    domain: "mum-ia",
    actionType: "answer",
    priority: 90,
    confidence: 0.88,
    patterns: [/difference.*mum/, /mum.*assistant/, /assistant.*mum/],
    keywords: ["différence", "mum", "assistant"],
    answer: () => ({
      text: "MUM IA = génération de devis détaillés (1 crédit). Assistant Batimum = copilote global (clients, chiffres, planning, actions) souvent à 0 crédit.",
    }),
  },
  {
    id: "mum_ia_quota",
    domain: "mum-ia",
    actionType: "answer",
    priority: 88,
    confidence: 0.85,
    patterns: [/quota.*ia/, /combien.*credit/, /credit.*ia/, /limite.*ia/],
    keywords: ["quota", "crédit", "crédits", "ia", "limite"],
    answer: () => ({
      text: "Votre quota MUM IA est visible dans Paramètres > MUM IA. L'Assistant Batimum utilise 0 crédit pour les questions simples et 1 crédit pour les tâches complexes (mail, analyse avancée).",
      navigateTo: "/parametres/mum-ia",
    }),
  },
  {
    id: "create_devis_ia",
    domain: "mum-ia",
    actionType: "answer",
    priority: 85,
    confidence: 0.84,
    patterns: [/gener.*devis.*ia/, /devis.*mum/, /ia.*generer/],
    keywords: ["générer", "devis", "ia", "mum"],
    answer: () => ({
      text: "Pour générer un devis avec MUM IA, ouvrez un devis et décrivez le chantier. MUM IA structure les lignes automatiquement.",
      navigateTo: "/devis",
    }),
    needsAi: true,
  },
];
