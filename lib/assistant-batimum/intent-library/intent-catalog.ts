/**
 * Catalogue d'intentions Batimum — 250+ intentions structurées.
 * Chaque intention est enrichie par le générateur de formulations.
 */
export type IntentCatalogEntry = {
  id: string;
  domain: string;
  actionType: "answer" | "prepare_action" | "refuse";
  entity?: keyof typeof import("@/lib/assistant-batimum/intent-library/synonym-banks").ENTITY_LABELS;
  templates: string[];
  /** Variantes générées automatiquement */
  generate?: "count" | "list" | "create" | "search" | "analyze" | "advice" | "navigate";
};

function countIntents(entity: string, domain: string): IntentCatalogEntry {
  return {
    id: `count_${entity}`,
    domain,
    actionType: "answer",
    entity: entity as IntentCatalogEntry["entity"],
    templates: [],
    generate: "count",
  };
}

function listIntents(id: string, domain: string, entity: string): IntentCatalogEntry {
  return {
    id,
    domain,
    actionType: "answer",
    entity: entity as IntentCatalogEntry["entity"],
    templates: [],
    generate: "list",
  };
}

function createIntent(id: string, domain: string, entity: string): IntentCatalogEntry {
  return {
    id,
    domain,
    actionType: "prepare_action",
    entity: entity as IntentCatalogEntry["entity"],
    templates: [],
    generate: "create",
  };
}

