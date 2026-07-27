import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

const FIELDS = [
  "Raison sociale",
  "Adresse",
  "Activité",
  "TVA",
  "Informations administratives",
] as const;

export function LandingAccountSection() {
  const href = getPublicSignupHref();
  const label = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Je crée une nouvelle entreprise";

  return (
    <section
      id="creation-compte"
      className="lp-section"
      aria-labelledby="siret-title"
    >
      <div className="lp-container">
        <div className="lp-split">
          <LandingReveal>
            <span className="lp-eyebrow">
              <span className="lp-eyebrow__dot" aria-hidden="true" />
              Création de compte
            </span>
            <h2 id="siret-title" className="lp-title mt-4 text-3xl sm:text-4xl">
              Une inscription plus simple pour démarrer.
            </h2>
            <p className="lp-subtitle mt-3 max-w-xl">
              Entrez votre numéro SIRET et Batimum prépare automatiquement les
              informations de votre entreprise. Cette simplification sera
              intégrée progressivement à l’inscription.
            </p>
            <div className="mt-6">
              <Link
                href={href}
                className="landing-btn-primary landing-btn-interactive group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold no-underline"
              >
                {label}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </LandingReveal>

          <LandingReveal delay={100}>
            <div className="lp-siret-box">
              <div className="text-sm font-semibold text-[#101828]">
                Aperçu des informations préparées
              </div>
              <div className="lp-siret-fields">
                {FIELDS.map((field) => (
                  <div key={field} className="lp-siret-field">
                    <span>{field}</span>
                    <span>Préremplie</span>
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
