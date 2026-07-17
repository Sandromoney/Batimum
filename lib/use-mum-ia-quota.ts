"use client";

import { fetchMumIaQuota } from "@/lib/mum-ia-quota-client";
import {
  MUM_IA_QUOTA_REFRESH_EVENT,
  MUM_IA_QUOTA_UPDATED_EVENT,
  type MumIaQuotaUpdatedDetail,
} from "@/lib/mum-ia-quota-events";
import {
  buildMumIaQuotaSnapshot,
  type MumIaQuotaSnapshot,
} from "@/lib/mum-ia-quota";
import { useCallback, useEffect, useState } from "react";

export function useMumIaQuota() {
  const [quota, setQuota] = useState<MumIaQuotaSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const snapshot = await fetchMumIaQuota();
    setQuota(snapshot);
    setLoading(false);
    return snapshot;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onRefresh() {
      void refresh();
    }

    function onUpdated(event: Event) {
      const custom = event as CustomEvent<MumIaQuotaUpdatedDetail>;
      const detail = custom.detail;
      if (!detail || typeof detail.used !== "number") return;
      const limit = detail.limit > 0 ? detail.limit : 100;
      const remaining =
        typeof detail.remaining === "number"
          ? detail.remaining
          : Math.max(0, limit - detail.used);
      setQuota((previous) => {
        const base = buildMumIaQuotaSnapshot({
          used: detail.used,
          monthlyIncluded: limit,
          packCredits: 0,
          renewalDate: detail.resetAt ?? previous?.renewalDate ?? "",
          periodStart: previous?.periodStart ?? "",
          periodEnd: detail.resetAt ?? previous?.periodEnd ?? "",
        });
        return {
          ...base,
          remaining,
          percentageUsed: Math.min(100, Math.round((detail.used / limit) * 100)),
        };
      });
      setLoading(false);
    }

    window.addEventListener(MUM_IA_QUOTA_REFRESH_EVENT, onRefresh);
    window.addEventListener(MUM_IA_QUOTA_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener(MUM_IA_QUOTA_REFRESH_EVENT, onRefresh);
      window.removeEventListener(MUM_IA_QUOTA_UPDATED_EVENT, onUpdated);
    };
  }, [refresh]);

  return { quota, loading, refresh, setQuota };
}
