"use client";

import { authenticatedFetch, MumIaAuthError } from "@/lib/mum-ia-api-client";
import {
  MUM_IA_VOICE_EXAMPLE,
  MUM_IA_VOICE_MAX_DURATION_SEC,
  MUM_IA_VOICE_MIME_CANDIDATES,
  MUM_IA_VOICE_PRIVACY_NOTE,
  MUM_IA_VOICE_PROMPT_HINT,
  type MumIaVoiceUiState,
} from "@/lib/mum-ia/voice-dictation-constants";
import { Mic, Pause, Play, Square, X, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
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
};

export function MumIaVoiceDictation({
  description,
  onTranscript,
  disabled = false,
}: Props) {
  const [uiState, setUiState] = useState<MumIaVoiceUiState>(() =>
    isMediaRecorderSupported() ? "idle" : "unsupported",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [level, setLevel] = useState(0);

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
    setLevel(0);
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
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += data[i] ?? 0;
        const avg = sum / data.length / 255;
        setLevel(avg);
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

        window.setTimeout(() => {
          if (!unmountedRef.current) setUiState("idle");
        }, 1600);
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
    [cleanupSession, description, onTranscript],
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
      ? "MUM IA vous écoute — cliquer pour les commandes"
      : uiState === "paused"
        ? "Dictée en pause"
        : uiState === "transcribing"
          ? "Transcription en cours"
          : uiState === "requesting_permission"
            ? "Demande d’autorisation du microphone"
            : "Commencer la dictée vocale";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <MicButton
          state={uiState}
          level={level}
          disabled={disabled || uiState === "transcribing"}
          ariaLabel={micAria}
          onClick={() => {
            if (uiState === "idle" || uiState === "done" || uiState === "error") {
              void startRecording();
            }
          }}
        />

        {active ? (
          <div
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <span className="text-xs font-medium text-[#2563eb]">
              {uiState === "requesting_permission"
                ? "Autorisation du micro…"
                : uiState === "transcribing"
                  ? "Transcription en cours…"
                  : uiState === "paused"
                    ? "Dictée en pause"
                    : "MUM IA vous écoute…"}
            </span>
            <span
              className="rounded-md bg-neutral-900 px-2 py-0.5 font-mono text-[11px] tabular-nums text-white"
              aria-label={`Durée ${formatDuration(elapsedSec)}`}
            >
              {formatDuration(elapsedSec)}
            </span>
            {uiState === "listening" ? <WaveBars level={level} /> : null}
          </div>
        ) : null}
      </div>

      {uiState === "listening" || uiState === "paused" ? (
        <div className="flex flex-wrap gap-2">
          {uiState === "listening" ? (
            <ControlChip
              onClick={pauseRecording}
              ariaLabel="Mettre la dictée en pause"
              icon={<Pause className="h-3.5 w-3.5" aria-hidden />}
            >
              Pause
            </ControlChip>
          ) : (
            <ControlChip
              onClick={resumeRecording}
              ariaLabel="Reprendre la dictée"
              icon={<Play className="h-3.5 w-3.5" aria-hidden />}
              primary
            >
              Reprendre
            </ControlChip>
          )}
          <ControlChip
            onClick={finishRecording}
            ariaLabel="Terminer la dictée"
            icon={<Square className="h-3.5 w-3.5" aria-hidden />}
            primary
          >
            Terminer
          </ControlChip>
          <ControlChip
            onClick={cancelRecording}
            ariaLabel="Annuler la dictée"
            icon={<X className="h-3.5 w-3.5" aria-hidden />}
          >
            Annuler
          </ControlChip>
        </div>
      ) : null}

      {uiState === "transcribing" ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563eb]" aria-hidden />
          Transcription de votre description…
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-xs text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {uiState === "unsupported" ? (
        <p className="text-xs text-muted-foreground" role="status">
          Dictée vocale non disponible sur ce navigateur. La saisie clavier reste
          disponible.
        </p>
      ) : null}

      {!active ? (
        <div className="space-y-1">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {MUM_IA_VOICE_PROMPT_HINT}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            {MUM_IA_VOICE_EXAMPLE}
          </p>
          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            {MUM_IA_VOICE_PRIVACY_NOTE}
          </p>
        </div>
      ) : (
        <p className="text-[10px] leading-relaxed text-muted-foreground/70">
          {MUM_IA_VOICE_PRIVACY_NOTE}
        </p>
      )}
    </div>
  );
}

function MicButton({
  state,
  level,
  disabled,
  ariaLabel,
  onClick,
}: {
  state: MumIaVoiceUiState;
  level: number;
  disabled?: boolean;
  ariaLabel: string;
  onClick: () => void;
}) {
  const listening = state === "listening";
  const paused = state === "paused";
  const busy =
    state === "requesting_permission" || state === "transcribing";
  const errored = state === "error";

  const pulse = 1 + Math.min(0.35, level * 0.8);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy || listening || paused}
      aria-label={ariaLabel}
      aria-pressed={listening || paused}
      className={[
        "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2",
        listening
          ? "border-[#2563eb] bg-[#2563eb] text-white"
          : paused
            ? "border-neutral-900 bg-neutral-900 text-white"
            : errored
              ? "border-red-300 bg-white text-red-600"
              : busy
                ? "border-border bg-white text-[#2563eb]"
                : "border-border bg-white text-neutral-900 hover:border-[#2563eb]/50 hover:text-[#2563eb]",
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      {listening ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl bg-[#2563eb]/25"
          style={{
            transform: `scale(${pulse})`,
            transition: "transform 120ms ease-out",
          }}
        />
      ) : null}
      {busy ? (
        <Loader2 className="relative h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <Mic className="relative h-5 w-5" aria-hidden />
      )}
    </button>
  );
}

function WaveBars({ level }: { level: number }) {
  const heights = [0.35, 0.7, 1, 0.55, 0.85].map(
    (base, i) => 6 + base * 14 * (0.35 + level * (1 + (i % 3) * 0.15)),
  );
  return (
    <span className="inline-flex h-5 items-end gap-0.5" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1 rounded-sm bg-[#2563eb]/80 transition-[height] duration-100"
          style={{ height: `${h}px` }}
        />
      ))}
    </span>
  );
}

function ControlChip({
  children,
  onClick,
  ariaLabel,
  icon,
  primary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  ariaLabel: string;
  icon: ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        "inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2",
        primary
          ? "border-[#2563eb] bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
          : "border-border bg-white text-neutral-900 hover:border-neutral-400",
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );
}
