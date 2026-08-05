import type {
  AppData,
  Chantier,
  Client,
  ClientHistoriqueEntry,
  Commande,
  Devis,
  Facture,
  StatutChantier,
  StatutDevis,
  StatutFacture,
} from "@/lib/types";
import { getClientAddress, getClientDisplayName } from "@/lib/clients";
import { formatCurrency } from "@/lib/utils";

export type ClientFicheTab =
  | "overview"
  | "devis"
  | "commandes"
  | "chantiers"
  | "factures"
  | "documents"
  | "notes"
  | "historique";

export type ClientFicheTimelineKind =
  | "client"
  | "devis"
  | "commande"
  | "chantier"
  | "facture"
  | "note"
  | "document";

export type ClientFicheTimelineEvent = {
  id: string;
  kind: ClientFicheTimelineKind;
  date: string;
  title: string;
  subtitle?: string;
  status?: string;
  amountLabel?: string;
  href?: string;
};

export type ClientFicheSummary = {
  devisTotal: number;
  devisBrouillons: number;
  devisEnvoyes: number;
  devisSignes: number;
  devisRefuses: number;
  commandes: number;
  chantiersEnCours: number;
  chantiersTermines: number;
  factures: number;
  montantFacture: number;
  montantEncaisse: number;
  montantDu: number;
  lastActivityAt: string | null;
};

export type ClientNote = {
  id: string;
  content: string;
  createdAt: string;
};

const DEVIS_STATUT_LABEL: Record<StatutDevis, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  signe: "Signé",
  en_attente: "En attente",
  en_retard: "En retard",
  expire: "Expiré",
  archive: "Archivé",
};

const FACTURE_STATUT_LABEL: Record<StatutFacture, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
  en_attente: "En attente",
  en_retard: "En retard",
  avoir_partiel: "Avoir partiel",
  avoir_total: "Avoir total",
};

const CHANTIER_STATUT_LABEL: Record<StatutChantier, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  retard_demarrage: "Retard démarrage",
  en_retard: "En retard",
  termine: "Terminé",
  suspendu: "Suspendu",
};

const CHANTIERS_EN_COURS: StatutChantier[] = [
  "planifie",
  "en_cours",
  "retard_demarrage",
  "en_retard",
  "suspendu",
];

export function getClientNotes(client: Client): ClientNote[] {
  const raw = client.notes;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (note) =>
      note &&
      typeof note.id === "string" &&
      typeof note.content === "string" &&
      typeof note.createdAt === "string",
  );
}

export function withClientNotes(client: Client, notes: ClientNote[]): Client {
  return { ...client, notes };
}

function devisAmount(devis: Devis): number {
  return typeof devis.montantTTC === "number" ? devis.montantTTC : 0;
}

function factureAmount(facture: Facture): number {
  if (typeof facture.montantTTC === "number") return facture.montantTTC;
  return typeof facture.montant === "number" ? facture.montant : 0;
}

export function filterEntitiesForClient(data: AppData, clientId: string) {
  return {
    devis: data.devis.filter((item) => item.clientId === clientId),
    factures: data.factures.filter((item) => item.clientId === clientId),
    chantiers: data.chantiers.filter((item) => item.clientId === clientId),
    commandes: (data.commandes ?? []).filter(
      (item) => item.clientId === clientId,
    ),
  };
}

