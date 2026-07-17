import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";
import {
  countTodayActionItems,
  buildTodayMenuItems,
} from "@/lib/batimum-today-menu";
import {
  kpis,
  metrics,
  MSG_PARTIAL,
  pilotagePartial,
} from "@/lib/assistant-batimum/knowledge/helpers";
import { formatCurrency } from "@/lib/utils";

export const DASHBOARD_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "count_clients",
    domain: "dashboard",
    actionType: "answer",
    priority: 120,
    confidence: 0.95,
    patterns: [/combien.*client/, /nombre.*client/, /client.*combien/, /mes clients$/],
    keywords: ["combien", "client", "clients", "nombre"],
    requiredData: ["clients"],
    answer: ({ data }) => ({
      text: `Vous avez ${data.clients.length} client${data.clients.length > 1 ? "s" : ""} enregistré${data.clients.length > 1 ? "s" : ""} dans Batimum.`,
    }),
  },
  {
    id: "count_devis",
    domain: "dashboard",
    actionType: "answer",
    priority: 115,
    confidence: 0.95,
    patterns: [/combien.*devis/, /nombre.*devis/, /devis.*combien/, /j'ai combien.*devis/],
    keywords: ["combien", "devis", "nombre"],
    requiredData: ["devis"],
    answer: ({ data }) => {
      const { devisBrouillon, devisEnvoye, devisSigne, devisRefuse, totalDevis } =
        metrics({ data, message: "", normalized: "", referenceDate: new Date() });
      return {
        text: `Vous avez ${totalDevis} devis au total : ${devisBrouillon} brouillon(s), ${devisEnvoye} envoyé(s), ${devisSigne} signé(s), ${devisRefuse} refusé(s).`,
      };
    },
  },
  {
    id: "count_factures",
    domain: "dashboard",
    actionType: "answer",
    priority: 115,
    confidence: 0.95,
    patterns: [/combien.*facture/, /nombre.*facture/, /j'ai combien.*facture/],
    keywords: ["combien", "facture", "factures", "nombre"],
    requiredData: ["factures"],
    answer: ({ data }) => {
      const m = metrics({ data, message: "", normalized: "", referenceDate: new Date() });
      return {
        text: `Vous avez ${m.totalFactures} factures : ${m.facturesPayees} payée(s) et ${m.facturesImpayees} impayée(s).`,
      };
    },
  },
  {
    id: "count_chantiers",
    domain: "dashboard",
    actionType: "answer",
    priority: 115,
    confidence: 0.95,
    patterns: [/combien.*chantier/, /nombre.*chantier/],
    keywords: ["combien", "chantier", "chantiers", "nombre"],
    requiredData: ["chantiers"],
    answer: ({ data }) => {
      const enRetard = data.chantiers.filter((c) =>
        ["en_retard", "retard_demarrage"].includes(c.statut),
      ).length;
      const enCours = data.chantiers.filter((c) => c.statut === "en_cours").length;
      return {
        text: `Vous avez ${data.chantiers.length} chantiers : ${enRetard} en retard et ${enCours} en cours.`,
      };
    },
  },
  {
    id: "monthly_revenue",
    domain: "dashboard",
    actionType: "answer",
    priority: 110,
    confidence: 0.92,
    patterns: [
      /gagn.*mois/,
      /chiffre.*affair/,
      /\bca\b.*mois/,
      /mon ca/,
      /combien.*gagn/,
      /revenu.*mois/,
      /encaisse.*mois/,
      /ca du mois/,
    ],
    keywords: ["ca", "chiffre", "gagne", "gagné", "mois", "revenu", "encaisse"],
    requiredData: ["factures"],
    answer: (ctx) => {
      const m = metrics(ctx);
      if (m.chiffreAffairesMensuel === 0 && ctx.data.factures.length === 0) {
        return { text: "Je ne peux pas répondre précisément car aucune facture n'est encore enregistrée." };
      }
      const objectif = ctx.data.parametres.objectifCaMensuel ?? 15000;
      const pct =
        objectif > 0 ? Math.round((m.chiffreAffairesMensuel / objectif) * 100) : 0;
      return {
        text: `Votre CA encaissé ce mois-ci est de ${formatCurrency(m.chiffreAffairesMensuel)} (${pct} % de l'objectif de ${formatCurrency(objectif)}).`,
        partial: pilotagePartial(ctx.data),
      };
    },
  },
  {
    id: "monthly_profit",
    domain: "dashboard",
    actionType: "answer",
    priority: 108,
    confidence: 0.9,
    patterns: [/benefice.*mois/, /marge.*mois/, /benefice estim/, /combien.*benefice/],
    keywords: ["benefice", "bénéfice", "marge", "mois"],
    requiredData: ["pilotage", "factures"],
    answer: (ctx) => {
      const k = kpis(ctx);
      return {
        text: `Votre bénéfice estimé ce mois-ci est de ${formatCurrency(k.beneficeReelMois)}. Ce calcul dépend des factures payées, achats saisis et heures pointées.`,
        partial: pilotagePartial(ctx.data),
      };
    },
  },
  {
    id: "dashboard_summary",
    domain: "dashboard",
    actionType: "answer",
    priority: 80,
    confidence: 0.85,
    patterns: [/statistique/, /tableau de bord/, /resume activit/, /résumé.*activit/, /vue d'ensemble/],
    keywords: ["statistiques", "tableau de bord", "résumé", "activité"],
    answer: (ctx) => {
      const m = metrics(ctx);
      const k = kpis(ctx);
      return {
        text: `Vue d'ensemble : ${m.totalClients} clients, ${m.totalDevis} devis, ${m.chantiersActifs} chantiers actifs, CA mensuel ${formatCurrency(m.chiffreAffairesMensuel)}, bénéfice estimé ${formatCurrency(k.beneficeReelMois)}.`,
        partial: pilotagePartial(ctx.data),
      };
    },
  },
  {
    id: "today_summary",
    domain: "dashboard",
    actionType: "answer",
    priority: 95,
    confidence: 0.9,
    patterns: [/aujourd.?hui/, /resume du jour/, /priorit.*jour/],
    keywords: ["aujourd'hui", "jour", "priorités", "résumé"],
    answer: (ctx) => {
      const items = buildTodayMenuItems(ctx.data, ctx.referenceDate);
      const count = countTodayActionItems(items);
      if (count === 0) {
        return { text: "Rien d'urgent aujourd'hui. Votre activité est sous contrôle." };
      }
      return {
        text: `Priorités du jour (${count}) :\n${items
          .filter((i) => i.id !== "all-clear")
          .slice(0, 5)
          .map((i) => `• ${i.label}`)
          .join("\n")}`,
      };
    },
  },
  {
    id: "important_actions",
    domain: "dashboard",
    actionType: "answer",
    priority: 92,
    confidence: 0.88,
    patterns: [/action.*important/, /urgent/, /a faire/, /priorit/],
    keywords: ["actions", "importantes", "urgent", "priorité"],
    answer: (ctx) => {
      const items = buildTodayMenuItems(ctx.data, ctx.referenceDate).filter(
        (i) => i.priority === "critical" || i.priority === "warning",
      );
      if (!items.length) {
        return { text: "Aucune action urgente identifiée pour le moment." };
      }
      return {
        text: items.map((i) => `• ${i.label}`).join("\n"),
      };
    },
  },
  {
    id: "monthly_goal",
    domain: "dashboard",
    actionType: "answer",
    priority: 88,
    confidence: 0.86,
    patterns: [/objectif.*mois/, /objectif.*ca/, /evolution.*mois/],
    keywords: ["objectif", "mois", "ca", "évolution"],
    answer: (ctx) => {
      const m = metrics(ctx);
      const objectif = ctx.data.parametres.objectifCaMensuel ?? 15000;
      const pct =
        objectif > 0 ? Math.round((m.chiffreAffairesMensuel / objectif) * 100) : 0;
      return {
        text: `Objectif mensuel : ${formatCurrency(objectif)}. Vous êtes à ${pct} % (${formatCurrency(m.chiffreAffairesMensuel)} encaissés).`,
      };
    },
  },
];
