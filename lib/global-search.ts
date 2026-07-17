import { CHANTIER_STATUT_LABELS } from "@/lib/chantiers";
import { getClientDisplayName } from "@/lib/clients";
import { COMMANDE_STATUT_LABELS } from "@/lib/commandes";
import { DEVIS_STATUT_LABELS } from "@/lib/devis";
import { getDevisDisplayStatut } from "@/lib/devis-statut";
import { getFactureDisplayStatut } from "@/lib/facture-statut";
import {
  matchesMonthFilter,
  parseSearchIntent,
  scoreSearchMatch,
} from "@/lib/intelligent-search";
import {
  getPlanningEventDisplayTitle,
  getPlanningTypeLabel,
} from "@/lib/planning-types";
import { matchesSearchQuery } from "@/lib/search-text-match";
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

function buildHaystack(...parts: (string | undefined | null)[]): string {
  return parts.filter((part): part is string => Boolean(part?.trim())).join(" ");
}

function matchesGlobalQuery(
  query: string,
  intent: ReturnType<typeof parseSearchIntent>,
  ...parts: (string | undefined | null)[]
): boolean {
  if (query.trim().length < 2) return false;
  const haystack = buildHaystack(...parts);
  return (
    matchesSearchQuery(haystack, query) ||
    scoreSearchMatch(haystack, query, intent) >= 12
  );
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
  intent: ReturnType<typeof parseSearchIntent>,
): GlobalSearchResult[] {
  return clients
    .filter((client) => {
      if (intent.clientHint) {
        const hint = intent.clientHint.toLowerCase();
        const display = getClientDisplayName(client).toLowerCase();
        if (!display.includes(hint)) return false;
      }
      return matchesGlobalQuery(query, intent, ...clientSearchParts(client));
    })
    .map((client) => ({
      client,
      score: scoreSearchMatch(
        buildHaystack(...clientSearchParts(client)),
        query,
        intent,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map(({ client }) => ({
      id: client.id,
      category: "clients" as const,
      title: getClientDisplayName(client),
      subtitle: clientSubtitle(client),
      href: "/clients",
    }));
}

function searchDevis(
  devis: Devis[],
  clientsById: Map<string, Client>,
  query: string,
  intent: ReturnType<typeof parseSearchIntent>,
): GlobalSearchResult[] {
  return devis
    .filter((item) => {
      if (intent.statutDevis?.length) {
        const display = getDevisDisplayStatut(item);
        if (!intent.statutDevis.includes(display)) return false;
      }
      if (!matchesMonthFilter(item.date, intent)) return false;
      const clientName = getClientName(item.clientId, clientsById);
      return matchesGlobalQuery(
        query,
        intent,
        item.numero,
        item.titre,
        item.descriptionChantier,
        clientName,
        DEVIS_STATUT_LABELS[item.statut],
      );
    })
    .map((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return {
        item,
        score: scoreSearchMatch(
          buildHaystack(item.numero, item.titre, item.descriptionChantier, clientName),
          query,
          intent,
        ),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map(({ item }) => {
      const clientName = getClientName(item.clientId, clientsById);
      return {
        id: item.id,
        category: "devis" as const,
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
  intent: ReturnType<typeof parseSearchIntent>,
): GlobalSearchResult[] {
  return factures
    .filter((item) => {
      if (intent.statutFacture?.length) {
        const display = getFactureDisplayStatut(item);
        if (!intent.statutFacture.includes(display)) return false;
      }
      if (!matchesMonthFilter(item.dateEmission, intent)) return false;
      const clientName = getClientName(item.clientId, clientsById);
      return matchesGlobalQuery(
        query,
        intent,
        item.numero,
        item.descriptionChantier,
        clientName,
        FACTURE_STATUT_LABELS[item.statut],
      );
    })
    .map((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return {
        item,
        score: scoreSearchMatch(
          buildHaystack(item.numero, item.descriptionChantier, clientName),
          query,
          intent,
        ),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map(({ item }) => {
      const clientName = getClientName(item.clientId, clientsById);
      return {
        id: item.id,
        category: "factures" as const,
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
  intent: ReturnType<typeof parseSearchIntent>,
): GlobalSearchResult[] {
  return chantiers
    .filter((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      if (intent.chantierHint) {
        const hint = intent.chantierHint.toLowerCase();
        if (!item.nom.toLowerCase().includes(hint) && !clientName.toLowerCase().includes(hint)) {
          return false;
        }
      }
      return matchesGlobalQuery(
        query,
        intent,
        item.nom,
        item.adresse,
        clientName,
        CHANTIER_STATUT_LABELS[item.statut],
        item.type,
        item.typePersonnalise,
      );
    })
    .map((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return {
        item,
        score: scoreSearchMatch(
          buildHaystack(item.nom, item.adresse, clientName, item.type),
          query,
          intent,
        ),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS_PER_CATEGORY)
    .map(({ item }) => {
      const clientName = getClientName(item.clientId, clientsById);
      return {
        id: item.id,
        category: "chantiers" as const,
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
  intent: ReturnType<typeof parseSearchIntent>,
): GlobalSearchResult[] {
  return commandes
    .filter((item) => {
      const clientName = getClientName(item.clientId, clientsById);
      return matchesGlobalQuery(
        query,
        intent,
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
  intent: ReturnType<typeof parseSearchIntent>,
): GlobalSearchResult[] {
  return planning
    .filter((event) => {
      if (!matchesMonthFilter(event.date, intent)) return false;
      const chantier = event.chantierId
        ? chantiersById.get(event.chantierId)
        : undefined;
      const clientName = chantier
        ? getClientName(chantier.clientId, clientsById)
        : "";
      const displayTitle = getPlanningEventDisplayTitle(event, chantier);
      const typeLabel = getPlanningTypeLabel(event);

      return matchesGlobalQuery(
        query,
        intent,
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

  const intent = parseSearchIntent(trimmed);
  const clientsById = new Map(data.clients.map((client) => [client.id, client]));
  const chantiersById = new Map(
    data.chantiers.map((chantier) => [chantier.id, chantier]),
  );

  const groups: GlobalSearchGroup[] = [
    {
      category: "clients",
      label: CATEGORY_LABELS.clients,
      results: searchClients(data.clients, trimmed, intent),
    },
    {
      category: "devis",
      label: CATEGORY_LABELS.devis,
      results: searchDevis(data.devis, clientsById, trimmed, intent),
    },
    {
      category: "factures",
      label: CATEGORY_LABELS.factures,
      results: searchFactures(data.factures, clientsById, trimmed, intent),
    },
    {
      category: "chantiers",
      label: CATEGORY_LABELS.chantiers,
      results: searchChantiers(data.chantiers, clientsById, trimmed, intent),
    },
    {
      category: "commandes",
      label: CATEGORY_LABELS.commandes,
      results: searchCommandes(data.commandes, clientsById, trimmed, intent),
    },
    {
      category: "planning",
      label: CATEGORY_LABELS.planning,
      results: searchPlanning(
        data.planning,
        chantiersById,
        clientsById,
        trimmed,
        intent,
      ),
    },
  ];

  return groups.filter((group) => group.results.length > 0);
}
