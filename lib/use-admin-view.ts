"use client";

import { useSyncExternalStore } from "react";
import { getAccount, isAdminAccount } from "@/lib/account";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getAdminSnapshot() {
  return isAdminAccount(getAccount());
}

/** true = dirigeant / admin (données pilotage visibles). */
export function useIsAdminView(): boolean {
  return useSyncExternalStore(subscribe, getAdminSnapshot, () => true);
}
