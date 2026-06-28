"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ParametresLogoField } from "@/components/parametres-logo-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, PhoneInput, Textarea } from "@/components/ui/input";
import { canAccessApp, getAccount, saveAccount, updateAccount } from "@/lib/account";
import { getCredentials } from "@/lib/auth-credentials";
import { needsCompanyOnboarding } from "@/lib/onboarding";
import { getPublicSignupHref } from "@/lib/private-beta";
import { normalizeParametres, syncParametresForSave } from "@/lib/parametres";
import { useStore } from "@/lib/store";
import { validatePhone } from "@/lib/validations";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Identité", description: "Nom et téléphone de votre entreprise" },
  { title: "Adresse", description: "Coordonnées postales" },
  { title: "Légal", description: "SIRET et TVA intracommunautaire" },
  { title: "Logo", description: "Logo affiché sur vos documents" },
  { title: "Banque", description: "Coordonnées bancaires (facultatif)" },
] as const;

export default function ConfigurerEntreprisePage() {
  const router = useRouter();
  const { data, setData } = useStore();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    entreprise: "",
    telephone: "",
    adresse: "",
    ville: "",
    codePostal: "",
    siret: "",
    tvaIntracom: "",
    logoPdf: "",
    coordonneesBancaires: "",
  });

  useEffect(() => {
    const account = getAccount();
    if (!account || !canAccessApp(account)) {
      router.replace(getPublicSignupHref());
      return;
    }
    const credentials = getCredentials(account.email);
    if (credentials && !credentials.emailVerified) {
      router.replace("/verifier-email");
      return;
    }
    if (!needsCompanyOnboarding(account)) {
      router.replace("/dashboard");
      return;
    }

    const parametres = normalizeParametres(data.parametres);
    setForm({
      entreprise: parametres.entreprise || account.entreprise || "",
      telephone: parametres.telephone || account.telephone || "",
      adresse: parametres.adresse || "",
      ville: parametres.ville || "",
      codePostal: parametres.codePostal || "",
      siret: parametres.siret || "",
      tvaIntracom: parametres.tvaIntracom || "",
      logoPdf: parametres.logoPdf || parametres.logoApplication || "",
      coordonneesBancaires: parametres.coordonneesBancaires || "",
    });
    setReady(true);
  }, [data.parametres, router]);

  function patch(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
    setError("");
  }

  function validateCurrentStep(): boolean {
    if (step === 0) {
      if (!form.entreprise.trim()) {
        setError("Le nom de l'entreprise est obligatoire.");
        return false;
      }
      if (!form.telephone.trim() || !validatePhone(form.telephone)) {
        setError("Un numéro de téléphone valide est obligatoire.");
        return false;
      }
    }
    if (step === 1) {
      if (!form.adresse.trim()) {
        setError("L'adresse est obligatoire.");
        return false;
      }
      if (!form.ville.trim()) {
        setError("La ville est obligatoire.");
        return false;
      }
      if (!form.codePostal.trim()) {
        setError("Le code postal est obligatoire.");
        return false;
      }
    }
    if (step === 2) {
      if (!form.siret.trim()) {
        setError("Le SIRET est obligatoire.");
        return false;
      }
    }
    setError("");
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    finishOnboarding();
  }

  function finishOnboarding() {
    const account = getAccount();
    if (!account) return;

    const emailLocalPart = account.email.split("@")[0] ?? "Administrateur";
    const utilisateur =
      emailLocalPart.charAt(0).toUpperCase() + emailLocalPart.slice(1);

    const nextParametres = syncParametresForSave(
      normalizeParametres({
        ...data.parametres,
        entreprise: form.entreprise.trim(),
        telephone: form.telephone.trim(),
        adresse: form.adresse.trim(),
        ville: form.ville.trim(),
        codePostal: form.codePostal.trim(),
        siret: form.siret.trim(),
        tvaIntracom: form.tvaIntracom.trim() || undefined,
        email: account.email,
        utilisateur,
        logoPdf: form.logoPdf || data.parametres.logoPdf,
        logoApplication: form.logoPdf || data.parametres.logoApplication,
        coordonneesBancaires: form.coordonneesBancaires.trim() || undefined,
      }),
    );

    setData((previous) => ({
      ...previous,
      parametres: nextParametres,
    }));

    updateAccount({
      entreprise: form.entreprise.trim(),
      telephone: form.telephone.trim(),
      utilisateur,
      onboardingCompleted: true,
    });
    saveAccount({
      ...account,
      entreprise: form.entreprise.trim(),
      telephone: form.telephone.trim(),
      utilisateur,
      onboardingCompleted: true,
    });

    router.replace("/dashboard");
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-10">
        <Card className="w-full max-w-xl">
          <Link href="/" className="mb-8 flex justify-center">
            <BrandLogo variant="landing" showSubtitle={false} />
          </Link>

          <header className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Configuration entreprise
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {STEPS[step].title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {STEPS[step].description}
            </p>
            <p className="mt-4 text-xs font-medium text-muted-foreground">
              Étape {step + 1} sur {STEPS.length}
            </p>
            <div className="mt-3 flex gap-2">
              {STEPS.map((item, index) => (
                <span
                  key={item.title}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    index <= step ? "bg-primary" : "bg-border",
                  )}
                />
              ))}
            </div>
          </header>

          <section className="space-y-5">
            {step === 0 && (
              <>
                <section>
                  <Label>Nom entreprise</Label>
                  <Input
                    value={form.entreprise}
                    onChange={(event) =>
                      patch({ entreprise: event.target.value })
                    }
                    placeholder="Ex : Martin Rénovation"
                  />
                </section>
                <section>
                  <Label>Téléphone</Label>
                  <PhoneInput
                    value={form.telephone}
                    onChangeValue={(telephone) => patch({ telephone })}
                    placeholder="06 12 34 56 78"
                  />
                </section>
              </>
            )}

            {step === 1 && (
              <>
                <section>
                  <Label>Adresse</Label>
                  <Input
                    value={form.adresse}
                    onChange={(event) => patch({ adresse: event.target.value })}
                    placeholder="12 rue des Artisans"
                  />
                </section>
                <section className="grid gap-4 sm:grid-cols-2">
                  <section>
                    <Label>Ville</Label>
                    <Input
                      value={form.ville}
                      onChange={(event) => patch({ ville: event.target.value })}
                      placeholder="Paris"
                    />
                  </section>
                  <section>
                    <Label>Code postal</Label>
                    <Input
                      value={form.codePostal}
                      onChange={(event) =>
                        patch({ codePostal: event.target.value })
                      }
                      placeholder="75011"
                    />
                  </section>
                </section>
              </>
            )}

            {step === 2 && (
              <>
                <section>
                  <Label>SIRET</Label>
                  <Input
                    value={form.siret}
                    onChange={(event) => patch({ siret: event.target.value })}
                    placeholder="123 456 789 00012"
                  />
                </section>
                <section>
                  <Label>TVA intracommunautaire (facultatif)</Label>
                  <Input
                    value={form.tvaIntracom}
                    onChange={(event) =>
                      patch({ tvaIntracom: event.target.value })
                    }
                    placeholder="FR12345678901"
                  />
                </section>
              </>
            )}

            {step === 3 && (
              <ParametresLogoField
                label="Logo entreprise"
                hint="Utilisé sur vos devis et factures PDF."
                value={form.logoPdf}
                onChange={(logoPdf) => patch({ logoPdf })}
              />
            )}

            {step === 4 && (
              <section>
                <Label>Coordonnées bancaires (facultatif)</Label>
                <Textarea
                  value={form.coordonneesBancaires}
                  onChange={(event) =>
                    patch({ coordonneesBancaires: event.target.value })
                  }
                  placeholder="IBAN, BIC, titulaire du compte…"
                  rows={4}
                />
              </section>
            )}

            {error && (
              <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
                {error}
              </p>
            )}

            <section className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={step === 0}
                onClick={() => {
                  setError("");
                  setStep((current) => Math.max(0, current - 1));
                }}
              >
                Retour
              </Button>
              <section className="flex flex-col gap-2 sm:flex-row">
                {(step === 3 || step === 4) && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (step === 4) {
                        finishOnboarding();
                        return;
                      }
                      setStep((current) => current + 1);
                    }}
                  >
                    {step === 4 ? "Terminer sans banque" : "Continuer sans logo"}
                  </Button>
                )}
                <Button type="button" onClick={goNext}>
                  {step === STEPS.length - 1
                    ? "Terminer et accéder au tableau de bord"
                    : "Continuer"}
                </Button>
              </section>
            </section>
          </section>
        </Card>
      </section>
    </main>
  );
}
