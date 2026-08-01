"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { GoogleContinueButton } from "@/components/google-continue-button";
import { AuthSplitLayout } from "@/components/marketing/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { clearEmployeeSessionForDirectorLogin } from "@/lib/employee-access";
import { isPrivateBetaEnabled } from "@/lib/private-beta";
import { finalizeDirectorLogin } from "@/lib/supabase-auth";
import { createClient } from "@/utils/supabase/client";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devAutoLogin, setDevAutoLogin] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadDevMode() {
      try {
        const response = await fetch("/api/dev-login", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) return;
        const body = (await response.json().catch(() => null)) as {
          enabled?: boolean;
        } | null;
        if (!cancelled) {
          setDevAutoLogin(Boolean(body?.enabled));
        }
      } catch {
        if (!cancelled) setDevAutoLogin(false);
      }
    }
    void loadDevMode();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const oauthError = searchParams.get("error") ?? searchParams.get("message");
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
    const reason = searchParams.get("reason");
    if (reason === "mumia_requires_auth") {
      setError("Veuillez vous connecter avec votre compte pour utiliser MUM IA.");
    }
    if (reason === "supabase_config_missing") {
      setError("Configuration Supabase manquante. Contactez le support.");
    }
    const prefilledEmail = searchParams.get("email");
    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }
  }, [searchParams]);

  async function completeDirectorSession() {
    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      return false;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user;
    const accessToken = sessionData.session?.access_token;

    if (!sessionUser || !accessToken || !sessionUser.id) {
      setError("Session Supabase invalide après connexion.");
      return false;
    }

    if (process.env.NODE_ENV === "development") {
      const diagnosticsResponse = await fetch("/api/ia/diagnostics", {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!diagnosticsResponse.ok) {
        const body = (await diagnosticsResponse.json().catch(() => null)) as
          | { error?: string; message?: string; debugMessage?: string }
          | null;
        setError(
          body?.debugMessage ??
            body?.message ??
            body?.error ??
            "Impossible de valider l'accès MUM IA après connexion.",
        );
        return false;
      }
    }

    finalizeDirectorLogin(sessionUser);
    await clearEmployeeSessionForDirectorLogin();
    return true;
  }

  async function handleDevAutoLogin() {
    setError("");
    setLoading(true);
    await clearEmployeeSessionForDirectorLogin();

    try {
      const response = await fetch("/api/dev-login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !body?.ok) {
        setLoading(false);
        setError(body?.error ?? "Auto-connexion développeur impossible.");
        return;
      }

      const ok = await completeDirectorSession();
      setLoading(false);
      if (ok) {
        router.replace("/dashboard");
      }
    } catch {
      setLoading(false);
      setError("Auto-connexion développeur impossible.");
    }
  }

  async function handlePasswordLogin() {
    setError("");
    setLoading(true);

    await clearEmployeeSessionForDirectorLogin();

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Configuration Supabase manquante.");
      return;
    }

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (signInError) {
      console.log("[login] Supabase signInWithPassword error:", signInError);
      setLoading(false);
      setError(signInError.message);
      return;
    }

    if (!signInData.session?.user) {
      setLoading(false);
      setError("Session Supabase invalide après connexion.");
      return;
    }

    // Synchronise le client avec la session fraîchement créée.
    await supabase.auth.getSession();
    const ok = await completeDirectorSession();
    setLoading(false);
    if (ok) {
      router.replace("/dashboard");
    }
  }

  if (!mounted) {
    return (
      <AuthSplitLayout>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <Card className="w-full">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <BrandLogo variant="marketing" showSubtitle={false} />
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Connexion</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isPrivateBetaEnabled()
              ? "Bêta privée — connectez-vous avec vos identifiants de test."
              : "Connectez-vous à votre espace Batimum."}
          </p>
          {devAutoLogin ? (
            <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground">
              Mode connexion développeur
            </p>
          ) : null}
        </header>

        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (devAutoLogin) {
              await handleDevAutoLogin();
              return;
            }
            await handlePasswordLogin();
          }}
        >
          {!devAutoLogin ? (
            <>
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
            </>
          ) : (
            <p className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Un clic sur Connexion ouvre directement le compte de
              développement local.
            </p>
          )}

          {error && (
            <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        {!isPrivateBetaEnabled() && !devAutoLogin ? (
          <>
            <div className="relative my-6 py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/70" />
              </div>
              <p className="relative mx-auto w-fit bg-card px-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                ou
              </p>
            </div>

            <GoogleContinueButton
              flow="login"
              disabled={loading}
              onBeforeRedirect={async () => {
                await clearEmployeeSessionForDirectorLogin();
                return true;
              }}
            />

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
    </AuthSplitLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthSplitLayout>
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </AuthSplitLayout>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
