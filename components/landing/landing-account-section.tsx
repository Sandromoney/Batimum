import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

const STEPS = [
  "Entrez votre numéro SIRET.",
  "Vérifiez les informations récupérées.",
  "Ajoutez votre logo.",
  "Créez votre premier devis.",
] as const;

const FIELDS = [
  "Entreprise",
  "Adresse",
  "Activité",
  "TVA",
  "Informations administratives",
] as const;

export function LandingAccountSection() {
  const href = getPublicSignupHref();
  const primaryLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";
  const secondaryLabel = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Je crée une nouvelle entreprise";

  return (
    <section
      id="creation-compte"
      className="lp-section"
      aria-labelledby="account-title"
    >
      <div className="lp-container">
        <div className="lp-split">
          <LandingReveal>
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Création de compte
            </span>
            <h2 id="account-title" className="lp-title mt-5">
              Votre entreprise prête en quelques minutes.
            </h2>
            <p className="lp-subtitle mt-5 max-w-xl">
              Un parcours simple pour démarrer. La récupération automatique via
              SIRET est en préparation.
            </p>
            <ol className="lp-account-steps">
              {STEPS.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="lp-account-actions">
              <Link
                href={href}
                className="landing-btn-primary landing-btn-interactive group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold no-underline"
              >
                {primaryLabel}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              {!isPrivateBetaEnabled() ? (
                <Link
                  href={href}
                  className="landing-btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold no-underline"
                >
                  {secondaryLabel}
                </Link>
              ) : null}
            </div>
          </LandingReveal>

          <LandingReveal delay={100}>
            <div className="lp-siret-box">
              <div className="lp-siret-box__top">
                <div className="text-sm font-semibold text-[#0F172A]">
                  Informations préparées automatiquement
                </div>
                <span className="lp-badge lp-badge--soon">Bientôt disponible</span>
              </div>
              <div className="lp-siret-fields">
                {FIELDS.map((field) => (
                  <div key={field} className="lp-siret-field">
                    <span>{field}</span>
                    <span>À venir</span>
                  </div>
                ))}
              </div>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
