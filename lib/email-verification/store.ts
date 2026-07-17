import "@/lib/stripe-tls-dev";
import {
  createVerificationCodeSalt,
  EMAIL_VERIFICATION_CODE_TTL_MINUTES,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  generateVerificationCode,
  hashVerificationCode,
  verificationCodeExpiresAt,
  verificationCodesMatch,
} from "@/lib/email-verification/code";
import {
  logEmailVerificationError,
  logSupabaseError,
  toClientErrorMessage,
} from "@/lib/email-verification/errors";
import { sendVerificationCodeEmail } from "@/lib/email-verification/send-email";
import {
  getSupabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE,
} from "@/lib/gmail-oauth-config";
import { createAdminClient } from "@/utils/supabase/admin";

const LOG_PREFIX = "[email-verification]";

export const EMAIL_VERIFICATION_CODES_TABLE = "email_verification_codes";

export type EmailVerificationCodeRow = {
  id: string;
  user_id: string | null;
  email: string;
  code_hash: string;
  code_salt: string;
  expires_at: string;
  attempts: number;
  max_attempts: number;
  used_at: string | null;
  last_sent_at: string;
  created_at: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function logSupabaseEnvPresence(): void {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  console.info(
    `${LOG_PREFIX} NEXT_PUBLIC_SUPABASE_URL présent : ${supabaseUrl ? "oui" : "non"}`,
  );
  console.info(
    `${LOG_PREFIX} SUPABASE_SERVICE_ROLE_KEY présente : ${serviceRoleKey ? "oui" : "non"}`,
  );
}

function getAdminOrThrow() {
  logSupabaseEnvPresence();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error(SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE);
  }

  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error(SUPABASE_SERVICE_ROLE_KEY_MISSING_MESSAGE);
  }

  return supabase;
}

async function getLatestActiveRow(
  email: string,
): Promise<EmailVerificationCodeRow | null> {
  const supabase = getAdminOrThrow();
  const { data, error } = await supabase
    .from(EMAIL_VERIFICATION_CODES_TABLE)
    .select("*")
    .eq("email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logSupabaseError("getLatestActiveRow", error);
    throw new Error(error.message);
  }

  return (data as EmailVerificationCodeRow | null) ?? null;
}

async function invalidateActiveCodes(email: string): Promise<void> {
  const supabase = getAdminOrThrow();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from(EMAIL_VERIFICATION_CODES_TABLE)
    .update({ used_at: now })
    .eq("email", email)
    .is("used_at", null);

  if (error) {
    logSupabaseError("invalidateActiveCodes", error);
    throw new Error(error.message);
  }
}

export async function issueEmailVerificationCode(
  email: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { ok: false, message: "Email invalide." };
  }

  console.info(`${LOG_PREFIX} Génération code pour : ${normalized}`);

  try {
    const existing = await getLatestActiveRow(normalized);
    if (existing) {
      const cooldownEnds =
        new Date(existing.last_sent_at).getTime() +
        EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000;
      if (Date.now() < cooldownEnds) {
        const waitSeconds = Math.ceil((cooldownEnds - Date.now()) / 1000);
        return {
          ok: false,
          message: `Veuillez patienter ${waitSeconds} seconde(s) avant de renvoyer un code.`,
        };
      }
    }

    const plainCode = generateVerificationCode();
    const salt = createVerificationCodeSalt();
    const codeHash = hashVerificationCode(plainCode, salt);
    const now = new Date().toISOString();

    await invalidateActiveCodes(normalized);

    const supabase = getAdminOrThrow();
    const { error } = await supabase.from(EMAIL_VERIFICATION_CODES_TABLE).insert({
      user_id: null,
      email: normalized,
      code_hash: codeHash,
      code_salt: salt,
      expires_at: verificationCodeExpiresAt(EMAIL_VERIFICATION_CODE_TTL_MINUTES),
      attempts: 0,
      max_attempts: EMAIL_VERIFICATION_MAX_ATTEMPTS,
      used_at: null,
      last_sent_at: now,
      created_at: now,
    });

    if (error) {
      logSupabaseError("insertVerificationCode", error);
      throw new Error(error.message);
    }

    const mail = await sendVerificationCodeEmail(normalized, plainCode);
    if (!mail.ok) {
      return { ok: false, message: mail.message };
    }

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[email-verification] Code généré pour ${normalized} (non exposé au client).`,
      );
    }

    return { ok: true, message: "Un code de vérification a été envoyé par email." };
  } catch (error) {
    logEmailVerificationError("issueEmailVerificationCode", error);
    return {
      ok: false,
      message: toClientErrorMessage(
        error,
        "Impossible de générer le code de vérification.",
      ),
    };
  }
}

export async function verifyEmailVerificationCode(
  email: string,
  submittedCode: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const normalized = normalizeEmail(email);
  const code = submittedCode.trim();

  if (!normalized) {
    return { ok: false, message: "Email invalide." };
  }
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, message: "Code invalide ou expiré." };
  }

  try {
    const row = await getLatestActiveRow(normalized);
    if (!row) {
      return { ok: false, message: "Code invalide ou expiré." };
    }

    if (row.attempts >= row.max_attempts) {
      return {
        ok: false,
        message: "Nombre maximum de tentatives atteint. Renvoyez un nouveau code.",
      };
    }

    const supabase = getAdminOrThrow();
    const isValid = verificationCodesMatch(code, row.code_hash, row.code_salt);

    if (!isValid) {
      const nextAttempts = row.attempts + 1;
      await supabase
        .from(EMAIL_VERIFICATION_CODES_TABLE)
        .update({ attempts: nextAttempts })
        .eq("id", row.id);

      if (nextAttempts >= row.max_attempts) {
        return {
          ok: false,
          message:
            "Nombre maximum de tentatives atteint. Renvoyez un nouveau code.",
        };
      }

      return { ok: false, message: "Code invalide ou expiré." };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from(EMAIL_VERIFICATION_CODES_TABLE)
      .update({ used_at: now })
      .eq("id", row.id);

    if (error) {
      logSupabaseError("markCodeUsed", error);
      throw new Error(error.message);
    }

    return { ok: true, message: "Email vérifié avec succès." };
  } catch (error) {
    logEmailVerificationError("verifyEmailVerificationCode", error);
    return {
      ok: false,
      message: toClientErrorMessage(error, "Impossible de vérifier le code."),
    };
  }
}

export async function resendEmailVerificationCode(
  email: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  return issueEmailVerificationCode(email);
}
