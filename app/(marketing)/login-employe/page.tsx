"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { authenticateEmployeLogin } from "@/lib/employee-access";

export default function LoginEmployePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <Link href="/landing" className="mb-8 flex items-center gap-3">
            <BrandLogo imageClassName="h-auto w-[180px] max-w-[180px] object-contain" />
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              Connexion employés
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Accédez à votre planning et à vos tâches.
            </p>
          </header>

          <form
            className="space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setLoading(true);

              const result = await authenticateEmployeLogin(identifier, password);
              if (!result.ok) {
                setLoading(false);
                setError(result.message);
                return;
              }

              router.push("/planning-employe");
            }}
          >
            <section>
              <Label>Email ou identifiant</Label>
              <Input
                type="text"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="vous@entreprise.fr"
                disabled={loading}
              />
            </section>
            <section>
              <Label>Mot de passe</Label>
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

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Dirigeant ou administrateur ?{" "}
            <Link
              href="/login"
              className="font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
            >
              Connexion
            </Link>
          </p>
        </Card>
      </section>
    </main>
  );
}
