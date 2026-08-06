"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  getAccount,
  updateAccount,
  type SubscriptionStatus,
} from "@/lib/account";
import {
  getOnboardingFlowState,
  resetOnboardingChecklistDismissed,
} from "@/lib/onboarding-flow";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingFooter } from "@/components/marketing-footer";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { saveUserSettings } from "@/lib/user-settings-client";

function AbonnementSuccessContent() {
  const searchParams = useSearchParams();
  const { setData } = useStore();
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
        const company = getOnboardingFlowState().company;
        const entreprise =
          payload.entreprise ||
          existing?.entreprise ||
          company?.entreprise ||
          "";
        const utilisateur =
          payload.utilisateur || existing?.utilisateur || "";
        const telephone =
          payload.telephone ||
          existing?.telephone ||
          company?.telephone ||
          "";

        // Fusionner : ne jamais écraser supabaseUserId / identité entreprise.
        if (existing) {
          updateAccount({
            entreprise,
            utilisateur,
            email: payload.email || existing.email,
            telephone,
            subscriptionStatus: payload.subscriptionStatus as SubscriptionStatus,
            stripeCustomerId: payload.stripeCustomerId,
            stripeSubscriptionId: payload.stripeSubscriptionId,
            trialEndsAt: payload.trialEndsAt,
            currentPeriodEnd: payload.currentPeriodEnd,
            onboardingCompleted: true,
            onboardingStep: 7,
          });
        }

        setData((previous) => {
          const nextParametres = {
            ...previous.parametres,
            entreprise: entreprise || previous.parametres.entreprise,
            utilisateur: utilisateur || previous.parametres.utilisateur,
            email: payload.email || previous.parametres.email,
            telephone: telephone || previous.parametres.telephone,
            siret: company?.siret || previous.parametres.siret || "",
          };
          const next = {
            ...previous,
            parametres: nextParametres,
          };

          if (existing?.supabaseUserId) {
            void saveUserSettings({
              parametres: nextParametres,
              employes: next.employes,
              appData: next,
            });
          }

          return next;
        });

        resetOnboardingChecklistDismissed();
        setMessage("Votre essai gratuit est activé. Votre entreprise est prête.");
      } catch {
        setFailed(true);
        setMessage("Impossible de valider le paiement.");
      }
    }

    void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on session_id
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <BrandLogo variant="marketing" imageClassName="mb-8" />
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
