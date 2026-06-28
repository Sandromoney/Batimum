"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { EmployeeShell } from "@/components/employee-shell";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { getAccount, isEmployeAccount } from "@/lib/account";
import { syncAppData } from "@/lib/app-sync";
import { useStore } from "@/lib/store";

const EMPLOYE_HOME = "/planning-employe";

export function AppLayoutRouter({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setData } = useStore();
  const [layoutState, setLayoutState] = useState<
    "loading" | "ready" | "redirecting"
  >("loading");

  useEffect(() => {
    setData((previous) => {
      const synced = syncAppData(previous);
      return synced === previous ? previous : synced;
    });
  }, [pathname, setData]);

  useEffect(() => {
    const account = getAccount();
    const isEmploye = isEmployeAccount(account);

    if (isEmploye && !pathname.startsWith(EMPLOYE_HOME)) {
      setLayoutState("redirecting");
      router.replace(EMPLOYE_HOME);
      return;
    }

    if (!isEmploye && pathname.startsWith(EMPLOYE_HOME)) {
      setLayoutState("redirecting");
      router.replace("/dashboard");
      return;
    }

    setLayoutState("ready");
  }, [pathname, router]);

  if (layoutState !== "ready") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        {layoutState === "redirecting" ? "Redirection…" : "Chargement…"}
      </div>
    );
  }

  if (pathname.startsWith("/signature/")) {
    return <>{children}</>;
  }

  const account = getAccount();
  const isEmploye = isEmployeAccount(account);

  return (
    <SubscriptionGuard>
      {isEmploye ? (
        <EmployeeShell>{children}</EmployeeShell>
      ) : (
        <AppShell>{children}</AppShell>
      )}
    </SubscriptionGuard>
  );
}
