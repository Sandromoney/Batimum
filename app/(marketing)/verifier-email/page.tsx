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
  resendVerificationCode,
  verifyEmailCode,
} from "@/lib/auth-credentials";
import { canAccessCompanyOnboarding } from "@/lib/onboarding";

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
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
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
                onClick={() => router.push("/configurer-entreprise")}
              >
                Continuer l&apos;onboarding
              </Button>
            </section>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <VerificationCodeInput
                value={code}
                onChange={setCode}
                disabled={loading}
              />

              {error && (
                <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 px-3 py-2 text-sm text-[#1d4ed8]">
                  {message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || code.length !== 6}
              >
                {loading ? "Vérification…" : "Vérifier le code"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={resending || !email}
                onClick={() => void handleResend()}
              >
                {resending ? "Envoi…" : "Renvoyer le code"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
            >
              Retour à la connexion
            </Link>
          </p>
        </Card>
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </main>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
