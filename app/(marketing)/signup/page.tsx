"use client";



import Link from "next/link";

import { useRouter, useSearchParams } from "next/navigation";

import { Suspense, useEffect, useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { GoogleContinueButton } from "@/components/google-continue-button";
import { MarketingFooter } from "@/components/marketing-footer";

import { Button } from "@/components/ui/button";

import { Card } from "@/components/ui/card";

import { Input, Label } from "@/components/ui/input";

import { saveAccount, type UserAccount } from "@/lib/account";

import { savePendingSignupCredentials } from "@/lib/auth-credentials";

import {
  isPrivateBetaEnabled,
  PRIVATE_BETA_SIGNUP_CLOSED_MESSAGE,
} from "@/lib/private-beta";

import { cn } from "@/lib/utils";

import {
  hasSignupFieldErrors,
  SIGNUP_STRIPE_ERROR_MESSAGE,
  validateSignupFields,
  type SignupField,
} from "@/lib/signup-validation";
import {
  fetchRecordedTermsAcceptance,
  recordTermsAcceptance,
  TERMS_ACCEPTANCE_REQUIRED_MESSAGE,
} from "@/lib/legal-acceptance";



type CheckoutResponse = {

  url?: string;

  error?: string;

};



const INPUT_ERROR_CLASS =

  "border-red-500/70 bg-red-500/5 focus:border-red-500/80 focus:ring-red-500/15";



function FieldError({ message }: { message?: string }) {

  if (!message) return null;

  return <p className="mt-1.5 text-xs font-medium text-red-400">{message}</p>;

}



function SignupForm() {

  const router = useRouter();

  const searchParams = useSearchParams();

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

      email,

      password,

      confirmPassword,

    }),

    [email, password, confirmPassword],

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



    const preset = searchParams.get("email");

    if (preset) {

      setEmail(preset);

      setTouched((current) => ({ ...current, email: true }));

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



  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {

    event.preventDefault();

    setShowAllErrors(true);

    setSubmitError("");

    setTermsError("");



    const errors = validateSignupFields(formValues, { showAll: true });

    if (hasSignupFieldErrors(errors)) {

      return;

    }



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



    const draft: UserAccount = {

      entreprise: "",

      utilisateur: "",

      email: normalizedEmail,

      telephone: "",

      subscriptionStatus: null,

      onboardingCompleted: false,

      createdAt: new Date().toISOString(),

      legalAcceptance: legalAcceptance ?? undefined,

    };



    saveAccount(draft);

    await savePendingSignupCredentials(normalizedEmail, formValues.password);

    setLoading(true);



    try {

      const response = await fetch("/api/stripe/checkout", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ email: normalizedEmail }),

      });



      let payload: CheckoutResponse = {};

      try {

        payload = (await response.json()) as CheckoutResponse;

      } catch {

        payload = {};

      }



      if (!response.ok || !payload.url) {

        setSubmitError(payload.error ?? SIGNUP_STRIPE_ERROR_MESSAGE);

        setLoading(false);

        return;

      }



      window.location.href = payload.url;

    } catch {

      setSubmitError(SIGNUP_STRIPE_ERROR_MESSAGE);

      setLoading(false);

    }

  }



  return (

    <main className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">

      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-10">

        <Card className="w-full max-w-md">

          <Link href="/" className="mb-8 flex justify-center">

            <BrandLogo variant="landing" showSubtitle={false} />

          </Link>



          <header className="mb-8">

            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary">

              Création d&apos;espace

            </p>

            <h1 className="text-3xl font-semibold tracking-tight">

              Créer un compte

            </h1>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">

              7 jours d&apos;essai gratuit avec carte bancaire. Annulable à tout

              moment avant la fin de l&apos;essai — aucun débit.

            </p>

          </header>



          <form className="space-y-5" onSubmit={handleSubmit} noValidate>

            <section>

              <Label>Email</Label>

              <Input

                id="email"

                type="email"

                value={email}

                onChange={(e) => {

                  markTouched("email");

                  setEmail(e.target.value);

                }}

                onBlur={() => markTouched("email")}

                placeholder="vous@entreprise.fr"

                disabled={loading}

                className={inputClass("email")}

                aria-invalid={Boolean(fieldErrors.email)}

              />

              <FieldError message={fieldErrors.email} />

            </section>



            <section>

              <Label>Mot de passe</Label>

              <Input

                id="password"

                type="password"

                value={password}

                onChange={(e) => {

                  markTouched("password");

                  setPassword(e.target.value);

                }}

                onBlur={() => markTouched("password")}

                placeholder="••••••••"

                disabled={loading}

                className={inputClass("password")}

                aria-invalid={Boolean(fieldErrors.password)}

              />

              <FieldError message={fieldErrors.password} />

            </section>



            <section>

              <Label>Confirmation mot de passe</Label>

              <Input

                id="confirmPassword"

                type="password"

                value={confirmPassword}

                onChange={(e) => {

                  markTouched("confirmPassword");

                  setConfirmPassword(e.target.value);

                }}

                onBlur={() => markTouched("confirmPassword")}

                placeholder="••••••••"

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

                  onChange={(e) => {

                    setAcceptedTerms(e.target.checked);

                    if (e.target.checked) setTermsError("");

                  }}

                  disabled={loading}

                  className="mt-0.5 size-4 shrink-0 rounded border-border bg-card accent-primary"

                  aria-invalid={Boolean(termsError)}

                />

                <span className="text-sm leading-6 text-muted-foreground">

                  J&apos;accepte les{" "}

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

                  </Link>

                </span>

              </label>

              {termsError && (

                <p className="mt-1.5 text-xs font-medium text-red-400">

                  {termsError}

                </p>

              )}

            </section>



            {submitError && (

              <p className="rounded-xl border btp-alert-error px-3 py-2 text-sm">

                {submitError}

              </p>

            )}



            <Button type="submit" className="w-full" disabled={loading}>

              {loading ? "Préparation du paiement sécurisé…" : "Démarrer l'essai gratuit"}

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

                  setSubmitError("Impossible d'enregistrer l'acceptation des CGU/CGV.");

                  return false;

                }

                setSubmitError("");

                setTermsError("");

                return true;

              }}

            />

          </form>



          <p className="mt-4 text-center text-xs text-muted-foreground">

            Paiement sécurisé par Stripe. Carte bancaire obligatoire pour activer

            l&apos;essai gratuit de 7 jours.

          </p>



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

      </section>

      <MarketingFooter />

    </main>

  );

}



export default function SignupPage() {

  return (

    <Suspense

      fallback={

        <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">

          Chargement…

        </main>

      }

    >

      <SignupForm />

    </Suspense>

  );

}

