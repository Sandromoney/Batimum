"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingImageUpload } from "@/components/onboarding/onboarding-image-upload";
import {
  OnboardingNav,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { getAccount, saveAccount } from "@/lib/account";
import { getCredentials } from "@/lib/auth-credentials";
import {
  emptyDocumentsDraft,
  getOnboardingFlowState,
  patchOnboardingFlowState,
  type OnboardingDocumentsDraft,
} from "@/lib/onboarding-flow";
import { getPublicSignupHref } from "@/lib/private-beta";
import { normalizeParametres, syncParametresForSave } from "@/lib/parametres";
import { useStore } from "@/lib/store";

export default function InscriptionDocumentsPage() {
  const router = useRouter();
  const { data, setData } = useStore();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<OnboardingDocumentsDraft>(
    emptyDocumentsDraft(),
  );

  useEffect(() => {
    const account = getAccount();
    if (!account) {
      router.replace(getPublicSignupHref());
      return;
    }

    const credentials = getCredentials(account.email);
    if (credentials && !credentials.emailVerified) {
      router.replace("/verifier-email");
      return;
    }

    if ((account.onboardingStep ?? 1) < 3) {
      router.replace("/configurer-entreprise");
      return;
    }

    if (account.onboardingCompleted === true) {
      router.replace("/dashboard");
      return;
    }

    if ((account.onboardingStep ?? 1) > 3) {
      router.replace("/inscription/bancaire");
      return;
    }

    setForm({
      ...emptyDocumentsDraft(),
      ...getOnboardingFlowState().documents,
    });
    setReady(true);
  }, [router]);

  function patch(partial: Partial<OnboardingDocumentsDraft>) {
    setForm((current) => {
      const next = { ...current, ...partial };
      patchOnboardingFlowState((state) => ({
        ...state,
        documents: next,
      }));
      return next;
    });
  }

  function persistAndContinue(options?: { skipped?: boolean }) {
    const account = getAccount();
    if (!account) return;

    patchOnboardingFlowState((state) => ({
      ...state,
      documents: form,
      documentsSkipped: options?.skipped ?? false,
    }));

    const nextParametres = syncParametresForSave(
      normalizeParametres({
        ...data.parametres,
        logoApplication: form.logoApplication,
        logoPdf: form.logoPdf,
        signaturePdf: form.signaturePdf,
      }),
    );

    setData((previous) => ({
      ...previous,
      parametres: nextParametres,
    }));

    saveAccount({
      ...account,
      onboardingStep: 4,
    });

    router.replace("/inscription/bancaire");
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  return (
    <OnboardingShell
      step={3}
      title="Documents commerciaux"
      description="Personnalisez vos devis et factures avec votre identité visuelle. Vous pourrez modifier ces éléments à tout moment."
      maxWidthClassName="max-w-2xl"
    >
      <section className="space-y-6">
        <OnboardingImageUpload
          label="Logo application"
          hint="Affiché dans votre espace Batimum."
          value={form.logoApplication}
          onChange={(logoApplication) => patch({ logoApplication })}
        />

        <OnboardingImageUpload
          label="Logo PDF"
          hint="Utilisé sur vos devis et factures exportés."
          value={form.logoPdf}
          onChange={(logoPdf) => patch({ logoPdf })}
        />

        <OnboardingImageUpload
          label="Signature du dirigeant"
          hint="Image de signature pour vos documents PDF."
          value={form.signaturePdf}
          onChange={(signaturePdf) => patch({ signaturePdf })}
        />

        <OnboardingNav
          onBack={() => router.replace("/configurer-entreprise")}
          onNext={() => persistAndContinue()}
          nextLabel="Continuer"
          secondaryAction={
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
              onClick={() => persistAndContinue({ skipped: true })}
            >
              Passer cette étape
            </button>
          }
        />
      </section>
    </OnboardingShell>
  );
}
