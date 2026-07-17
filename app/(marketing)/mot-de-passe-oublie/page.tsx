"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      setLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reinitialiser-mot-de-passe")}`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    );

    setLoading(false);

    if (resetError) {
      setError(
        resetError.message ||
          "Impossible d'envoyer l'email de réinitialisation.",
      );
      return;
    }

    setMessage(
      "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé. Vérifiez votre boîte de réception.",
    );
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
              Mot de passe oublié
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Indiquez votre email. Vous recevrez un lien officiel Supabase pour
              choisir un nouveau mot de passe.
            </p>
          </header>

          <form className="space-y-5" onSubmit={handleSubmit}>
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Envoi…" : "Envoyer le lien"}
            </Button>
          </form>

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
