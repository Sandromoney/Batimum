"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth-credentials";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setResetCode(null);

    const result = requestPasswordReset(email);
    setMessage(result.message);
    setResetCode(result.resetCode ?? null);
    setLoading(false);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-3">
            <BrandLogo imageClassName="h-auto w-[180px] max-w-[180px] object-contain" />
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              Mot de passe oublié
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Indiquez votre email pour recevoir un code de réinitialisation.
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

            {message && (
              <p className="rounded-xl border border-border bg-card-elevated/50 px-3 py-2 text-sm text-muted-foreground">
                {message}
              </p>
            )}

            {resetCode && (
              <p className="rounded-xl border border-border bg-card-elevated/50 px-3 py-2 text-xs text-muted-foreground">
                Code de réinitialisation (simulation V1) :{" "}
                <span className="font-mono font-semibold text-foreground">
                  {resetCode}
                </span>
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Génération…" : "Obtenir un code"}
            </Button>
          </form>

          {resetCode && (
            <Button
              className="mt-4 w-full"
              variant="secondary"
              onClick={() =>
                router.push(
                  `/reinitialiser-mot-de-passe?email=${encodeURIComponent(email.trim().toLowerCase())}`,
                )
              }
            >
              Saisir le code et nouveau mot de passe
            </Button>
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
