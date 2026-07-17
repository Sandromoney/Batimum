import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";
import { isFacturePayee, isFactureOverdue } from "@/lib/facture-statut";
import { clientName } from "@/lib/assistant-batimum/knowledge/helpers";
import { formatCurrency } from "@/lib/utils";

export const FACTURES_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "show_unpaid_invoices",
    domain: "factures",
    actionType: "answer",
    priority: 130,
    confidence: 0.95,
    patterns: [/impay/, /facture.*retard/, /quelles? factures.*impay/, /combien.*facture.*impay/],
    keywords: ["impayées", "impayé", "factures", "impayés"],
    answer: (ctx) => {
      const impayees = ctx.data.factures.filter((f) => !isFacturePayee(f));
      const total = impayees.reduce((s, f) => s + (f.montantTTC ?? 0), 0);
      if (!impayees.length) {
        return { text: "Aucune facture impayée pour le moment." };
      }
      return {
        text: `Vous avez ${impayees.length} facture(s) impayée(s) pour un total de ${formatCurrency(total)}.`,
        navigateTo: "/factures",
      };
    },
  },
  {
    id: "invoices_paid",
    domain: "factures",
    actionType: "answer",
    priority: 100,
    confidence: 0.88,
    patterns: [/factures? pay/, /paye.*facture/],
    keywords: ["factures", "payées", "payés"],
    answer: (ctx) => {
      const payees = ctx.data.factures.filter((f) => isFacturePayee(f));
      const total = payees.reduce((s, f) => s + (f.montantTTC ?? 0), 0);
      return {
        text: `${payees.length} facture(s) payée(s) pour un total de ${formatCurrency(total)}.`,
      };
    },
  },
  {
    id: "invoices_overdue",
    domain: "factures",
    actionType: "answer",
    priority: 105,
    confidence: 0.9,
    patterns: [/facture.*retard/, /en retard.*facture/],
    keywords: ["factures", "retard", "échues"],
    answer: (ctx) => {
      const overdue = ctx.data.factures.filter((f) => isFactureOverdue(f));
      if (!overdue.length) {
        return { text: "Aucune facture en retard." };
      }
      return { text: `${overdue.length} facture(s) en retard.`, navigateTo: "/factures" };
    },
  },
  {
    id: "search_facture",
    domain: "factures",
    actionType: "answer",
    priority: 95,
    confidence: 0.86,
    patterns: [/ouvr.*facture/, /cherch.*facture/, /\bfacture\s+f?-?\d+/i],
    keywords: ["facture", "ouvrir", "chercher"],
    answer: (ctx) => {
      const num = ctx.message.match(/\bF?-?\d{4,}\b/i)?.[0];
      const f = num ? ctx.data.factures.find((x) => x.numero?.includes(num)) : undefined;
      if (!f) {
        return { text: "Indiquez le numéro de facture.", navigateTo: "/factures" };
      }
      return {
        text: `Facture ${f.numero} — ${formatCurrency(f.montantTTC ?? 0)} (${isFacturePayee(f) ? "payée" : "impayée"}) pour ${clientName(ctx.data, f.clientId)}.`,
        navigateTo: "/factures",
      };
    },
  },
  {
    id: "create_facture",
    domain: "factures",
    actionType: "prepare_action",
    priority: 90,
    confidence: 0.88,
    patterns: [/cr[eé]e.*facture/, /nouvelle facture/],
    keywords: ["créer", "facture", "nouvelle"],
    unavailable: true,
    unavailableReply:
      "J'ai compris que vous souhaitez créer une facture. Cette action n'est pas encore disponible via l'assistant.",
  },
];
