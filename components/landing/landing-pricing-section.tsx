"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { Card } from "@/components/ui/card";
import { isStripeConfigured } from "@/lib/dev-access";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";
import { cn } from "@/lib/utils";

const MONTHLY_PRICE = 39;
const YEARLY_MONTHLY_PRICE = 29;
const YEARLY_TOTAL = 348;
const YEARLY_SAVINGS = 120;

const PREMIUM_FEATURES = [
  "100 devis MUM IA inclus chaque mois",
  "Clients, devis et chantiers illimités",
  "Devis → facture automatiquement",
  "Espace employé distinct",
  "Signature électronique intégrée",
  "Support français",
  "Toutes les futures mises à jour incluses",
] as const;

type BillingCycle = "monthly" | "yearly";

function BillingSwitch({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div
      className={cn(
        "landing-billing-switch relative grid grid-cols-2 rounded-xl p-1 text-sm font-medium",
        value === "yearly" && "landing-billing-switch--yearly",
      )}
      role="tablist"
      aria-label="Formule d'abonnement"
    >
      <span className="landing-billing-switch__thumb" aria-hidden="true" />
      <button
        type="button"
        role="tab"
        aria-selected={value === "monthly"}
        onClick={() => onChange("monthly")}
        className={cn(
          "landing-billing-switch__btn relative z-10 rounded-lg px-4 py-2 transition-colors duration-300",
          value === "monthly" && "landing-billing-switch__btn--active",
        )}
      >
        Mensuel
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "yearly"}
        onClick={() => onChange("yearly")}
        className={cn(
          "landing-billing-switch__btn relative z-10 rounded-lg px-4 py-2 transition-colors duration-300",
          value === "yearly" && "landing-billing-switch__btn--active",
        )}
      >
        Annuel
      </button>
    </div>
  );
}

function PricingFeature({ text }: { text: string }) {
  return (
    <li className="landing-pricing-feature group flex items-start gap-3 text-sm">
      <span className="landing-pricing-feature__check mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="leading-6 text-foreground/90">{text}</span>
    </li>
  );
}

function PriceDisplay({
  billingCycle,
  animDirection,
  reducedMotion,
}: {
  billingCycle: BillingCycle;
  animDirection: "to-yearly" | "to-monthly" | null;
  reducedMotion: boolean;
}) {
  const isYearly = billingCycle === "yearly";

  return (
    <p
      className={cn(
        "landing-pricing-price-stack inline-flex items-baseline gap-1.5",
        !reducedMotion && animDirection === "to-yearly" &&
          "landing-pricing-price-stack--to-yearly",
        !reducedMotion && animDirection === "to-monthly" &&
          "landing-pricing-price-stack--to-monthly",
      )}
      aria-live="polite"
    >
      <span className="relative inline-block h-[3.25rem] w-[5.5rem] overflow-hidden sm:w-[6rem]">
        <span
          className={cn(
            "landing-pricing-price landing-pricing-price--monthly absolute inset-0 text-5xl font-semibold tracking-[-0.04em] text-foreground",
            !animDirection &&
              (isYearly
                ? "landing-pricing-price--resting-below"
                : "landing-pricing-price--active"),
          )}
          aria-hidden={isYearly}
        >
          {MONTHLY_PRICE}€
        </span>
        <span
          className={cn(
            "landing-pricing-price landing-pricing-price--yearly absolute inset-0 text-5xl font-semibold tracking-[-0.04em] text-foreground",
            !animDirection &&
              (isYearly
                ? "landing-pricing-price--active"
                : "landing-pricing-price--resting-below"),
          )}
          aria-hidden={!isYearly}
        >
          {YEARLY_MONTHLY_PRICE}€
        </span>
      </span>
      <span className="text-base font-medium text-muted-foreground">/ mois</span>
    </p>
  );
}

