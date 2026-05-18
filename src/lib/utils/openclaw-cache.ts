/**
 * Server-side in-memory cache for OpenClaw CLI responses.
 *
 * Keys incorporate workspace path so switching characters with different
 * workspaces always gets fresh data. Short TTL (10s) prevents redundant
 * CLI spawns during page-load bursts without risking staleness.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 10_000;

/** Build a cache key scoped to a workspace. */
export function cacheKey(prefix: string, workspacePath?: string): string {
  return `${prefix}:${workspacePath ?? '__default__'}`;
}

/** Get a cached value, or null if expired/missing. */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/** Store a value in the cache. */
export function setCached<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** Invalidate all entries whose key starts with the given prefix. */
export function invalidateByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
