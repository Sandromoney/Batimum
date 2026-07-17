import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";
import {
  MSG_PARTIAL,
  topChantierRentabilite,
} from "@/lib/assistant-batimum/knowledge/helpers";
import { formatCurrency } from "@/lib/utils";

export const CHANTIERS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "show_late_chantiers",
    domain: "chantiers",
    actionType: "answer",
    priority: 130,
    confidence: 0.95,
    patterns: [/chantier.*retard/, /retard.*chantier/, /mes chantiers en retard/],
    keywords: ["chantiers", "retard", "en retard"],
    answer: (ctx) => {
      const list = ctx.data.chantiers.filter((c) =>
        ["en_retard", "retard_demarrage"].includes(c.statut),
      );
      if (!list.length) {
        return { text: "Aucun chantier en retard actuellement." };
      }
      return {
        text: `Vous avez ${list.length} chantier(s) en retard :\n${list.slice(0, 5).map((c) => `• ${c.nom}`).join("\n")}`,
        navigateTo: "/chantiers",
      };
    },
  },
  {
    id: "chantiers_active",
    domain: "chantiers",
    actionType: "answer",
    priority: 100,
    confidence: 0.88,
    patterns: [/chantier.*en cours/, /chantiers? actif/],
    keywords: ["chantiers", "en cours", "actifs"],
    answer: (ctx) => {
      const n = ctx.data.chantiers.filter((c) => c.statut === "en_cours").length;
      return { text: `Vous avez ${n} chantier(s) en cours.` };
    },
  },
  {
    id: "chantiers_completed",
    domain: "chantiers",
    actionType: "answer",
    priority: 98,
    confidence: 0.86,
    patterns: [/chantier.*termin/, /chantiers? fini/],
    keywords: ["chantiers", "terminés", "fini"],
    answer: (ctx) => {
      const n = ctx.data.chantiers.filter((c) => c.statut === "termine").length;
      return { text: `Vous avez ${n} chantier(s) terminé(s).` };
    },
  },
  {
    id: "best_chantier",
    domain: "chantiers",
    actionType: "answer",
    priority: 95,
    confidence: 0.88,
    patterns: [/chantier.*rentab/, /meilleur.*chantier/, /plus rentable/],
    keywords: ["chantier", "rentable", "meilleur", "marge"],
    answer: (ctx) => {
      const top = topChantierRentabilite(ctx.data);
      if (!top) {
        return {
          text: "Je ne peux pas répondre précisément car les achats ou pointages ne sont pas encore renseignés.",
        };
      }
      return {
        text: `Votre chantier le plus rentable est « ${top.chantier.nom} » (marge ${formatCurrency(top.rentabilite.margeReelle)}).`,
        partial: top.rentabilite.fiabilite !== "fiable",
        navigateTo: "/pilotage",
      };
    },
  },
  {
    id: "chantier_overrun",
    domain: "chantiers",
    actionType: "answer",
    priority: 88,
    confidence: 0.84,
    patterns: [/depassement/, /budget.*depass/, /chantier.*cout/],
    keywords: ["dépassement", "budget", "coût", "chantier"],
    answer: (ctx) => {
      const alerts = ctx.data.chantiers.filter(
        (c) => c.statut === "en_retard" || c.statut === "retard_demarrage",
      );
      if (!alerts.length) {
        return { text: "Aucun chantier avec dépassement identifié pour le moment." };
      }
      return {
        text: `${alerts.length} chantier(s) nécessitent votre attention (retard ou dépassement potentiel).`,
        navigateTo: "/chantiers",
      };
    },
  },
  {
    id: "search_chantier",
    domain: "chantiers",
    actionType: "answer",
    priority: 92,
    confidence: 0.85,
    patterns: [/ouvr.*chantier/, /cherch.*chantier/],
    keywords: ["chantier", "ouvrir", "chercher"],
    answer: (ctx) => ({
      text: "Indiquez le nom du chantier.",
      navigateTo: "/chantiers",
    }),
  },
  {
    id: "create_chantier",
    domain: "chantiers",
    actionType: "prepare_action",
    priority: 95,
    confidence: 0.9,
    patterns: [/cr[eé]e.*chantier/, /nouveau chantier/, /ajoute.*chantier/],
    keywords: ["créer", "chantier", "nouveau"],
  },
];
