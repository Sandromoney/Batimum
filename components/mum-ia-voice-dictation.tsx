"use client";

import { authenticatedFetch, MumIaAuthError } from "@/lib/mum-ia-api-client";
import {
  MUM_IA_VOICE_EXAMPLE,
  MUM_IA_VOICE_MAX_DURATION_SEC,
  MUM_IA_VOICE_MIME_CANDIDATES,
  MUM_IA_VOICE_PROMPT_HINT,
  type MumIaVoiceUiState,
} from "@/lib/mum-ia/voice-dictation-constants";
import { Mic, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const candidate of MUM_IA_VOICE_MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }
  return "";
}

function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isMediaRecorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

type Props = {
  /** Texte actuel du champ description (pour append). */
  description: string;
  onTranscript: (text: string, meta: { appended: boolean; fromVoice: true }) => void;
  disabled?: boolean;
  /** Textarea du chantier — micro positionné en bas à droite ; scroll après transcription. */
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  /** Champ description — enveloppé pour placer le micro en bas à droite. */
  textarea: ReactNode;
};

export function MumIaVoiceDictation({
  description,
  onTranscript,
  disabled = false,
  textareaRef,
  textarea,
}: Props) {
  // Toujours "idle" au premier paint (SSR + hydratation) pour éviter un mismatch.
  const [uiState, setUiState] = useState<MumIaVoiceUiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!isMediaRecorderSupported()) {
      setUiState("unsupported");
      setErrorMessage(
        "Votre navigateur ne prend pas en charge la dictée vocale. Saisissez le texte manuellement.",
      );
    }
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef("");
  const startedAtRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const maxHitRef = useRef(false);
  const unmountedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopLevelMeter = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    stopLevelMeter();
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    streamRef.current = null;
    try {
      void audioCtxRef.current?.close();
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, [stopLevelMeter]);

  const startLevelMeter = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      // Compteur de niveau conservé pour l’analyseur (sans UI d’onde).
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* meter optionnel */
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    startedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const running = Date.now() - startedAtRef.current;
      const total = (accumulatedMsRef.current + running) / 1000;
      setElapsedSec(total);
      if (total >= MUM_IA_VOICE_MAX_DURATION_SEC && !maxHitRef.current) {
        maxHitRef.current = true;
        const recorder = mediaRecorderRef.current;
        if (recorder && (recorder.state === "recording" || recorder.state === "paused")) {
          try {
            if (recorder.state === "recording") {
              accumulatedMsRef.current += Date.now() - startedAtRef.current;
            }
            clearTimer();
            stopLevelMeter();
            recorder.stop();
          } catch {
            /* ignore */
          }
        }
      }
    }, 250);
  }, [clearTimer, stopLevelMeter]);

  const cleanupSession = useCallback(() => {
    clearTimer();
    releaseStream();
    chunksRef.current = [];
    accumulatedMsRef.current = 0;
    startedAtRef.current = 0;
    maxHitRef.current = false;
    setElapsedSec(0);
  }, [clearTimer, releaseStream]);

  useEffect(() => {
    unmountedRef.current = false;
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === "recording") {
          try {
            recorder.pause();
            accumulatedMsRef.current += Date.now() - startedAtRef.current;
            clearTimer();
            stopLevelMeter();
            setUiState("paused");
          } catch {
            /* ignore */
          }
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      unmountedRef.current = true;
      document.removeEventListener("visibilitychange", onVis);
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      cleanupSession();
    };
  }, [cleanupSession, clearTimer, stopLevelMeter]);

  const transcribeBlob = useCallback(
    async (blob: Blob, durationSec: number) => {
      if (blob.size < 256) {
        setErrorMessage("Aucune voix détectée.");
        setUiState("error");
        cleanupSession();
        return;
      }

      setUiState("transcribing");
      setErrorMessage(null);

      const form = new FormData();
      const ext = blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("wav")
          ? "wav"
          : blob.type.includes("ogg")
            ? "ogg"
            : "webm";
      form.append("audio", blob, `dictation.${ext}`);
      form.append("mimeType", blob.type || mimeTypeRef.current || "audio/webm");
      form.append("durationSec", String(Math.round(durationSec)));

      try {
        const response = await authenticatedFetch(
          "/api/ia/transcribe",
          { method: "POST", body: form },
          "transcrire",
        );

        const payload = (await response.json().catch(() => null)) as {
          success?: boolean;
          text?: string;
          message?: string;
          code?: string;
        } | null;

        if (!response.ok || !payload?.success || !payload.text?.trim()) {
          setErrorMessage(
            payload?.message ||
              "La transcription n’a pas pu être terminée. Vous pouvez recommencer ou saisir le texte manuellement.",
          );
          setUiState("error");
          cleanupSession();
          return;
        }

        const transcript = payload.text.trim();
        const appended = description.trim().length > 0;
        const next = appended
          ? `${description.trim()}\n${transcript}`
          : transcript;

        onTranscript(next, { appended, fromVoice: true });
        setUiState("done");
        cleanupSession();

        requestAnimationFrame(() => {
          const el = textareaRef?.current;
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        });

        window.setTimeout(() => {
          if (!unmountedRef.current) setUiState("idle");
        }, 1200);
      } catch (error) {
        if (error instanceof MumIaAuthError) {
          setErrorMessage("Connectez-vous pour utiliser la dictée vocale.");
        } else if (!navigator.onLine) {
          setErrorMessage(
            "Réseau indisponible. Vérifiez votre connexion ou saisissez le texte manuellement.",
          );
        } else {
          setErrorMessage(
            "La transcription n’a pas pu être terminée. Vous pouvez recommencer ou saisir le texte manuellement.",
          );
        }
        setUiState("error");
        cleanupSession();
      }
    },
    [cleanupSession, description, onTranscript, textareaRef],
  );

  const finishRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    clearTimer();
    stopLevelMeter();
    if (recorder.state === "recording" || recorder.state === "paused") {
      try {
        if (recorder.state === "recording") {
          accumulatedMsRef.current += Date.now() - startedAtRef.current;
        }
        recorder.stop();
      } catch {
        setErrorMessage(
          "La transcription n’a pas pu être terminée. Vous pouvez recommencer ou saisir le texte manuellement.",
        );
        setUiState("error");
        cleanupSession();
      }
    }
  }, [clearTimer, cleanupSession, stopLevelMeter]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    chunksRef.current = [];
    try {
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
    } catch {
      /* ignore */
    }
    cleanupSession();
    setErrorMessage(null);
    setUiState("idle");
  }, [cleanupSession]);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    try {
      recorder.pause();
      accumulatedMsRef.current += Date.now() - startedAtRef.current;
      clearTimer();
      stopLevelMeter();
      setUiState("paused");
    } catch {
      setErrorMessage("Impossible de mettre la dictée en pause.");
      setUiState("error");
    }
  }, [clearTimer, stopLevelMeter]);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    try {
      recorder.resume();
      if (streamRef.current) startLevelMeter(streamRef.current);
      startTimer();
      setUiState("listening");
    } catch {
      setErrorMessage("Impossible de reprendre la dictée.");
      setUiState("error");
    }
  }, [startLevelMeter, startTimer]);

  const startRecording = useCallback(async () => {
    if (disabled) return;
    if (!isMediaRecorderSupported()) {
      setUiState("unsupported");
      setErrorMessage(
        "Votre navigateur ne prend pas en charge la dictée vocale. Saisissez le texte manuellement.",
      );
      return;
    }

    setErrorMessage(null);
    setUiState("requesting_permission");
    chunksRef.current = [];
    accumulatedMsRef.current = 0;
    maxHitRef.current = false;
    setElapsedSec(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      if (unmountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const mimeType = pickSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const durationSec = accumulatedMsRef.current / 1000;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeTypeRef.current || "audio/webm",
        });
        chunksRef.current = [];
        releaseStream();
        void transcribeBlob(blob, durationSec);
      };

      recorder.onerror = () => {
        setErrorMessage(
          "La transcription n’a pas pu être terminée. Vous pouvez recommencer ou saisir le texte manuellement.",
        );
        setUiState("error");
        cleanupSession();
      };

      recorder.start(1000);
      startLevelMeter(stream);
      startTimer();
      setUiState("listening");
    } catch (error) {
      cleanupSession();
      const name =
        error && typeof error === "object" && "name" in error
          ? String((error as { name: string }).name)
          : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setErrorMessage(
          "Autorisez l’accès au microphone pour utiliser la dictée.",
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setErrorMessage("Aucun microphone détecté.");
      } else {
        setErrorMessage(
          "Impossible de démarrer l’enregistrement. Vérifiez le microphone ou saisissez le texte manuellement.",
        );
      }
      setUiState("error");
    }
  }, [
    cleanupSession,
    disabled,
    releaseStream,
    startLevelMeter,
    startTimer,
    transcribeBlob,
  ]);

  const active =
    uiState === "listening" ||
    uiState === "paused" ||
    uiState === "requesting_permission" ||
    uiState === "transcribing";

  const micAria =
    uiState === "listening"
      ? "Dictée en cours — utilisez Pause ou Terminer"
      : uiState === "paused"
        ? "Dictée en pause"
        : uiState === "transcribing"
          ? "Transcription en cours"
          : uiState === "requesting_permission"
            ? "Demande d’autorisation du microphone"
            : "Commencer la dictée vocale";

  return (
    <div>
      <div className="relative">
        {textarea}
        <div className="absolute bottom-1.5 right-1.5 z-[1]">
          <MicButton
            state={uiState}
            disabled={disabled || uiState === "transcribing"}
            ariaLabel={micAria}
            onClick={() => {
              if (uiState === "idle" || uiState === "done" || uiState === "error") {
                void startRecording();
              }
            }}
          />
        </div>
      </div>

      {active ? (
        <div
          className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {uiState === "listening" ? (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563eb]"
                aria-hidden
              />
            ) : uiState === "transcribing" ||
              uiState === "requesting_permission" ? (
              <Loader2
                className="h-3 w-3 shrink-0 animate-spin text-[#2563eb]"
                aria-hidden
              />
            ) : null}
            {uiState === "requesting_permission"
              ? "Autorisation du micro…"
              : uiState === "transcribing"
                ? "Transcription…"
                : uiState === "paused"
                  ? "Dictée en pause"
                  : "MUM IA vous écoute…"}
            {(uiState === "listening" || uiState === "paused") && (
              <span className="font-mono tabular-nums text-muted-foreground/80">
                {formatDuration(elapsedSec)}
              </span>
            )}
          </span>

          {(uiState === "listening" || uiState === "paused") && (
            <span className="inline-flex flex-wrap items-center gap-2 text-[11px]">
              {uiState === "listening" ? (
                <button
                  type="button"
                  onClick={pauseRecording}
                  aria-label="Mettre la dictée en pause"
                  className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-1"
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeRecording}
                  aria-label="Reprendre la dictée"
                  className="text-[#2563eb] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-1"
                >
                  Reprendre
                </button>
              )}
              <button
                type="button"
                onClick={finishRecording}
                aria-label="Terminer la dictée"
                className="font-medium text-[#2563eb] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-1"
              >
                Terminer
              </button>
              <button
                type="button"
                onClick={cancelRecording}
                aria-label="Annuler la dictée"
                className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-1"
              >
                Annuler
              </button>
            </span>
          )}
        </div>
      ) : null}

      {errorMessage ? (
        <p className="mt-1.5 text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {uiState === "unsupported" ? (
        <p className="mt-1.5 text-xs text-muted-foreground" role="status">
          Dictée vocale non disponible. La saisie clavier reste disponible.
        </p>
      ) : null}

      {!active ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {MUM_IA_VOICE_PROMPT_HINT}{" "}
          <span className="text-muted-foreground/75">{MUM_IA_VOICE_EXAMPLE}</span>
        </p>
      ) : null}
    </div>
  );
}

function MicButton({
  state,
  disabled,
  ariaLabel,
  onClick,
}: {
  state: MumIaVoiceUiState;
  disabled?: boolean;
  ariaLabel: string;
  onClick: () => void;
}) {
  const listening = state === "listening";
  const paused = state === "paused";
  const busy =
    state === "requesting_permission" || state === "transcribing";
  const errored = state === "error";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy || listening || paused}
      aria-label={ariaLabel}
      aria-pressed={listening || paused}
      className={[
        "inline-flex h-10 w-10 items-center justify-center rounded-lg border-0 bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/50 focus-visible:ring-offset-1",
        listening
          ? "text-[#2563eb]"
          : paused
            ? "text-neutral-800"
            : errored
              ? "text-red-600 hover:bg-neutral-100/80"
              : busy
                ? "text-[#2563eb]"
                : "text-neutral-700 hover:bg-neutral-100/90 hover:text-neutral-900",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      {busy ? (
        <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
      ) : (
        <Mic className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
