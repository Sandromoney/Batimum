/**
 * Message d'accueil du dashboard — façade branchée aux données Batimum.
 */

import type { UserAccount } from "@/lib/account";
import type { AppData, Parametres } from "@/lib/types";
import {
  getDashboardTodaySnapshot,
  type DashboardTodaySnapshot,
} from "@/lib/dashboard-today";
import {
  DASHBOARD_GENERIC_WELCOME_PHRASES,
  formatDashboardWelcomeTitle,
  getDashboardGreetingHour,
  looksLikeTechnicalDisplayName,
  pickDailyGenericWelcomePhrase,
  resolveDashboardWelcomeName,
  resolveDashboardWelcomeSubtitle,
  type DashboardWelcomeContextInput,
  type DashboardWelcomeNameInput,
} from "@/lib/dashboard-welcome-core";

export {
  DASHBOARD_GENERIC_WELCOME_PHRASES,
  formatDashboardWelcomeTitle,
  getDashboardGreetingHour,
  looksLikeTechnicalDisplayName,
  pickDailyGenericWelcomePhrase,
  resolveDashboardWelcomeName,
  resolveDashboardWelcomeSubtitle,
};
export type { DashboardWelcomeContextInput, DashboardWelcomeNameInput };

export function resolveDashboardWelcomeNameFromSources(options: {
  account?: UserAccount | null;
  parametres?: Pick<Parametres, "utilisateur" | "entreprise"> | null;
}): string {
  const account = options.account;
  const parametres = options.parametres;
  return resolveDashboardWelcomeName({
    prenom: account?.prenom,
    utilisateur: account?.utilisateur || parametres?.utilisateur,
    entreprise: account?.entreprise || parametres?.entreprise,
    email: account?.email,
  });
}

export function countInterventionsToday(
  data: AppData,
  referenceDate = new Date(),
): number {
  const y = referenceDate.getFullYear();
  const m = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const d = String(referenceDate.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${d}`;
  return data.planning.filter((event) => event.date === today).length;
}

export function countOnboardingStepsRemaining(data: AppData): number {
  const parametres = data.parametres;
  const companyConfigured = Boolean(
    parametres.entreprise?.trim() &&
      parametres.adresse?.trim() &&
      parametres.telephone?.trim(),
  );
  const hasSupplierTarif =
    (parametres.entreprisePriceLibrary?.entries?.length ?? 0) > 0 ||
    (parametres.tarifsFournisseurs?.length ?? 0) > 0;
  const hasIaDevis = (data.mumIaHistorique?.length ?? 0) > 0;
  const hasChantier = (data.chantiers?.length ?? 0) > 0;

  const done = [
    companyConfigured,
    hasSupplierTarif,
    hasIaDevis,
    hasChantier,
  ].filter(Boolean).length;

  return Math.max(0, 4 - done);
}

export function buildDashboardWelcomeSubtitleFromData(
  data: AppData,
  options?: {
    snapshot?: DashboardTodaySnapshot;
    referenceDate?: Date;
  },
): string {
  const referenceDate = options?.referenceDate ?? new Date();
  const snapshot =
    options?.snapshot ?? getDashboardTodaySnapshot(data, referenceDate);

  return resolveDashboardWelcomeSubtitle({
    interventionsToday: countInterventionsToday(data, referenceDate),
    devisEnAttente: snapshot.devisEnAttente,
    chantiersEnRetard: snapshot.chantiersEnRetard,
    onboardingStepsRemaining: countOnboardingStepsRemaining(data),
    referenceDate,
  });
}
