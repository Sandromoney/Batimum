"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import {
  OnboardingNav,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { Input, Label, PhoneInput } from "@/components/ui/input";
import {
  getAccount,
  saveAccount,
} from "@/lib/account";
import { getCredentials } from "@/lib/auth-credentials";
import { getLocationFromPostalCode } from "@/lib/french-regions";
import {
  canAccessCompanyOnboarding,
  needsCompanyOnboarding,
} from "@/lib/onboarding";
import {
  emptyCompanyDraft,
  getOnboardingFlowState,
  patchOnboardingFlowState,
  type OnboardingCompanyDraft,
} from "@/lib/onboarding-flow";
import { getPublicSignupHref } from "@/lib/private-beta";
import {
  normalizeParametres,
  syncParametresForSave,
} from "@/lib/parametres";
import { useStore } from "@/lib/store";
import {
  validateEmail,
  validateFrenchTva,
  validatePhone,
  validatePostalCode,
  validateSiret,
} from "@/lib/validations";

export default function ConfigurerEntreprisePage() {
  const router = useRouter();
  const { data, setData } = useStore();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [addressSelected, setAddressSelected] = useState(false);
  const [form, setForm] = useState<OnboardingCompanyDraft>(emptyCompanyDraft());
  const [accountEmail, setAccountEmail] = useState("");

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

    if (!canAccessCompanyOnboarding(account)) {
      if (needsCompanyOnboarding(account)) {
        router.replace("/verifier-email");
      } else if (account.onboardingStep === 3) {
        router.replace("/inscription/documents");
      } else if (account.onboardingStep === 4) {
        router.replace("/inscription/bancaire");
      } else {
        router.replace("/abonnement");
      }
      return;
    }

    const saved = getOnboardingFlowState().company;
    const email =
      account.email?.trim() ||
      getOnboardingFlowState().account?.email?.trim() ||
      "";

    const initial = {
      ...emptyCompanyDraft(email),
      ...saved,
      email,
      dirigeant:
        saved?.dirigeant?.trim() ||
        account.utilisateur?.trim() ||
        [account.prenom, account.nom].filter(Boolean).join(" ").trim() ||
        "",
    };

    setAccountEmail(email);
    setForm(initial);
    setAddressSelected(
      Boolean(initial.adresse && initial.codePostal && initial.ville),
    );
    setReady(true);
  }, [router]);

  function patch(partial: Partial<OnboardingCompanyDraft>) {
    setForm((current) => {
      const next = { ...current, ...partial, email: accountEmail || current.email };
      if (partial.codePostal !== undefined) {
        const location = getLocationFromPostalCode(partial.codePostal);
        next.departement = location.departement;
        next.region = location.region;
      }
      patchOnboardingFlowState((state) => ({
        ...state,
        company: next,
      }));
      return next;
    });
    setError("");
  }

  function validate(): boolean {
    if (!form.entreprise.trim()) {
      setError("Le nom de l'entreprise est obligatoire.");
      return false;
    }
    if (!form.dirigeant.trim()) {
      setError("Le nom du dirigeant est obligatoire.");
      return false;
    }
    if (!addressSelected || !form.adresse.trim()) {
      setAddressError("Sélectionnez une adresse dans les suggestions.");
      setError("L'adresse doit être choisie dans la liste de suggestions.");
      return false;
    }
    if (!validatePostalCode(form.codePostal)) {
      setError("Le code postal doit contenir exactement 5 chiffres.");
      return false;
    }
    if (!form.ville.trim()) {
      setError("La ville est obligatoire.");
      return false;
    }
    if (!form.departement.trim() || !form.region.trim()) {
      setError("Département et région introuvables pour ce code postal.");
      return false;
    }
    if (!form.telephone.trim() || !validatePhone(form.telephone)) {
      setError(
        "Indiquez un numéro de téléphone français valide (chiffres uniquement).",
      );
      return false;
    }
    if (!accountEmail || !validateEmail(accountEmail)) {
      setError("L'email du compte est invalide. Reprenez l'inscription.");
      return false;
    }
    if (!validateSiret(form.siret)) {
      setError("Le SIRET doit contenir exactement 14 chiffres.");
      return false;
    }
    if (!validateFrenchTva(form.tvaIntracom)) {
      setError("La TVA doit être au format français (ex. FR12345678901).");
      return false;
    }
    setError("");
    setAddressError("");
    return true;
  }

  function handleContinue() {
    if (!validate()) return;

    const account = getAccount();
    if (!account) return;

    const companyPayload = {
      ...form,
      email: accountEmail,
      entreprise: form.entreprise.trim(),
      dirigeant: form.dirigeant.trim(),
      adresse: form.adresse.trim(),
      ville: form.ville.trim(),
      codePostal: form.codePostal.trim(),
      telephone: form.telephone.trim(),
      siret: form.siret.replace(/\s/g, ""),
      tvaIntracom: form.tvaIntracom.replace(/\s/g, "").toUpperCase(),
    };

    patchOnboardingFlowState((state) => ({
      ...state,
      company: companyPayload,
    }));

    const nextParametres = syncParametresForSave(
      normalizeParametres({
        entreprise: companyPayload.entreprise,
        utilisateur: companyPayload.dirigeant,
        adresse: companyPayload.adresse,
        ville: companyPayload.ville,
        codePostal: companyPayload.codePostal,
        departement: companyPayload.departement.trim(),
        region: companyPayload.region.trim(),
        telephone: companyPayload.telephone,
        email: accountEmail,
        siteInternet: companyPayload.siteInternet.trim(),
        siret: companyPayload.siret,
        tvaIntracom: companyPayload.tvaIntracom,
      }),
    );

    setData((previous) => ({
      ...previous,
      parametres: nextParametres,
    }));

    saveAccount({
      ...account,
      entreprise: companyPayload.entreprise,
      utilisateur: companyPayload.dirigeant,
      telephone: companyPayload.telephone,
      email: accountEmail,
      onboardingStep: 3,
      onboardingCompleted: false,
    });

    router.replace("/inscription/documents");
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
      step={2}
      title="Configurez votre entreprise"
      description="Ces informations apparaîtront sur vos devis, factures et documents commerciaux."
      maxWidthClassName="max-w-2xl"
    >
      <section className="space-y-5">
        <section>
          <Label>Nom de l&apos;entreprise</Label>
          <Input
            value={form.entreprise}
            onChange={(event) => patch({ entreprise: event.target.value })}
            required
          />
        </section>

        <section>
          <Label>Nom du dirigeant</Label>
          <Input
            value={form.dirigeant}
            onChange={(event) => patch({ dirigeant: event.target.value })}
            required
          />
        </section>

        <AddressAutocomplete
          value={{
            adresse: form.adresse,
            codePostal: form.codePostal,
            ville: form.ville,
          }}
          error={addressError}
          onChange={(next) => {
            setAddressSelected(next.selectedFromSuggestion);
            setAddressError(
              next.selectedFromSuggestion
                ? ""
                : "Sélectionnez une adresse dans les suggestions.",
            );
            const location = getLocationFromPostalCode(next.codePostal);
            patch({
              adresse: next.adresse,
              codePostal: next.codePostal,
              ville: next.ville,
              departement: location.departement,
              region: location.region,
            });
          }}
        />

        <section className="grid gap-4 sm:grid-cols-2">
          <section>
            <Label>Code postal</Label>
            <Input
              value={form.codePostal}
              readOnly
              className="bg-muted/40"
              inputMode="numeric"
            />
          </section>
          <section>
            <Label>Ville</Label>
            <Input value={form.ville} readOnly className="bg-muted/40" />
          </section>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <section>
            <Label>Département</Label>
            <Input value={form.departement} readOnly className="bg-muted/40" />
          </section>
          <section>
            <Label>Région</Label>
            <Input value={form.region} readOnly className="bg-muted/40" />
          </section>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <section>
            <Label>Téléphone</Label>
            <PhoneInput
              value={form.telephone}
              onChangeValue={(telephone) => patch({ telephone })}
            />
          </section>
          <section>
            <Label>Email du compte</Label>
            <Input
              type="email"
              value={accountEmail}
              readOnly
              className="bg-muted/40"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Déjà renseigné à l&apos;inscription — non modifiable ici.
            </p>
          </section>
        </section>

        <section>
          <Label>Site internet (optionnel)</Label>
          <Input
            value={form.siteInternet}
            onChange={(event) => patch({ siteInternet: event.target.value })}
            placeholder="https://"
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <section>
            <Label>SIRET (optionnel pendant l&apos;essai)</Label>
            <Input
              value={form.siret}
              inputMode="numeric"
              maxLength={14}
              onChange={(event) =>
                patch({
                  siret: event.target.value.replace(/\D/g, "").slice(0, 14),
                })
              }
              placeholder="14 chiffres"
            />
          </section>
          <section>
            <Label>TVA intracommunautaire (optionnel)</Label>
            <Input
              value={form.tvaIntracom}
              onChange={(event) =>
                patch({
                  tvaIntracom: event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 13),
                })
              }
              placeholder="FRXX999999999"
            />
          </section>
        </section>

        {error ? (
          <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}

        <OnboardingNav
          onBack={() => router.replace("/verifier-email")}
          onNext={handleContinue}
          nextLabel="Continuer"
        />
      </section>
    </OnboardingShell>
  );
}
