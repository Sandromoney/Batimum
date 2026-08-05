/** Limites et formats pour la dictée vocale MUM IA (devis). */

/** Durée max d'un enregistrement (secondes). */
export const MUM_IA_VOICE_MAX_DURATION_SEC = 4 * 60; // 4 minutes

/** Taille max du fichier audio envoyé (octets). */
export const MUM_IA_VOICE_MAX_BYTES = 25 * 1024 * 1024; // 25 Mo (limite Whisper)

/** Silence prolongé avant alerte côté client (ms) — informatif uniquement. */
export const MUM_IA_VOICE_SILENCE_HINT_MS = 12_000;

/** Anti-abus : max transcriptions par utilisateur / fenêtre. */
export const MUM_IA_VOICE_RATE_LIMIT_MAX = 30;
export const MUM_IA_VOICE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 h

export const MUM_IA_VOICE_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

export const MUM_IA_VOICE_ALLOWED_MIME_PREFIXES = [
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/x-m4a",
  "video/webm", // certains navigateurs étiquettent ainsi
] as const;

export const MUM_IA_VOICE_PROMPT_HINT =
  "Indiquez les travaux, les surfaces, les dimensions, les matériaux et les contraintes.";

export const MUM_IA_VOICE_EXAMPLE =
  "Ex. : Salle de bain de 8 m², douche 120 × 90, faïence sur 24 m², reprise plomberie et peinture plafond.";

export const MUM_IA_VOICE_PRIVACY_NOTE =
  "Votre voix sert uniquement à transcrire la description du chantier. L’audio n’est pas conservé.";

export type MumIaVoiceUiState =
  | "idle"
  | "requesting_permission"
  | "listening"
  | "paused"
  | "transcribing"
  | "done"
  | "error"
  | "unsupported";
