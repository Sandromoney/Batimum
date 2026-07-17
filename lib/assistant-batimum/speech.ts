/**
 * Architecture vocale Assistant Batimum (STT / TTS).
 * Prépare le branchement Web Speech API + futurs providers cloud.
 * Aucune dépendance externe pour V1.
 */

export type SpeechRecognitionResult = {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
};

export type SpeechSynthesisOptions = {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>>;
  }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor():
  | (new () => BrowserSpeechRecognition)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() != null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Écoute une courte dictée (FR). Retourne le transcript final ou null.
 */
export function listenOnce(options?: {
  lang?: string;
  timeoutMs?: number;
}): Promise<SpeechRecognitionResult | null> {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return Promise.resolve(null);

  return new Promise((resolve) => {
    const recognition = new Ctor();
    recognition.lang = options?.lang ?? "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;

    const timeout = window.setTimeout(() => {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      resolve(null);
    }, options?.timeoutMs ?? 12000);

    recognition.onresult = (event) => {
      window.clearTimeout(timeout);
      const first = event.results[0]?.[0];
      if (!first?.transcript) {
        resolve(null);
        return;
      }
      resolve({
        transcript: first.transcript.trim(),
        isFinal: true,
        confidence: first.confidence,
      });
    };
    recognition.onerror = () => {
      window.clearTimeout(timeout);
      resolve(null);
    };
    recognition.onend = () => {
      window.clearTimeout(timeout);
    };

    try {
      recognition.start();
    } catch {
      window.clearTimeout(timeout);
      resolve(null);
    }
  });
}

/**
 * Synthèse vocale navigateur (architecture prête pour un TTS cloud).
 */
export function speakText(options: SpeechSynthesisOptions): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(options.text);
    utterance.lang = options.lang ?? "fr-FR";
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
