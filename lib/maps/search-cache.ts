const TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const store = new Map<string, CacheEntry<unknown>>();

export function getSearchCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setSearchCache<T>(key: string, data: T): void {
  store.set(key, { expiresAt: Date.now() + TTL_MS, data });
}

export function buildDepotSearchCacheKey(input: {
  query: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}): string {
  const q = input.query.trim().toLowerCase().replace(/\s+/g, " ");
  return `depots:${q}:${input.latitude.toFixed(4)}:${input.longitude.toFixed(4)}:${input.radiusKm}`;
}
