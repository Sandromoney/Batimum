"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function ensureRecoverySession() {
      const supabase = createClient();
      if (!supabase) {
        setError("Configuration Supabase manquante.");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!cancelled) {
        if (!data.session) {
          setError(
            "Lien de récupération invalide ou expiré. Demandez un nouveau lien.",
          );
          setReady(false);
        } else {
          setReady(true);
        }
      }
    }
    void ensureRecoverySession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Impossible de mettre à jour le mot de passe.");
      return;
    }

    setMessage("Mot de passe mis à jour. Vous pouvez vous reconnecter.");
    window.setTimeout(() => router.replace("/login"), 1200);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-3">
            <BrandLogo variant="marketing" showSubtitle={false} />
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              Nouveau mot de passe
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Choisissez un nouveau mot de passe pour votre compte Batimum
              (Supabase Auth).
            </p>
          </header>

          {!ready && error ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
              <Link
                href="/mot-de-passe-oublie"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-border/80 bg-card px-5 py-3 text-sm font-medium"
              >
                Demander un nouveau lien
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <section>
                <Label>Nouveau mot de passe</Label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </section>
              <section>
                <Label>Confirmation</Label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </section>

              {error && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-xl border border-border bg-card-elevated/50 px-3 py-2 text-sm text-muted-foreground">
                  {message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !ready}
              >
                {loading ? "Enregistrement…" : "Enregistrer"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
