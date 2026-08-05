/**
 * Anti-abus léger pour /api/ia/transcribe.
 * En mémoire process — ne remplace pas un rate-limit distribué,
 * mais limite les rafales sur une même instance.
 */

import {
  MUM_IA_VOICE_RATE_LIMIT_MAX,
  MUM_IA_VOICE_RATE_LIMIT_WINDOW_MS,
} from "@/lib/mum-ia/voice-dictation-constants";

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function checkMumIaVoiceRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
} {
  const now = Date.now();
  const bucket = buckets.get(userId) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter(
    (ts) => now - ts < MUM_IA_VOICE_RATE_LIMIT_WINDOW_MS,
  );

  if (bucket.timestamps.length >= MUM_IA_VOICE_RATE_LIMIT_MAX) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((MUM_IA_VOICE_RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000),
    );
    buckets.set(userId, bucket);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  bucket.timestamps.push(now);
  buckets.set(userId, bucket);
  return {
    allowed: true,
    remaining: MUM_IA_VOICE_RATE_LIMIT_MAX - bucket.timestamps.length,
    retryAfterSec: 0,
  };
}
