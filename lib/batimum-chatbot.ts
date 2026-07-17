import { getClientDisplayName } from "@/lib/clients";
import { devisTotal } from "@/lib/data";
import { getDevisDisplayStatut } from "@/lib/devis-statut";
import { isFacturePayee } from "@/lib/facture-statut";
import {
  buildTodayMenuItems,
  countTodayActionItems,
} from "@/lib/batimum-today-menu";
import {
  buildChantiersRentabilite,
  computeMonthlyPilotageKpis,
} from "@/lib/pilotage/calculations";
import { computeEmployePerformance } from "@/lib/pilotage/analytics";
import { calculateSaasMetrics } from "@/lib/saas-calculations";
import type {
  AssistantParseResult,
  AssistantProposedAction,
} from "@/lib/batimum-assistant-parser";
import { parseAssistantMessage } from "@/lib/batimum-assistant-parser";
import { processAssistantBrainTurn } from "@/lib/assistant-batimum";
import {
  classifyUserMessage,
  isNotYetAvailableAction,
} from "@/lib/batimum-message-classifier";
import { replyAck } from "@/lib/batimum-assistant-signals";
import { understandNaturalLanguage } from "@/lib/batimum-nlu";
import type { AppData, Client, Devis, TypeChantier } from "@/lib/types";
import { formatCurrency, generateId } from "@/lib/utils";

export type ChatMessageRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
};

export type ChatbotPendingConfirmation = {
  title: string;
  summary: string;
  actionIds: string[];
  parseResult: AssistantParseResult;
  actions: AssistantProposedAction[];
};

export type ChatbotTurnResult = {
  reply: string;
  suggestions?: string[];
  pendingConfirmation?: ChatbotPendingConfirmation;
  navigateTo?: string;
};

