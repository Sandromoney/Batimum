import { CHANTIER_STATUT_LABELS } from "@/lib/chantiers";
import { getClientDisplayName } from "@/lib/clients";
import { COMMANDE_STATUT_LABELS } from "@/lib/commandes";
import { DEVIS_STATUT_LABELS } from "@/lib/devis";
import {
  getPlanningEventDisplayTitle,
  getPlanningTypeLabel,
} from "@/lib/planning-types";
import type {
  AppData,
  Chantier,
  Client,
  Commande,
  Devis,
  EvenementPlanning,
  Facture,
  StatutChantier,
  StatutFacture,
} from "@/lib/types";

export type GlobalSearchCategory =
  | "clients"
  | "devis"
  | "factures"
  | "chantiers"
  | "commandes"
  | "planning";

export interface GlobalSearchResult {
  id: string;
  category: GlobalSearchCategory;
  title: string;
  subtitle: string;
  href: string;
}

export interface GlobalSearchGroup {
  category: GlobalSearchCategory;
  label: string;
  results: GlobalSearchResult[];
}

const MAX_RESULTS_PER_CATEGORY = 8;

const CATEGORY_LABELS: Record<GlobalSearchCategory, string> = {
  clients: "Clients",
  devis: "Devis",
  factures: "Factures",
  chantiers: "Chantiers",
  commandes: "Commandes",
  planning: "Planning",
};

const FACTURE_STATUT_LABELS: Record<StatutFacture, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  en_attente: "En attente",
  en_retard: "En retard",
  payee: "Payée",
  avoir_partiel: "Avoir partiel",
  avoir_total: "Soldée par avoir",
};

function includesQuery(query: string, ...parts: (string | undefined | null)[]): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) return false;

  const haystack = parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function clientSearchParts(client: Client): (string | undefined)[] {
  return [
    client.nom,
    client.prenom,
    client.societe,
    client.email,
    client.telephone,
    client.indicatifTelephone,
    client.adresse,
    client.ville,
    client.codePostal,
  ];
}

function clientSubtitle(client: Client): string {
  const displayName = getClientDisplayName(client);
  if (client.societe?.trim() && client.societe.trim() !== displayName) {
    return client.societe.trim();
  }
  return client.email?.trim() || client.telephone?.trim() || "Client";
}

function getClientName(
  clientId: string,
  clientsById: Map<string, Client>,
): string {
  return getClientDisplayName(clientsById.get(clientId));
}

function searchClients(
  clients: Client[],
  query: string,
): GlobalSearchResult[] {
  return clients
    .filter((client) => includesQuery(query, ...clientSearchParts(client)))
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map((client) => ({
      id: client.id,
      category: "clients",
      title: getClientDisplayName(client),
      subtitle: clientSubtitle(client),
      href: "/clients",
    }));
}

function searchDevis(
  devis: Devis[],
  clientsById: Map<string, Client>,
  query: string,
): GlobalSearchResult[] {
  return devis
    .filter((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return includesQuery(
        query,
        item.numero,
        item.titre,
        clientName,
        DEVIS_STATUT_LABELS[item.statut],
      );
    })
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return {
        id: item.id,
        category: "devis",
        title: `Devis ${item.numero} — ${clientName}`,
        subtitle: `${item.titre} · ${DEVIS_STATUT_LABELS[item.statut]}`,
        href: `/devis/${item.id}`,
      };
    });
}

function searchFactures(
  factures: Facture[],
  clientsById: Map<string, Client>,
  query: string,
): GlobalSearchResult[] {
  return factures
    .filter((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return includesQuery(
        query,
        item.numero,
        item.descriptionChantier,
        clientName,
        FACTURE_STATUT_LABELS[item.statut],
      );
    })
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return {
        id: item.id,
        category: "factures",
        title: `Facture ${item.numero} — ${clientName}`,
        subtitle: FACTURE_STATUT_LABELS[item.statut],
        href: "/factures",
      };
    });
}

