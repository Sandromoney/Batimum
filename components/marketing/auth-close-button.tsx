"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { prepareSoftReturnToLanding } from "@/components/landing/landing-experience";
import { cn } from "@/lib/utils";

type AuthCloseButtonProps = {
  className?: string;
  /** Cible de retour. Défaut : landing. */
  href?: string;
};

/**
 * Fermeture propre des pages d’auth → retour landing soft
 * (conserve scroll + intro déjà vue, sans F5).
 */
export function AuthCloseButton({
  className,
  href = "/landing",
}: AuthCloseButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={cn("auth-close-btn", className)}
      onClick={() => {
        prepareSoftReturnToLanding();
        router.push(href);
      }}
      aria-label="Fermer et revenir à la page d’accueil"
    >
      <X className="auth-close-btn__icon" strokeWidth={2} aria-hidden="true" />
      <span>Fermer</span>
    </button>
  );
}
