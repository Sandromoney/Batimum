"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { GoogleContinueButton } from "@/components/google-continue-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import {
  canAccessApp,
  getAccount,
  isLegacyAppUser,
  saveAccount,
} from "@/lib/account";
import { authenticateCredentials, getCredentials, saveVerifiedPasswordCredentials } from "@/lib/auth-credentials";
import { isEmployeLoginIdentifier } from "@/lib/employee-access";
import { needsCompanyOnboarding } from "@/lib/onboarding";
import {
  createPrivateBetaAccount,
  isPrivateBetaEnabled,
  isPrivateBetaTestCredentials,
  PRIVATE_BETA_LOGIN_DENIED_MESSAGE,
  PRIVATE_BETA_TEST_EMAIL,
  PRIVATE_BETA_TEST_PASSWORD,
} from "@/lib/private-beta";
import {
  createDevAdminAccount,
  isDevAdminCredentials,
  isDevOpenAccess,
} from "@/lib/dev-access";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const oauthError = searchParams.get("error") ?? searchParams.get("message");
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
    const prefilledEmail = searchParams.get("email");
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [searchParams]);

  if (!mounted) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
        <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-3">
            <BrandLogo imageClassName="h-auto w-[180px] max-w-[180px] object-contain" />
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">Connexion</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isPrivateBetaEnabled()
                ? "Bêta privée — connectez-vous avec vos identifiants de test."
                : "Connectez-vous à votre espace Batimum."}
            </p>
          </header>

          <form
            className="space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setLoading(true);

              if (isPrivateBetaEnabled()) {
                if (!isPrivateBetaTestCredentials(email, password)) {
                  setLoading(false);
                  setError(PRIVATE_BETA_LOGIN_DENIED_MESSAGE);
                  return;
                }
                await saveVerifiedPasswordCredentials(
                  PRIVATE_BETA_TEST_EMAIL,
                  PRIVATE_BETA_TEST_PASSWORD,
                );
                saveAccount(createPrivateBetaAccount());
                router.push("/dashboard");
                return;
              }

              if (isDevAdminCredentials(email, password)) {
                saveAccount(createDevAdminAccount());
                router.push("/dashboard");
                return;
              }

              if (isLegacyAppUser() || isDevOpenAccess()) {
                router.push("/dashboard");
                return;
              }

              if (isEmployeLoginIdentifier(email)) {
                setLoading(false);
                setError(
                  "Cette page est réservée aux dirigeants. Utilisez la connexion employés.",
                );
                return;
              }

              const account = getAccount();
              const credentials = getCredentials(email);

              if (credentials && credentials.role !== "employe") {
                const auth = await authenticateCredentials(email, password);
                if (!auth.ok) {
                  setLoading(false);
                  if (auth.message.includes("Vérifiez votre email")) {
                    router.push("/verifier-email");
                    return;
                  }
                  setError(auth.message);
                  return;
                }
                if (!canAccessApp(account)) {
                  setLoading(false);
                  router.push("/abonnement");
                  return;
                }
                router.push(
                  needsCompanyOnboarding(account)
                    ? "/configurer-entreprise"
                    : "/dashboard",
                );
                return;
              }

              if (account && canAccessApp(account) && account.role !== "employe") {
                router.push(
                  needsCompanyOnboarding(account)
                    ? "/configurer-entreprise"
                    : "/dashboard",
                );
                return;
              }

              setLoading(false);
              setError("Email ou mot de passe incorrect.");
            }}
          >
            <section>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@entreprise.fr"
              />
            </section>
            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label>Mot de passe</Label>
                {!isPrivateBetaEnabled() ? (
                  <Link
                    href="/mot-de-passe-oublie"
                    className="text-xs font-medium text-primary no-underline hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                ) : null}
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </section>
            {error && (
              <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>

          {!isPrivateBetaEnabled() ? (
            <>
              <div className="relative my-6 py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/70" />
                </div>
                <p className="relative mx-auto w-fit bg-card px-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  ou
                </p>
              </div>

              <GoogleContinueButton flow="login" disabled={loading} />

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
                >
                  S&apos;inscrire
                </Link>
              </p>
            </>
          ) : null}
        </Card>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
          <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </section>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
