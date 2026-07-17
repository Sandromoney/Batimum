/** Événement navigateur : rafraîchir le quota MUM IA (fetch serveur). */

export const MUM_IA_QUOTA_REFRESH_EVENT = "mum-ia-quota-refresh";

/** Mise à jour instantanée du compteur (sans attendre le fetch). */
export const MUM_IA_QUOTA_UPDATED_EVENT = "mum-ia-quota-updated";

export type MumIaQuotaUpdatedDetail = {
  used: number;
  limit: number;
  remaining?: number;
  resetAt?: string;
};

export function broadcastMumIaQuotaRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MUM_IA_QUOTA_REFRESH_EVENT));
}

export function broadcastMumIaQuotaUpdated(detail: MumIaQuotaUpdatedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MUM_IA_QUOTA_UPDATED_EVENT, { detail }),
  );
}
