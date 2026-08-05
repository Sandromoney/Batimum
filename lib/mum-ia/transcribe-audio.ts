import {
  createOpenAiClient,
  getOpenAiApiKey,
  getOpenAiTranscribeModel,
  logMumIa,
} from "@/lib/openai-server";
import { cleanupBtpTranscript } from "@/lib/mum-ia/btp-transcript-cleanup";
import {
  MUM_IA_VOICE_ALLOWED_MIME_PREFIXES,
  MUM_IA_VOICE_MAX_BYTES,
} from "@/lib/mum-ia/voice-dictation-constants";
import { toFile } from "openai";

/** Prompt Whisper pour biaiser le vocabulaire BTP FR (sans inventer de contenu). */
const BTP_TRANSCRIBE_PROMPT = [
  "Transcription d'une description de chantier BTP en français.",
  "Vocabulaire possible : BA13, placo, PER, multicouche, PVC, faïence, carrelage,",
  "receveur, double vasque, douche à l'italienne, ossature métallique, laine de verre,",
  "faux plafond, nourrice, VMC, mètres carrés, mètres linéaires, millimètres, centimètres.",
].join(" ");

export function isAllowedVoiceMimeType(mime: string): boolean {
  const base = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!base) return false;
  return MUM_IA_VOICE_ALLOWED_MIME_PREFIXES.some(
    (prefix) => base === prefix || base.startsWith(prefix),
  );
}

export function extensionForMime(mime: string): string {
  const base = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base.includes("webm")) return "webm";
  if (base.includes("wav")) return "wav";
  if (base.includes("mpeg") || base.includes("mp3")) return "mp3";
  if (base.includes("ogg")) return "ogg";
  if (base.includes("mp4") || base.includes("m4a")) return "m4a";
  return "webm";
}

export type TranscribeAudioResult = {
  text: string;
  rawText: string;
  model: string;
  durationMs: number;
};

export class MumIaTranscribeError extends Error {
  code:
    | "empty_audio"
    | "too_large"
    | "unsupported_format"
    | "missing_key"
    | "rate_limit"
    | "failed";

  constructor(code: MumIaTranscribeError["code"], message: string) {
    super(message);
    this.name = "MumIaTranscribeError";
    this.code = code;
  }
}

/**
 * Transcrit un buffer audio via OpenAI (Whisper / gpt-4o-*-transcribe).
 * Ne débite aucun crédit MUM IA devis.
 * Le buffer n'est pas persisté — uniquement envoyé à OpenAI puis libéré.
 */
export async function transcribeMumIaAudio(params: {
  buffer: Buffer;
  mimeType: string;
  filename?: string;
}): Promise<TranscribeAudioResult> {
  const { buffer, mimeType } = params;

  if (!buffer.length) {
    throw new MumIaTranscribeError("empty_audio", "Aucune voix détectée.");
  }

  if (buffer.length > MUM_IA_VOICE_MAX_BYTES) {
    throw new MumIaTranscribeError(
      "too_large",
      "L’enregistrement est trop volumineux. Raccourcissez la dictée.",
    );
  }

  if (!isAllowedVoiceMimeType(mimeType) && mimeType !== "application/octet-stream") {
    throw new MumIaTranscribeError(
      "unsupported_format",
      "Format audio non pris en charge. Réessayez depuis Chrome ou Safari.",
    );
  }

  const apiKey = getOpenAiApiKey("mum_devis");
  if (!apiKey) {
    throw new MumIaTranscribeError(
      "missing_key",
      "La transcription vocale n’est pas configurée sur le serveur.",
    );
  }

  const client = createOpenAiClient("mum_devis");
  if (!client) {
    throw new MumIaTranscribeError(
      "missing_key",
      "La transcription vocale n’est pas configurée sur le serveur.",
    );
  }

  const model = getOpenAiTranscribeModel();
  const ext = extensionForMime(mimeType);
  const filename = params.filename?.trim() || `dictation.${ext}`;
  const started = Date.now();

  logMumIa("info", "Transcription vocale démarrée", {
    model,
    mimeType,
    bytes: buffer.length,
    filename,
  });

  try {
    const file = await toFile(buffer, filename, {
      type: mimeType.split(";")[0]?.trim() || "audio/webm",
    });

    const response = await client.audio.transcriptions.create({
      file,
      model,
      language: "fr",
      prompt: BTP_TRANSCRIBE_PROMPT,
      response_format: "text",
    });

    const rawText =
      typeof response === "string"
        ? response
        : typeof (response as { text?: string }).text === "string"
          ? (response as { text: string }).text
          : String(response ?? "");

    const cleaned = cleanupBtpTranscript(rawText);
    const durationMs = Date.now() - started;

    if (!cleaned.trim()) {
      throw new MumIaTranscribeError("empty_audio", "Aucune voix détectée.");
    }

    logMumIa("info", "Transcription vocale OK", {
      model,
      durationMs,
      chars: cleaned.length,
    });

    return { text: cleaned, rawText: rawText.trim(), model, durationMs };
  } catch (error) {
    if (error instanceof MumIaTranscribeError) throw error;
    logMumIa("error", "Échec transcription vocale", {
      model,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