/** Intentions catalogue — base pour 250+ entrées avec génération. */
export const INTENT_CATALOG: IntentCatalogEntry[] = [
  // --- Clients (20+) ---
  countIntents("clients", "clients"),
  listIntents("list_clients", "clients", "clients"),
  listIntents("clients_recent", "clients", "clients"),
  listIntents("clients_without_devis", "clients", "clients"),
  listIntents("clients_to_follow_up", "clients", "clients"),
  listIntents("best_client", "clients", "clients"),
  createIntent("create_client", "clients", "clients"),
  { id: "search_client", domain: "clients", actionType: "answer", entity: "clients", templates: [], generate: "search" },
  { id: "open_client", domain: "clients", actionType: "answer", entity: "clients", templates: [], generate: "search" },

  // --- Devis (25+) ---
  countIntents("devis", "devis"),
  listIntents("show_quotes_to_follow_up", "devis", "devis"),
  listIntents("devis_drafts", "devis", "devis"),
  listIntents("devis_sent", "devis", "devis"),
  listIntents("devis_signed", "devis", "devis"),
  listIntents("devis_refused", "devis", "devis"),
  listIntents("devis_expired", "devis", "devis"),
  listIntents("devis_total_amount", "devis", "devis"),
  listIntents("search_devis", "devis", "devis"),
  createIntent("create_devis", "devis", "devis"),
  createIntent("create_devis_ia", "devis", "devis"),
  { id: "prepare_email", domain: "devis", actionType: "prepare_action", entity: "devis", templates: [], generate: "create" },

  // --- Factures (20+) ---
  countIntents("factures", "factures"),
  listIntents("show_unpaid_invoices", "factures", "factures"),
  listIntents("invoices_paid", "factures", "factures"),
  listIntents("invoices_overdue", "factures", "factures"),
  listIntents("monthly_revenue", "factures", "factures"),
  listIntents("search_facture", "factures", "factures"),
  createIntent("create_facture", "factures", "factures"),

  // --- Chantiers (25+) ---
  countIntents("chantiers", "chantiers"),
  listIntents("show_late_chantiers", "chantiers", "chantiers"),
  listIntents("chantiers_active", "chantiers", "chantiers"),
  listIntents("chantiers_completed", "chantiers", "chantiers"),
  listIntents("chantier_overrun", "chantiers", "chantiers"),
  listIntents("chantier_profitability", "chantiers", "chantiers"),
  listIntents("best_chantier", "chantiers", "chantiers"),
  listIntents("best_chantier_type", "pilotage", "chantiers"),
  listIntents("search_chantier", "chantiers", "chantiers"),
  createIntent("create_chantier", "chantiers", "chantiers"),

  // --- Planning (15+) ---
  listIntents("planning_today", "planning", "planning"),
  listIntents("planning_tomorrow", "planning", "planning"),
  createIntent("create_rendez_vous", "planning", "planning"),
  { id: "move_appointment", domain: "planning", actionType: "prepare_action", entity: "planning", templates: [], generate: "create" },

  // --- Employés (10+) ---
  countIntents("employes", "employes"),
  listIntents("employee_performance", "pilotage", "employes"),
  createIntent("create_employe", "employes", "employes"),

  // --- Fournitures (10+) ---
  countIntents("fournitures", "fournitures"),
  listIntents("search_fourniture", "fournitures", "fournitures"),
  createIntent("create_fourniture", "fournitures", "fournitures"),

  // --- Commandes (8+) ---
  countIntents("commandes", "commandes"),
  { id: "count_commandes", domain: "commandes", actionType: "answer", entity: "commandes", templates: [], generate: "count" },

  // --- Pilotage / conseil (30+) ---
  listIntents("monthly_profit", "pilotage", "pilotage"),
  listIntents("monthly_goal", "pilotage", "pilotage"),
  listIntents("dashboard_summary", "dashboard", "pilotage"),
  listIntents("today_summary", "dashboard", "pilotage"),
  listIntents("important_actions", "dashboard", "pilotage"),
  listIntents("company_advice", "pilotage", "pilotage"),
  listIntents("pilotage_attention", "pilotage", "pilotage"),
  listIntents("pilotage_reliability", "pilotage", "pilotage"),

  // --- MUM IA (8+) ---
  { id: "explain_mum_ia", domain: "mum-ia", actionType: "answer", templates: ["mum ia", "ia devis", "intelligence artificielle"], generate: "advice" },
  { id: "mum_ia_quota", domain: "mum-ia", actionType: "answer", templates: ["quota ia", "credits ia", "combien ia"], generate: "count" },
  { id: "mum_ia_difference", domain: "mum-ia", actionType: "answer", templates: ["difference mum ia", "ia vs manuel"], generate: "advice" },

  // --- Paramètres (10+) ---
  { id: "parametres_entreprise", domain: "parametres", actionType: "answer", templates: ["parametres entreprise", "infos entreprise", "mon entreprise"], generate: "navigate" },
  { id: "parametres_tva", domain: "parametres", actionType: "answer", templates: ["tva entreprise", "taux tva parametres"], generate: "navigate" },
  { id: "parametres_abonnement", domain: "parametres", actionType: "answer", templates: ["abonnement", "mon abonnement", "facturation abonnement"], generate: "navigate" },

  // --- BTP métier (20+) ---
  { id: "tva_question", domain: "btp", actionType: "answer", templates: ["tva travaux", "quelle tva"], generate: "advice" },
  { id: "debourse_question", domain: "btp", actionType: "answer", templates: ["debourse", "deboursé", "cout horaire"], generate: "advice" },
  { id: "margin_question", domain: "btp", actionType: "answer", templates: ["marge", "ameliorer marge", "taux marge"], generate: "advice" },
  { id: "price_advice", domain: "btp", actionType: "answer", templates: ["prix", "tarif", "combien au m2"], generate: "advice" },
  { id: "chantier_method_question", domain: "btp", actionType: "answer", templates: ["organiser chantier", "planning chantier"], generate: "advice" },
  { id: "dtu_question", domain: "btp", actionType: "answer", templates: ["dtu", "norme", "norme nf"], generate: "advice" },
  { id: "btp_question", domain: "btp", actionType: "answer", templates: ["question btp", "conseil metier"], generate: "advice" },

  // --- Navigation app (15+) ---
  { id: "explain_dashboard", domain: "dashboard", actionType: "answer", templates: ["tableau de bord", "dashboard", "accueil"], generate: "navigate" },
  { id: "explain_devis_page", domain: "devis", actionType: "answer", templates: ["page devis", "module devis"], generate: "navigate" },
  { id: "explain_factures_page", domain: "factures", actionType: "answer", templates: ["page factures", "module factures"], generate: "navigate" },
  { id: "explain_chantiers_page", domain: "chantiers", actionType: "answer", templates: ["page chantiers", "module chantiers"], generate: "navigate" },
  { id: "explain_pilotage_page", domain: "pilotage", actionType: "answer", templates: ["page pilotage", "module pilotage"], generate: "navigate" },
  { id: "explain_planning_page", domain: "planning", actionType: "answer", templates: ["page planning", "module planning"], generate: "navigate" },
  { id: "explain_clients_page", domain: "clients", actionType: "answer", templates: ["page clients", "module clients"], generate: "navigate" },
  { id: "explain_commandes_page", domain: "commandes", actionType: "answer", templates: ["page commandes", "module commandes"], generate: "navigate" },
  { id: "explain_fournitures_page", domain: "fournitures", actionType: "answer", templates: ["bibliotheque fournitures", "fournitures"], generate: "navigate" },
  { id: "explain_parametres_page", domain: "parametres", actionType: "answer", templates: ["parametres", "reglages", "configuration"], generate: "navigate" },
  { id: "explain_mum_ia_page", domain: "mum-ia", actionType: "answer", templates: ["page mum ia", "module ia"], generate: "navigate" },

  // --- Conversation (12) ---
  { id: "greeting", domain: "conversation", actionType: "answer", templates: ["bonjour", "salut"], generate: undefined },
  { id: "thanks", domain: "conversation", actionType: "answer", templates: ["merci"], generate: undefined },
  { id: "small_talk", domain: "conversation", actionType: "answer", templates: ["ca va"], generate: undefined },
  { id: "ready", domain: "conversation", actionType: "answer", templates: ["pret"], generate: undefined },
  { id: "ack", domain: "conversation", actionType: "answer", templates: ["ok", "parfait"], generate: undefined },
  { id: "farewell", domain: "conversation", actionType: "answer", templates: ["au revoir", "bonne journee"], generate: undefined },
  { id: "help_capabilities", domain: "conversation", actionType: "answer", templates: ["aide", "que peux tu faire"], generate: "advice" },
  { id: "out_of_scope", domain: "conversation", actionType: "refuse", templates: ["blague", "politique"], generate: undefined },
];

