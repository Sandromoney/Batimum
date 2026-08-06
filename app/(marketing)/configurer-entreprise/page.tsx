"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { EntrepriseSirenLookup } from "@/components/entreprise-siren-lookup";
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
import type { CompanyPrefillFields } from "@/lib/entreprise/annuaire-lookup";
import { computeFrenchTvaIntracomFromSiren } from "@/lib/entreprise/siren-siret";
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

  // Filet de sécurité : ne jamais rester bloqué sur « Chargement… ».
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => {
      setReady(true);
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [ready]);

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

  function hasFilledCompanyFields(draft: OnboardingCompanyDraft): boolean {
    return Boolean(
      draft.entreprise.trim() ||
        draft.adresse.trim() ||
        draft.siret.trim() ||
        draft.formeJuridique?.trim() ||
        draft.codeApe?.trim(),
    );
  }

  function applyOfficialCompany(fields: CompanyPrefillFields) {
    const location = getLocationFromPostalCode(fields.codePostal);
    const hasAddress = Boolean(
      fields.adresse.trim() && fields.codePostal.trim() && fields.ville.trim(),
    );
    if (hasAddress) {
      setAddressSelected(true);
      setAddressError("");
    }
    patch({
      entreprise: fields.entreprise || form.entreprise,
      enseigne: fields.enseigne,
      adresse: fields.adresse || form.adresse,
      adresseComplement: fields.adresseComplement,
      codePostal: fields.codePostal || form.codePostal,
      ville: fields.ville || form.ville,
      pays: fields.pays || form.pays || "France",
      departement: location.departement || form.departement,
      region: location.region || form.region,
      siret: fields.siret.replace(/\D/g, ""),
      siren: fields.siren,
      formeJuridique: fields.formeJuridique,
      codeApe: fields.codeApe,
      libelleActivite: fields.libelleActivite,
      tvaIntracom: fields.tvaIntracom || form.tvaIntracom,
      dateCreationEntreprise: fields.dateCreationEntreprise,
      establishmentStatus: fields.establishmentStatus,
      isSiege: fields.isSiege,
      officialDataLastCheckedAt: fields.officialDataLastCheckedAt,
      officialDataSource: fields.officialDataSource,
      officialDataVerificationStatus: fields.officialDataVerificationStatus,
    });
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
    if (!form.adresse.trim()) {
      setAddressError(
        form.officialDataLastCheckedAt
          ? "Complétez l'adresse (absente du répertoire officiel) via les suggestions."
          : "Sélectionnez une adresse dans les suggestions.",
      );
      setError("L'adresse est obligatoire.");
      return false;
    }
    if (!addressSelected && !form.officialDataLastCheckedAt) {
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
        adresseComplement: companyPayload.adresseComplement?.trim() || "",
        ville: companyPayload.ville,
        codePostal: companyPayload.codePostal,
        departement: companyPayload.departement.trim(),
        region: companyPayload.region.trim(),
        pays: companyPayload.pays?.trim() || "France",
        telephone: companyPayload.telephone,
        email: accountEmail,
        siteInternet: companyPayload.siteInternet.trim(),
        siret: companyPayload.siret,
        siren: companyPayload.siren?.trim() || undefined,
        formeJuridique: companyPayload.formeJuridique?.trim() || undefined,
        codeApe: companyPayload.codeApe?.trim() || undefined,
        libelleActivite: companyPayload.libelleActivite?.trim() || undefined,
        enseigne: companyPayload.enseigne?.trim() || undefined,
        dateCreationEntreprise:
          companyPayload.dateCreationEntreprise?.trim() || undefined,
        establishmentStatus: companyPayload.establishmentStatus,
        isSiege: companyPayload.isSiege,
        officialDataLastCheckedAt:
          companyPayload.officialDataLastCheckedAt?.trim() || undefined,
        officialDataSource:
          companyPayload.officialDataSource?.trim() || undefined,
        officialDataVerificationStatus:
          companyPayload.officialDataVerificationStatus || undefined,
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
        <EntrepriseSirenLookup
          preferSiret
          autoApply={!hasFilledCompanyFields(form)}
          compact
          initialValue={form.siret || form.siren || ""}
          hasExistingData={hasFilledCompanyFields(form)}
          lastCheckedAt={form.officialDataLastCheckedAt}
          onApply={applyOfficialCompany}
        />

        <section>
          <Label>Nom de l&apos;entreprise</Label>
          <Input
            value={form.entreprise}
            onChange={(event) => patch({ entreprise: event.target.value })}
            required
          />
        </section>

        {form.enseigne ? (
          <section>
            <Label>Enseigne / nom commercial</Label>
            <Input
              value={form.enseigne}
              onChange={(event) => patch({ enseigne: event.target.value })}
            />
          </section>
        ) : null}

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
            pays: form.pays ?? "France",
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
              pays: next.pays || form.pays || "France",
              departement: location.departement,
              region: location.region,
            });
          }}
        />

        <section>
          <Label>Complément d&apos;adresse (optionnel)</Label>
          <Input
            value={form.adresseComplement ?? ""}
            onChange={(event) =>
              patch({ adresseComplement: event.target.value })
            }
            placeholder="Bâtiment, étage…"
          />
        </section>

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
              maxLength={17}
              onChange={(event) => {
                const siret = event.target.value.replace(/\D/g, "").slice(0, 14);
                const siren = siret.slice(0, 9);
                const tva =
                  siret.length === 14
                    ? computeFrenchTvaIntracomFromSiren(siren)
                    : "";
                patch({
                  siret,
                  siren,
                  ...(tva && !form.tvaIntracom.trim()
                    ? { tvaIntracom: tva }
                    : {}),
                });
              }}
              placeholder="14 chiffres"
            />
          </section>
          <section>
            <Label>Forme juridique</Label>
            <Input
              value={form.formeJuridique ?? ""}
              onChange={(event) =>
                patch({ formeJuridique: event.target.value })
              }
              placeholder="Ex. : SAS, SARL"
            />
          </section>
          <section>
            <Label>Code APE</Label>
            <Input
              value={form.codeApe ?? ""}
              onChange={(event) => patch({ codeApe: event.target.value })}
              placeholder="Ex. : 43.22A"
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

        {form.libelleActivite ? (
          <section>
            <Label>Activité</Label>
            <Input
              value={form.libelleActivite}
              onChange={(event) =>
                patch({ libelleActivite: event.target.value })
              }
            />
          </section>
        ) : null}

        {form.establishmentStatus === "ferme" ? (
          <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            Cet établissement est déclaré fermé dans le répertoire officiel.
          </p>
        ) : null}

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
