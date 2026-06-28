"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { getAccount } from "@/lib/account";
import { needsCompanyOnboarding } from "@/lib/onboarding";
import {
  getCredentials,
  getPendingSignupEmail,
  getVerificationCodeForEmail,
  verifyEmailCode,
} from "@/lib/auth-credentials";

function VerifyEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const account = getAccount();
    const pending = getPendingSignupEmail();
    const resolved = pending ?? account?.email ?? "";
    setEmail(resolved);
    if (resolved) {
      setDevCode(getVerificationCodeForEmail(resolved));
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const result = await verifyEmailCode(email, code);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    window.setTimeout(() => {
      const account = getAccount();
      if (needsCompanyOnboarding(account)) {
        router.replace("/configurer-entreprise");
        return;
      }
      router.replace("/dashboard");
    }, 1200);
  }

  const alreadyVerified = email
    ? Boolean(getCredentials(email)?.emailVerified)
    : false;

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-3">
            <BrandLogo imageClassName="h-auto w-[180px] max-w-[180px] object-contain" />
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              Vérification email
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Saisissez le code reçu par email pour activer votre compte.
            </p>
          </header>

          {alreadyVerified ? (
            <section className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Votre email est déjà vérifié.
              </p>
              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                Accéder à l&apos;espace
              </Button>
            </section>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <section>
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setDevCode(getVerificationCodeForEmail(event.target.value));
                  }}
                  placeholder="vous@entreprise.fr"
                />
              </section>
              <section>
                <Label>Code de vérification</Label>
                <Input
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                />
              </section>

              {devCode && process.env.NODE_ENV === "development" && (
                <p className="rounded-xl border border-border bg-card-elevated/50 px-3 py-2 text-xs text-muted-foreground">
                  Code de vérification (simulation V1) :{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {devCode}
                  </span>
                </p>
              )}

              {error && (
                <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {message}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Vérification…" : "Vérifier mon email"}
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
