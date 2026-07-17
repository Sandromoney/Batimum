"use client";

import { buildAuthenticatedFetchInit } from "@/lib/authenticated-api-fetch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ParametresSection } from "@/components/parametres-section";
import { Button } from "@/components/ui/button";
import {
  EMAIL_EXPIRED_MESSAGE,
  EMAIL_STATUS_FETCH_ERROR_MESSAGE,
  GMAIL_CONFIG_INCOMPLETE_MESSAGE,
  buildConnexionEmailConnected,
  buildConnexionEmailDisconnected,
  connexionEmailToDisplayStatus,
  fetchEmailConnectionStatus,
  getConnexionEmailStatutLabel,
  isConnexionEmailConnected,
  toFriendlyFlashOAuthMessage,
} from "@/lib/email-provider";
import type { EmailConnectionStatus } from "@/lib/email-provider/types";
import type {
  ConnexionEmailStatut,
  EmailOAuthProvider,
  ParametresConnexionEmail,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2, LogOut, Mail } from "lucide-react";

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

function statusToStatut(status: EmailConnectionStatus | null): ConnexionEmailStatut {
  if (!status) return "non_connecte";
  if (status.connected) return "connecte";
  if (status.expired) return "expire";
  return "non_connecte";
}

function providerFromParam(value: string | null): EmailOAuthProvider | null {
  if (value === "google") return "google";
  if (value === "microsoft") return "microsoft";
  return null;
}

type Props = {
  connexionEmail?: ParametresConnexionEmail;
  modified?: boolean;
  onConnexionEmailChange: (connexionEmail: ParametresConnexionEmail) => void;
};

