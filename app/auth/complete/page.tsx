"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";
import { getAccount, saveAccount } from "@/lib/account";
import { clearEmployeeSessionForDirectorLogin } from "@/lib/employee-access";
import { buildGoogleSignupAccount } from "@/lib/google-signup";
import { saveOnboardingFlowState } from "@/lib/onboarding-flow";
import {
  finalizeDirectorLogin,
} from "@/lib/supabase-auth";
import { createClient } from "@/utils/supabase/client";

function AuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flow = searchParams.get("flow") === "signup" ? "signup" : "login";
  const [message, setMessage] = useState("Finalisation de la connexion Google…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      await clearEmployeeSessionForDirectorLogin();

      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setFailed(true);
          setMessage("Configuration Supabase manquante.");
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) {
        if (!cancelled) {
          setFailed(true);
          setMessage(
            error?.message ??
              "Session Google invalide. Réessayez la connexion.",
          );
        }
        return;
      }

      const user = data.session.user;
      const email = user.email?.trim().toLowerCase() ?? "";
      if (!email) {
        if (!cancelled) {
          setFailed(true);
          setMessage("Impossible de lire l'email Google.");
        }
        return;
      }

      if (flow === "login") {
        finalizeDirectorLogin(user);
        if (!cancelled) {
          setMessage("Connexion réussie. Redirection…");
          router.replace("/dashboard");
        }
        return;
      }

      // Signup Google : compte déjà finalisé → dashboard ; sinon onboarding.
      const existing = getAccount();
      const alreadyCompleted =
        existing?.onboardingCompleted === true &&
        (existing.email?.toLowerCase() === email ||
          existing.supabaseUserId === user.id);

      if (alreadyCompleted) {
        finalizeDirectorLogin(user);
        if (!cancelled) {
          setMessage("Compte déjà actif. Redirection…");
          router.replace("/dashboard");
        }
        return;
      }

      const displayName =
        (user.user_metadata as { full_name?: string } | undefined)?.full_name ??
        email.split("@")[0];
      const draft = buildGoogleSignupAccount(email, displayName);
      saveAccount({
        ...draft,
        supabaseUserId: user.id,
        onboardingCompleted: false,
        onboardingStep: 2,
      });
      saveOnboardingFlowState({
        account: {
          prenom: draft.prenom ?? "",
          nom: draft.nom ?? "",
          email,
        },
      });

      if (!cancelled) {
        setMessage("Compte créé. Configuration de l'entreprise…");
        router.replace("/configurer-entreprise");
      }
    }

    void complete();
    return () => {
      cancelled = true;
    };
  }, [flow, router]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
        <Card className="w-full max-w-lg text-center">
          <BrandLogo variant="marketing" showSubtitle={false} />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">
            {failed ? "Connexion Google interrompue" : "Connexion Google"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {message}
          </p>
          {failed ? (
            <Link
              href={flow === "signup" ? "/signup" : "/login"}
              className="mt-8 flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Retour
            </Link>
          ) : null}
        </Card>
      </section>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </main>
      }
    >
      <AuthCompleteContent />
    </Suspense>
  );
}
