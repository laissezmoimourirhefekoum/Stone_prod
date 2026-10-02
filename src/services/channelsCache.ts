// src/services/channelsCache.ts
//
// Cache partagé du profil des réseaux connectés (Channels + Home).
// Mémoire (navigation dans l'app) + localStorage (rechargement de page),
// séparé par utilisateur.
// Préfixe "stone_" : volontairement différent de "crossflow_" pour ne pas
// déclencher la synchro de session de UserContext.

export type Connection = {
  connected: boolean;
  handle?: string;
  avatarUrl?: string;
};

export type CachedTikTok = { connection: Connection; savedAt: number };

export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 h

const CACHE_PREFIX = "stone_tiktok_profile_";
const memoryCache = new Map<string, CachedTikTok>();

export function readCache(userId: string): CachedTikTok | null {
  const inMemory = memoryCache.get(userId);
  if (inMemory) return inMemory;

  try {
    const raw = localStorage.getItem(CACHE_PREFIX + userId);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedTikTok;
    memoryCache.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache(userId: string, connection: Connection): void {
  const entry: CachedTikTok = { connection, savedAt: Date.now() };
  memoryCache.set(userId, entry);

  try {
    localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(entry));
  } catch {
    // localStorage indisponible : le cache mémoire suffit
  }
}

export function clearCache(userId: string): void {
  memoryCache.delete(userId);

  try {
    localStorage.removeItem(CACHE_PREFIX + userId);
  } catch {
    // ignore
  }
}