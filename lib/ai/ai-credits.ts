/**
 * Crédits IA uniques Batimum — MUM IA, Assistant et analyses partagent le même quota.
 */
import {
  AI_REQUESTS_LIMIT_DEFAULT,
  buildQuotaSnapshotFromUsage,
  checkUserAiQuota,
  getMumIaUsedCount,
  getOrCreateUserAiUsage,
  incrementUserAiUsage,
  type MumIaQuotaCheckResult,
  type UserAiUsageRow,
} from "@/lib/ai-usage-store";
import { formatParisDateLongLabel } from "@/lib/mum-ia-credit-period";

export type AiCreditCategory =
  | "mum_devis"
  | "assistant"
  | "document_analysis"
  | "ocr"
  | "other";

export type AiUsageBreakdown = {
  mumDevis: number;
  assistant: number;
  documentAnalysis: number;
  ocr: number;
  other: number;
};

export type AiUsageView = {
  quotaTotal: number;
  creditsUsed: number;
  creditsRemaining: number;
  percentageUsed: number;
  periodStart: string;
  periodEnd: string;
  renewalLabel: string;
  breakdown: AiUsageBreakdown;
  available: boolean;
  storageAvailable: boolean;
};

export const AI_QUOTA_MONTHLY_DEFAULT = AI_REQUESTS_LIMIT_DEFAULT;

const EMPTY_BREAKDOWN: AiUsageBreakdown = {
  mumDevis: 0,
  assistant: 0,
  documentAnalysis: 0,
  ocr: 0,
  other: 0,
};

/** Préfixe d'opération pour tracker la catégorie sans migration SQL. */
export function buildAiOperationId(
  category: AiCreditCategory,
  rawId: string,
): string {
  const clean = rawId.trim() || cryptoRandomId();
  if (
    clean.startsWith("mum_devis:") ||
    clean.startsWith("assistant:") ||
    clean.startsWith("document_analysis:") ||
    clean.startsWith("ocr:") ||
    clean.startsWith("other:")
  ) {
    return clean;
  }
  return `${category}:${clean}`;
}

function cryptoRandomId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseAiUsageBreakdown(
  generationIds: string[] | null | undefined,
): AiUsageBreakdown {
  const breakdown = { ...EMPTY_BREAKDOWN };
  if (!Array.isArray(generationIds)) return breakdown;

  for (const raw of generationIds) {
    const id = String(raw ?? "");
    if (id.startsWith("assistant:")) breakdown.assistant += 1;
    else if (id.startsWith("document_analysis:")) breakdown.documentAnalysis += 1;
    else if (id.startsWith("ocr:")) breakdown.ocr += 1;
    else if (id.startsWith("other:")) breakdown.other += 1;
    else if (id.startsWith("mum_devis:")) breakdown.mumDevis += 1;
    else breakdown.mumDevis += 1; // legacy = MUM devis
  }

  return breakdown;
}

export function getAiUsagePercentage(used: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

export function buildAiUsageView(usage: UserAiUsageRow): AiUsageView {
  const snapshot = buildQuotaSnapshotFromUsage(usage);
  return {
    quotaTotal: snapshot.limit,
    creditsUsed: snapshot.used,
    creditsRemaining: snapshot.remaining,
    percentageUsed: getAiUsagePercentage(snapshot.used, snapshot.limit),
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    renewalLabel: formatParisDateLongLabel(snapshot.renewalDate) || snapshot.renewalDate,
    breakdown: { ...EMPTY_BREAKDOWN, mumDevis: snapshot.used },
    available: true,
    storageAvailable: true,
  };
}

export async function getAiUsage(userId: string): Promise<AiUsageView> {
  const { usage, error } = await getOrCreateUserAiUsage(userId);
  if (!usage) {
    const fallbackEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    console.warn("[AI USAGE] storage unavailable", { userId, error });
    return {
      quotaTotal: AI_QUOTA_MONTHLY_DEFAULT,
      creditsUsed: 0,
      creditsRemaining: AI_QUOTA_MONTHLY_DEFAULT,
      percentageUsed: 0,
      periodStart: new Date().toISOString(),
      periodEnd: fallbackEnd,
      renewalLabel: formatParisDateLongLabel(fallbackEnd) || fallbackEnd,
      breakdown: { ...EMPTY_BREAKDOWN },
      available: false,
      storageAvailable: false,
    };
  }
  return buildAiUsageView(usage);
}

export async function checkAiCreditAvailable(
  userId: string,
): Promise<MumIaQuotaCheckResult> {
  return checkUserAiQuota(userId);
}

/**
 * Débite 1 crédit uniquement après succès technique exploitable.
 * category est encodée dans l'operationId pour la répartition.
 */
export async function consumeAiCreditAfterSuccess(
  userId: string,
  category: AiCreditCategory,
  operationId: string,
): Promise<{
  ok: boolean;
  alreadyCounted?: boolean;
  error?: string | null;
  usage?: AiUsageView;
}> {
  const prefixed = buildAiOperationId(category, operationId);
  const result = await incrementUserAiUsage(userId, prefixed);
  if (!result.usage) {
    return { ok: false, error: result.error };
  }
  return {
    ok: true,
    alreadyCounted: result.alreadyCounted,
    error: result.error,
    usage: buildAiUsageView(result.usage),
  };
}

export function logAiUsageEvent(params: {
  mode: string;
  category: AiCreditCategory;
  model: string;
  creditConsumed: number;
  used: number;
  total: number;
  durationMs?: number;
  success: boolean;
}) {
  const percent = getAiUsagePercentage(params.used, params.total);
  console.log("[AI USAGE]");
  console.log(`MODE: ${params.mode}`);
  console.log(`CATEGORY: ${params.category}`);
  console.log(`CREDIT: ${params.creditConsumed}`);
  console.log(`USED: ${params.used}/${params.total}`);
  console.log(`PERCENT: ${percent}`);
  console.log(`MODEL: ${params.model}`);
  console.log(`SUCCESS: ${params.success}`);
  if (params.durationMs != null) {
    console.log(`DURATION_MS: ${params.durationMs}`);
  }
}

export function buildQuotaExhaustedUserMessage(
  renewalLabel: string,
  limit = AI_QUOTA_MONTHLY_DEFAULT,
): string {
  const renewalBlock = renewalLabel
    ? `\n\nVotre quota sera automatiquement réinitialisé le :\n${renewalLabel}`
    : "";
  return `Quota IA atteint\n\nVous avez utilisé vos ${limit} utilisations IA pour cette période.${renewalBlock}`;
}

export function getUsedCountFromRow(usage: UserAiUsageRow): number {
  return getMumIaUsedCount(usage);
}