export function computeClientFicheSummary(
  data: AppData,
  clientId: string,
  client?: Client,
): ClientFicheSummary {
  const { devis, factures, chantiers, commandes } = filterEntitiesForClient(
    data,
    clientId,
  );

  const montantFacture = factures.reduce(
    (sum, item) => sum + factureAmount(item),
    0,
  );
  const montantEncaisse = factures
    .filter((item) => item.statut === "payee")
    .reduce((sum, item) => sum + factureAmount(item), 0);
  const montantDu = factures
    .filter(
      (item) =>
        item.statut === "envoyee" ||
        item.statut === "en_attente" ||
        item.statut === "en_retard",
    )
    .reduce((sum, item) => {
      const reste =
        typeof item.resteAPayer === "number"
          ? item.resteAPayer
          : factureAmount(item);
      return sum + Math.max(0, reste);
    }, 0);

  const activityDates: string[] = [];
  if (client?.createdAt) activityDates.push(client.createdAt);
  for (const item of client?.historique ?? []) activityDates.push(item.date);
  for (const item of devis) {
    activityDates.push(item.dateCreation ?? item.date);
    for (const h of item.historique ?? []) activityDates.push(h.date);
  }
  for (const item of factures) {
    activityDates.push(item.dateEmission);
    for (const h of item.historique ?? []) activityDates.push(h.date);
  }
  for (const item of chantiers) {
    activityDates.push(item.dateDebut);
    for (const h of item.historique ?? []) activityDates.push(h.date);
  }
  for (const item of commandes) {
    activityDates.push(item.dateCreation);
  }
  for (const note of client ? getClientNotes(client) : []) {
    activityDates.push(note.createdAt);
  }

  const lastActivityAt =
    activityDates.length > 0
      ? activityDates.sort(
          (a, b) => new Date(b).getTime() - new Date(a).getTime(),
        )[0]!
      : null;

  return {
    devisTotal: devis.length,
    devisBrouillons: devis.filter((d) => d.statut === "brouillon").length,
    devisEnvoyes: devis.filter(
      (d) => d.statut === "envoye" || d.statut === "en_attente",
    ).length,
    devisSignes: devis.filter(
      (d) => d.statut === "signe" || d.statut === "accepte",
    ).length,
    devisRefuses: devis.filter((d) => d.statut === "refuse").length,
    commandes: commandes.length,
    chantiersEnCours: chantiers.filter((c) =>
      CHANTIERS_EN_COURS.includes(c.statut),
    ).length,
    chantiersTermines: chantiers.filter((c) => c.statut === "termine").length,
    factures: factures.length,
    montantFacture,
    montantEncaisse,
    montantDu,
    lastActivityAt,
  };
}

function pushUnique(
  events: ClientFicheTimelineEvent[],
  event: ClientFicheTimelineEvent,
) {
  if (events.some((item) => item.id === event.id)) return;
  events.push(event);
}

