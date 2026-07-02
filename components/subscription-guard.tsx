"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  canAccessApp,
  getAccount,
  saveAccount,
  type UserAccount,
} from "@/lib/account";
import { getCredentials } from "@/lib/auth-credentials";
import { needsCompanyOnboarding } from "@/lib/onboarding";
import {
  getPublicSignupHref,
  isPrivateBetaEnabled,
} from "@/lib/private-beta";
import {
  ensureAppAccountFromSupabaseUser,
  isSupabaseAuthenticatedAccount,
} from "@/lib/supabase-auth";
import { createClient } from "@/utils/supabase/client";

type AccessState = "loading" | "granted" | "redirecting";

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

      const supabase = createClient();
      if (!supabase) {
        redirectTo("/login?reason=supabase_config_missing");
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.log("[subscription-guard] Supabase getSession error:", error);
      }

      const hasSupabaseSession = Boolean(data.session?.user && data.session.access_token);
      if (!hasSupabaseSession) {
        const target = pathname.startsWith("/ia")
          ? "/login?reason=mumia_requires_auth"
          : isPrivateBetaEnabled()
            ? "/login"
            : getPublicSignupHref();
        redirectTo(target);
        return;
      }

      ensureAppAccountFromSupabaseUser(data.session!.user);

      const account = getAccount();
      if (!account) {
        redirectTo(isPrivateBetaEnabled() ? "/login" : getPublicSignupHref());
        return;
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
      if (!canAccessApp(updated)) {
        redirectTo("/abonnement");
        return;
      }

      const credentials = updated ? getCredentials(updated.email) : null;
      if (
        credentials &&
        !credentials.emailVerified &&
        !isSupabaseAuthenticatedAccount(updated)
      ) {
        redirectTo("/verifier-email");
        return;
      }

      if (
        needsCompanyOnboarding(updated) &&
        !isSupabaseAuthenticatedAccount(updated)
      ) {
        redirectTo("/configurer-entreprise");
        return;
      }

      setAccessState("granted");
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
