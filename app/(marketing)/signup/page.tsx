"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { GoogleContinueButton } from "@/components/google-continue-button";
import { AuthSplitLayout } from "@/components/marketing/auth-split-layout";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { saveAccount, type UserAccount } from "@/lib/account";
import { savePendingSignupCredentials } from "@/lib/auth-credentials";
import { sendEmailVerificationCode } from "@/lib/email-verification/client";
import {
  fetchRecordedTermsAcceptance,
  recordTermsAcceptance,
  TERMS_ACCEPTANCE_REQUIRED_MESSAGE,
} from "@/lib/legal-acceptance";
import {
  saveOnboardingFlowState,
  type OnboardingAccountDraft,
} from "@/lib/onboarding-flow";
import {
  isPrivateBetaEnabled,
  PRIVATE_BETA_SIGNUP_CLOSED_MESSAGE,
} from "@/lib/private-beta";
import {
  hasSignupFieldErrors,
  validateSignupFields,
  type SignupField,
} from "@/lib/signup-validation";
import { cn } from "@/lib/utils";

const INPUT_ERROR_CLASS =
  "border-red-500/70 bg-red-500/5 focus:border-red-500/80 focus:ring-red-500/15";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-400">{message}</p>;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<SignupField, boolean>>>(
    {},
  );

  const formValues = useMemo(
    () => ({
      prenom,
      nom,
      email,
      password,
      confirmPassword,
    }),
    [confirmPassword, email, nom, password, prenom],
  );

  const fieldErrors = useMemo(
    () =>
      validateSignupFields(formValues, {
        showAll: showAllErrors,
        touched,
      }),
    [formValues, showAllErrors, touched],
  );

  useEffect(() => {
    if (isPrivateBetaEnabled()) {
      router.replace("/login");
      return;
    }

    const oauthError = searchParams.get("error") ?? searchParams.get("message");
    if (oauthError) {
      setSubmitError(decodeURIComponent(oauthError));
    }
    if (searchParams.get("notice") === "no_account") {
      setSubmitError(
        "Aucun compte n'existe encore pour cette adresse Google. Acceptez les CGU et les CGV pour créer votre compte.",
      );
    }
  }, [router, searchParams]);

  if (isPrivateBetaEnabled()) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-sm text-muted-foreground">
        {PRIVATE_BETA_SIGNUP_CLOSED_MESSAGE}
      </main>
    );
  }

  function markTouched(field: SignupField) {
    setTouched((current) =>
      current[field] ? current : { ...current, [field]: true },
    );
  }

  function inputClass(field: SignupField) {
    return cn(fieldErrors[field] && INPUT_ERROR_CLASS);
  }

  function persistDraft(values: typeof formValues) {
    const draft: OnboardingAccountDraft = {
      prenom: values.prenom.trim(),
      nom: values.nom.trim(),
      email: values.email.trim().toLowerCase(),
    };
    saveOnboardingFlowState({ account: draft });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowAllErrors(true);
    setSubmitError("");
    setTermsError("");

    const errors = validateSignupFields(formValues, { showAll: true });
    if (hasSignupFieldErrors(errors)) return;

    if (!acceptedTerms) {
      setTermsError(TERMS_ACCEPTANCE_REQUIRED_MESSAGE);
      return;
    }

    const termsRecorded = await recordTermsAcceptance();
    if (!termsRecorded) {
      setSubmitError("Impossible d'enregistrer l'acceptation des CGU/CGV.");
      return;
    }

    const legalAcceptance = await fetchRecordedTermsAcceptance();
    const normalizedEmail = formValues.email.trim().toLowerCase();
    const utilisateur =
      `${formValues.prenom.trim()} ${formValues.nom.trim()}`.trim();

    setLoading(true);
    persistDraft(formValues);

    const draft: UserAccount = {
      entreprise: "",
      utilisateur,
      prenom: formValues.prenom.trim(),
      nom: formValues.nom.trim(),
      email: normalizedEmail,
      telephone: "",
      subscriptionStatus: null,
      onboardingCompleted: false,
      onboardingStep: 1,
      createdAt: new Date().toISOString(),
      legalAcceptance: legalAcceptance ?? undefined,
    };

    saveAccount(draft);
    await savePendingSignupCredentials(normalizedEmail, formValues.password);
    const sendResult = await sendEmailVerificationCode(normalizedEmail);
    setLoading(false);

    if (!sendResult.ok) {
      setSubmitError(sendResult.message);
      return;
    }

    router.push("/verifier-email");
  }

  return (
    <AuthSplitLayout footer={<MarketingFooter />}>
      <Card className="w-full">
        <Link href="/" className="mb-8 flex justify-center">
          <BrandLogo variant="marketing" showSubtitle={false} />
        </Link>

        <header className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Inscription · Étape 1 sur 7
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Créer votre compte
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Quelques informations pour démarrer votre essai gratuit de 7 jours.
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <section className="grid gap-4 sm:grid-cols-2">
            <section>
              <Label>Prénom</Label>
              <Input
                value={prenom}
                onChange={(event) => {
                  markTouched("prenom");
                  setPrenom(event.target.value);
                }}
                onBlur={() => markTouched("prenom")}
                autoComplete="given-name"
                disabled={loading}
                className={inputClass("prenom")}
                aria-invalid={Boolean(fieldErrors.prenom)}
              />
              <FieldError message={fieldErrors.prenom} />
            </section>
            <section>
              <Label>Nom</Label>
              <Input
                value={nom}
                onChange={(event) => {
                  markTouched("nom");
                  setNom(event.target.value);
                }}
                onBlur={() => markTouched("nom")}
                autoComplete="family-name"
                disabled={loading}
                className={inputClass("nom")}
                aria-invalid={Boolean(fieldErrors.nom)}
              />
              <FieldError message={fieldErrors.nom} />
            </section>
          </section>

          <section>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(event) => {
                markTouched("email");
                setEmail(event.target.value);
              }}
              onBlur={() => markTouched("email")}
              placeholder="vous@entreprise.fr"
              autoComplete="email"
              disabled={loading}
              className={inputClass("email")}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            <FieldError message={fieldErrors.email} />
          </section>

          <section>
            <Label>Mot de passe</Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => {
                markTouched("password");
                setPassword(event.target.value);
              }}
              onBlur={() => markTouched("password")}
              autoComplete="new-password"
              disabled={loading}
              className={inputClass("password")}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <FieldError message={fieldErrors.password} />
          </section>

          <section>
            <Label>Confirmation du mot de passe</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                markTouched("confirmPassword");
                setConfirmPassword(event.target.value);
              }}
              onBlur={() => markTouched("confirmPassword")}
              autoComplete="new-password"
              disabled={loading}
              className={inputClass("confirmPassword")}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
            />
            <FieldError message={fieldErrors.confirmPassword} />
          </section>

          <section>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked);
                  if (event.target.checked) setTermsError("");
                }}
                disabled={loading}
                className="mt-0.5 size-4 shrink-0 rounded border-border bg-card accent-primary"
                aria-invalid={Boolean(termsError)}
              />
              <span className="text-sm leading-6 text-muted-foreground">
                En créant mon compte, j&apos;accepte les{" "}
                <Link
                  href="/cgu"
                  target="_blank"
                  className="font-medium text-primary no-underline hover:underline"
                >
                  CGU
                </Link>{" "}
                et les{" "}
                <Link
                  href="/cgv"
                  target="_blank"
                  className="font-medium text-primary no-underline hover:underline"
                >
                  CGV
                </Link>{" "}
                de Batimum.
              </span>
            </label>
            {termsError ? (
              <p className="mt-1.5 text-xs font-medium text-red-400">
                {termsError}
              </p>
            ) : null}
          </section>

          {submitError ? (
            <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">
              {submitError}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Envoi du code…" : "Continuer"}
          </Button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/70" />
            </div>
            <p className="relative mx-auto w-fit bg-card px-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              ou
            </p>
          </div>

          <GoogleContinueButton
            flow="signup"
            disabled={loading}
            onBeforeRedirect={async () => {
              if (!acceptedTerms) {
                setTermsError(TERMS_ACCEPTANCE_REQUIRED_MESSAGE);
                return false;
              }
              const recorded = await recordTermsAcceptance();
              if (!recorded) {
                setSubmitError(
                  "Impossible d'enregistrer l'acceptation des CGU/CGV.",
                );
                return false;
              }
              setSubmitError("");
              setTermsError("");
              return true;
            }}
          />
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </Card>
    </AuthSplitLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <AuthSplitLayout>
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </AuthSplitLayout>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
