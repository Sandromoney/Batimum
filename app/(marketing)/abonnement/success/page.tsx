"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  getAccount,
  saveAccount,
  type SubscriptionStatus,
  type UserAccount,
} from "@/lib/account";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingFooter } from "@/components/marketing-footer";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

function AbonnementSuccessContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Activation de votre essai en cours…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setFailed(true);
      setMessage("Session de paiement introuvable.");
      return;
    }

    async function verify() {
      try {
        const response = await fetch("/api/stripe/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const payload = await response.json();

        if (!response.ok) {
          setFailed(true);
          setMessage(payload.error ?? "Échec de la validation.");
          return;
        }

        const existing = getAccount();
        const account: UserAccount = {
          entreprise: payload.entreprise ?? existing?.entreprise ?? "",
          utilisateur: payload.utilisateur ?? existing?.utilisateur ?? "",
          email: payload.email ?? existing?.email ?? "",
          telephone: payload.telephone ?? existing?.telephone ?? "",
          subscriptionStatus: payload.subscriptionStatus as SubscriptionStatus,
          stripeCustomerId: payload.stripeCustomerId,
          stripeSubscriptionId: payload.stripeSubscriptionId,
          trialEndsAt: payload.trialEndsAt,
          currentPeriodEnd: payload.currentPeriodEnd,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          onboardingCompleted: existing?.onboardingCompleted,
        };
        saveAccount(account);
        setMessage("Votre essai gratuit est activé.");
      } catch {
        setFailed(true);
        setMessage("Impossible de valider le paiement.");
      }
    }

    void verify();
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <BrandLogo variant="landing" imageClassName="mb-8" />
        <Card className="space-y-4 p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {failed ? "Activation incomplète" : "Bienvenue sur Batimum"}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          {!failed ? (
            <ButtonLink href="/dashboard" className="w-full justify-center">
              Accéder à l&apos;application
            </ButtonLink>
          ) : (
            <ButtonLink href="/signup" variant="secondary" className="w-full justify-center">
              Réessayer
            </ButtonLink>
          )}
        </Card>
      </div>
      <MarketingFooter />
    </main>
  );
}

export default function AbonnementSuccessPage() {
  return (
    <Suspense>
      <AbonnementSuccessContent />
    </Suspense>
  );
}
