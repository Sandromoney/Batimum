"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  getAccount,
  saveAccount,
  type SubscriptionStatus,
  type UserAccount,
} from "@/lib/account";
import {
  finalizePendingSignupCredentials,
  getCredentials,
} from "@/lib/auth-credentials";
import { useStore } from "@/lib/store";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingFooter } from "@/components/marketing-footer";
import { Card } from "@/components/ui/card";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setData } = useStore();
  const [message, setMessage] = useState("Validation de votre essai en cours…");
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
          onboardingCompleted: existing?.onboardingCompleted ?? false,
        };

        saveAccount(account);
        finalizePendingSignupCredentials(account.email);

        setData((previous) => ({
          ...previous,
          parametres: {
            ...previous.parametres,
            entreprise: account.entreprise || previous.parametres.entreprise,
            utilisateur: account.utilisateur || previous.parametres.utilisateur,
            email: account.email || previous.parametres.email,
            telephone: account.telephone || previous.parametres.telephone,
          },
        }));

        const needsVerification = !getCredentials(account.email)?.emailVerified;
        const needsOnboarding = account.onboardingCompleted === false;
        setMessage(
          needsVerification
            ? "Essai activé. Vérification de votre email…"
            : needsOnboarding
              ? "Essai activé. Configuration de votre entreprise…"
              : "Essai activé. Redirection vers votre espace…",
        );
        window.setTimeout(() => {
          if (needsVerification) {
            router.replace("/verifier-email");
            return;
          }
          if (needsOnboarding) {
            router.replace("/configurer-entreprise");
            return;
          }
          router.replace("/dashboard");
        }, 1200);
      } catch {
        setFailed(true);
        setMessage("Erreur réseau lors de la validation.");
      }
    }

    void verify();
  }, [router, searchParams, setData]);

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-10">
        <Card className="w-full max-w-lg text-center">
          <BrandLogo variant="marketing" showSubtitle={false} />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">
            {failed ? "Validation impossible" : "Paiement confirmé"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{message}</p>
          {failed && (
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Réessayer
            </Link>
          )}
        </Card>
      </section>
      <MarketingFooter />
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </main>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
