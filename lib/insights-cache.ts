/** Cache léger en mémoire pour les calculs d'insights (évite les recalculs répétés). */

const TTL_MS = 15_000;
const store = new Map<string, { value: unknown; expiresAt: number }>();

export function buildDataFingerprint(parts: (string | number)[]): string {
  return parts.join("|");
}

export function getCachedValue<T>(
  cacheKey: string,
  fingerprint: string,
  compute: () => T,
): T {
  const key = `${cacheKey}::${fingerprint}`;
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = compute();
  store.set(key, { value, expiresAt: now + TTL_MS });
  if (store.size > 48) {
    for (const [k, entry] of store) {
      if (entry.expiresAt <= now) store.delete(k);
    }
  }
  return value;
}
