import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";
import {
  bestChantierType,
  bestChantierTypePerformance,
  kpis,
  MSG_PARTIAL,
  pilotagePartial,
  topChantierRentabilite,
} from "@/lib/assistant-batimum/knowledge/helpers";
import { computeEmployePerformance } from "@/lib/pilotage/analytics";
import { getPilotageReadiness } from "@/lib/pilotage/readiness";
import { isFacturePayee } from "@/lib/facture-statut";
import { formatCurrency } from "@/lib/utils";

export const PILOTAGE_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "chantier_profitability",
    domain: "pilotage",
    actionType: "answer",
    priority: 100,
    confidence: 0.88,
    patterns: [/rentab/, /marge.*chantier/, /analys.*chantier/],
    keywords: ["rentabilité", "marge", "chantier", "analyse"],
    answer: (ctx) => {
      const top = topChantierRentabilite(ctx.data);
      if (!top) {
        return {
          text: "Je ne peux pas répondre précisément car les achats ou pointages ne sont pas encore renseignés.",
        };
      }
      return {
        text: `Meilleure marge : « ${top.chantier.nom} » — ${formatCurrency(top.rentabilite.margeReelle)} (${top.rentabilite.tauxMargeReelle.toFixed(0)} %).`,
        partial: pilotagePartial(ctx.data),
        navigateTo: "/pilotage",
      };
    },
  },
  {
    id: "employee_performance",
    domain: "pilotage",
    actionType: "answer",
    priority: 98,
    confidence: 0.88,
    patterns: [/salari.*travaill/, /employ.*efficac/, /meilleur.*salari/, /plus travaill/],
    keywords: ["salarié", "efficace", "heures", "travaillé"],
    answer: (ctx) => {
      const perf = computeEmployePerformance(ctx.data)
        .filter((p) => p.heuresTravaillees > 0)
        .sort((a, b) => b.heuresTravaillees - a.heuresTravaillees);
      if (!perf.length) {
        return {
          text: "Je ne peux pas répondre précisément car les pointages ne sont pas encore renseignés.",
        };
      }
      const top = perf[0];
      return {
        text: `${top.employe.prenom} ${top.employe.nom} a le plus travaillé (${top.heuresTravaillees.toFixed(1)} h).`,
        navigateTo: "/pilotage",
      };
    },
  },
  {
    id: "best_chantier_type",
    domain: "pilotage",
    actionType: "answer",
    priority: 95,
    confidence: 0.9,
    patterns: [
      /type.*chantier.*rentab/,
      /chantier.*marche/,
      /quel type.*marche/,
      /se porte le mieux/,
      /meilleur sur quoi/,
      /ou je gagne le plus/,
      /gagne le plus/,
      /je suis meilleur/,
    ],
    keywords: [
      "type",
      "chantier",
      "rentable",
      "marche",
      "se porte le mieux",
      "gagne le plus",
      "meilleur sur quoi",
    ],
    answer: (ctx) => {
      const best = bestChantierTypePerformance(ctx.data);
      if (!best || best.count < 2) {
        const fallback = bestChantierType(ctx.data);
        if (fallback && best?.count === 1) {
          return {
            text: `Votre type de chantier le plus performant semble être : ${best.label}, avec une marge moyenne de ${best.avgMargin.toFixed(0)} %. Ce résultat est à confirmer car vous avez peu de chantiers analysés.`,
            partial: true,
            navigateTo: "/pilotage",
          };
        }
        return {
          text: "Je n'ai pas encore assez de données fiables pour le confirmer. Il faut au minimum des chantiers classés par type, des achats et des pointages.",
          navigateTo: "/pilotage",
        };
      }
      const partialNote = pilotagePartial(ctx.data) ? ` ${MSG_PARTIAL}` : "";
      return {
        text: `Votre type de chantier le plus performant semble être : ${best.label}, avec une marge moyenne de ${best.avgMargin.toFixed(0)} %.${partialNote}`,
        partial: pilotagePartial(ctx.data),
        navigateTo: "/pilotage",
      };
    },
  },
  {
    id: "company_advice",
    domain: "pilotage",
    actionType: "answer",
    priority: 85,
    confidence: 0.82,
    patterns: [/conseil/, /recommand/, /prioris/, /strategie/, /que faire/],
    keywords: ["conseil", "recommandation", "prioriser", "stratégie"],
    answer: (ctx) => {
      const best = bestChantierType(ctx.data);
      if (!best) {
        return {
          text: "Je n'ai pas encore assez d'historique pour donner un conseil fiable.",
        };
      }
      return {
        text: `D'après vos données, vos chantiers « ${best.label} » performent le mieux. Vous pourriez prioriser ce type de prestation.`,
        partial: pilotagePartial(ctx.data),
      };
    },
  },
  {
    id: "pilotage_reliability",
    domain: "pilotage",
    actionType: "answer",
    priority: 80,
    confidence: 0.8,
    patterns: [/fiabilite.*chiffre/, /donnees.*fiables/, /pilotage.*pret/],
    keywords: ["fiabilité", "fiable", "données", "pilotage"],
    answer: (ctx) => {
      const r = getPilotageReadiness(ctx.data);
      if (r.isActionable) {
        return { text: "Vos données pilotage sont suffisantes pour une analyse fiable." };
      }
      const missing = r.steps.filter((s) => !s.done).map((s) => s.label);
      return {
        text: `Pilotage partiel : il manque ${missing.slice(0, 3).join(", ")}.`,
        partial: true,
        navigateTo: "/pilotage",
      };
    },
  },
  {
    id: "pilotage_attention",
    domain: "pilotage",
    actionType: "answer",
    priority: 78,
    confidence: 0.78,
    patterns: [/point.*attention/, /alerte/, /surveiller/],
    keywords: ["attention", "alertes", "surveiller"],
    answer: (ctx) => {
      const enRetard = ctx.data.chantiers.filter((c) =>
        ["en_retard", "retard_demarrage"].includes(c.statut),
      ).length;
      const parts: string[] = [];
      if (enRetard > 0) parts.push(`${enRetard} chantier(s) en retard`);
      if (ctx.data.factures.some((f) => !isFacturePayee(f))) {
        parts.push("factures impayées");
      }
      if (!parts.length) {
        return { text: "Aucun point d'attention critique identifié." };
      }
      return { text: `Points d'attention : ${parts.join(", ")}.`, navigateTo: "/pilotage" };
    },
  },
];
