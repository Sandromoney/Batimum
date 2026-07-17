import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";
import { planningToday, planningTomorrow } from "@/lib/assistant-batimum/knowledge/helpers";

export const PLANNING_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "planning_today",
    domain: "planning",
    actionType: "answer",
    priority: 110,
    confidence: 0.9,
    patterns: [/rdv.*aujourd/, /planning.*aujourd/, /rendez.*aujourd/, /aujourd.*rdv/],
    keywords: ["aujourd'hui", "rdv", "rendez-vous", "planning"],
    answer: (ctx) => {
      const events = planningToday(ctx.data, ctx.referenceDate);
      if (!events.length) {
        return { text: "Aucun rendez-vous prévu aujourd'hui.", navigateTo: "/planning" };
      }
      return {
        text: `${events.length} rendez-vous aujourd'hui :\n${events.slice(0, 5).map((e) => `• ${e.titre ?? "RDV"} ${e.heureDebut ?? ""}`).join("\n")}`,
        navigateTo: "/planning",
      };
    },
  },
  {
    id: "planning_tomorrow",
    domain: "planning",
    actionType: "answer",
    priority: 108,
    confidence: 0.88,
    patterns: [/rdv.*demain/, /planning.*demain/, /demain.*rdv/],
    keywords: ["demain", "rdv", "planning", "rendez-vous"],
    answer: (ctx) => {
      const events = planningTomorrow(ctx.data, ctx.referenceDate);
      if (!events.length) {
        return { text: "Aucun rendez-vous prévu demain.", navigateTo: "/planning" };
      }
      return {
        text: `${events.length} rendez-vous demain :\n${events.slice(0, 5).map((e) => `• ${e.titre ?? "RDV"}`).join("\n")}`,
        navigateTo: "/planning",
      };
    },
  },
  {
    id: "create_rendez_vous",
    domain: "planning",
    actionType: "prepare_action",
    priority: 95,
    confidence: 0.88,
    patterns: [/rdv/, /rendez[- ]vous/, /ajoute.*rendez/, /planif.*rendez/],
    keywords: ["rdv", "rendez-vous", "planifier", "créer"],
  },
  {
    id: "move_appointment",
    domain: "planning",
    actionType: "answer",
    priority: 85,
    confidence: 0.82,
    patterns: [/deplac.*rdv/, /decal.*rdv/, /modifier.*planning/],
    keywords: ["déplacer", "décaler", "planning", "rdv"],
    answer: () => ({
      text: "Pour déplacer un rendez-vous, ouvrez le Planning et modifiez l'événement.",
      navigateTo: "/planning",
    }),
  },
];
