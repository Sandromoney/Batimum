"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import {
  OnboardingNav,
  OnboardingShell,
} from "@/components/onboarding/onboarding-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, PhoneInput } from "@/components/ui/input";
import { getAccount, saveAccount } from "@/lib/account";
import { getCredentials } from "@/lib/auth-credentials";
import { normalizeSiretDigits } from "@/lib/entreprise-lookup/types";
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
import { cn } from "@/lib/utils";

type LookupUiStatus =
  | "idle"
  | "loading"
  | "not_connected"
  | "invalid"
  | "error";

export default function ConfigurerEntrepriseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setData } = useStore();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [addressSelected, setAddressSelected] = useState(false);
  const [form, setForm] = useState<OnboardingCompanyDraft>(emptyCompanyDraft());
  const [accountEmail, setAccountEmail] = useState("");
  const [lookupStatus, setLookupStatus] = useState<LookupUiStatus>("idle");
  const [lookupMessage, setLookupMessage] = useState("");

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

    const fromQuery = searchParams.get("nouvelle-entreprise") === "1";
    const initial: OnboardingCompanyDraft = {
      ...emptyCompanyDraft(email),
      ...saved,
      email,
      activite: saved?.activite ?? "",
      codeApe: saved?.codeApe ?? "",
      entrepriseEnCreation:
        saved?.entrepriseEnCreation === true || fromQuery,
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
  }, [router, searchParams]);

  function patch(partial: Partial<OnboardingCompanyDraft>) {
    setForm((current) => {
      const next = {
        ...current,
        ...partial,
        email: accountEmail || current.email,
      };
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

  async function handleLookup() {
    const siret = normalizeSiretDigits(form.siret);
    if (!/^\d{14}$/.test(siret)) {
      setLookupStatus("invalid");
      setLookupMessage("Le SIRET doit contenir exactement 14 chiffres.");
      return;
    }

    setLookupStatus("loading");
    setLookupMessage("");

    try {
      const response = await fetch(
        `/api/entreprise/lookup?siret=${encodeURIComponent(siret)}`,
      );
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        entreprise?: {
          denomination?: string;
          adresse?: string;
          codePostal?: string;
          ville?: string;
          activite?: string;
          codeApe?: string;
          tvaIntracom?: string;
          siret?: string;
        };
      };

      if (data.status === "ok" && data.entreprise) {
        const location = getLocationFromPostalCode(
          data.entreprise.codePostal ?? "",
        );
        patch({
          siret: data.entreprise.siret ?? siret,
          entreprise: data.entreprise.denomination ?? "",
          adresse: data.entreprise.adresse ?? "",
          codePostal: data.entreprise.codePostal ?? "",
          ville: data.entreprise.ville ?? "",
          departement: location.departement,
          region: location.region,
          activite: data.entreprise.activite ?? "",
          codeApe: data.entreprise.codeApe ?? "",
          tvaIntracom: data.entreprise.tvaIntracom ?? form.tvaIntracom,
          entrepriseEnCreation: false,
        });
        if (data.entreprise.adresse && data.entreprise.codePostal) {
          setAddressSelected(true);
        }
        setLookupStatus("idle");
        setLookupMessage("Entreprise trouvée — vérifiez puis confirmez.");
        return;
      }

      if (data.status === "not_connected" || response.status === 501) {
        setLookupStatus("not_connected");
        setLookupMessage(
          data.message ||
            "La recherche automatique n’est pas encore connectée. Complétez les champs manuellement.",
        );
        return;
      }

      setLookupStatus("error");
      setLookupMessage(
        data.message || "Impossible de récupérer l’entreprise pour le moment.",
      );
    } catch {
      setLookupStatus("error");
      setLookupMessage("Impossible de joindre le service de recherche.");
    }
  }

  function enableNouvelleEntreprise() {
    patch({
      entrepriseEnCreation: true,
      siret: "",
    });
    setLookupStatus("idle");
    setLookupMessage("");
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

    const siretDigits = normalizeSiretDigits(form.siret);
    if (form.entrepriseEnCreation) {
      if (siretDigits && !validateSiret(siretDigits)) {
        setError("Le SIRET doit contenir exactement 14 chiffres.");
        return false;
      }
    } else if (!siretDigits) {
      setError(
        "Indiquez un SIRET à 14 chiffres, ou choisissez « Je crée une nouvelle entreprise ».",
      );
      return false;
    } else if (!validateSiret(siretDigits)) {
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

    const companyPayload: OnboardingCompanyDraft = {
      ...form,
      email: accountEmail,
      entreprise: form.entreprise.trim(),
      dirigeant: form.dirigeant.trim(),
      adresse: form.adresse.trim(),
      ville: form.ville.trim(),
      codePostal: form.codePostal.trim(),
      telephone: form.telephone.trim(),
      siret: normalizeSiretDigits(form.siret),
      tvaIntracom: form.tvaIntracom.replace(/\s/g, "").toUpperCase(),
      activite: form.activite.trim(),
      codeApe: form.codeApe.trim(),
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
        codeApe: companyPayload.codeApe || undefined,
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
      description="Entrez votre SIRET pour préremplir l’essentiel, ou créez une fiche manuelle si l’entreprise est en cours de constitution."
      maxWidthClassName="max-w-2xl"
    >
      <section className="space-y-5">
        <section className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Recherche par SIRET
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                14 chiffres. Provider prévu : API Recherche d’Entreprises
                (data.gouv.fr) — actuellement non connectée.
              </p>
            </div>
            {form.entrepriseEnCreation ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                Entreprise en création
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Label htmlFor="siret-lookup">SIRET</Label>
              <Input
                id="siret-lookup"
                value={form.siret}
                inputMode="numeric"
                maxLength={14}
                disabled={form.entrepriseEnCreation}
                onChange={(event) =>
                  patch({
                    siret: event.target.value.replace(/\D/g, "").slice(0, 14),
                    entrepriseEnCreation: false,
                  })
                }
                placeholder="14 chiffres"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="sm:min-w-[9.5rem]"
              disabled={
                form.entrepriseEnCreation || lookupStatus === "loading"
              }
              onClick={() => void handleLookup()}
            >
              <Search className="mr-1.5 h-4 w-4" aria-hidden />
              {lookupStatus === "loading" ? "Recherche…" : "Rechercher"}
            </Button>
          </div>

          {lookupMessage ? (
            <p
              className={cn(
                "mt-3 rounded-xl border px-3 py-2 text-sm",
                lookupStatus === "not_connected"
                  ? "border-amber-200 bg-amber-50 text-amber-950"
                  : lookupStatus === "invalid" || lookupStatus === "error"
                    ? "btp-alert-error"
                    : "border-border/60 bg-muted/30 text-muted-foreground",
              )}
            >
              {lookupMessage}
            </p>
          ) : null}

          <button
            type="button"
            className="mt-3 text-sm font-medium text-primary underline-offset-2 hover:underline"
            onClick={enableNouvelleEntreprise}
          >
            Je crée une nouvelle entreprise
          </button>
        </section>

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

        <section>
          <Label>Activité (optionnel)</Label>
          <Input
            value={form.activite}
            onChange={(event) => patch({ activite: event.target.value })}
            placeholder="Ex. Travaux de plâtrerie"
          />
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
              Déjà collecté à l&apos;inscription — non redemandé ici.
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

        {error ? (
          <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}

        <OnboardingNav
          onBack={() => router.replace("/verifier-email")}
          onNext={handleContinue}
          nextLabel="Confirmer"
        />
      </section>
    </OnboardingShell>
  );
}
