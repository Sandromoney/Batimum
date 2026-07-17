"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import {
  finalizeGoogleLoginFromOAuth,
  syncGoogleEmailToAppData,
} from "@/lib/google-auth";
import { clearEmployeeSessionForDirectorLogin } from "@/lib/employee-access";

function GoogleLoginCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setData } = useStore();
  const [message, setMessage] = useState("Connexion à votre compte Google…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setFailed(true);
      setMessage(decodeURIComponent(oauthError));
      return;
    }

    async function complete() {
      await clearEmployeeSessionForDirectorLogin();

      const displayName = searchParams.get("name") ?? undefined;
      const result = await finalizeGoogleLoginFromOAuth({ displayName });

      if (!result.ok) {
        if (result.redirectTo) {
          router.replace(result.redirectTo);
          return;
        }
        setFailed(true);
        setMessage(result.message);
        return;
      }

      setData((previous) =>
        syncGoogleEmailToAppData(previous, result.email, displayName),
      );

      setMessage("Connexion réussie. Redirection…");
      router.replace(result.redirectTo);
    }

    void complete();
  }, [router, searchParams, setData]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
        <Card className="w-full max-w-lg text-center">
          <BrandLogo variant="marketing" showSubtitle={false} />
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">
            {failed ? "Connexion Google interrompue" : "Connexion Google"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {message}
          </p>
          {failed ? (
            <Link
              href="/login"
              className="mt-8 flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Retour à la connexion
            </Link>
          ) : null}
        </Card>
      </section>
    </main>
  );
}

export default function GoogleLoginCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Chargement…
        </main>
      }
    >
      <GoogleLoginCompleteContent />
    </Suspense>
  );
}