export function LandingPricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [yearlyExtrasVisible, setYearlyExtrasVisible] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [cardGlow, setCardGlow] = useState(false);
  const [priceAnimDirection, setPriceAnimDirection] = useState<
    "to-yearly" | "to-monthly" | null
  >(null);
  const reducedMotion = usePrefersReducedMotion();
  const stripeReady = isStripeConfigured();
  const isFirstRender = useRef(true);

  const handleBillingChange = useCallback((cycle: BillingCycle) => {
    setBillingCycle(cycle);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (reducedMotion) {
      setPriceAnimDirection(null);
      setYearlyExtrasVisible(billingCycle === "yearly");
      setBadgeVisible(billingCycle === "yearly");
      setCardGlow(false);
      return;
    }

    setPriceAnimDirection(
      billingCycle === "yearly" ? "to-yearly" : "to-monthly",
    );

    const animTimer = window.setTimeout(() => setPriceAnimDirection(null), 650);

    if (billingCycle === "yearly") {
      setCardGlow(true);
      const glowTimer = window.setTimeout(() => setCardGlow(false), 500);
      setBadgeVisible(false);
      const badgeTimer = window.setTimeout(() => setBadgeVisible(true), 360);
      const extrasTimer = window.setTimeout(() => setYearlyExtrasVisible(true), 320);

      return () => {
        window.clearTimeout(animTimer);
        window.clearTimeout(glowTimer);
        window.clearTimeout(badgeTimer);
        window.clearTimeout(extrasTimer);
      };
    }

    setCardGlow(false);
    setYearlyExtrasVisible(false);
    setBadgeVisible(false);

    return () => window.clearTimeout(animTimer);
  }, [billingCycle, reducedMotion]);

  const checkoutHref = isPrivateBetaEnabled()
    ? "/login"
    : stripeReady
      ? `/checkout?billing=${billingCycle}`
      : getPublicSignupHref();

  return (
    <section id="plans" className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
      <LandingReveal variant="title">
        <header className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Tarifs
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Une seule offre.
            <br />
            Tout ce qu&apos;il faut pour gérer une TPE du bâtiment.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            Pas de formule compliquée. Pas d&apos;option cachée. Un seul abonnement
            pour vos devis, factures, chantiers, équipes et MUM IA.
          </p>
        </header>
      </LandingReveal>

      <LandingReveal delay={100}>
        <div className="mx-auto max-w-3xl">
          <Card
            className={cn(
              "landing-pricing-card relative overflow-hidden p-6 transition-all duration-[400ms] sm:p-8",
              billingCycle === "yearly" && "landing-pricing-card--yearly",
              cardGlow && "landing-pricing-card--glow",
            )}
          >
            <div className="relative">
              <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <section>
                  <div className="mb-3">
                    <span className="landing-pricing-trial-label">
                      Essai gratuit • 7 jours
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    Batimum Premium
                  </h3>
                </section>

                <BillingSwitch value={billingCycle} onChange={handleBillingChange} />
              </div>

              <section className="mb-6 rounded-2xl border border-border/70 bg-card/60 p-6 text-center">
                <div className="flex flex-col items-center">
                  {billingCycle === "yearly" ? (
                    <span
                      className={cn(
                        "landing-pricing-savings-badge mb-4",
                        badgeVisible && "landing-pricing-savings-badge--visible",
                      )}
                    >
                      Économisez {YEARLY_SAVINGS}€/an
                    </span>
                  ) : (
                    <span className="mb-4 h-6" aria-hidden="true" />
                  )}

                  <PriceDisplay
                    billingCycle={billingCycle}
                    animDirection={priceAnimDirection}
                    reducedMotion={reducedMotion}
                  />

                  {billingCycle === "monthly" ? (
                    <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
                      <p>Sans engagement</p>
                      <p>Annulation à tout moment</p>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "mt-3 space-y-1 text-sm transition-all duration-500",
                        yearlyExtrasVisible
                          ? "translate-y-0 opacity-100"
                          : "translate-y-2 opacity-0",
                      )}
                    >
                      <p className="text-muted-foreground">Facturé annuellement</p>
                      <p className="text-muted-foreground">{YEARLY_TOTAL}€ / an</p>
                    </div>
                  )}
                </div>
              </section>

              <ul className="grid gap-3 sm:grid-cols-2">
                {PREMIUM_FEATURES.map((feature) => (
                  <PricingFeature key={feature} text={feature} />
                ))}
              </ul>

              <Link
                href={checkoutHref}
                className="landing-pricing-cta landing-btn-primary landing-btn-interactive group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground no-underline shadow-glow transition-all hover:bg-primary-hover active:scale-[0.98]"
              >
                Essayer gratuitement — 7 jours
                <ArrowRight
                  className="landing-pricing-cta__arrow h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                Déjà inscrit ?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary no-underline hover:text-primary-hover"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </LandingReveal>
    </section>
  );
}
