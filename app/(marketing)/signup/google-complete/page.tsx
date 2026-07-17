"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { MarketingFooter } from "@/components/marketing-footer";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import {
  applyGoogleSignupToAppData,
  finalizeGoogleSignupFromOAuth,
} from "@/lib/google-signup";

function GoogleSignupCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setData } = useStore();
  const [message, setMessage] = useState(
    "Finalisation de votre compte Google…",
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setFailed(true);
      setMessage(decodeURIComponent(oauthError));
      return;
    }

    async function complete() {
      const displayName = searchParams.get("name") ?? undefined;
      const result = await finalizeGoogleSignupFromOAuth({ displayName });

      if (!result.ok) {
        setFailed(true);
        setMessage(result.message);
        return;
      }

      setData((previous) =>
        applyGoogleSignupToAppData(previous, result.email, displayName),
      );

      setMessage("Compte créé. Poursuivez la configuration de votre entreprise…");

      router.replace("/configurer-entreprise");
    }

    void complete();
  }, [router, searchParams, setData]);

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-10">
        <Card className="w-full max-w-lg text-center">
          <BrandLogo variant="marketing" showSubtitle={false} />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">
            {failed ? "Inscription Google interrompue" : "Connexion Google"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {message}
          </p>
          {failed ? (
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Retour à l&apos;inscription
            </Link>
          ) : null}
        </Card>
      </section>
      <MarketingFooter />
    </main>
  );
}

export default function GoogleSignupCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </main>
      }
    >
      <GoogleSignupCompleteContent />
    </Suspense>
  );
}
