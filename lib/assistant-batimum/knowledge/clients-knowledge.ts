import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";
import {
  bestClientByDevis,
  clientsWithoutDevis,
  extractQuery,
  findClients,
  listDevisToRelance,
} from "@/lib/assistant-batimum/knowledge/helpers";
import { extractClientName } from "@/lib/assistant-batimum/assistant-cleaners";
import { getClientDisplayName } from "@/lib/clients";

export const CLIENTS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "search_client",
    domain: "clients",
    actionType: "answer",
    priority: 100,
    confidence: 0.88,
    patterns: [/cherch.*client/, /trouv.*client/, /^client\s+[a-z]/i, /^cherche\s+[a-z]/i],
    keywords: ["chercher", "trouver", "client", "cherche"],
    answer: (ctx) => {
      const q = extractQuery(ctx.message, ["chercher", "cherche", "trouve", "trouver", "client"]);
      const matches = findClients(ctx.data, q);
      if (!matches.length) {
        return { text: q ? `Je n'ai pas trouvé de client « ${q} ».` : "Quel client souhaitez-vous retrouver ?" };
      }
      if (matches.length === 1) {
        const c = matches[0];
        const n = ctx.data.devis.filter((d) => d.clientId === c.id).length;
        return { text: `${getClientDisplayName(c)} — ${n} devis associé(s).`, navigateTo: "/clients" };
      }
      return {
        text: `${matches.length} clients trouvés :\n${matches.slice(0, 5).map((c) => `• ${getClientDisplayName(c)}`).join("\n")}`,
        navigateTo: "/clients",
      };
    },
  },
  {
    id: "best_client",
    domain: "clients",
    actionType: "answer",
    priority: 90,
    confidence: 0.88,
    patterns: [/meilleur.*client/, /top client/, /client.*plus de devis/, /client.*devis/],
    keywords: ["meilleur", "client", "top", "devis"],
    answer: (ctx) => {
      const top = bestClientByDevis(ctx.data);
      if (!top?.client) {
        return { text: "Je ne peux pas répondre précisément car aucun devis n'est encore enregistré." };
      }
      return {
        text: `Le client avec le plus de devis est ${getClientDisplayName(top.client)} (${top.count} devis).`,
      };
    },
  },
  {
    id: "clients_without_devis",
    domain: "clients",
    actionType: "answer",
    priority: 85,
    confidence: 0.86,
    patterns: [/client.*sans devis/, /sans devis/],
    keywords: ["clients", "sans", "devis"],
    answer: (ctx) => {
      const list = clientsWithoutDevis(ctx.data);
      if (!list.length) {
        return { text: "Tous vos clients ont au moins un devis." };
      }
      return {
        text: `${list.length} client(s) sans devis : ${list.slice(0, 5).map((c) => getClientDisplayName(c)).join(", ")}.`,
      };
    },
  },
  {
    id: "clients_to_follow_up",
    domain: "clients",
    actionType: "answer",
    priority: 84,
    confidence: 0.85,
    patterns: [/client.*relanc/, /clients? a relancer/],
    keywords: ["clients", "relancer", "relance"],
    answer: (ctx) => {
      const devis = listDevisToRelance(ctx.data);
      const clientIds = [...new Set(devis.map((d) => d.clientId))];
      if (!clientIds.length) {
        return { text: "Aucun client à relancer pour le moment." };
      }
      const names = clientIds
        .slice(0, 5)
        .map((id) => getClientDisplayName(ctx.data.clients.find((c) => c.id === id)));
      return { text: `Clients à relancer : ${names.join(", ")}.` };
    },
  },
  {
    id: "clients_recent",
    domain: "clients",
    actionType: "answer",
    priority: 82,
    confidence: 0.84,
    patterns: [/client.*recent/, /nouveau.*client/, /dernier.*client/],
    keywords: ["clients", "récents", "nouveaux", "derniers"],
    answer: (ctx) => {
      const recent = [...ctx.data.clients]
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 5);
      if (!recent.length) {
        return { text: "Aucun client enregistré pour le moment." };
      }
      return {
        text: `Clients récents : ${recent.map((c) => getClientDisplayName(c)).join(", ")}.`,
      };
    },
  },
  {
    id: "create_client",
    domain: "clients",
    actionType: "prepare_action",
    priority: 95,
    confidence: 0.9,
    patterns: [/cr[eé]e.*client/, /cr[eé] client/, /nouveau client/, /ajoute.*client/, /j.aimerais.*client/, /je veux.*client/, /peux.*client/],
    keywords: ["créer", "crée", "client", "ajouter", "nouveau", "veux", "aimerais"],
  },
  {
    id: "open_client",
    domain: "clients",
    actionType: "answer",
    priority: 88,
    confidence: 0.86,
    patterns: [/ouvr.*client/, /affiche.*client/, /fiche client/],
    keywords: ["ouvrir", "affiche", "fiche", "client"],
    answer: (ctx) => {
      const fromMessage = extractClientName(ctx.message);
      const q = fromMessage || extractQuery(ctx.message, ["ouvrir", "ouvre", "affiche", "fiche", "client"]);
      const matches = findClients(ctx.data, q);
      if (!matches.length) {
        return { text: q ? `Je n'ai pas trouvé le client « ${q} ».` : "Indiquez le nom du client à ouvrir.", navigateTo: "/clients" };
      }
      const c = matches[0];
      return {
        text: `Client ${getClientDisplayName(c)} — ouverture de la fiche.`,
        navigateTo: "/clients",
      };
    },
  },
];
