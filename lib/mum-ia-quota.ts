import { AI_QUOTA_PRO_MONTHLY } from "@/lib/ai-quota";
import { formatParisDateLabel } from "@/lib/mum-ia-credit-period";

export const MUM_IA_QUOTA_WARNING_THRESHOLD = 80;

export type MumIaQuotaTone = "normal" | "warning" | "exhausted";

export type MumIaQuotaSnapshot = {
  used: number;
  limit: number;
  remaining: number;
  monthlyIncluded: number;
  packCredits: number;
  renewalDate: string;
  periodStart: string;
  periodEnd: string;
};

export function formatMumIaQuotaUsageLabel(
  used: number,
  monthlyIncluded = AI_QUOTA_PRO_MONTHLY,
): string {
  return `Devis MUM IA : ${used} / ${monthlyIncluded} utilisés ce mois-ci`;
}

export function formatMumIaRenewalLabel(renewalDateIso: string): string {
  const label = formatParisDateLabel(renewalDateIso);
  return label ? `Renouvellement le : ${label}` : "";
}

export function buildMumIaQuotaExceededMessage(renewalDateIso: string): string {
  const renewalLabel = formatParisDateLabel(renewalDateIso);
  const renewalSentence = renewalLabel
    ? ` Renouvellement le ${renewalLabel}.`
    : "";
  return `Vous avez utilisé vos 100 demandes IA ce mois-ci.${renewalSentence}`;
}

export function getMumIaQuotaTone(
  used: number,
  monthlyIncluded = AI_QUOTA_PRO_MONTHLY,
): MumIaQuotaTone {
  if (used >= monthlyIncluded) return "exhausted";
  if (used >= MUM_IA_QUOTA_WARNING_THRESHOLD) return "warning";
  return "normal";
}

export function buildMumIaQuotaSnapshot(params: {
  used: number;
  monthlyIncluded: number;
  packCredits?: number;
  renewalDate: string;
  periodStart: string;
  periodEnd: string;
}): MumIaQuotaSnapshot {
  const packCredits = 0;
  const limit = params.monthlyIncluded;
  return {
    used: params.used,
    limit,
    remaining: Math.max(0, limit - params.used),
    monthlyIncluded: params.monthlyIncluded,
    packCredits,
    renewalDate: params.renewalDate,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  };
}

/** @deprecated Utiliser buildMumIaQuotaExceededMessage(renewalDate) */
export const MUM_IA_QUOTA_EXCEEDED_MESSAGE =
  "Désolé, vous n'avez plus de crédits IA disponibles pour ce mois-ci. Vos 100 devis MUM IA ont été utilisés.";
