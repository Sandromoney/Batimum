"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { EmployeeShell } from "@/components/employee-shell";
import { SubscriptionGuard } from "@/components/subscription-guard";
import {
  clearAccount,
  getAccount,
  isEmployeAccount,
  saveAccount,
} from "@/lib/account";
import {
  fetchEmployeeSession,
  logoutEmploye,
} from "@/lib/employee-access";
import { syncAppData } from "@/lib/app-sync";
import { useStore } from "@/lib/store";
import { createClient } from "@/utils/supabase/client";

const EMPLOYEE_HOME = "/planning-employe";

export function AppLayoutRouter({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setData } = useStore();
  const [layoutState, setLayoutState] = useState<
    "loading" | "ready" | "redirecting"
  >("loading");
  const [isEmploye, setIsEmploye] = useState(false);

  useEffect(() => {
    setData((previous) => {
      const synced = syncAppData(previous);
      return synced === previous ? previous : synced;
    });
  }, [pathname, setData]);

  useEffect(() => {
    let cancelled = false;

    async function resolveLayout() {
      // Espace employé : uniquement cookie employé.
      if (pathname.startsWith(EMPLOYEE_HOME)) {
        const session = await fetchEmployeeSession();
        if (cancelled) return;
        if (!session.ok || !session.account) {
          // Dirigeant connecté qui atterrit ici → dashboard, pas login employé.
          const supabase = createClient();
          if (supabase) {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user && data.session.access_token) {
              clearAccount();
              setLayoutState("redirecting");
              router.replace("/dashboard");
              return;
            }
          }
          clearAccount();
          setLayoutState("redirecting");
          router.replace("/login-employe");
          return;
        }
        saveAccount(session.account);
        setIsEmploye(true);
        setLayoutState("ready");
        return;
      }

      // Pages dirigeant : session Supabase prioritaire sur l'ancien cookie employé.
      const supabase = createClient();
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        const hasDirectorSession = Boolean(
          data.session?.user && data.session.access_token,
        );
        if (cancelled) return;

        if (hasDirectorSession) {
          // Un dirigeant connecté ne doit jamais être renvoyé vers l'espace employé.
          await logoutEmploye();
          if (cancelled) return;
          const account = getAccount();
          if (isEmployeAccount(account)) {
            clearAccount();
          }
          setIsEmploye(false);
          setLayoutState("ready");
          return;
        }
      }

      // Pas de session dirigeant : si cookie employé valide → espace employé.
      const employeeSession = await fetchEmployeeSession();
      if (cancelled) return;
      if (employeeSession.ok && employeeSession.account) {
        saveAccount(employeeSession.account);
        setLayoutState("redirecting");
        router.replace(EMPLOYEE_HOME);
        return;
      }

      const account = getAccount();
      if (isEmployeAccount(account)) {
        clearAccount();
      }

      if (cancelled) return;
      setIsEmploye(false);
      setLayoutState("ready");
    }

    setLayoutState("loading");
    void resolveLayout();

    return () => {
      cancelled = true;
    };
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
