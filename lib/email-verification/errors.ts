const LOG_PREFIX = "[email-verification]";

export function logEmailVerificationError(
  context: string,
  error: unknown,
): void {
  if (error instanceof Error) {
    console.error(`${LOG_PREFIX} Erreur serveur (${context}) : ${error.message}`);
    if (error.cause) {
      console.error(`${LOG_PREFIX} Cause :`, error.cause);
    }
    if (error.stack) {
      console.error(`${LOG_PREFIX} Stack :`, error.stack);
    }
    return;
  }

  console.error(`${LOG_PREFIX} Erreur serveur (${context}) :`, error);
}

export function logSupabaseError(
  context: string,
  error: { message?: string; code?: string; details?: string; hint?: string },
): void {
  console.error(
    `${LOG_PREFIX} Erreur Supabase (${context}) : ${error.message ?? "inconnue"}`,
  );
  if (error.code) console.error(`${LOG_PREFIX} Supabase code : ${error.code}`);
  if (error.details)
    console.error(`${LOG_PREFIX} Supabase details : ${error.details}`);
  if (error.hint) console.error(`${LOG_PREFIX} Supabase hint : ${error.hint}`);
}

export function toClientErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!(error instanceof Error)) return fallback;
  if (error.message.includes("fetch failed")) {
    return "Connexion au serveur impossible. Réessayez dans quelques instants.";
  }
  if (error.message.includes(SUPABASE_SERVICE_ROLE_KEY_MISSING)) {
    return "Configuration serveur incomplète. Contactez le support.";
  }
  return error.message || fallback;
}

const SUPABASE_SERVICE_ROLE_KEY_MISSING = "SUPABASE_SERVICE_ROLE_KEY";
