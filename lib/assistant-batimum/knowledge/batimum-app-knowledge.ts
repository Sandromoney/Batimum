import type { KnowledgeEntry } from "@/lib/assistant-batimum/knowledge/types";
import { DESKTOP_NAV_ITEMS } from "@/lib/app-nav";

const PAGE_HELP: Record<string, { path: string; description: string }> = {
  explain_dashboard: {
    path: "/dashboard",
    description:
      "Tableau de bord : CA, priorités du jour, devis à relancer, chantiers à surveiller et accès rapide aux modules.",
  },
  explain_devis_page: {
    path: "/devis",
    description:
      "Devis : créer, modifier, envoyer, signer, relancer. Transformation en facture ou commande en un clic.",
  },
  explain_factures_page: {
    path: "/factures",
    description:
      "Factures : suivi des paiements, impayés, relances, CA encaissé et statuts.",
  },
  explain_chantiers_page: {
    path: "/chantiers",
    description:
      "Chantiers : suivi terrain, étapes, achats, pointages, rentabilité par chantier.",
  },
  explain_pilotage_page: {
    path: "/pilotage",
    description:
      "Pilotage : marges, rentabilité, temps réel vs prévu, alertes et analyse par type de chantier.",
  },
  explain_planning_page: {
    path: "/planning",
    description:
      "Planning : rendez-vous, affectations équipes, vue calendrier.",
  },
  explain_clients_page: {
    path: "/clients",
    description:
      "Clients : fiches, historique devis/factures, création et recherche.",
  },
  explain_commandes_page: {
    path: "/commandes",
    description:
      "Commandes : suivi des devis signés, facturation progressive, situations.",
  },
  explain_fournitures_page: {
    path: "/parametres/bibliotheque",
    description:
      "Bibliothèque fournitures : prix, références, suggestions dans les devis.",
  },
  explain_parametres_page: {
    path: "/parametres",
    description:
      "Paramètres : entreprise, employés, TVA, abonnement, connexion email, MUM IA.",
  },
  explain_mum_ia_page: {
    path: "/ia",
    description:
      "MUM IA : génération de devis par IA, historique, quotas et analyse chantier.",
  },
};

function buildPageEntry(id: string): KnowledgeEntry {
  const help = PAGE_HELP[id];
  const nav = DESKTOP_NAV_ITEMS.find((i) => i.href === help.path);
  return {
    id,
    domain: "app",
    actionType: "answer",
    priority: 70,
    confidence: 0.85,
    patterns: [
      new RegExp(help.path.replace("/", "\\/")),
      new RegExp(id.replace("explain_", "").replace(/_/g, ".*")),
    ],
    keywords: [
      nav?.label.toLowerCase() ?? id,
      "page",
      "module",
      "menu",
      "bouton",
      "fonctionnalite",
    ],
    answer: () => ({
      text: `${nav?.label ?? "Module"} — ${help.description}`,
      navigateTo: help.path,
    }),
  };
}

/** Connaissance complète de la navigation Batimum. */
export const BATIMUM_APP_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "modify_data",
    domain: "app",
    actionType: "prepare_action",
    priority: 120,
    confidence: 0.86,
    patterns: [/affecte|deplace|déplace|modifie|change|mets .* sur/],
    keywords: ["affecter", "deplacer", "modifier", "changer", "mettre"],
    answer: () => null,
  },
  {
    id: "delete_data",
    domain: "app",
    actionType: "prepare_action",
    priority: 110,
    confidence: 0.84,
    patterns: [/supprime|retire|efface|enleve/],
    keywords: ["supprimer", "retirer", "effacer", "enlever"],
    answer: () => null,
  },
  ...Object.keys(PAGE_HELP).map(buildPageEntry),
  {
    id: "app_capabilities",
    domain: "app",
    actionType: "answer",
    priority: 75,
    confidence: 0.88,
    patterns: [/que fait batimum/, /fonctionnalites/, /tout le logiciel/],
    keywords: ["fonctionnalités", "modules", "batimum", "logiciel", "tout"],
    answer: () => ({
      text: `Batimum couvre : ${DESKTOP_NAV_ITEMS.map((i) => i.label).join(", ")}. Je peux vous guider sur chaque module.`,
    }),
  },
];
