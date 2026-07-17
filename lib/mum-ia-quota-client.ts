import { authenticatedFetch } from "@/lib/mum-ia-api-client";
import {
  buildMumIaQuotaSnapshot,
  type MumIaQuotaSnapshot,
} from "@/lib/mum-ia-quota";

export async function fetchMumIaQuota(): Promise<MumIaQuotaSnapshot | null> {
  try {
    const response = await authenticatedFetch("/api/ai/usage", {}, "quota");
    if (!response.ok) return null;

    const body = (await response.json()) as {
      available?: boolean;
      used?: number;
      limit?: number;
      remaining?: number;
      monthlyIncluded?: number;
      packCredits?: number;
      renewalDate?: string;
      periodStart?: string;
      periodEnd?: string;
      percentageUsed?: number;
      breakdown?: MumIaQuotaSnapshot["breakdown"];
    };

    if (body.available === false || typeof body.used !== "number") return null;

    const snapshot = buildMumIaQuotaSnapshot({
      used: body.used,
      monthlyIncluded: body.monthlyIncluded ?? body.limit ?? 100,
      packCredits: 0,
      renewalDate: body.renewalDate ?? body.periodEnd ?? "",
      periodStart: body.periodStart ?? "",
      periodEnd: body.periodEnd ?? body.renewalDate ?? "",
    });

    return {
      ...snapshot,
      percentageUsed: body.percentageUsed,
      breakdown: body.breakdown ?? {
        mumDevis: 0,
        assistant: 0,
        documentAnalysis: 0,
        ocr: 0,
        other: 0,
      },
    };
  } catch {
    return null;
  }
}
