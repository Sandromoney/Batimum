import type {
  AppData,
  Avoir,
  BibliothequeEntreprise,
  Chantier,
  ChantierAffectation,
  ChantierTimeEntry,
  Client,
  Commande,
  Devis,
  Employe,
  EvenementPlanning,
  Facture,
  MumIaHistoriqueEntry,
  NotificationApp,
  Parametres,
  RelanceClient,
} from "@/lib/types";
import {
  DEFAULT_BIBLIOTHEQUE_ENTREPRISE,
  normalizeBibliothequeEntreprise,
} from "@/lib/bibliotheque-entreprise";
import { DEFAULT_PARAMETRES, normalizeParametres } from "@/lib/parametres";
import { normalizeMumIaHistorique } from "@/lib/mum-ia-historique";
import { normalizeClient } from "@/lib/clients";

/** Payload cloud = AppData métier + métadonnées d'import. */
export type CompanyWorkspacePayload = {
  parametres: Parametres;
  employes: Employe[];
  clients: Client[];
  devis: Devis[];
  factures: Facture[];
  commandes: Commande[];
  chantiers: Chantier[];
  planning: EvenementPlanning[];
  affectations: ChantierAffectation[];
  avoirs: Avoir[];
  notifications: NotificationApp[];
  deletedNotificationKeys: string[];
  relances: RelanceClient[];
  bibliothequeEntreprise: BibliothequeEntreprise;
  mumIaHistorique: MumIaHistoriqueEntry[];
  chantierTimeEntries: ChantierTimeEntry[];
  localImportCompletedAt?: string | null;
};

export type UserSettingsOperationalPayload = {
  planning: EvenementPlanning[];
  chantiers: Chantier[];
  affectations: ChantierAffectation[];
  clients: Client[];
};

/** @deprecated Prefer CompanyWorkspacePayload — conservé pour compat API. */
export type UserSettingsPayload = {
  parametres: Parametres;
  employes: Employe[];
  operational?: UserSettingsOperationalPayload;
  workspace?: Partial<CompanyWorkspacePayload>;
};

export function emptyWorkspacePayload(): CompanyWorkspacePayload {
  return {
    parametres: normalizeParametres(DEFAULT_PARAMETRES),
    employes: [],
    clients: [],
    devis: [],
    factures: [],
    commandes: [],
    chantiers: [],
    planning: [],
    affectations: [],
    avoirs: [],
    notifications: [],
    deletedNotificationKeys: [],
    relances: [],
    bibliothequeEntreprise: DEFAULT_BIBLIOTHEQUE_ENTREPRISE,
    mumIaHistorique: [],
    chantierTimeEntries: [],
    localImportCompletedAt: null,
  };
}

export function emptyOperationalPayload(): UserSettingsOperationalPayload {
  return {
    planning: [],
    chantiers: [],
    affectations: [],
    clients: [],
  };
}

