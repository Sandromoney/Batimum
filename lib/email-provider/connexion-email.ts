import { buildAuthenticatedFetchInit } from "@/lib/authenticated-api-fetch";
import type {
  ConnexionEmailStatut,
  EmailOAuthProvider,
  Parametres,
  ParametresConnexionEmail,
} from "@/lib/types";
import type { EmailConnectionStatus } from "./types";

export const DEFAULT_CONNEXION_EMAIL: ParametresConnexionEmail = {
  statut: "non_connecte",
  provider: null,
};

export function resolveConnexionEmail(
  parametres: Parametres,
): ParametresConnexionEmail {
  return {
    ...DEFAULT_CONNEXION_EMAIL,
    ...parametres.connexionEmail,
  };
}

export function isEmailConnectionActive(parametres: Parametres): boolean {
  return resolveConnexionEmail(parametres).statut === "connecte";
}

export function mergeConnexionEmailMetadata(
  parametres: Parametres,
  status: EmailConnectionStatus,
): Parametres {
  let statut: ConnexionEmailStatut = "non_connecte";
  if (status.connected) statut = "connecte";
  else if (status.expired) statut = "expire";

  return {
    ...parametres,
    connexionEmail: {
      provider: (status.provider as EmailOAuthProvider | null | undefined) ?? null,
      connectedEmail: status.email,
      statut,
      connecteLe:
        statut === "connecte"
          ? parametres.connexionEmail?.connecteLe ?? new Date().toISOString()
          : undefined,
      expireLe: status.expiresAt,
    },
  };
}

export function buildConnexionEmailConnected(input: {
  email: string;
  provider: EmailOAuthProvider | null;
  expiresAt?: string;
  connecteLe?: string;
}): ParametresConnexionEmail {
  return {
    statut: "connecte",
    connectedEmail: input.email,
    provider: input.provider,
    connecteLe: input.connecteLe ?? new Date().toISOString(),
    expireLe: input.expiresAt,
  };
}

export function buildConnexionEmailDisconnected(): ParametresConnexionEmail {
  return { ...DEFAULT_CONNEXION_EMAIL };
}

export function isConnexionEmailConnected(
  connexion?: ParametresConnexionEmail | null,
): boolean {
  return (
    connexion?.statut === "connecte" &&
    Boolean(connexion.connectedEmail?.trim())
  );
}

export function connexionEmailToDisplayStatus(
  connexion?: ParametresConnexionEmail | null,
): EmailConnectionStatus | null {
  if (!connexion) return null;
  if (connexion.statut === "expire") {
    return {
      connected: false,
      expired: true,
      provider: connexion.provider ?? null,
      email: connexion.connectedEmail,
      expiresAt: connexion.expireLe,
    };
  }
  if (!isConnexionEmailConnected(connexion)) return null;
  return {
    connected: true,
    expired: false,
    provider: connexion.provider ?? null,
    email: connexion.connectedEmail,
    expiresAt: connexion.expireLe,
  };
}

export async function fetchEmailConnectionStatus(): Promise<EmailConnectionStatus> {
  try {
    const response = await fetch(
      "/api/email/status",
      await buildAuthenticatedFetchInit({ cache: "no-store" }),
    );
    if (!response.ok) {
      return {
        connected: false,
        expired: false,
        provider: null,
        statusError: true,
      };
    }
    return (await response.json()) as EmailConnectionStatus;
  } catch {
    return {
      connected: false,
      expired: false,
      provider: null,
      statusError: true,
    };
  }
}

export function getConnexionEmailStatutLabel(statut: ConnexionEmailStatut): string {
  switch (statut) {
    case "connecte":
      return "Connecté";
    case "expire":
      return "Connexion expirée";
    default:
      return "Non connecté";
  }
}

export {
  EMAIL_EXPIRED_MESSAGE,
  EMAIL_NOT_CONNECTED_MESSAGE,
} from "./types";