const WELCOME_SUGGESTIONS = [
  "Combien ai-je gagné ce mois ?",
  "Quels devis relancer ?",
  "Prépare un devis salle de bain",
  "Ajoute un rendez-vous demain à 14h",
  "Chantiers en retard",
];

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extractTime(text: string): string | undefined {
  const match = text.match(/\b(\d{1,2})[:h](\d{2})?\b/);
  if (!match) return undefined;
  const h = Math.min(23, Number(match[1]));
  const m = match[2] ? Math.min(59, Number(match[2])) : 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function findClientByName(data: AppData, query?: string): Client | undefined {
  if (!query) return undefined;
  const q = normalize(query);
  return data.clients.find((client) => {
    const display = normalize(getClientDisplayName(client));
    return (
      display.includes(q) ||
      normalize(client.nom ?? "").includes(q) ||
      normalize(client.prenom ?? "").includes(q)
    );
  });
}

function findDevisByQuery(data: AppData, text: string): Devis | undefined {
  const normalized = normalize(text);
  return (
    data.devis.find((d) => normalized.includes(normalize(d.numero))) ??
    data.devis.find((d) => {
      const client = data.clients.find((c) => c.id === d.clientId);
      const name = client ? normalize(getClientDisplayName(client)) : "";
      return name && normalized.includes(name);
    })
  );
}

function matchIntent(text: string): string {
  const n = normalize(text);
  if (/^(bonjour|salut|hello|coucou)\b/.test(n)) return "greeting";
  if (/^(merci|thanks|remercie|bcp|merci beaucoup)/.test(n)) return "thanks";
  if (/^(ok|parfait|nickel|d'?accord|compris|super)\s*[!?.]*$/.test(n)) return "ack";
  if (/aide|que peux|comment utiliser|que sais tu/.test(n)) return "help";
  if (/ouvr|ouvre|affiche.*client|fiche client/.test(n)) return "open_client";
  if (/ouvr|ouvre.*devis|affiche.*devis/.test(n)) return "open_devis";
  if (/gagn[eé]|ca |chiffre d.affaires|combien.*mois|revenu/.test(n)) return "stats_ca";
  if (/impay|facture.*retard|encours/.test(n)) return "stats_impayes";
  if (/devis.*relanc|relanc.*devis|devis en attente/.test(n)) return "devis_relancer";
  if (/chantier.*retard|retard.*chantier/.test(n)) return "chantiers_retard";
  if (/meilleur.*client|top client|clients.*rentable/.test(n)) return "meilleurs_clients";
  if (/meilleur.*salari|employ[eé].*rentable|top employ/.test(n)) return "meilleurs_employes";
  if (/rentabilit|marge.*chantier|analys.*chantier/.test(n)) return "rentabilite";
  if (/compar.*devis/.test(n)) return "compare_devis";
  if (/retrouv|cherch.*devis|cherch.*facture|document/.test(n)) return "find_document";
  if (/mail|email|message.*client/.test(n)) return "mail_prepare";
  if (/relanc.*monsieur|relanc.*madame|relanc.*client|relance/.test(n)) return "relance";
  if (/mat[eé]riel|liste.*fourniture|commande fournisseur/.test(n)) return "materiel";
  if (/d[eé]plac.*rdv|d[eé]plac.*rendez|modifier.*planning|d[eé]caler/.test(n)) return "move_rdv";
  if (/cr[eé]e.*client|nouveau client|ajoute.*client/.test(n)) return "create_client";
  if (/cr[eé]e.*chantier|nouveau chantier/.test(n)) return "create_chantier";
  if (/cr[eé]e.*devis|pr[eé]par.*devis|devis.*salle|devis.*cuisine/.test(n)) return "create_devis";
  if (/cr[eé]e.*facture|nouvelle facture/.test(n)) return "create_facture";
  if (/cr[eé]e.*salari|nouvel employ|nouveau employ|nouvel employe|ajoute.*employ/.test(n)) return "create_employe";
  if (/rdv|rendez-vous|rendez vous|planning|ajoute.*rendez/.test(n)) return "create_rdv";
  if (/statistique|tableau de bord|r[eé]sum[eé] activit/.test(n)) return "stats_overview";
  if (/aujourd.hui|alerte|priorit/.test(n)) return "today_summary";
  if (/^(?:ca va|ça va|comment ca va|comment ça va)\s*\??$/.test(n)) return "conversation";
  if (/^(?:bonne journee|bonne journée|bonne soiree|bonne soirée|a bientot|à bientôt|a demain|à demain|au revoir)\b/.test(n)) return "conversation";
  return "unrecognized";
}

function buildConfirmation(
  parseResult: AssistantParseResult,
  title: string,
  summary: string,
): ChatbotPendingConfirmation {
  return {
    title,
    summary,
    actionIds: parseResult.actions.filter((a) => a.enabled).map((a) => a.id),
    parseResult,
    actions: parseResult.actions,
  };
}

function replyDevisARelancer(data: AppData): string {
  const list = data.devis.filter((d) =>
    ["envoye", "en_attente", "en_retard"].includes(getDevisDisplayStatut(d)),
  );
  if (list.length === 0) {
    return "Aucun devis n'est à relancer pour le moment. Tous vos devis envoyés sont encore dans un délai correct, ou aucun devis envoyé n'est en attente.";
  }
  const lines = list.slice(0, 6).map((d) => {
    const client = data.clients.find((c) => c.id === d.clientId);
    return `• ${d.titre || d.numero} — ${getClientDisplayName(client)} (${formatCurrency(devisTotal(d))})`;
  });
  const extra = list.length > 6 ? `\n… et ${list.length - 6} autre(s).` : "";
  return `${list.length} devis à relancer :\n${lines.join("\n")}${extra}`;
}

function replyChantiersRetard(data: AppData): string {
  const list = data.chantiers.filter((c) =>
    ["en_retard", "retard_demarrage"].includes(c.statut),
  );
  if (list.length === 0) {
    return "Aucun chantier n'est en retard pour le moment. Vos chantiers suivent le planning prévu.";
  }
  return `${list.length} chantier(s) en retard :\n${list
    .slice(0, 6)
    .map((c) => `• ${c.nom}`)
    .join("\n")}`;
}

function replyStatsCa(data: AppData, referenceDate: Date): string {
  const metrics = calculateSaasMetrics(data, referenceDate);
  const kpis = computeMonthlyPilotageKpis(data, referenceDate);
  const objectif = data.parametres.objectifCaMensuel ?? 15000;
  const pct =
    objectif > 0
      ? Math.round((metrics.chiffreAffairesMensuel / objectif) * 100)
      : 0;
  return `Ce mois-ci, votre CA encaissé est de ${formatCurrency(metrics.chiffreAffairesMensuel)} (${pct} % de l'objectif de ${formatCurrency(objectif)}).\n\nVotre bénéfice estimé du mois est de ${formatCurrency(kpis.beneficeReelMois)}. Si vous voulez, je peux aussi analyser la marge ou la rentabilité de vos chantiers.`;
}

function replyImpayes(data: AppData): string {
  const impayees = data.factures.filter((f) => !isFacturePayee(f));
  const total = impayees.reduce((s, f) => s + (f.montantTTC ?? 0), 0);
  if (impayees.length === 0) {
    return "Toutes vos factures sont réglées. Aucun impayé en cours pour le moment.";
  }
  return `${impayees.length} facture(s) impayée(s) pour un total de ${formatCurrency(total)}. Souhaitez-vous que j'ouvre la liste des factures ?`;
}

function replyMeilleursClients(data: AppData): string {
  const byClient = new Map<string, number>();
  for (const f of data.factures.filter((x) => x.statut === "payee")) {
    byClient.set(f.clientId, (byClient.get(f.clientId) ?? 0) + (f.montantTTC ?? 0));
  }
  const sorted = [...byClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (sorted.length === 0) return "Pas encore assez de factures payées pour classer vos clients.";
  return `Vos meilleurs clients (CA encaissé) :\n${sorted
    .map(([id, ca]) => {
      const client = data.clients.find((c) => c.id === id);
      return `• ${getClientDisplayName(client)} — ${formatCurrency(ca)}`;
    })
    .join("\n")}`;
}

function replyMeilleursEmployes(data: AppData): string {
  const perf = computeEmployePerformance(data)
    .filter((p) => p.heuresTravaillees > 0)
    .sort((a, b) => b.chantiersRentables - a.chantiersRentables)
    .slice(0, 5);
  if (perf.length === 0) {
    return "Aucun pointage enregistré — renseignez les heures chantier pour analyser vos salariés.";
  }
  return `Salariés les plus rentables :\n${perf
    .map(
      (p) =>
        `• ${p.employe.prenom} ${p.employe.nom} — ${p.chantiersRentables} chantier(s) rentable(s)`,
    )
    .join("\n")}`;
}

function replyRentabilite(data: AppData): string {
  const classements = buildChantiersRentabilite(data)
    .filter((c) => c.rentabilite.fiabilite !== "non_calculable")
    .sort((a, b) => b.rentabilite.margeReelle - a.rentabilite.margeReelle)
    .slice(0, 5);
  if (classements.length === 0) {
    return "Pas assez de données pour calculer la rentabilité. Liez des devis à vos chantiers et saisissez achats / pointages.";
  }
  return `Rentabilité chantiers (top 5) :\n${classements
    .map(
      (c) =>
        `• ${c.chantier.nom} — marge ${formatCurrency(c.rentabilite.margeReelle)} (${c.rentabilite.tauxMargeReelle.toFixed(0)} %)`,
    )
    .join("\n")}`;
}

function replyCompareDevis(data: AppData, text: string): string {
  const numbers = text.match(/\bD?-?\d{4,}\b/gi);
  if (!numbers || numbers.length < 2) {
    return "Indiquez deux numéros de devis à comparer, par ex. « Compare devis DEV-2026-001 et DEV-2026-002 ».";
  }
  const a = data.devis.find((d) => d.numero.includes(numbers[0]));
  const b = data.devis.find((d) => d.numero.includes(numbers[1]));
  if (!a || !b) return "Je n'ai pas trouvé les deux devis demandés.";
  const totalA = devisTotal(a);
  const totalB = devisTotal(b);
  const diff = totalB - totalA;
  return `Comparaison :\n• ${a.numero} — ${formatCurrency(totalA)}\n• ${b.numero} — ${formatCurrency(totalB)}\nÉcart : ${diff >= 0 ? "+" : ""}${formatCurrency(diff)}`;
}

function replyFindDocument(data: AppData, text: string): string {
  const devis = findDevisByQuery(data, text);
  if (devis) {
    return `Devis trouvé : ${devis.numero} — ${devis.titre} (${formatCurrency(devisTotal(devis))}). Ouvrez-le depuis Devis.`;
  }
  const client = findClientByName(data, text.replace(/client|chercher|trouve/gi, ""));
  if (client) {
    const count = data.devis.filter((d) => d.clientId === client.id).length;
    return `Client : ${getClientDisplayName(client)} — ${count} devis associé(s).`;
  }
  return "Je n'ai pas trouvé de document correspondant. Précisez un numéro de devis ou un nom de client.";
}

function replyMailRelance(data: AppData, text: string): string {
  const client = findClientByName(data, text);
  if (!client?.email) {
    return "Je n'ai pas identifié le client ou son email. Précisez « Relance Monsieur Martin » avec un client enregistré.";
  }
  const impayee = data.factures.find(
    (f) => f.clientId === client.id && !isFacturePayee(f),
  );
  const body = impayee
    ? `Bonjour ${getClientDisplayName(client)},\n\nSauf erreur, la facture ${impayee.numero} d'un montant de ${formatCurrency(impayee.montantTTC ?? 0)} reste en attente de règlement.\n\nMerci de votre retour.\n\nCordialement`
    : `Bonjour ${getClientDisplayName(client)},\n\nJe me permets de revenir vers vous concernant notre dernier échange.\n\nCordialement`;
  return `Brouillon de mail pour ${getClientDisplayName(client)} (${client.email}) :\n\n${body}`;
}

function replyMateriel(text: string, data: AppData): string {
  const parsed = parseAssistantMessage(text, data);
  const items = parsed.materielEstime ?? [];
  if (items.length === 0) {
    return "Décrivez le type de travaux (salle de bain, placo, cuisine…) pour une liste matériel indicative.";
  }
  return `Liste matériel indicative :\n${items.map((i) => `• ${i}`).join("\n")}\n\nÀ adapter selon votre chantier.`;
}

function replyTodaySummary(data: AppData): string {
  const items = buildTodayMenuItems(data);
  const count = countTodayActionItems(items);
  if (count === 0) return items[0]?.label ?? "Rien d'urgent aujourd'hui.";
  return `Priorités du jour (${count}) :\n${items
    .filter((i) => i.id !== "all-clear")
    .map((i) => `• ${i.label}`)
    .join("\n")}`;
}

function replyStatsOverview(data: AppData, referenceDate: Date): string {
  const metrics = calculateSaasMetrics(data, referenceDate);
  const kpis = computeMonthlyPilotageKpis(data, referenceDate);
  return `Vue d'ensemble :\n• ${metrics.totalClients} clients\n• ${metrics.totalDevis} devis (${metrics.devisSigne} signés)\n• ${metrics.chantiersActifs} chantiers actifs\n• CA mensuel ${formatCurrency(metrics.chiffreAffairesMensuel)}\n• Bénéfice estimé ${formatCurrency(kpis.beneficeReelMois)}`;
}

function enhanceParseForIntent(
  text: string,
  data: AppData,
  intent: string,
  referenceDate: Date,
): AssistantParseResult {
  const base = parseAssistantMessage(text, data, referenceDate);

  if (intent === "create_rdv") {
    const time = extractTime(text);
    const heureDebut = time ?? "14:00";
    const [h, m] = heureDebut.split(":").map(Number);
    const endH = Math.min(23, h + 2);
    const heureFin = `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    base.actions = base.actions.map((action) => {
      if (action.type !== "planning") return action;
      return {
        ...action,
        label: `Créer rendez-vous le ${action.payload.date as string} à ${heureDebut}`,
        payload: { ...action.payload, heureDebut, heureFin },
      };
    });
    if (!base.actions.some((a) => a.type === "planning")) {
      const date = base.dateRdv ?? new Date(referenceDate.getTime() + 86400000).toISOString().slice(0, 10);
      base.actions.push({
        id: generateId(),
        type: "planning",
        label: `Créer rendez-vous le ${date} à ${heureDebut}`,
        enabled: true,
        payload: {
          date,
          titre: `RDV — ${base.clientNom ?? "Client"}`,
          heureDebut,
          heureFin,
          type: "rendez_vous_client",
        },
      });
    }
    base.actions = base.actions.filter((a) =>
      ["planning", "client", "chantier"].includes(a.type),
    );
  }

  if (intent === "create_devis") {
    base.actions = base.actions.filter((a) =>
      ["devis", "client", "chantier", "materiel"].includes(a.type),
    );
  }

  if (intent === "create_chantier") {
    base.actions = base.actions.filter((a) =>
      ["chantier", "client"].includes(a.type),
    );
  }

  if (intent === "create_client") {
    const nlu = understandNaturalLanguage(text);
    const nom = nlu.entities.clientName ?? base.clientNom ?? "Nouveau client";
    base.actions = [
      {
        id: generateId(),
        type: "client",
        label: `Créer le client ${nom}`,
        enabled: true,
        payload: { nom, prenom: nom },
      },
    ];
  }

  if (intent === "create_employe") {
    return { ...base, actions: [] };
  }

  if (intent === "create_facture") {
    const client = findClientByName(data, text) ?? data.clients[0];
    base.actions = [
      {
        id: generateId(),
        type: "facture",
        label: client
          ? `Préparer une facture pour ${getClientDisplayName(client)}`
          : "Ouvrir la création de facture",
        enabled: true,
        payload: { clientId: client?.id, navigateOnly: !client },
      },
    ];
  }

  if (intent === "create_employe") {
    const nameMatch = text.match(/salari[eé]\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]+)/i);
    base.actions = [
      {
        id: generateId(),
        type: "employe",
        label: `Créer l'employé ${nameMatch?.[1] ?? "nouveau"}`,
        enabled: true,
        payload: {
          prenom: nameMatch?.[1] ?? "Nouveau",
          nom: "Employé",
        },
      },
    ];
  }

  if (intent === "relance") {
    const client = findClientByName(data, text);
    base.actions = [
      {
        id: generateId(),
        type: "relance",
        label: client
          ? `Préparer une relance pour ${getClientDisplayName(client)}`
          : "Préparer une relance client",
        enabled: true,
        payload: { clientId: client?.id, clientNom: client ? getClientDisplayName(client) : undefined },
      },
    ];
  }

  return base;
}

function replyOpenClient(data: AppData, text: string): ChatbotTurnResult {
  const query = text.replace(/ouvr|ouvre|affiche|fiche|client/gi, "").trim();
  const matches = data.clients.filter((client) => {
    const display = normalize(getClientDisplayName(client));
    const q = normalize(query);
    return q.length >= 2 && (display.includes(q) || normalize(client.nom).includes(q));
  });
  if (matches.length === 0) {
    return {
      reply: query
        ? `Je n'ai pas trouvé de client correspondant à « ${query.trim()} ».`
        : "Quel client souhaitez-vous ouvrir ?",
    };
  }
  if (matches.length > 1) {
    const lines = matches
      .slice(0, 5)
      .map((c, i) => `${i + 1}. ${getClientDisplayName(c)}`)
      .join("\n");
    return {
      reply: `J'ai trouvé plusieurs clients :\n${lines}\n\nPrécisez lequel ouvrir.`,
      navigateTo: "/clients",
    };
  }
  const client = matches[0];
  return {
    reply: `J'ouvre la fiche de ${getClientDisplayName(client)}.`,
    navigateTo: "/clients",
  };
}

function replyOpenDevis(data: AppData, text: string): ChatbotTurnResult {
  const devis = findDevisByQuery(data, text);
  if (!devis) {
    return {
      reply: "Je n'ai pas trouvé ce devis. Indiquez le numéro (ex. DEV-2026-004).",
      navigateTo: "/devis",
    };
  }
  return {
    reply: `J'ouvre le devis ${devis.numero} — ${devis.titre}.`,
    navigateTo: `/devis/${devis.id}`,
  };
}

export function getChatbotWelcomeMessage(name: string): ChatbotTurnResult {
  return {
    reply: `Bonjour ${name} ! Je suis votre assistant Batimum. Posez-moi une question sur votre activité ou demandez-moi d'agir : créer un client, un devis, un rendez-vous, analyser la rentabilité…`,
    suggestions: WELCOME_SUGGESTIONS,
  };
}

function normalizeActionIntent(actionKey: string): string {
  const map: Record<string, string> = {
    show_unpaid: "stats_impayes",
    search_client: "find_document",
    mail_prepare: "mail_prepare",
  };
  return map[actionKey] ?? actionKey;
}

export function processChatMessage(
  text: string,
  data: AppData,
  referenceDate = new Date(),
  options?: { skipBrain?: boolean },
): ChatbotTurnResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { reply: "Écrivez votre demande en langage naturel." };
  }

  if (!options?.skipBrain) {
    const brain = processAssistantBrainTurn(trimmed, data, {}, referenceDate);
    if (brain.handled && brain.reply) {
      return {
        reply: brain.reply,
        suggestions: brain.suggestions,
        pendingConfirmation: brain.pendingConfirmation,
        navigateTo: brain.navigateTo,
      };
    }
  }

  const classified = classifyUserMessage(trimmed);

  if (classified.route) {
    const route = classified.route;

    if (route.reply && route.intent !== "incompris") {
      return {
        reply: route.reply,
        suggestions:
          route.intent === "conversation_simple" ? WELCOME_SUGGESTIONS : undefined,
      };
    }
  }

  if (
    classified.category === "conversation" ||
    classified.category === "off_topic" ||
    classified.category === "unrecognized"
  ) {
    return {
      reply: classified.reply ?? "Je suis là pour vous aider.",
      suggestions:
        classified.category === "unrecognized" ? WELCOME_SUGGESTIONS : undefined,
    };
  }

  if (classified.category === "btp_question" && classified.reply) {
    return { reply: classified.reply };
  }

  if (
    classified.category === "batimum_action" &&
    classified.actionIntent &&
    isNotYetAvailableAction(classified.actionIntent)
  ) {
    return { reply: classified.reply ?? "Cette fonctionnalité n'est pas encore disponible." };
  }

  const intent = normalizeActionIntent(classified.actionIntent ?? matchIntent(trimmed));

  switch (intent) {
    case "conversation":
      return {
        reply:
          classified.reply ??
          "Je suis là pour vous aider. Que souhaitez-vous faire ?",
      };
    case "thanks":
      return { reply: "Avec plaisir.", suggestions: WELCOME_SUGGESTIONS };
    case "ack":
      return { reply: replyAck(), suggestions: WELCOME_SUGGESTIONS };
    case "open_client":
      return replyOpenClient(data, trimmed);
    case "open_devis":
      return replyOpenDevis(data, trimmed);
    case "greeting":
      return {
        reply: "Bonjour ! Comment puis-je vous aider sur votre activité aujourd'hui ?",
        suggestions: WELCOME_SUGGESTIONS,
      };
    case "help":
      return {
        reply:
          "Je peux répondre sur vos chiffres, lister les devis à relancer, les chantiers en retard, préparer des devis ou RDV, et exécuter des actions après votre confirmation.",
        suggestions: WELCOME_SUGGESTIONS,
      };
    case "stats_ca":
      return { reply: replyStatsCa(data, referenceDate) };
    case "stats_impayes":
      return { reply: replyImpayes(data) };
    case "devis_relancer":
      return { reply: replyDevisARelancer(data), navigateTo: "/devis" };
    case "chantiers_retard":
      return { reply: replyChantiersRetard(data), navigateTo: "/chantiers" };
    case "meilleurs_clients":
      return { reply: replyMeilleursClients(data) };
    case "meilleurs_employes":
      return { reply: replyMeilleursEmployes(data), navigateTo: "/pilotage" };
    case "rentabilite":
      return { reply: replyRentabilite(data), navigateTo: "/pilotage" };
    case "compare_devis":
      return { reply: replyCompareDevis(data, trimmed) };
    case "find_document":
      return { reply: replyFindDocument(data, trimmed) };
    case "mail_prepare":
    case "relance":
      if (intent === "relance" && /cr[eé]e|pr[eé]par|fais|lance/.test(normalize(trimmed))) {
        const parsed = enhanceParseForIntent(trimmed, data, "relance", referenceDate);
        if (parsed.actions.length > 0) {
          return {
            reply: "Je peux préparer cette relance. Confirmez l'action ci-dessous.",
            pendingConfirmation: buildConfirmation(
              parsed,
              "Confirmer la relance",
              replyMailRelance(data, trimmed),
            ),
          };
        }
      }
      return { reply: replyMailRelance(data, trimmed) };
    case "materiel":
      return { reply: replyMateriel(trimmed, data) };
    case "stats_overview":
      return { reply: replyStatsOverview(data, referenceDate) };
    case "today_summary":
      return { reply: replyTodaySummary(data) };
    case "move_rdv":
      return {
        reply:
          "Pour déplacer un rendez-vous, ouvrez le Planning et modifiez l'événement. Indiquez-moi la date souhaitée si vous voulez que je crée un nouveau créneau.",
        navigateTo: "/planning",
      };
    case "create_client":
    case "create_chantier":
    case "create_devis":
    case "create_facture":
    case "create_employe":
    case "create_rdv": {
      const parsed = enhanceParseForIntent(trimmed, data, intent, referenceDate);
      if (parsed.actions.length === 0) {
        return {
          reply:
            "Je n'ai pas suffisamment compris les détails de votre demande. Pouvez-vous préciser ?",
          suggestions: WELCOME_SUGGESTIONS,
        };
      }
      const actionLabels = parsed.actions.map((a) => `• ${a.label}`).join("\n");
      return {
        reply: `Voici ce que je propose :\n${actionLabels}\n\nConfirmez pour exécuter.`,
        pendingConfirmation: buildConfirmation(
          parsed,
          "Confirmer les actions",
          actionLabels,
        ),
      };
    }
    case "unrecognized":
    default:
      return {
        reply:
          classified.reply ??
          "Je n'ai pas suffisamment compris votre demande pour agir.\n\nVous pouvez par exemple me demander de créer un client, préparer un devis, consulter vos chiffres ou lister les devis à relancer.",
        suggestions: WELCOME_SUGGESTIONS,
      };
  }
}

export { WELCOME_SUGGESTIONS };
