/**
 * Feature flag Assistant Batimum.
 * Activé par défaut — désactiver avec NEXT_PUBLIC_ENABLE_ASSISTANT=false.
 */
export const ENABLE_ASSISTANT_UI =
  process.env.NEXT_PUBLIC_ENABLE_ASSISTANT !== "false";
