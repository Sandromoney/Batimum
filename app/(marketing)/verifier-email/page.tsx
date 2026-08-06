"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { AuthCloseButton } from "@/components/marketing/auth-close-button";
import { VerificationCodeInput } from "@/components/marketing/verification-code-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccount, updateAccount } from "@/lib/account";
import {
  getCredentials,
  getPendingSignupEmail,
  peekPendingSignupPassword,
  clearPendingSignupPassword,
  resendVerificationCode,
  verifyEmailCode,
} from "@/lib/auth-credentials";
import { getOnboardingFlowState } from "@/lib/onboarding-flow";
import { canAccessCompanyOnboarding } from "@/lib/onboarding";
import { ensureAppAccountFromSupabaseUser } from "@/lib/supabase-auth";
import { createClient } from "@/utils/supabase/client";

async function provisionAndSignInDirector(email: string): Promise<{
  ok: boolean;
  message?: string;
}> {
  const password = peekPendingSignupPassword();
  if (!password) {
    return {
      ok: false,
      message:
        "Session d'inscription expirée. Reprenez l'inscription pour créer votre espace entreprise.",
    };
  }

  const account = getAccount();
  const company = getOnboardingFlowState().company;

  const response = await fetch("/api/auth/provision-director", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      entreprise: account?.entreprise || company?.entreprise || "",
      utilisateur: account?.utilisateur || "",
      telephone: account?.telephone || company?.telephone || "",
      siret: company?.siret || "",
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    userId?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.ok || !payload.userId) {
    return {
      ok: false,
      message: payload?.error ?? "Impossible de créer votre compte entreprise.",
    };
  }

  const supabase = createClient();
  if (!supabase) {
    return { ok: false, message: "Configuration Supabase manquante." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      ok: false,
      message: error?.message ?? "Connexion après création impossible.",
    };
  }

  ensureAppAccountFromSupabaseUser(data.user);
  updateAccount({
    supabaseUserId: data.user.id,
    entreprise: account?.entreprise || company?.entreprise || "",
    telephone: account?.telephone || company?.telephone || "",
  });
  clearPendingSignupPassword();
  return { ok: true };
}

function VerifyEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const account = getAccount();
    const pending = getPendingSignupEmail();
    const resolved = pending ?? account?.email ?? "";
    setEmail(resolved);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (code.trim().length !== 6) {
      setError("Veuillez saisir le code à 6 chiffres.");
      return;
    }

    setLoading(true);
    const result = await verifyEmailCode(email, code);
    if (!result.ok) {
      setLoading(false);
      setError(result.message);
      return;
    }

    const provision = await provisionAndSignInDirector(email);
    setLoading(false);

    if (!provision.ok) {
      setError(provision.message ?? "Provision entreprise impossible.");
      return;
    }

    const account = getAccount();
    if (canAccessCompanyOnboarding(account)) {
      updateAccount({ onboardingStep: 2 });
      router.replace("/configurer-entreprise");
      return;
    }

    router.replace("/abonnement");
  }

  async function handleResend() {
    setError("");
    setMessage("");
    setResending(true);
    const result = await resendVerificationCode(email);
    setResending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
  }

  const alreadyVerified = email
    ? Boolean(getCredentials(email)?.emailVerified)
    : false;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="auth-close-bar">
        <AuthCloseButton />
      </div>
      <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-6xl items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md">
          <Link href="/landing" className="mb-8 flex items-center gap-3">
            <BrandLogo variant="marketing" showSubtitle={false} />
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              Vérifiez votre adresse email
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Nous avons envoyé un code de sécurité à 6 chiffres à l&apos;adresse
              renseignée.
            </p>
            {email ? (
              <p className="mt-2 text-sm font-medium text-foreground">{email}</p>
            ) : null}
          </header>

          {alreadyVerified ? (
            <section className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Votre email est déjà vérifié.
              </p>
              <Button
                className="w-full"
                onClick={async () => {
                  setLoading(true);
                  const provision = await provisionAndSignInDirector(email);
                  setLoading(false);
                  if (!provision.ok) {
                    setError(provision.message ?? "Provision impossible.");
                    return;
                  }
                  router.push("/configurer-entreprise");
                }}
                disabled={loading}
              >
                Continuer l&apos;onboarding
              </Button>
              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
            </section>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <VerificationCodeInput value={code} onChange={setCode} />
              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="text-sm text-muted-foreground">{message}</p>
              ) : null}
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Vérification…" : "Valider le code"}
              </Button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full text-sm text-muted-foreground underline-offset-2 hover:underline"
              >
                {resending ? "Envoi…" : "Renvoyer le code"}
              </button>
            </form>
          )}
        </Card>
      </section>
    </main>
  );
}

export default function VerifierEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
