import { AI_QUOTA_PRO_MONTHLY } from "@/lib/ai-quota";
import {
  formatParisDateLabel,
  formatParisDateLongLabel,
} from "@/lib/mum-ia-credit-period";

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
  breakdown?: {
    mumDevis: number;
    assistant: number;
    documentAnalysis: number;
    ocr: number;
    other: number;
  };
  percentageUsed?: number;
};

export function formatMumIaQuotaUsageLabel(
  used: number,
  monthlyIncluded = AI_QUOTA_PRO_MONTHLY,
): string {
  return `Utilisation MUM IA : ${used} / ${monthlyIncluded}`;
}

export function formatMumIaRenewalLabel(renewalDateIso: string): string {
  const label = formatParisDateLongLabel(renewalDateIso) || formatParisDateLabel(renewalDateIso);
  return label ? `Renouvellement : ${label}` : "";
}

export function buildMumIaQuotaExceededMessage(
  renewalDateIso: string,
  limit = AI_QUOTA_PRO_MONTHLY,
): string {
  const renewalLabel =
    formatParisDateLongLabel(renewalDateIso) || formatParisDateLabel(renewalDateIso);
  const renewalBlock = renewalLabel
    ? `\n\nVotre quota sera automatiquement réinitialisé le :\n${renewalLabel}`
    : "";
  return `Quota MUM IA atteint\n\nVous avez utilisé vos ${limit} demandes de devis IA pour cette période.${renewalBlock}`;
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
  "Quota MUM IA atteint\n\nVous avez utilisé vos 100 demandes de devis IA pour cette période.";
