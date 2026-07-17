"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  canAccessApp,
  clearAccount,
  getAccount,
  isEmployeAccount,
  saveAccount,
  type UserAccount,
} from "@/lib/account";
import { getCredentials } from "@/lib/auth-credentials";
import {
  fetchEmployeeSession,
  logoutEmploye,
} from "@/lib/employee-access";
import { needsCompanyOnboarding, needsSubscriptionCheckout, getOnboardingRedirectPath } from "@/lib/onboarding";
import {
  ensureAppAccountFromSupabaseUser,
  finalizeDirectorLogin,
  isSupabaseAuthenticatedAccount,
} from "@/lib/supabase-auth";
import { createClient } from "@/utils/supabase/client";

type AccessState = "loading" | "granted" | "redirecting";

const EMPLOYEE_HOME = "/planning-employe";

export function SubscriptionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [accessState, setAccessState] = useState<AccessState>("loading");

  useEffect(() => {
    let cancelled = false;

    function redirectTo(path: string) {
      if (cancelled) return;
      setAccessState("redirecting");
      router.replace(path);
    }

    async function checkAccess() {
      if (pathname.startsWith("/signature/")) {
        setAccessState("granted");
        return;
      }

      // Espace employé : cookie employé uniquement (ignore Supabase dirigeant).
      if (pathname.startsWith(EMPLOYEE_HOME)) {
        const session = await fetchEmployeeSession();
        if (cancelled) return;
        if (!session.ok || !session.account) {
          const supabaseOnEmployeePath = createClient();
          if (supabaseOnEmployeePath) {
            const { data: directorData } =
              await supabaseOnEmployeePath.auth.getSession();
            if (
              directorData.session?.user &&
              directorData.session.access_token
            ) {
              clearAccount();
              redirectTo("/dashboard");
              return;
            }
          }
          clearAccount();
          redirectTo("/login-employe");
          return;
        }
        saveAccount(session.account);
        setAccessState("granted");
        return;
      }

      // Pages dirigeant : session Supabase d'abord.
      const supabase = createClient();
      if (!supabase) {
        redirectTo("/login?reason=supabase_config_missing");
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.log("[subscription-guard] Supabase getSession error:", error);
      }

      const hasSupabaseSession = Boolean(
        data.session?.user && data.session.access_token,
      );

      if (hasSupabaseSession) {
        // Priorité dirigeant : supprimer tout cookie employé résiduel.
        await logoutEmploye();
        if (cancelled) return;

        const existingAccount = getAccount();
        if (isEmployeAccount(existingAccount)) {
          clearAccount();
        }

        ensureAppAccountFromSupabaseUser(data.session!.user);

        let account = getAccount();
        if (!account) {
          redirectTo("/login");
          return;
        }

        // Inscription en cours (nouveau Google/email) → reprendre l'onboarding.
        // Compte existant avec flags locaux incomplets → finaliser et ouvrir le logiciel.
        if (account.onboardingCompleted !== true) {
          const step = account.onboardingStep ?? 1;
          const midSignup =
            step >= 2 &&
            step <= 4 &&
            account.subscriptionStatus !== "active" &&
            account.subscriptionStatus !== "trialing" &&
            !account.stripeSubscriptionId;

          if (midSignup) {
            const next =
              getOnboardingRedirectPath(account) ?? "/configurer-entreprise";
            redirectTo(next);
            return;
          }

          account = finalizeDirectorLogin(data.session!.user);
        }

        if (account.stripeSubscriptionId && !account.devBypass) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch("/api/stripe/sync-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscriptionId: account.stripeSubscriptionId,
              }),
              signal: controller.signal,
            });
            clearTimeout(timeout);
            if (response.ok) {
              const payload = (await response.json()) as {
                status: UserAccount["subscriptionStatus"];
                trialEndsAt?: string;
                currentPeriodEnd?: string;
              };
              saveAccount({
                ...account,
                subscriptionStatus: payload.status,
                trialEndsAt: payload.trialEndsAt ?? account.trialEndsAt,
                currentPeriodEnd:
                  payload.currentPeriodEnd ?? account.currentPeriodEnd,
              });
            }
          } catch {
            /* garde le statut local */
          }
        }

        if (cancelled) return;

        const updated = getAccount();

        const credentials = updated ? getCredentials(updated.email) : null;
        if (
          credentials &&
          !credentials.emailVerified &&
          !isSupabaseAuthenticatedAccount(updated)
        ) {
          redirectTo("/verifier-email");
          return;
        }

        const onboardingRedirect = getOnboardingRedirectPath(updated);
        if (
          onboardingRedirect &&
          !isSupabaseAuthenticatedAccount(updated)
        ) {
          redirectTo(onboardingRedirect);
          return;
        }

        if (
          needsCompanyOnboarding(updated) &&
          !isSupabaseAuthenticatedAccount(updated)
        ) {
          redirectTo("/configurer-entreprise");
          return;
        }

        if (needsSubscriptionCheckout(updated)) {
          redirectTo("/abonnement");
          return;
        }

        if (!canAccessApp(updated)) {
          redirectTo("/abonnement");
          return;
        }

        setAccessState("granted");
        return;
      }

      // Pas de session dirigeant : cookie employé → espace employé.
      const employeeSession = await fetchEmployeeSession();
      if (cancelled) return;
      if (employeeSession.ok && employeeSession.account) {
        saveAccount(employeeSession.account);
        redirectTo(EMPLOYEE_HOME);
        return;
      }

      const existingAccount = getAccount();
      if (isEmployeAccount(existingAccount)) {
        clearAccount();
      }

      // Session absente : toujours renvoyer vers la connexion (jamais l'inscription).
      const target = pathname.startsWith("/ia")
        ? "/login?reason=mumia_requires_auth"
        : "/login";
      redirectTo(target);
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (accessState !== "granted") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        {accessState === "redirecting" ? "Redirection…" : "Chargement…"}
      </div>
    );
  }

  return <>{children}</>;
}
