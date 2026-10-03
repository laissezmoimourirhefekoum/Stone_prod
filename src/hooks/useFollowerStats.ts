// src/hooks/useFollowerStats.ts
//
// Récupère le total d'abonnés (tous réseaux connectés) et la variation
// sur 7 jours depuis le backend (GET /api/stats/followers).

import { useEffect, useState } from "react";
import { apiRequest } from "../services/supabase";
import { CHANNELS_CHANGED_EVENT } from "../services/channelsCache";

export type FollowerStats = {
  total: number;
  /** null tant qu'il n'existe aucun snapshot antérieur à aujourd'hui */
  delta: number | null;
  providers: { provider: string; followers: number; delta: number | null }[];
};

export function useFollowerStats(): FollowerStats | null {
  const [stats, setStats] = useState<FollowerStats | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await apiRequest<FollowerStats>("/api/stats/followers", {
          method: "GET",
        });

        if (mounted && data) setStats(data);
      } catch (error) {
        console.error("Followers stats error:", error);
      }
    };

    load();

    // Recharge quand un réseau est connecté / déconnecté.
    window.addEventListener(CHANNELS_CHANGED_EVENT, load);

    return () => {
      mounted = false;
      window.removeEventListener(CHANNELS_CHANGED_EVENT, load);
    };
  }, []);

  return stats;
}