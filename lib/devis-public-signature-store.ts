import { randomBytes } from "crypto";
import {
  GmailDbError,
  logGmailDbSupabaseError,
  SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE,
} from "@/lib/gmail-oauth-config";
import { getDevisDisplayStatut } from "@/lib/devis-statut";
import type { Client, Devis, Parametres } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";

export const DEVIS_PUBLIC_SIGNATURES_TABLE = "devis_public_signatures";

export type PublicDevisSignatureStatus = "pending" | "signed" | "refused" | "expired";

export type DevisPublicSignatureRow = {
  id: string;
  public_token: string;
  user_id: string;
  devis_id: string;
  devis: Devis;
  client: Client | null;
  parametres: Parametres;
  status: PublicDevisSignatureStatus;
  signature_data: string | null;
  signed_by: string | null;
  signed_at: string | null;
  refused_at: string | null;
  refused_by: string | null;
  refusal_reason: string | null;
  client_ip: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export function generateDevisPublicToken(): string {
  return randomBytes(32).toString("base64url");
}

function stripSensitiveParametres(parametres: Parametres): Parametres {
  const next = { ...parametres };
  if (next.facturationElectronique) {
    next.facturationElectronique = {
      ...next.facturationElectronique,
      pdpApiKey: "",
    };
  }
  return next;
}

function resolveExpiresAt(devis: Devis): string | null {
  const baseDate = devis.dateDevis ?? devis.date;
  if (!baseDate) return null;
  const validite = Math.max(1, devis.validiteJours ?? 30);
  const expires = new Date(`${baseDate.slice(0, 10)}T12:00:00`);
  expires.setDate(expires.getDate() + validite);
  return expires.toISOString();
}

function resolveRowStatus(row: DevisPublicSignatureRow): PublicDevisSignatureStatus {
  if (row.status === "signed" || row.status === "refused") {
    return row.status;
  }
  if (row.expires_at && Date.now() > new Date(row.expires_at).getTime()) {
    return "expired";
  }
  const display = getDevisDisplayStatut(row.devis);
  if (display === "expire") return "expired";
  return row.status;
}

export async function publishDevisPublicSignature({
  userId,
  devis,
  client,
  parametres,
}: {
  userId: string;
  devis: Devis;
  client?: Client;
  parametres: Parametres;
}): Promise<{
  publicToken: string;
  error: { message: string; code?: string } | null;
}> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      publicToken: "",
      error: { message: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE },
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      publicToken: "",
      error: { message: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE },
    };
  }

  const { data: existing } = await supabase
    .from(DEVIS_PUBLIC_SIGNATURES_TABLE)
    .select("public_token, status")
    .eq("user_id", userId)
    .eq("devis_id", devis.id)
    .maybeSingle();

  const existingRow = existing as {
    public_token?: string;
    status?: PublicDevisSignatureStatus;
  } | null;

  const reuseToken =
    existingRow?.status === "pending" &&
    Boolean(existingRow.public_token?.trim());

  const publicToken = reuseToken
    ? existingRow!.public_token!.trim()
    : generateDevisPublicToken();
  const now = new Date().toISOString();

  const { error } = await supabase.from(DEVIS_PUBLIC_SIGNATURES_TABLE).upsert(
    {
      user_id: userId,
      devis_id: devis.id,
      public_token: publicToken,
      devis,
      client: client ?? null,
      parametres: stripSensitiveParametres(parametres),
      status: "pending",
      signature_data: null,
      signed_by: null,
      signed_at: null,
      refused_at: null,
      refused_by: null,
      refusal_reason: null,
      client_ip: null,
      expires_at: resolveExpiresAt(devis),
      updated_at: now,
    },
    { onConflict: "user_id,devis_id" },
  );

  if (error) {
    logGmailDbSupabaseError(error);
    return {
      publicToken: "",
      error: {
        message: new GmailDbError(error).message,
        code: error.code,
      },
    };
  }

  return { publicToken, error: null };
}

export async function loadDevisPublicSignatureByToken(
  publicToken: string,
): Promise<{
  row: DevisPublicSignatureRow | null;
  error: { message: string; code?: string } | null;
}> {
  if (!publicToken.trim()) {
    return { row: null, error: { message: "Token manquant." } };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      row: null,
      error: { message: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE },
    };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return {
      row: null,
      error: { message: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE },
    };
  }

  const { data, error } = await supabase
    .from(DEVIS_PUBLIC_SIGNATURES_TABLE)
    .select("*")
    .eq("public_token", publicToken.trim())
    .maybeSingle();

  if (error) {
    logGmailDbSupabaseError(error);
    return {
      row: null,
      error: {
        message: new GmailDbError(error).message,
        code: error.code,
      },
    };
  }

  if (!data) {
    return { row: null, error: null };
  }

  const row = data as DevisPublicSignatureRow;
  return {
    row: {
      ...row,
      status: resolveRowStatus(row),
      devis: row.devis as Devis,
      client: (row.client as Client | null) ?? null,
      parametres: row.parametres as Parametres,
    },
    error: null,
  };
}

export async function loadDevisPublicSignatureForOwner(
  userId: string,
  devisId: string,
): Promise<{
  row: DevisPublicSignatureRow | null;
  error: { message: string; code?: string } | null;
}> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { row: null, error: { message: "Client Supabase indisponible." } };
  }

  const { data, error } = await supabase
    .from(DEVIS_PUBLIC_SIGNATURES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("devis_id", devisId)
    .maybeSingle();

  if (error) {
    logGmailDbSupabaseError(error);
    return {
      row: null,
      error: {
        message: new GmailDbError(error).message,
        code: error.code,
      },
    };
  }

  if (!data) return { row: null, error: null };

  const row = data as DevisPublicSignatureRow;
  return {
    row: {
      ...row,
      status: resolveRowStatus(row),
      devis: row.devis as Devis,
      client: (row.client as Client | null) ?? null,
      parametres: row.parametres as Parametres,
    },
    error: null,
  };
}

export async function updateDevisPublicSignatureByToken(
  publicToken: string,
  patch: Partial<
    Pick<
      DevisPublicSignatureRow,
      | "status"
      | "devis"
      | "signature_data"
      | "signed_by"
      | "signed_at"
      | "refused_at"
      | "refused_by"
      | "refusal_reason"
      | "client_ip"
    >
  >,
): Promise<{ error: { message: string; code?: string } | null }> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { error: { message: SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE } };
  }

  const { error } = await supabase
    .from(DEVIS_PUBLIC_SIGNATURES_TABLE)
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("public_token", publicToken.trim());

  if (error) {
    logGmailDbSupabaseError(error);
    return {
      error: {
        message: new GmailDbError(error).message,
        code: error.code,
      },
    };
  }

  return { error: null };
}
