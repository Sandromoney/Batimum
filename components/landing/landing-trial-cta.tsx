"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPublicSignupHref, isPrivateBetaEnabled } from "@/lib/private-beta";
import { cn } from "@/lib/utils";
import { writeLandingSnapshot } from "@/components/landing/landing-experience";

type LandingTrialCtaProps = {
  href?: string;
  /** Libellé du bouton — même destination, formulations adaptées au contexte. */
  label?: string;
  className?: string;
  buttonClassName?: string;
  noteClassName?: string;
  /** Affiche la note « 7 jours d'essai gratuit » sous le bouton. */
  showTrialNote?: boolean;
  fullWidth?: boolean;
  onNavigate?: () => void;
};

/**
 * CTA principaux landing — même parcours d’inscription / essai.
 * Le libellé peut varier selon la section.
 */
export function LandingTrialCta({
  href,
  label,
  className,
  buttonClassName,
  noteClassName,
  showTrialNote = true,
  fullWidth = false,
  onNavigate,
}: LandingTrialCtaProps) {
  const beta = isPrivateBetaEnabled();
  const target = href ?? getPublicSignupHref();
  const buttonLabel = beta ? "Se connecter" : label ?? "Essayer gratuitement";

  return (
    <div
      className={cn(
        "lp-trial-cta",
        fullWidth && "lp-trial-cta--full",
        className,
      )}
    >
      <Link
        href={target}
        className={cn(
          "landing-btn-primary landing-btn-interactive group inline-flex items-center justify-center gap-2 no-underline",
          fullWidth && "w-full",
          buttonClassName,
        )}
        onClick={() => {
          writeLandingSnapshot();
          onNavigate?.();
        }}
      >
        {buttonLabel}
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
      {showTrialNote && !beta ? (
        <p className={cn("lp-trial-cta__note", noteClassName)}>
          7 jours d&apos;essai gratuit
        </p>
      ) : null}
    </div>
  );
}
