"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { getAccount } from "@/lib/account";
import {
  isStripeConfigured,
  PAYMENT_NOT_READY_MESSAGE,
} from "@/lib/dev-access";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";

export default function AbonnementPage() {
  const stripeReady = isStripeConfigured();
  const [email, setEmail] = useState("");
  const [statusLabel, setStatusLabel] = useState("");

  useEffect(() => {
    const account = getAccount();
    if (account?.email) setEmail(account.email);
    if (account?.subscriptionStatus === "canceled") {
      setStatusLabel("Votre abonnement a été annulé.");
    } else if (account?.subscriptionStatus === "expired") {
      setStatusLabel("Votre essai ou abonnement a expiré.");
    } else {
      setStatusLabel("Un abonnement actif est requis pour accéder à l'application.");
    }
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
        <Card className="w-full max-w-xl border-primary/30 shadow-glow">
          <Link href="/" className="mb-8 flex justify-center">
            <BrandLogo variant="landing" showSubtitle={false} />
          </Link>

          <header className="mb-8 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Abonnement
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Réactiver Batimum Premium
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {statusLabel}
            </p>
          </header>

          <section className="mb-8 rounded-2xl border border-border bg-card-elevated/60 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  Batimum Premium
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  7 jours d&apos;essai gratuit, puis 29€/mois
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Annulation avant la fin de l&apos;essai : aucun débit.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                Paiement sécurisé Stripe
              </span>
            </div>
          </section>

          {!stripeReady && (
            <p className="mb-6 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-center text-sm text-primary">
              {PAYMENT_NOT_READY_MESSAGE}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href={
                email
                  ? `/signup?email=${encodeURIComponent(email)}`
                  : "/signup"
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              <CreditCard className="h-4 w-4" />
              Démarrer l&apos;essai gratuit
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-card"
            >
              Se connecter
            </Link>
          </div>
        </Card>
      </section>
    </main>
  );
}
