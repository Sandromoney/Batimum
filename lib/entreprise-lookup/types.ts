/**
 * Lookup entreprise (SIRET / SIREN).
 *
 * Provider prévu : API Recherche d’Entreprises (data.gouv.fr)
 * https://recherche-entreprises.api.gouv.fr — open data, sans clé.
 *
 * État actuel : non branché. Aucune donnée inventée n’est renvoyée.
 */

export type EntrepriseLookupStatus =
  | "not_connected"
  | "invalid_query"
  | "not_found"
  | "ok"
  | "unavailable";

export type EntrepriseLookupResult = {
  status: EntrepriseLookupStatus;
  /** Message utilisateur (FR). */
  message: string;
  /** Présent uniquement si status === "ok". */
  entreprise?: EntrepriseLookupRecord;
};

export type EntrepriseLookupRecord = {
  siret: string;
  siren: string;
  denomination: string;
  adresse: string;
  codePostal: string;
  ville: string;
  /** Libellé d’activité (NAF) si disponible. */
  activite?: string;
  codeApe?: string;
  /** TVA intracom si dérivable / disponible — jamais inventée. */
  tvaIntracom?: string;
};

export type EntrepriseLookupProvider = {
  readonly id: string;
  readonly connected: boolean;
  lookupBySiret(siret: string): Promise<EntrepriseLookupResult>;
};

export function normalizeSiretDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

export function isValidSiretFormat(value: string): boolean {
  return /^\d{14}$/.test(normalizeSiretDigits(value));
}
