"use client";

import { fetchMumIaQuota } from "@/lib/mum-ia-quota-client";
import type { MumIaQuotaSnapshot } from "@/lib/mum-ia-quota";
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

  return { quota, loading, refresh, setQuota };
}
