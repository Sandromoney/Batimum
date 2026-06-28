"use client";

import { getAccount } from "@/lib/account";
import { useStore } from "@/lib/store";
import type { Employe } from "@/lib/types";

export function useEmployeeSession(): {
  employeId: string;
  employe: Employe | undefined;
  displayName: string;
} {
  const { data } = useStore();
  const account = getAccount();
  const employeId = account?.employeId ?? "";
  const employe = data.employes.find((item) => item.id === employeId);
  const displayName = employe?.prenom?.trim() || account?.utilisateur || "Employé";

  return { employeId, employe, displayName };
}
