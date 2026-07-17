"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  OnboardingNav,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { Input, Label } from "@/components/ui/input";
import { getAccount, saveAccount } from "@/lib/account";
import { getCredentials } from "@/lib/auth-credentials";
import {
  emptyBankDraft,
  getOnboardingFlowState,
  patchOnboardingFlowState,
  type OnboardingBankDraft,
} from "@/lib/onboarding-flow";
import { getPublicSignupHref } from "@/lib/private-beta";
import { normalizeParametres, syncParametresForSave } from "@/lib/parametres";
import { useStore } from "@/lib/store";

function normalizeIban(value: string): string {
  return value.replace(/\s/g, "").toUpperCase();
}

export default function InscriptionBancairePage() {
  const router = useRouter();
  const { data, setData } = useStore();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<OnboardingBankDraft>(emptyBankDraft());

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

    if (account.onboardingCompleted === true) {
      router.replace("/dashboard");
      return;
    }

    if ((account.onboardingStep ?? 1) < 4) {
      router.replace("/inscription/documents");
      return;
    }

    const saved = getOnboardingFlowState();
    setForm({
      ...emptyBankDraft(),
      ...saved.bank,
    });
    setReady(true);
  }, [router]);

  function patch(partial: Partial<OnboardingBankDraft>) {
    setForm((current) => {
      const next = { ...current, ...partial };
      patchOnboardingFlowState((state) => ({
        ...state,
        bank: next,
      }));
      return next;
    });
    setError("");
  }

  function validate(): boolean {
    if (!form.titulaire.trim()) {
      setError("Le titulaire du compte est obligatoire.");
      return false;
    }
    if (!normalizeIban(form.iban)) {
      setError("L'IBAN est obligatoire.");
      return false;
    }
    if (!form.banque.trim()) {
      setError("Le nom de la banque est obligatoire.");
      return false;
    }
    setError("");
    return true;
  }

  function finish(options?: { skipped?: boolean }) {
    const account = getAccount();
    if (!account) return;

    if (!options?.skipped && !validate()) return;

    const bankData = options?.skipped ? emptyBankDraft() : form;

    patchOnboardingFlowState((state) => ({
      ...state,
      bank: bankData,
      bankSkipped: options?.skipped ?? false,
    }));

    const nextParametres = syncParametresForSave(
      normalizeParametres({
        ...data.parametres,
        coordonneesBancairesTitulaire: bankData.titulaire.trim(),
        coordonneesBancairesIban: normalizeIban(bankData.iban),
        coordonneesBancairesBic: bankData.bic.trim(),
        coordonneesBancairesBanque: bankData.banque.trim(),
        afficherCoordonneesBancaires: !options?.skipped,
      }),
    );

    setData((previous) => ({
      ...previous,
      parametres: nextParametres,
    }));

    saveAccount({
      ...account,
      onboardingStep: 5,
      onboardingCompleted: true,
    });

    router.replace("/abonnement");
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
      step={4}
      title="Coordonnées bancaires"
      description="Ces informations seront affichées sur vos factures pour faciliter les virements de vos clients."
      maxWidthClassName="max-w-2xl"
    >
      <section className="space-y-5">
        <section>
          <Label>Titulaire du compte</Label>
          <Input
            value={form.titulaire}
            onChange={(event) => patch({ titulaire: event.target.value })}
          />
        </section>

        <section>
          <Label>IBAN</Label>
          <Input
            value={form.iban}
            onChange={(event) => patch({ iban: event.target.value })}
            placeholder="FR76 1234 5678 9012 3456 7890 123"
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <section>
            <Label>BIC (optionnel)</Label>
            <Input
              value={form.bic}
              onChange={(event) => patch({ bic: event.target.value })}
            />
          </section>
          <section>
            <Label>Banque</Label>
            <Input
              value={form.banque}
              onChange={(event) => patch({ banque: event.target.value })}
            />
          </section>
        </section>

        {error ? (
          <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}

        <OnboardingNav
          onBack={() => router.replace("/inscription/documents")}
          onNext={() => finish()}
          nextLabel="Continuer"
          secondaryAction={
            <button
              type="button"
              className="w-full rounded-xl border border-[rgba(15,23,42,0.08)] px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              onClick={() => finish({ skipped: true })}
            >
              Je compléterai plus tard
            </button>
          }
        />
      </section>
    </OnboardingShell>
  );
}