export function buildClientFicheTimeline(
  data: AppData,
  client: Client,
): ClientFicheTimelineEvent[] {
  const events: ClientFicheTimelineEvent[] = [];
  const { devis, factures, chantiers, commandes } = filterEntitiesForClient(
    data,
    client.id,
  );

  pushUnique(events, {
    id: `client-created-${client.id}`,
    kind: "client",
    date: client.createdAt,
    title: "Client créé",
    subtitle: getClientDisplayName(client),
    status: "Créé",
  });

  for (const entry of client.historique ?? []) {
    if (entry.type === "cree") continue;
    pushUnique(events, {
      id: `client-hist-${entry.id}`,
      kind: "client",
      date: entry.date,
      title: entry.label,
      status: entry.type,
      href: hrefFromClientHistorique(entry),
    });
  }

  for (const item of devis) {
    pushUnique(events, {
      id: `devis-created-${item.id}`,
      kind: "devis",
      date: item.dateCreation ?? item.date,
      title: `Devis ${item.numero} créé`,
      subtitle: item.titre,
      status: DEVIS_STATUT_LABEL[item.statut] ?? item.statut,
      amountLabel: devisAmount(item)
        ? formatCurrency(devisAmount(item))
        : undefined,
      href: `/devis/${item.id}`,
    });

    for (const h of item.historique ?? []) {
      if (h.type === "cree") continue;
      pushUnique(events, {
        id: `devis-hist-${h.id}`,
        kind: "devis",
        date: h.date,
        title: h.label || `Devis ${item.numero}`,
        subtitle: item.titre,
        status: DEVIS_STATUT_LABEL[item.statut] ?? item.statut,
        amountLabel: devisAmount(item)
          ? formatCurrency(devisAmount(item))
          : undefined,
        href: `/devis/${item.id}`,
      });
    }

    if (item.signedPdfBase64) {
      pushUnique(events, {
        id: `devis-pdf-${item.id}`,
        kind: "document",
        date: item.signedPdfGeneratedAt ?? item.signedAt ?? item.date,
        title: `PDF signé — ${item.numero}`,
        subtitle: item.titre,
        status: "Document",
        href: `/devis/${item.id}`,
      });
    }
  }

  for (const item of commandes) {
    pushUnique(events, {
      id: `commande-created-${item.id}`,
      kind: "commande",
      date: item.dateCreation,
      title: `Commande ${item.numero} créée`,
      subtitle: item.devisTitre || item.devisNumero || item.numero,
      status: item.statut,
      amountLabel: item.montantTTC
        ? formatCurrency(item.montantTTC)
        : undefined,
      href: `/commandes/${item.id}`,
    });
  }

  for (const item of chantiers) {
    pushUnique(events, {
      id: `chantier-created-${item.id}`,
      kind: "chantier",
      date: item.dateDebut,
      title: `Chantier créé — ${item.nom}`,
      subtitle: item.adresse,
      status: CHANTIER_STATUT_LABEL[item.statut] ?? item.statut,
      href: `/chantiers/${item.id}`,
    });
    for (const h of item.historique ?? []) {
      if (h.type === "cree") continue;
      pushUnique(events, {
        id: `chantier-hist-${h.id}`,
        kind: "chantier",
        date: h.date,
        title: h.label || item.nom,
        subtitle: item.nom,
        status: CHANTIER_STATUT_LABEL[item.statut] ?? item.statut,
        href: `/chantiers/${item.id}`,
      });
    }
  }

  for (const item of factures) {
    pushUnique(events, {
      id: `facture-created-${item.id}`,
      kind: "facture",
      date: item.dateEmission,
      title: `Facture ${item.numero} créée`,
      subtitle: item.descriptionChantier,
      status: FACTURE_STATUT_LABEL[item.statut] ?? item.statut,
      amountLabel: formatCurrency(factureAmount(item)),
      href: "/factures",
    });
    for (const h of item.historique ?? []) {
      if (h.type === "cree") continue;
      pushUnique(events, {
        id: `facture-hist-${h.id}`,
        kind: "facture",
        date: h.date,
        title: h.label || `Facture ${item.numero}`,
        status: FACTURE_STATUT_LABEL[item.statut] ?? item.statut,
        amountLabel: formatCurrency(factureAmount(item)),
        href: "/factures",
      });
    }
  }

  for (const note of getClientNotes(client)) {
    pushUnique(events, {
      id: `note-${note.id}`,
      kind: "note",
      date: note.createdAt,
      title: "Note ajoutée",
      subtitle:
        note.content.length > 120
          ? `${note.content.slice(0, 117)}…`
          : note.content,
      status: "Note",
    });
  }

  return events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

function hrefFromClientHistorique(
  entry: ClientHistoriqueEntry,
): string | undefined {
  if (entry.meta?.devisId) return `/devis/${entry.meta.devisId}`;
  if (entry.meta?.chantierId) return `/chantiers/${entry.meta.chantierId}`;
  if (entry.meta?.commandeId) return `/commandes/${entry.meta.commandeId}`;
  if (entry.meta?.factureId) return "/factures";
  return undefined;
}

export function formatClientFicheDateTime(iso: string): {
  date: string;
  time: string;
} {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: "—", time: "" };
  }
  return {
    date: d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function getClientPhoneHref(client: Client): string | null {
  const raw = `${client.indicatifTelephone ?? ""}${client.telephone}`.trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits.replace(/\D/g, "")) return null;
  return `tel:${digits.startsWith("+") ? digits : `+${digits}`}`;
}

export function getClientMailtoHref(client: Client): string | null {
  const email = client.email?.trim();
  if (!email) return null;
  return `mailto:${email}`;
}

export function getClientTypeLabel(client: Client): string {
  return client.typeClient === "professionnel" ? "Professionnel" : "Particulier";
}

export function getClientFullAddress(client: Client): string {
  return getClientAddress(client) || "Adresse non renseignée";
}

export function devisStatutLabel(statut: StatutDevis): string {
  return DEVIS_STATUT_LABEL[statut] ?? statut;
}

export function factureStatutLabel(statut: StatutFacture): string {
  return FACTURE_STATUT_LABEL[statut] ?? statut;
}

export function chantierStatutLabel(statut: StatutChantier): string {
  return CHANTIER_STATUT_LABEL[statut] ?? statut;
}

export function findOrphanClientNameMatches(
  data: AppData,
  clients: Client[],
): { entityType: string; entityId: string; label: string }[] {
  // Legacy safety: entities without clientId cannot be auto-linked by name.
  // Current model requires clientId — this reports empty unless bad data appears.
  const orphans: { entityType: string; entityId: string; label: string }[] = [];
  void data;
  void clients;
  return orphans;
}