function searchChantiers(
  chantiers: Chantier[],
  clientsById: Map<string, Client>,
  query: string,
): GlobalSearchResult[] {
  return chantiers
    .filter((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return includesQuery(
        query,
        item.nom,
        item.adresse,
        clientName,
        CHANTIER_STATUT_LABELS[item.statut],
        item.type,
        item.typePersonnalise,
      );
    })
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return {
        id: item.id,
        category: "chantiers",
        title: `Chantier ${item.nom} — ${clientName}`,
        subtitle: CHANTIER_STATUT_LABELS[item.statut],
        href: `/chantiers/${item.id}`,
      };
    });
}

function searchCommandes(
  commandes: Commande[],
  clientsById: Map<string, Client>,
  query: string,
): GlobalSearchResult[] {
  return commandes
    .filter((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return includesQuery(
        query,
        item.numero,
        item.devisNumero,
        item.devisTitre,
        clientName,
        COMMANDE_STATUT_LABELS[item.statut],
      );
    })
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return {
        id: item.id,
        category: "commandes",
        title: `Commande ${item.numero} — ${clientName}`,
        subtitle: [
          item.devisNumero ? `Devis ${item.devisNumero}` : item.devisTitre,
          COMMANDE_STATUT_LABELS[item.statut],
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/commandes/${item.id}`,
      };
    });
}

function formatPlanningDate(date: string): string {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function searchPlanning(
  planning: EvenementPlanning[],
  chantiersById: Map<string, Chantier>,
  clientsById: Map<string, Client>,
  query: string,
): GlobalSearchResult[] {
  return planning
    .filter((event) => {
      const chantier = event.chantierId
        ? chantiersById.get(event.chantierId)
        : undefined;
      const clientName = chantier
        ? getClientName(chantier.clientId, clientsById)
        : "";
      const displayTitle = getPlanningEventDisplayTitle(event, chantier);
      const typeLabel = getPlanningTypeLabel(event);

      return includesQuery(
        query,
        typeLabel,
        displayTitle,
        event.titre,
        event.tache,
        clientName,
        chantier?.nom,
      );
    })
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map((event) => {
      const chantier = event.chantierId
        ? chantiersById.get(event.chantierId)
        : undefined;
      const clientName = chantier
        ? getClientName(chantier.clientId, clientsById)
        : "";
      const displayTitle = getPlanningEventDisplayTitle(event, chantier);
      const typeLabel = getPlanningTypeLabel(event);

      return {
        id: event.id,
        category: "planning",
        title: clientName
          ? `${typeLabel} — ${clientName}`
          : `${typeLabel} — ${displayTitle}`,
        subtitle: [displayTitle, formatPlanningDate(event.date)]
          .filter(Boolean)
          .join(" · "),
        href: "/planning",
      };
    });
}

export function buildGlobalSearchGroups(
  data: AppData,
  query: string,
): GlobalSearchGroup[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const clientsById = new Map(data.clients.map((client) => [client.id, client]));
  const chantiersById = new Map(
    data.chantiers.map((chantier) => [chantier.id, chantier]),
  );

  const groups: GlobalSearchGroup[] = [
    {
      category: "clients",
      label: CATEGORY_LABELS.clients,
      results: searchClients(data.clients, trimmed),
    },
    {
      category: "devis",
      label: CATEGORY_LABELS.devis,
      results: searchDevis(data.devis, clientsById, trimmed),
    },
    {
      category: "factures",
      label: CATEGORY_LABELS.factures,
      results: searchFactures(data.factures, clientsById, trimmed),
    },
    {
      category: "chantiers",
      label: CATEGORY_LABELS.chantiers,
      results: searchChantiers(data.chantiers, clientsById, trimmed),
    },
    {
      category: "commandes",
      label: CATEGORY_LABELS.commandes,
      results: searchCommandes(data.commandes, clientsById, trimmed),
    },
    {
      category: "planning",
      label: CATEGORY_LABELS.planning,
      results: searchPlanning(
        data.planning,
        chantiersById,
        clientsById,
        trimmed,
      ),
    },
  ];

  return groups.filter((group) => group.results.length > 0);
}