export function normalizeOperationalPayload(
  value: Partial<UserSettingsOperationalPayload> | null | undefined,
): UserSettingsOperationalPayload {
  return {
    planning: Array.isArray(value?.planning) ? value.planning : [],
    chantiers: Array.isArray(value?.chantiers) ? value.chantiers : [],
    affectations: Array.isArray(value?.affectations) ? value.affectations : [],
    clients: Array.isArray(value?.clients) ? value.clients : [],
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function normalizeWorkspacePayload(
  value: Partial<CompanyWorkspacePayload> | null | undefined,
): CompanyWorkspacePayload {
  const base = emptyWorkspacePayload();
  if (!value) return base;

  return {
    parametres: normalizeParametres(value.parametres ?? base.parametres),
    employes: asArray<Employe>(value.employes).map((employe) => ({
      ...employe,
      prenom: employe.prenom ?? "",
      nom: employe.nom ?? "",
      statut: employe.statut === "desactive" ? "desactive" : ("actif" as const),
    })),
    clients: asArray<Client>(value.clients).map((client) =>
      normalizeClient({
        ...client,
        typeClient:
          client.typeClient === "professionnel" ? "professionnel" : "particulier",
        email: client.email ?? "",
        adresse: client.adresse ?? "",
        codePostal: client.codePostal ?? "",
        ville: client.ville ?? "",
      }),
    ),
    devis: asArray<Devis>(value.devis),
    factures: asArray<Facture>(value.factures),
    commandes: asArray<Commande>(value.commandes),
    chantiers: asArray<Chantier>(value.chantiers).map((chantier) => ({
      ...chantier,
      achats: Array.isArray(chantier.achats) ? chantier.achats : [],
    })),
    planning: asArray<EvenementPlanning>(value.planning).map((event) => ({
      ...event,
      employeIds: Array.isArray(event.employeIds) ? event.employeIds : [],
      employeTermineIds: Array.isArray(event.employeTermineIds)
        ? event.employeTermineIds
        : [],
      employeProblemes: Array.isArray(event.employeProblemes)
        ? event.employeProblemes
        : [],
    })),
    affectations: asArray<ChantierAffectation>(value.affectations),
    avoirs: asArray<Avoir>(value.avoirs),
    notifications: asArray<NotificationApp>(value.notifications),
    deletedNotificationKeys: asArray<string>(value.deletedNotificationKeys),
    relances: asArray<RelanceClient>(value.relances),
    bibliothequeEntreprise: normalizeBibliothequeEntreprise(
      value.bibliothequeEntreprise ?? base.bibliothequeEntreprise,
    ),
    mumIaHistorique: normalizeMumIaHistorique(
      value.mumIaHistorique ?? base.mumIaHistorique,
    ),
    chantierTimeEntries: asArray<ChantierTimeEntry>(value.chantierTimeEntries),
    localImportCompletedAt: value.localImportCompletedAt ?? null,
  };
}

export function appDataToWorkspace(
  data: AppData,
  localImportCompletedAt?: string | null,
): CompanyWorkspacePayload {
  return normalizeWorkspacePayload({
    parametres: data.parametres,
    employes: data.employes,
    clients: data.clients,
    devis: data.devis,
    factures: data.factures,
    commandes: data.commandes,
    chantiers: data.chantiers,
    planning: data.planning,
    affectations: data.affectations,
    avoirs: data.avoirs,
    notifications: data.notifications,
    deletedNotificationKeys: data.deletedNotificationKeys,
    relances: data.relances,
    bibliothequeEntreprise: data.bibliothequeEntreprise,
    mumIaHistorique: data.mumIaHistorique ?? [],
    chantierTimeEntries: data.chantierTimeEntries ?? [],
    localImportCompletedAt,
  });
}

export function workspaceToAppData(
  workspace: CompanyWorkspacePayload,
): AppData {
  return {
    parametres: workspace.parametres,
    employes: workspace.employes,
    clients: workspace.clients,
    devis: workspace.devis,
    factures: workspace.factures,
    commandes: workspace.commandes,
    chantiers: workspace.chantiers,
    planning: workspace.planning,
    affectations: workspace.affectations,
    avoirs: workspace.avoirs,
    notifications: workspace.notifications,
    deletedNotificationKeys: workspace.deletedNotificationKeys,
    relances: workspace.relances,
    bibliothequeEntreprise: workspace.bibliothequeEntreprise,
    mumIaHistorique: workspace.mumIaHistorique,
    chantierTimeEntries: workspace.chantierTimeEntries,
  };
}

/** Colonnes DB ↔ payload. */
export const WORKSPACE_SELECT_COLUMNS = [
  "parametres",
  "employes",
  "planning",
  "chantiers",
  "affectations",
  "clients",
  "devis",
  "factures",
  "commandes",
  "avoirs",
  "notifications",
  "deleted_notification_keys",
  "relances",
  "bibliotheque_entreprise",
  "mum_ia_historique",
  "chantier_time_entries",
  "local_import_completed_at",
  "updated_at",
].join(", ");

export function rowToWorkspace(row: Record<string, unknown>): CompanyWorkspacePayload {
  return normalizeWorkspacePayload({
    parametres: (row.parametres as Parametres) ?? undefined,
    employes: row.employes as Employe[],
    planning: row.planning as EvenementPlanning[],
    chantiers: row.chantiers as Chantier[],
    affectations: row.affectations as ChantierAffectation[],
    clients: row.clients as Client[],
    devis: row.devis as Devis[],
    factures: row.factures as Facture[],
    commandes: row.commandes as Commande[],
    avoirs: row.avoirs as Avoir[],
    notifications: row.notifications as NotificationApp[],
    deletedNotificationKeys: row.deleted_notification_keys as string[],
    relances: row.relances as RelanceClient[],
    bibliothequeEntreprise:
      row.bibliotheque_entreprise as BibliothequeEntreprise,
    mumIaHistorique: row.mum_ia_historique as MumIaHistoriqueEntry[],
    chantierTimeEntries: row.chantier_time_entries as ChantierTimeEntry[],
    localImportCompletedAt: (row.local_import_completed_at as string) ?? null,
  });
}

export function workspaceToDbWrite(payload: CompanyWorkspacePayload): Record<string, unknown> {
  const { connexionEmail: _ignored, ...parametresForStorage } =
    payload.parametres;
  return {
    parametres: normalizeParametres(parametresForStorage),
    employes: payload.employes,
    planning: payload.planning,
    chantiers: payload.chantiers,
    affectations: payload.affectations,
    clients: payload.clients,
    devis: payload.devis,
    factures: payload.factures,
    commandes: payload.commandes,
    avoirs: payload.avoirs,
    notifications: payload.notifications,
    deleted_notification_keys: payload.deletedNotificationKeys,
    relances: payload.relances,
    bibliotheque_entreprise: payload.bibliothequeEntreprise,
    mum_ia_historique: payload.mumIaHistorique,
    chantier_time_entries: payload.chantierTimeEntries,
    local_import_completed_at: payload.localImportCompletedAt ?? null,
    updated_at: new Date().toISOString(),
  };
}
