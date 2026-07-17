import { getAccount } from "@/lib/account";
import {
  emptyAppData,
  LEGACY_DATA_KEY,
  scopedDataKey,
  scopedImportFlagKey,
} from "@/lib/app-data-empty";
import { normalizeBibliothequeEntreprise } from "@/lib/bibliotheque-entreprise";
import { normalizeClient } from "@/lib/clients";
import { normalizeMumIaHistorique } from "@/lib/mum-ia-historique";
import { normalizeParametres } from "@/lib/parametres";
import { normalizeThemePreference } from "@/lib/theme";
import type { AppData } from "@/lib/types";
import {
  appDataToWorkspace,
  workspaceToAppData,
  type CompanyWorkspacePayload,
} from "@/lib/user-settings-types";

function parseAppData(raw: string): AppData | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      parametres: normalizeParametres({
        ...emptyAppData().parametres,
        ...parsed.parametres,
        theme: normalizeThemePreference(parsed.parametres?.theme),
      }),
      clients: Array.isArray(parsed.clients)
        ? parsed.clients.map((client) =>
            normalizeClient({
              ...client,
              typeClient:
                client.typeClient === "professionnel"
                  ? "professionnel"
                  : "particulier",
              email: client.email ?? "",
              adresse: client.adresse ?? "",
              codePostal: client.codePostal ?? "",
              ville: client.ville ?? "",
            }),
          )
        : [],
      devis: Array.isArray(parsed.devis) ? parsed.devis : [],
      chantiers: Array.isArray(parsed.chantiers)
        ? parsed.chantiers.map((chantier) => ({
            ...chantier,
            achats: Array.isArray(chantier.achats) ? chantier.achats : [],
          }))
        : [],
      commandes: Array.isArray(parsed.commandes) ? parsed.commandes : [],
      factures: Array.isArray(parsed.factures) ? parsed.factures : [],
      avoirs: Array.isArray(parsed.avoirs) ? parsed.avoirs : [],
      employes: Array.isArray(parsed.employes) ? parsed.employes : [],
      planning: Array.isArray(parsed.planning) ? parsed.planning : [],
      affectations: Array.isArray(parsed.affectations) ? parsed.affectations : [],
      notifications: Array.isArray(parsed.notifications)
        ? parsed.notifications
        : [],
      deletedNotificationKeys: Array.isArray(parsed.deletedNotificationKeys)
        ? parsed.deletedNotificationKeys
        : [],
      relances: Array.isArray(parsed.relances) ? parsed.relances : [],
      bibliothequeEntreprise: normalizeBibliothequeEntreprise(
        parsed.bibliothequeEntreprise ?? emptyAppData().bibliothequeEntreprise,
      ),
      mumIaHistorique: normalizeMumIaHistorique(parsed.mumIaHistorique ?? []),
      chantierTimeEntries: Array.isArray(parsed.chantierTimeEntries)
        ? parsed.chantierTimeEntries
        : [],
    };
  } catch {
    return null;
  }
}

function countBusinessItems(data: AppData): number {
  return (
    data.clients.length +
    data.devis.length +
    data.factures.length +
    data.commandes.length +
    data.chantiers.length +
    data.planning.length +
    data.employes.length
  );
}

function emailsMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Import unique sécurisé des données localStorage legacy vers le workspace cloud.
 * N'importe que si le compte connecté correspond aux métadonnées locales.
 */
export function tryBuildLocalImport(
  ownerId: string,
  remote: CompanyWorkspacePayload | null,
): {
  data: AppData | null;
  shouldUpload: boolean;
  markImportDone: boolean;
} {
  if (typeof window === "undefined") {
    return { data: null, shouldUpload: false, markImportDone: false };
  }

  if (remote?.localImportCompletedAt) {
    return { data: null, shouldUpload: false, markImportDone: false };
  }

  if (localStorage.getItem(scopedImportFlagKey(ownerId)) === "1") {
    return { data: null, shouldUpload: false, markImportDone: false };
  }

  const account = getAccount();
  if (!account?.supabaseUserId || account.supabaseUserId !== ownerId) {
    return { data: null, shouldUpload: false, markImportDone: false };
  }

  // Préférer le cache scoped, sinon legacy global (une seule fois).
  const scopedRaw = localStorage.getItem(scopedDataKey(ownerId));
  const legacyRaw = localStorage.getItem(LEGACY_DATA_KEY);
  const raw = scopedRaw || legacyRaw;
  if (!raw) {
    return { data: null, shouldUpload: false, markImportDone: true };
  }

  const local = parseAppData(raw);
  if (!local || countBusinessItems(local) === 0) {
    return { data: null, shouldUpload: false, markImportDone: true };
  }

  // Isolation : si le cache legacy appartient clairement à un autre email, refuser.
  const localEmail = local.parametres.email?.trim();
  if (
    legacyRaw &&
    !scopedRaw &&
    localEmail &&
    account.email &&
    !emailsMatch(localEmail, account.email)
  ) {
    console.warn(
      "[local-import] refus : données legacy d'un autre email",
      localEmail,
      account.email,
    );
    return { data: null, shouldUpload: false, markImportDone: true };
  }

  const remoteCount = remote ? countBusinessItems(workspaceToAppData(remote)) : 0;
  if (remoteCount > 0) {
    // Cloud déjà peuplé — ne pas écraser ; marquer import terminé.
    return { data: null, shouldUpload: false, markImportDone: true };
  }

  return {
    data: local,
    shouldUpload: true,
    markImportDone: true,
  };
}

export function markLocalImportDone(ownerId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(scopedImportFlagKey(ownerId), "1");
  // Après import réussi, retirer le blob legacy partagé pour éviter les fuites.
  localStorage.removeItem(LEGACY_DATA_KEY);
}

export function writeScopedCache(ownerId: string, data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      ...data,
      devis: data.devis.map((d) => ({ ...d, signedPdfBase64: undefined })),
    };
    localStorage.setItem(scopedDataKey(ownerId), JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function readScopedCache(ownerId: string): AppData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(scopedDataKey(ownerId));
  if (!raw) return null;
  return parseAppData(raw);
}

export function workspaceOrEmpty(
  workspace: CompanyWorkspacePayload | null | undefined,
  accountEmail?: string,
  accountName?: string,
): AppData {
  if (workspace) return workspaceToAppData(workspace);
  return emptyAppData({
    email: accountEmail,
    utilisateur: accountName,
  });
}

export { appDataToWorkspace };
