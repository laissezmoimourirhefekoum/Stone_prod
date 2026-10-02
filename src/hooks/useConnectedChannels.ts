// src/hooks/useConnectedChannels.ts
import { useEffect, useState } from "react";

import { useUser } from "../contexts/UserContext";
import { getTikTokStatus } from "../services/tiktok";
import {
  CACHE_MAX_AGE_MS,
  readCache,
  writeCache,
  type Connection,
} from "../services/channelsCache";

export type ConnectedChannel = {
  key: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
};

function toChannels(tiktok: Connection | null): ConnectedChannel[] {
  if (!tiktok?.connected) return [];

  return [
    {
      key: "tiktok",
      name: "TikTok",
      handle: tiktok.handle,
      avatarUrl: tiktok.avatarUrl,
    },
  ];
}

/**
 * Réseaux connectés, lus depuis le cache (aucun clignotement, aucun appel
 * réseau si le cache est récent). Le backend n'est interrogé que s'il n'y a
 * pas de cache ou s'il a plus de 24 h.
 *
 * Pour l'instant seul TikTok est un vrai OAuth : les autres réseaux de la
 * page Channels sont des placeholders non persistés.
 */
export function useConnectedChannels(): ConnectedChannel[] {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [tiktok, setTiktok] = useState<Connection | null>(() => {
    const cached = userId ? readCache(userId) : null;
    return cached?.connection ?? null;
  });

  useEffect(() => {
    if (!userId) return;

    const cached = readCache(userId);

    if (cached) {
      setTiktok(cached.connection);
      if (Date.now() - cached.savedAt < CACHE_MAX_AGE_MS) return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const status = await getTikTokStatus();
        if (cancelled) return;

        const account = status.account as
          | {
              display_name?: string | null;
              avatar_url?: string | null;
              avatarUrl?: string | null;
            }
          | null
          | undefined;

        const connection: Connection = status.connected
          ? {
              connected: true,
              handle: account?.display_name ?? undefined,
              avatarUrl: account?.avatar_url ?? account?.avatarUrl ?? undefined,
            }
          : { connected: false };

        writeCache(userId, connection);
        setTiktok(connection);
      } catch (error) {
        // Non bloquant : on garde ce qui est affiché.
        console.warn("[Stone] Could not load connected channels:", error);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return toChannels(tiktok);
}