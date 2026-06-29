"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ParametresSection } from "@/components/parametres-section";
import { Button } from "@/components/ui/button";
import {
  EMAIL_EXPIRED_MESSAGE,
  EMAIL_STATUS_FETCH_ERROR_MESSAGE,
  GMAIL_CONFIG_INCOMPLETE_MESSAGE,
  fetchEmailConnectionStatus,
  getConnexionEmailStatutLabel,
  mergeConnexionEmailMetadata,
  resolveConnexionEmail,
} from "@/lib/email-provider";
import { toFriendlyFlashOAuthMessage } from "@/lib/email-provider/oauth-errors";
import type { ConnexionEmailStatut, Parametres } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2, LogOut, Mail } from "lucide-react";

type ParametresConnexionEmailSectionProps = {
  form: Parametres;
  onChange: (next: Parametres) => void;
  onPersist?: (next: Parametres) => void;
};

function statutBadgeClass(statut: ConnexionEmailStatut): string {
  switch (statut) {
    case "connecte":
      return "border-primary/30 bg-primary/10 text-primary";
    case "expire":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-border/80 bg-card-elevated/60 text-muted-foreground";
  }
}

export function ParametresConnexionEmailSection({
  form,
  onChange,
  onPersist,
}: ParametresConnexionEmailSectionProps) {
  const searchParams = useSearchParams();
  const connexion = resolveConnexionEmail(form);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [configError, setConfigError] = useState(false);
  const [configErrorMessage, setConfigErrorMessage] = useState<string | null>(
    null,
  );

  const applyStatus = useCallback(
    async (persist = true) => {
      const status = await fetchEmailConnectionStatus();
      setStatusError(Boolean(status.statusError));
      setConfigError(Boolean(status.configError));
      setConfigErrorMessage(status.message ?? null);
      const next = mergeConnexionEmailMetadata(form, status);
      onChange(next);
      if (persist) onPersist?.(next);
      return status;
    },
    [form, onChange, onPersist],
  );

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      setLoading(true);
      await applyStatus(true);
      if (!cancelled) setLoading(false);
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const oauth = searchParams.get("email_oauth");
    if (!oauth) return;

    const message = searchParams.get("message");

    async function handleOAuthRedirect() {
      if (oauth === "success") {
        const email = searchParams.get("email");
        await applyStatus(true);
        setFlashMessage(
          email
            ? `Compte ${email} connecté avec succès.`
            : "Connexion email réussie.",
        );
      } else if (oauth === "error") {
        setFlashMessage(
          message
            ? toFriendlyFlashOAuthMessage(decodeURIComponent(message))
            : "La connexion email a échoué.",
        );
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("email_oauth");
      url.searchParams.delete("provider");
      url.searchParams.delete("email");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.pathname + url.search);
    }

    void handleOAuthRedirect();
  }, [searchParams, applyStatus]);

  async function handleDisconnect() {
    setDisconnecting(true);
    setFlashMessage(null);

    try {
      await fetch("/api/email/disconnect", { method: "POST" });
      const next = mergeConnexionEmailMetadata(form, {
        connected: false,
        expired: false,
        provider: null,
      });
      onChange(next);
      onPersist?.(next);
      setFlashMessage("Adresse email déconnectée.");
    } finally {
      setDisconnecting(false);
    }
  }

  const isConnected = connexion.statut === "connecte";
  const isExpired = connexion.statut === "expire";

  return (
    <ParametresSection
      id="connexion-email"
      title="Connexion email"
      description="Envoyez devis et factures depuis votre propre adresse professionnelle (Gmail ou Microsoft 365)"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
              statutBadgeClass(connexion.statut),
            )}
          >
            <Mail className="h-3.5 w-3.5" />
            {loading ? "Vérification…" : getConnexionEmailStatutLabel(connexion.statut)}
          </span>
          {connexion.connectedEmail ? (
            <span className="text-sm text-muted-foreground">
              Connecté :{" "}
              <span className="font-medium text-foreground">
                {connexion.connectedEmail}
              </span>
              {connexion.provider === "google"
                ? " · Gmail"
                : connexion.provider === "microsoft"
                  ? " · Microsoft 365"
                  : null}
            </span>
          ) : null}
        </div>

        {configError ? (
          <p className="rounded-lg border btp-alert-error px-3 py-2 text-sm">
            {configErrorMessage ?? GMAIL_CONFIG_INCOMPLETE_MESSAGE}
          </p>
        ) : null}

        {statusError ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {EMAIL_STATUS_FETCH_ERROR_MESSAGE}
          </p>
        ) : null}

        {isExpired ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {EMAIL_EXPIRED_MESSAGE}
          </p>
        ) : null}

        {flashMessage ? (
          <p className="rounded-lg border border-border/80 bg-card-elevated/60 px-3 py-2 text-sm text-foreground">
            {flashMessage}
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Connexion sécurisée par OAuth — aucun mot de passe n&apos;est demandé ni
          stocké. Les réponses de vos clients arrivent directement dans votre boîte
          mail.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={loading || isConnected}
            onClick={() => {
              window.location.href = "/api/email/oauth/google";
            }}
          >
            Connecter Gmail
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || isConnected}
            onClick={() => {
              window.location.href = "/api/email/oauth/microsoft";
            }}
          >
            Connecter Outlook / Microsoft 365
          </Button>
          {(isConnected || isExpired) && (
            <Button
              type="button"
              variant="ghost"
              disabled={disconnecting}
              onClick={() => void handleDisconnect()}
            >
              {disconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Déconnecter l&apos;email
            </Button>
          )}
        </div>
      </div>
    </ParametresSection>
  );
}
