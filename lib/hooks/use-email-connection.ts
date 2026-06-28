"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchEmailConnectionStatus,
  type EmailConnectionStatus,
} from "@/lib/email-provider";

export function useEmailConnection() {
  const [status, setStatus] = useState<EmailConnectionStatus>({
    connected: false,
    expired: false,
    provider: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await fetchEmailConnectionStatus();
    setStatus(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    status,
    loading,
    connected: status.connected,
    expired: status.expired,
    email: status.email,
    refresh,
  };
}
