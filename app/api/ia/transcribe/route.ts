import { NextResponse } from "next/server";
import {
  classifyOpenAiError,
  getOpenAiTranscribeModel,
  isOpenAiConfigured,
  logMumIa,
  openAiNotConfiguredResponse,
} from "@/lib/openai-server";
import {
  attachMumIaDevDebug,
  logMumIaRouteError,
} from "@/lib/mum-ia-server-diagnostics";
import { isMumIaAuthContext, requireMumIaAuth } from "@/lib/supabase-auth-server";
import {
  MumIaTranscribeError,
  isAllowedVoiceMimeType,
  transcribeMumIaAudio,
} from "@/lib/mum-ia/transcribe-audio";
import { checkMumIaVoiceRateLimit } from "@/lib/mum-ia/voice-rate-limit";
import {
  MUM_IA_VOICE_MAX_BYTES,
  MUM_IA_VOICE_MAX_DURATION_SEC,
} from "@/lib/mum-ia/voice-dictation-constants";

export const runtime = "nodejs";
/** Transcription Whisper peut prendre plusieurs secondes. */
export const maxDuration = 60;

/**
 * POST /api/ia/transcribe
 * FormData: audio (File), mimeType? (string), durationSec? (string)
 *
 * - Auth MUM IA obligatoire
 * - Clé OpenAI côté serveur uniquement
 * - Ne consomme PAS de crédit devis MUM IA
 * - Audio temporaire en mémoire uniquement (jamais Supabase)
 */
export async function POST(request: Request) {
  if (!isOpenAiConfigured()) {
    return NextResponse.json(
      attachMumIaDevDebug(
        openAiNotConfiguredResponse(),
        "Missing OPENAI_API_KEY",
      ),
      { status: 503 },
    );
  }

  const auth = await requireMumIaAuth(request);
  if (!isMumIaAuthContext(auth)) return auth;

  const rate = checkMumIaVoiceRateLimit(auth.user.id);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        success: false,
        code: "rate_limit",
        message:
          "Trop de dictées consécutives. Patientez un moment ou saisissez le texte manuellement.",
        retryAfterSec: rate.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "invalid_body",
        message: "Envoi audio invalide.",
      },
      { status: 400 },
    );
  }

  const audioEntry = form.get("audio");
  if (!audioEntry || typeof audioEntry === "string") {
    return NextResponse.json(
      {
        success: false,
        code: "missing_audio",
        message: "Aucun fichier audio reçu.",
      },
      { status: 400 },
    );
  }

  const file = audioEntry as File;
  const mimeFromField = String(form.get("mimeType") ?? "").trim();
  const mimeType = (mimeFromField || file.type || "audio/webm").trim();
  const durationRaw = String(form.get("durationSec") ?? "").trim();
  const durationSec = durationRaw ? Number(durationRaw) : null;

  if (
    durationSec != null &&
    Number.isFinite(durationSec) &&
    durationSec > MUM_IA_VOICE_MAX_DURATION_SEC + 5
  ) {
    return NextResponse.json(
      {
        success: false,
        code: "too_long",
        message: `La dictée est limitée à ${Math.floor(MUM_IA_VOICE_MAX_DURATION_SEC / 60)} minutes.`,
        maxDurationSec: MUM_IA_VOICE_MAX_DURATION_SEC,
      },
      { status: 400 },
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      {
        success: false,
        code: "empty_audio",
        message: "Aucune voix détectée.",
      },
      { status: 400 },
    );
  }

  if (file.size > MUM_IA_VOICE_MAX_BYTES) {
    return NextResponse.json(
      {
        success: false,
        code: "too_large",
        message: "L’enregistrement est trop volumineux. Raccourcissez la dictée.",
      },
      { status: 413 },
    );
  }

  if (!isAllowedVoiceMimeType(mimeType) && mimeType !== "application/octet-stream") {
    return NextResponse.json(
      {
        success: false,
        code: "unsupported_format",
        message: "Format audio non pris en charge.",
        mimeType,
      },
      { status: 415 },
    );
  }

  let buffer: Buffer;
  try {
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } catch (error) {
    logMumIaRouteError({ route: "transcribe", error, userId: auth.user.id });
    return NextResponse.json(
      {
        success: false,
        code: "read_error",
        message:
          "La transcription n’a pas pu être terminée. Vous pouvez recommencer ou saisir le texte manuellement.",
      },
      { status: 400 },
    );
  }

  const model = getOpenAiTranscribeModel();

  try {
    const result = await transcribeMumIaAudio({
      buffer,
      mimeType,
      filename: file.name || undefined,
    });

    // Libération explicite de la référence buffer (GC) — jamais écrit sur disque / Supabase
    buffer = Buffer.alloc(0);

    logMumIa("info", "Dictée vocale transcrite (sans crédit devis)", {
      userId: auth.user.id,
      companyId: auth.companyId,
      model: result.model,
      durationMs: result.durationMs,
      chars: result.text.length,
      creditConsumed: 0,
    });

    return NextResponse.json({
      success: true,
      text: result.text,
      rawText: result.rawText,
      model: result.model,
      durationMs: result.durationMs,
      /** La dictée ne consomme jamais un crédit devis MUM IA. */
      creditConsumed: 0,
      maxDurationSec: MUM_IA_VOICE_MAX_DURATION_SEC,
    });
  } catch (error) {
    if (error instanceof MumIaTranscribeError) {
      const status =
        error.code === "missing_key"
          ? 503
          : error.code === "too_large"
            ? 413
            : error.code === "unsupported_format"
              ? 415
              : error.code === "empty_audio"
                ? 400
                : 502;

      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        { status },
      );
    }

    const classified = classifyOpenAiError(error, model);
    logMumIaRouteError({ route: "transcribe", error, userId: auth.user.id });

    return NextResponse.json(
      attachMumIaDevDebug(
        {
          success: false,
          code: classified.code,
          message:
            "La transcription n’a pas pu être terminée. Vous pouvez recommencer ou saisir le texte manuellement.",
          technicalMessage: classified.message,
        },
        classified.message,
      ),
      { status: classified.httpStatus },
    );
  }
}