export function ParametresConnexionEmailSection({
  connexionEmail,
  modified = false,
  onConnexionEmailChange,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<EmailConnectionStatus | null>(
    null,
  );

  const savedDisplayStatus = useMemo(
    () => connexionEmailToDisplayStatus(connexionEmail),
    [connexionEmail],
  );
  const isConnected = isConnexionEmailConnected(connexionEmail);
  const isExpired = connexionEmail?.statut === "expire";

  const connexionEmailRef = useRef(connexionEmail);
  connexionEmailRef.current = connexionEmail;

  const refreshRemoteStatus = useCallback(async () => {
    setVerifying(true);
    const next = await fetchEmailConnectionStatus();
    setRemoteStatus(next);
    setVerifying(false);
    return next;
  }, []);

  useEffect(() => {
    const oauth = searchParams.get("email_oauth");
    if (oauth) return;

    void (async () => {
      if (isConnexionEmailConnected(connexionEmailRef.current)) {
        await refreshRemoteStatus();
        return;
      }

      const next = await refreshRemoteStatus();
      if (next.connected && next.email) {
        onConnexionEmailChange(
          buildConnexionEmailConnected({
            email: next.email,
            provider: next.provider ?? null,
            expiresAt: next.expiresAt,
          }),
        );
      }
    })();
  }, [onConnexionEmailChange, refreshRemoteStatus, searchParams]);

  useEffect(() => {
    const oauth = searchParams.get("email_oauth");
    if (!oauth) return;

    const message = searchParams.get("message");
    const emailParam = searchParams.get("email");
    const providerParam = searchParams.get("provider");
    const decodedEmail = emailParam ? decodeURIComponent(emailParam) : null;

    async function handleOAuthRedirect() {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (oauth === "success") {
        if (decodedEmail) {
          onConnexionEmailChange(
            buildConnexionEmailConnected({
              email: decodedEmail,
              provider: providerFromParam(providerParam),
            }),
          );
          setSuccessMessage(`Compte ${decodedEmail} connecté avec succès.`);
        }

        router.replace("/parametres?section=connexion-email", { scroll: false });

        const next = await refreshRemoteStatus();
        if (next.connected && next.email) {
          onConnexionEmailChange(
            buildConnexionEmailConnected({
              email: next.email,
              provider: next.provider ?? null,
              expiresAt: next.expiresAt,
            }),
          );
          setSuccessMessage(`Compte ${next.email} connecté avec succès.`);
        }
        return;
      }

      if (oauth === "error") {
        setErrorMessage(
          message
            ? toFriendlyFlashOAuthMessage(decodeURIComponent(message))
            : "La connexion email a échoué.",
        );
        router.replace("/parametres?section=connexion-email", { scroll: false });
        await refreshRemoteStatus();
      }
    }

    void handleOAuthRedirect();
  }, [
    onConnexionEmailChange,
    refreshRemoteStatus,
    router,
    searchParams,
  ]);

  async function handleDisconnect() {
    setDisconnecting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await fetch(
        "/api/email/disconnect",
        await buildAuthenticatedFetchInit({ method: "POST" }),
      );
      onConnexionEmailChange(buildConnexionEmailDisconnected());
      await refreshRemoteStatus();
      setSuccessMessage("Adresse email déconnectée.");
    } finally {
      setDisconnecting(false);
    }
  }

  const displayStatus = savedDisplayStatus ?? remoteStatus;
  const statut = isConnected
    ? "connecte"
    : isExpired
      ? "expire"
      : statusToStatut(displayStatus);

  const configError =
    !isConnected && !verifying && Boolean(remoteStatus?.configError);
  const configErrorMessage = remoteStatus?.message ?? null;
  const statusFetchError =
    !isConnected &&
    !verifying &&
    Boolean(remoteStatus?.statusError) &&
    !successMessage;

  const badgeLabel = isConnected
    ? "Connecté"
    : verifying
      ? "Vérification…"
      : getConnexionEmailStatutLabel(statut);

  const connectedEmail = connexionEmail?.connectedEmail;

  return (
    <ParametresSection
      id="connexion-email"
      title="Connexion email"
      description="Envoyez devis et factures depuis votre propre adresse professionnelle (Gmail ou Microsoft 365)"
      modified={modified}
    >
      <div className="space-y-4">
        {verifying && !isConnected ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Vérification de la connexion email...
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                  statutBadgeClass(isConnected ? "connecte" : statut),
                )}
              >
                <Mail className="h-3.5 w-3.5" />
                {badgeLabel}
              </span>
              {isConnected && connectedEmail && !successMessage ? (
                <span className="text-sm text-muted-foreground">
                  Connecté :{" "}
                  <span className="font-medium text-foreground">{connectedEmail}</span>
                  {connexionEmail?.provider === "google"
                    ? " · Gmail"
                    : connexionEmail?.provider === "microsoft"
                      ? " · Microsoft 365"
                      : null}
                </span>
              ) : null}
            </div>

            {isConnected && successMessage ? (
              <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {successMessage}
              </p>
            ) : null}

            {isConnected && modified ? (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Modifications non enregistrées — cliquez sur « Enregistrer les
                paramètres » pour conserver la connexion.
              </p>
            ) : null}

            {configError ? (
              <p className="rounded-lg border btp-alert-error px-3 py-2 text-sm">
                {configErrorMessage ?? GMAIL_CONFIG_INCOMPLETE_MESSAGE}
              </p>
            ) : null}

            {statusFetchError ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {EMAIL_STATUS_FETCH_ERROR_MESSAGE}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-lg border btp-alert-error px-3 py-2 text-sm">
                {errorMessage}
              </p>
            ) : null}

            {isExpired ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {EMAIL_EXPIRED_MESSAGE}
              </p>
            ) : null}
          </>
        )}

        <p className="text-sm text-muted-foreground">
          Connexion sécurisée par OAuth — aucun mot de passe n&apos;est demandé ni
          stocké. Les réponses de vos clients arrivent directement dans votre boîte
          mail.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={verifying || isConnected}
            onClick={() => {
              window.location.href = "/api/email/oauth/google";
            }}
          >
            Connecter Gmail
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={verifying || isConnected}
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
              Déconnecter
            </Button>
          )}
        </div>
      </div>
    </ParametresSection>
  );
}
