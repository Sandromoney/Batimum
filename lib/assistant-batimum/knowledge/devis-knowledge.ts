import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";
import { getDevisDisplayStatut } from "@/lib/devis-statut";
import { devisTotal } from "@/lib/data";
import {
  clientName,
  formatDevisRelanceList,
  listDevisToRelance,
} from "@/lib/assistant-batimum/knowledge/helpers";
import { formatCurrency } from "@/lib/utils";

export const DEVIS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "show_quotes_to_follow_up",
    domain: "devis",
    actionType: "answer",
    priority: 130,
    confidence: 0.95,
    patterns: [/devis.*relanc/, /relanc.*devis/, /quels? devis/, /devis a relancer/, /pas signe/],
    keywords: ["devis", "relancer", "relance", "quels", "signé"],
    answer: (ctx) => ({
      text: formatDevisRelanceList(ctx.data, listDevisToRelance(ctx.data)),
    }),
  },
  {
    id: "devis_drafts",
    domain: "devis",
    actionType: "answer",
    priority: 100,
    confidence: 0.9,
    patterns: [/devis.*brouillon/, /brouillon.*devis/, /mes brouillons/],
    keywords: ["devis", "brouillon", "brouillons"],
    answer: (ctx) => {
      const n = ctx.data.devis.filter((d) => getDevisDisplayStatut(d) === "brouillon").length;
      return { text: `Vous avez ${n} devis en brouillon sur ${ctx.data.devis.length} au total.` };
    },
  },
  {
    id: "devis_sent",
    domain: "devis",
    actionType: "answer",
    priority: 98,
    confidence: 0.88,
    patterns: [/devis.*envoy/, /envoy.*devis/],
    keywords: ["devis", "envoyés", "envoyé"],
    answer: (ctx) => {
      const n = ctx.data.devis.filter((d) =>
        ["envoye", "en_attente", "en_retard"].includes(getDevisDisplayStatut(d)),
      ).length;
      return { text: `Vous avez ${n} devis envoyé(s) en attente de réponse.` };
    },
  },
  {
    id: "devis_signed",
    domain: "devis",
    actionType: "answer",
    priority: 98,
    confidence: 0.88,
    patterns: [/devis.*sign/, /sign.*devis/, /devis.*accept/],
    keywords: ["devis", "signés", "signé", "acceptés"],
    answer: (ctx) => {
      const n = ctx.data.devis.filter((d) =>
        ["signe", "accepte"].includes(getDevisDisplayStatut(d)),
      ).length;
      return { text: `Vous avez ${n} devis signé(s) ou accepté(s).` };
    },
  },
  {
    id: "devis_refused",
    domain: "devis",
    actionType: "answer",
    priority: 95,
    confidence: 0.86,
    patterns: [/devis.*refus/],
    keywords: ["devis", "refusés", "refusé"],
    answer: (ctx) => {
      const n = ctx.data.devis.filter((d) => getDevisDisplayStatut(d) === "refuse").length;
      return { text: `Vous avez ${n} devis refusé(s).` };
    },
  },
  {
    id: "devis_expired",
    domain: "devis",
    actionType: "answer",
    priority: 95,
    confidence: 0.86,
    patterns: [/devis.*expir/, /expir.*devis/],
    keywords: ["devis", "expirés", "expiré"],
    answer: (ctx) => {
      const n = ctx.data.devis.filter((d) => getDevisDisplayStatut(d) === "expire").length;
      return { text: `Vous avez ${n} devis expiré(s).` };
    },
  },
  {
    id: "devis_total_amount",
    domain: "devis",
    actionType: "answer",
    priority: 88,
    confidence: 0.85,
    patterns: [/montant.*devis/, /total.*devis/, /ca.*devis/],
    keywords: ["montant", "total", "devis", "ca"],
    answer: (ctx) => {
      const total = ctx.data.devis.reduce((s, d) => s + devisTotal(d), 0);
      return { text: `Le montant total de vos devis est de ${formatCurrency(total)}.` };
    },
  },
  {
    id: "search_devis",
    domain: "devis",
    actionType: "answer",
    priority: 105,
    confidence: 0.9,
    patterns: [/ouvr.*devis/, /affiche.*devis/, /\bdevis\s+d?-?\d{4,}/i, /cherch.*devis/],
    keywords: ["ouvrir", "devis", "chercher", "numéro"],
    answer: (ctx) => {
      const num = ctx.message.match(/\bD?-?\d{4,}\b/i)?.[0];
      const devis = num
        ? ctx.data.devis.find((d) => d.numero.includes(num))
        : ctx.data.devis[0];
      if (!devis) {
        return { text: "Je n'ai pas trouvé ce devis. Indiquez le numéro.", navigateTo: "/devis" };
      }
      return {
        text: `Devis ${devis.numero} — ${devis.titre} (${formatCurrency(devisTotal(devis))}) pour ${clientName(ctx.data, devis.clientId)}.`,
        navigateTo: `/devis/${devis.id}`,
      };
    },
  },
  {
    id: "create_devis",
    domain: "devis",
    actionType: "prepare_action",
    priority: 95,
    confidence: 0.9,
    patterns: [/cr[eé]e.*devis/, /nouveau devis/, /pr[eé]par.*devis/, /fais.*devis/, /devis.*salle de bain/, /devis.*placo/],
    keywords: ["créer", "devis", "préparer", "nouveau"],
  },
  {
    id: "prepare_email",
    domain: "devis",
    actionType: "prepare_action",
    priority: 100,
    confidence: 0.88,
    patterns: [/mail/, /email/, /pr[eé]par.*mail/, /relanc.*mail/],
    keywords: ["mail", "email", "relance", "message"],
    needsAi: true,
  },
];
