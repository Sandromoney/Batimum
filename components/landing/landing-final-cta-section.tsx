import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";

export function LandingFinalCtaSection() {
  const href = getPublicSignupHref();
  const label = isPrivateBetaEnabled()
    ? "Se connecter"
    : "Essayer gratuitement";

  return (
    <section className="lp-section" aria-labelledby="final-cta-title">
      <div className="lp-container">
        <LandingReveal>
          <div className="lp-final">
            <h2
              id="final-cta-title"
              className="lp-title text-3xl text-white sm:text-4xl"
            >
              Moins d&apos;administratif.{" "}
              <span className="lp-title-accent">Plus de chantiers.</span>
            </h2>
            <p className="lp-subtitle mx-auto mt-4 max-w-2xl">
              Centralisez votre activité et gardez le contrôle de votre
              entreprise, où que vous soyez.
            </p>
            <div className="lp-hero__ctas mt-8 justify-center">
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
              <Link
                href="/landing#fonctionnalites"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
              >
                Voir les fonctionnalités
              </Link>
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