/** Génère des variantes d'intentions par métier BTP (× trades). */
export function expandBtpTradeIntents(): IntentCatalogEntry[] {
  const trades = [
    "plomberie", "placo", "carrelage", "peinture", "electricite", "menuiserie",
    "maconnerie", "toiture", "isolation", "chauffage", "climatisation",
    "salle_de_bain", "cuisine", "renovation", "neuf", "sav", "depannage",
  ];
  return trades.flatMap((trade) => [
    {
      id: `devis_${trade}`,
      domain: "devis",
      actionType: "prepare_action" as const,
      templates: [`devis ${trade.replace(/_/g, " ")}`, `chiffrer ${trade.replace(/_/g, " ")}`, `estimation ${trade.replace(/_/g, " ")}`],
      generate: "create" as const,
    },
    {
      id: `rentabilite_${trade}`,
      domain: "pilotage",
      actionType: "answer" as const,
      templates: [`rentabilite ${trade.replace(/_/g, " ")}`, `marge ${trade.replace(/_/g, " ")}`],
      generate: "analyze" as const,
    },
    {
      id: `conseil_${trade}`,
      domain: "btp",
      actionType: "answer" as const,
      templates: [`conseil ${trade.replace(/_/g, " ")}`, `comment ${trade.replace(/_/g, " ")}`],
      generate: "advice" as const,
    },
  ]);
}

const OP_MODULES = [
  { key: "clients", domain: "clients", entity: "clients" },
  { key: "devis", domain: "devis", entity: "devis" },
  { key: "factures", domain: "factures", entity: "factures" },
  { key: "chantiers", domain: "chantiers", entity: "chantiers" },
  { key: "planning", domain: "planning", entity: "planning" },
  { key: "employes", domain: "employes", entity: "employes" },
  { key: "fournitures", domain: "fournitures", entity: "fournitures" },
  { key: "commandes", domain: "commandes", entity: "commandes" },
  { key: "pilotage", domain: "pilotage", entity: "pilotage" },
] as const;

const OP_ACTIONS = [
  { prefix: "create", type: "prepare_action" },
  { prefix: "modify", type: "prepare_action" },
  { prefix: "delete", type: "prepare_action" },
  { prefix: "duplicate", type: "prepare_action" },
  { prefix: "move", type: "prepare_action" },
  { prefix: "plan", type: "prepare_action" },
  { prefix: "relance", type: "prepare_action" },
  { prefix: "prepare", type: "prepare_action" },
  { prefix: "generate", type: "prepare_action" },
  { prefix: "calculate", type: "answer" },
  { prefix: "compare", type: "answer" },
  { prefix: "filter", type: "answer" },
  { prefix: "search", type: "answer" },
  { prefix: "analyze", type: "answer" },
  { prefix: "assign", type: "prepare_action" },
  { prefix: "reassign", type: "prepare_action" },
  { prefix: "merge", type: "prepare_action" },
  { prefix: "sort", type: "answer" },
  { prefix: "export", type: "prepare_action" },
  { prefix: "import", type: "prepare_action" },
  { prefix: "share", type: "prepare_action" },
  { prefix: "send", type: "prepare_action" },
  { prefix: "archive", type: "prepare_action" },
  { prefix: "sign", type: "prepare_action" },
] as const;

export function expandOperationalIntents(): IntentCatalogEntry[] {
  const out: IntentCatalogEntry[] = [];
  for (const m of OP_MODULES) {
    for (const a of OP_ACTIONS) {
      out.push({
        id: `${a.prefix}_${m.key}`,
        domain: m.domain,
        actionType: a.type as IntentCatalogEntry["actionType"],
        entity: m.entity as IntentCatalogEntry["entity"],
        templates: [`${a.prefix} ${m.key}`, `${m.key} ${a.prefix}`],
        generate: a.type === "prepare_action" ? "create" : "list",
      });
    }
  }
  return out;
}

export function getFullIntentCatalog(): IntentCatalogEntry[] {
  const all = [
    ...INTENT_CATALOG,
    ...expandBtpTradeIntents(),
    ...expandOperationalIntents(),
  ];
  const byId = new Map<string, IntentCatalogEntry>();
  for (const i of all) {
    if (!byId.has(i.id)) byId.set(i.id, i);
  }
  return [...byId.values()];
}

export function getIntentCatalogStats() {
  const catalog = getFullIntentCatalog();
  return { intentCount: catalog.length, ids: catalog.map((c) => c.id) };
}
