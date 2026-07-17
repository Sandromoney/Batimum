"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingFooter } from "@/components/marketing-footer";
import { Card } from "@/components/ui/card";

export default function CheckoutCancelPage() {
  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-10">
        <Card className="w-full max-w-lg text-center">
          <BrandLogo variant="marketing" showSubtitle={false} />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">
            Paiement annulé
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Aucun débit n&apos;a été effectué. Vous pouvez reprendre votre
            inscription quand vous le souhaitez.
          </p>
          <Link
            href="/signup"
            className="mt-8 flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Reprendre l&apos;essai gratuit
          </Link>
        </Card>
      </section>
      <MarketingFooter />
    </main>
  );
}
