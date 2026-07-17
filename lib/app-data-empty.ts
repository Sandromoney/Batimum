import type { AppData } from "@/lib/types";
import { DEFAULT_BIBLIOTHEQUE_ENTREPRISE } from "@/lib/bibliotheque-entreprise";
import { DEFAULT_PARAMETRES, normalizeParametres } from "@/lib/parametres";

/** Workspace vide pour un compte cloud — jamais les données démo. */
export function emptyAppData(partialParametres?: Partial<AppData["parametres"]>): AppData {
  return {
    parametres: normalizeParametres({
      ...DEFAULT_PARAMETRES,
      ...partialParametres,
      entreprise: partialParametres?.entreprise ?? "",
      email: partialParametres?.email ?? "",
      utilisateur: partialParametres?.utilisateur ?? "",
    }),
    bibliothequeEntreprise: DEFAULT_BIBLIOTHEQUE_ENTREPRISE,
    mumIaHistorique: [],
    clients: [],
    devis: [],
    chantiers: [],
    commandes: [],
    factures: [],
    avoirs: [],
    employes: [],
    planning: [],
    affectations: [],
    notifications: [],
    deletedNotificationKeys: [],
    relances: [],
    chantierTimeEntries: [],
  };
}

export const LEGACY_DATA_KEY = "btp-gestion-data";
export const LEGACY_ACCOUNT_KEY = "btp-gestion-account";

export function scopedDataKey(ownerId: string): string {
  return `btp-gestion-data:${ownerId}`;
}

export function scopedImportFlagKey(ownerId: string): string {
  return `btp-gestion-local-import-done:${ownerId}`;
}

export function clearOwnerCaches(ownerId?: string | null): void {
  if (typeof window === "undefined") return;
  if (ownerId) {
    localStorage.removeItem(scopedDataKey(ownerId));
    localStorage.removeItem(scopedImportFlagKey(ownerId));
  }
  // Ne pas supprimer LEGACY_DATA_KEY ici — réservé à l'import unique réussi.
}

export function clearAllAppDataCaches(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (
      key &&
      (key === LEGACY_DATA_KEY ||
        key.startsWith("btp-gestion-data:") ||
        key.startsWith("btp-gestion-local-import-done:") ||
        key.startsWith("btp-gestion-signed-pdf:"))
    ) {
      keys.push(key);
    }
  }
  for (const key of keys) localStorage.removeItem(key);
}
