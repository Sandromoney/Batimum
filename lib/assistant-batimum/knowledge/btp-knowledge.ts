import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";
import { BTP_UNCERTAIN_REPLY } from "@/lib/batimum-assistant-router";

export const BTP_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "tva_question",
    domain: "btp",
    actionType: "answer",
    priority: 120,
    confidence: 0.92,
    patterns: [/tva.*renov/, /quelle tva/, /tva pour une/],
    keywords: ["tva", "rénovation", "travaux"],
    answer: () => ({
      text: `TVA rénovation (logement +2 ans) : 10 % ou 5,5 % selon conditions. ${BTP_UNCERTAIN_REPLY}`,
    }),
  },
  {
    id: "debourse_question",
    domain: "btp",
    actionType: "answer",
    priority: 115,
    confidence: 0.9,
    patterns: [/calcul.*debours/, /comment.*debours/, /debourse/],
    keywords: ["déboursé", "calculer", "coût"],
    answer: () => ({
      text: `Le déboursé = matériaux + main-d'œuvre + frais chantier. Batimum le calcule dans Pilotage si vos achats et pointages sont saisis. ${BTP_UNCERTAIN_REPLY}`,
      navigateTo: "/pilotage",
    }),
  },
  {
    id: "margin_question",
    domain: "btp",
    actionType: "answer",
    priority: 115,
    confidence: 0.9,
    patterns: [/amelior.*marge/, /comment.*marge/, /augmenter.*marge/],
    keywords: ["marge", "améliorer", "rentabilité"],
    answer: () => ({
      text: `Pour améliorer votre marge : chiffrez précisément, suivez les achats réels, pointez les heures et analysez vos chantiers dans Pilotage. ${BTP_UNCERTAIN_REPLY}`,
      navigateTo: "/pilotage",
    }),
  },
  {
    id: "price_advice",
    domain: "btp",
    actionType: "answer",
    priority: 110,
    confidence: 0.88,
    patterns: [/prix.*faux plafond/, /prix moyen/, /quel prix/, /combien.*m2/, /combien.*m²/],
    keywords: ["prix", "moyen", "faux plafond", "carrelage", "m²"],
    answer: (ctx) => {
      const n = ctx.normalized;
      if (/faux plafond|placo/.test(n)) {
        return {
          text: `Un faux plafond se chiffre souvent entre 40 et 80 €/m² pose comprise selon complexité. ${BTP_UNCERTAIN_REPLY}`,
        };
      }
      return {
        text: `Les prix varient selon région, accès chantier et finitions. ${BTP_UNCERTAIN_REPLY}`,
      };
    },
  },
  {
    id: "chantier_method_question",
    domain: "btp",
    actionType: "answer",
    priority: 105,
    confidence: 0.86,
    patterns: [/organis.*chantier/, /organis.*salle de bain/, /planning chantier/],
    keywords: ["organiser", "chantier", "salle de bain", "planning"],
    answer: () => ({
      text: `Organisez par phases : démolition, réseaux, étanchéité, finitions. Planifiez les corps de métier et les approvisionnements dans Batimum.`,
    }),
  },
  {
    id: "dtu_question",
    domain: "btp",
    actionType: "answer",
    priority: 100,
    confidence: 0.88,
    patterns: [/dtu/, /norme.*placo/, /quel dtu/],
    keywords: ["dtu", "norme", "placo"],
    answer: () => ({
      text: `Les DTU dépendent du métier et de la prestation. Pour le placo, référez-vous aux DTU 25.41 à 25.45. ${BTP_UNCERTAIN_REPLY}`,
    }),
  },
  {
    id: "btp_question",
    domain: "btp",
    actionType: "answer",
    priority: 90,
    confidence: 0.78,
    patterns: [/tva.*renov/, /quelle tva/, /dtu/, /norme/, /hauteur.*pose/, /prix moyen/],
    keywords: ["tva", "dtu", "norme", "rénovation", "prix", "marge", "pointage"],
    answer: (ctx) => {
      const n = ctx.normalized;
      if (/tva.*renov|quelle tva/.test(n)) {
        return {
          text: `Pour une rénovation (logement +2 ans) : 10 % ou 5,5 % selon conditions. ${BTP_UNCERTAIN_REPLY}`,
        };
      }
      if (/dtu|norme/.test(n)) {
        return {
          text: `Les DTU dépendent du métier et de la prestation. Précisez le type de travaux. ${BTP_UNCERTAIN_REPLY}`,
        };
      }
      if (/marge|debourse|pointage/.test(n)) {
        return {
          text: `En BTP, suivez marge, déboursé et pointages pour piloter la rentabilité. Batimum calcule cela dans Pilotage si vos données sont renseignées.`,
          navigateTo: "/pilotage",
        };
      }
      return {
        text: `Les prix et normes varient selon le contexte chantier. ${BTP_UNCERTAIN_REPLY}`,
      };
    },
  },
];
