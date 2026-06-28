"use client";

import { ButtonLink } from "@/components/ui/button";
import { EMAIL_EXPIRED_MESSAGE } from "@/lib/email-provider";
import { cn } from "@/lib/utils";
import { Mail } from "lucide-react";

export const EMAIL_CONNECT_SETTINGS_HREF = "/parametres?section=connexion-email";

export const EMAIL_BANNER_MESSAGE =
  "Adresse email non connectée. Connectez votre email dans les paramètres pour envoyer vos devis et factures depuis votre propre adresse.";

export const EMAIL_SEND_DISABLED_MESSAGE =
  "Veuillez connecter votre email avant d'envoyer ce document.";

type EmailConnectionBannerProps = {
  connected: boolean;
  expired?: boolean;
  email?: string;
  loading?: boolean;
  className?: string;
};

export function EmailConnectionBanner({
  connected,
  expired = false,
  email,
  loading = false,
  className,
}: EmailConnectionBannerProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border/70 bg-card-elevated/50 px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        Vérification de la connexion email…
      </div>
    );
  }

  if (connected && email) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card-elevated/50 px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        <Mail className="h-4 w-4 shrink-0 text-primary/80" />
        <span>
          Connecté :{" "}
          <span className="font-medium text-foreground">{email}</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card-elevated/60 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="flex gap-3">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm leading-6 text-foreground/90">
            {expired ? EMAIL_EXPIRED_MESSAGE : EMAIL_BANNER_MESSAGE}
          </p>
        </div>
      </div>
      <ButtonLink
        href={EMAIL_CONNECT_SETTINGS_HREF}
        variant="secondary"
        size="sm"
        className="mt-3 shrink-0 sm:mt-0"
      >
        Connecter mon email
      </ButtonLink>
    </div>
  );
}

export function resolveEmailSendDisabledTitle({
  emailConnected,
  clientHasEmail = true,
  clientMissingMessage = "Ajoutez l'email du client pour envoyer le devis",
}: {
  emailConnected: boolean;
  clientHasEmail?: boolean;
  clientMissingMessage?: string;
}): string | undefined {
  if (!emailConnected) return EMAIL_SEND_DISABLED_MESSAGE;
  if (!clientHasEmail) return clientMissingMessage;
  return undefined;
}
