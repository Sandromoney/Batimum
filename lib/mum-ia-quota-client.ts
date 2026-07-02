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
      used?: number;
      limit?: number;
      remaining?: number;
      monthlyIncluded?: number;
      packCredits?: number;
      renewalDate?: string;
      periodStart?: string;
      periodEnd?: string;
    };

    if (typeof body.used !== "number") return null;

    return buildMumIaQuotaSnapshot({
      used: body.used,
      monthlyIncluded: body.monthlyIncluded ?? 100,
      packCredits: 0,
      renewalDate: body.renewalDate ?? body.periodEnd ?? "",
      periodStart: body.periodStart ?? "",
      periodEnd: body.periodEnd ?? body.renewalDate ?? "",
    });
  } catch {
    return null;
  }
}
