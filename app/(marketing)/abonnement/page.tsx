"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import {
  OnboardingNav,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { Button } from "@/components/ui/button";
import { getAccount } from "@/lib/account";
import { getCredentials } from "@/lib/auth-credentials";
import {
  isStripeConfigured,
  PAYMENT_NOT_READY_MESSAGE,
} from "@/lib/dev-access";
import { needsSubscriptionCheckout } from "@/lib/onboarding";
import { getPublicSignupHref } from "@/lib/private-beta";
import { SIGNUP_STRIPE_ERROR_MESSAGE } from "@/lib/signup-validation";

const PLAN_FEATURES = [
  "7 jours d'essai gratuit",
  "Toutes les fonctionnalités Batimum",
  "Sans engagement — annulable à tout moment",
  "Support français",
  "Devis IA, pilotage, planning et facturation",
] as const;

export default function AbonnementPage() {
  const stripeReady = isStripeConfigured();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);

  useEffect(() => {
    const account = getAccount();
    if (!account) {
      window.location.replace(getPublicSignupHref());
      return;
    }

    const credentials = getCredentials(account.email);
    if (credentials && !credentials.emailVerified) {
      window.location.replace("/verifier-email");
      return;
    }

    // Inscription non terminée → reprendre le bon step (jamais écraser un compte terminé).
    if (account.onboardingCompleted !== true) {
      const step = account.onboardingStep ?? 1;
      if (step <= 2) {
        window.location.replace("/configurer-entreprise");
        return;
      }
      if (step === 3) {
        window.location.replace("/inscription/documents");
        return;
      }
      if (step === 4) {
        window.location.replace("/inscription/bancaire");
        return;
      }
    }

    if (!needsSubscriptionCheckout(account)) {
      window.location.replace("/dashboard");
      return;
    }

    setEmail(account.email);
    setReady(true);
  }, []);

  async function handleCheckout() {
    if (!email) return;
    setError("");
    setLoading(true);

    const account = getAccount();

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          billingCycle: "monthly",
          entreprise: account?.entreprise ?? "",
          utilisateur: account?.utilisateur ?? "",
          telephone: account?.telephone ?? "",
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? SIGNUP_STRIPE_ERROR_MESSAGE);
        setLoading(false);
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError(SIGNUP_STRIPE_ERROR_MESSAGE);
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  if (showPaymentStep) {
    return (
      <OnboardingShell
        step={6}
        title="Paiement sécurisé"
        description="Ajoutez votre carte bancaire pour démarrer l'essai. Aucun débit ne sera effectué aujourd'hui."
      >
        <section className="space-y-6">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-7 text-foreground">
            <p className="font-semibold text-foreground">
              Aucun débit aujourd&apos;hui.
            </p>
            <p className="mt-2 text-muted-foreground">
              Votre essai gratuit dure 7 jours. Vous ne serez débité qu&apos;à
              la fin de cette période si vous poursuivez votre abonnement. Vous
              pouvez annuler à tout moment.
            </p>
          </div>

          {!stripeReady ? (
            <p className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-center text-sm text-primary">
              {PAYMENT_NOT_READY_MESSAGE}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            className="w-full gap-2"
            disabled={loading || !stripeReady}
            onClick={() => void handleCheckout()}
          >
            <CreditCard className="h-4 w-4" />
            {loading
              ? "Redirection vers Stripe…"
              : "Ajouter ma carte et démarrer l'essai"}
          </Button>

          <button
            type="button"
            className="w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            onClick={() => setShowPaymentStep(false)}
          >
            Retour au choix du plan
          </button>
        </section>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      step={5}
      title="Votre offre Batimum"
      description="Une seule formule complète pour piloter votre entreprise du bâtiment."
    >
      <section className="space-y-6">
        <div className="rounded-2xl border border-[rgba(16,185,129,0.22)] bg-[#f8faf8] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Batimum Premium
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                39 €
                <span className="text-base font-medium text-muted-foreground">
                  {" "}
                  / mois
                </span>
              </p>
            </div>
            <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          </div>

          <ul className="mt-5 space-y-2.5">
            {PLAN_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm text-foreground"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-xs leading-6 text-muted-foreground">
          Paiement sécurisé par Stripe. Carte requise pour activer l&apos;essai,
          sans débit immédiat.
        </p>

        <OnboardingNav
          onBack={() => {
            window.location.href = "/inscription/bancaire";
          }}
          onNext={() => setShowPaymentStep(true)}
          nextLabel="Commencer mon essai gratuit"
        />

        <p className="text-center text-sm text-muted-foreground">
          Déjà abonné ?{" "}
          <Link
            href="/login"
            className="font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </section>
    </OnboardingShell>
  );
}
