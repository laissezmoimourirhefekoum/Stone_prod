// src/services/youtube.ts

export type YouTubePrivacy = "public" | "unlisted" | "private";

export type YouTubePublishInput = {
  video: File;
  title: string;
  description: string;
  tags: string[];
  privacy: YouTubePrivacy;
  madeForKids: boolean;
  /** ISO 8601 : si renseigné, la vidéo est programmée (privée jusqu'à cette date). */
  publishAt?: string | null;
  /** Progression de l'envoi vers NOTRE serveur, 0–100. */
  onProgress?: (percent: number) => void;
};

export type YouTubePublishResult = {
  video_id: string;
  url: string;
  privacy_status: string | null;
  requested_privacy: YouTubePrivacy;
  publish_at: string | null;
  /** true : YouTube a forcé la vidéo en privé (projet Google non vérifié). */
  privacy_locked: boolean;
};

/** Réponse de /api/youtube/status — consommée par DashboardSidebar. */
export type YouTubeStatusResponse = {
  connected: boolean;
  account?:
    | {
        display_name?: string | null;
        avatar_url?: string | null;
        avatarUrl?: string | null;
      }
    | null;
};

// Le serveur ajoute lui-même "/api/..." : on retire un éventuel "/api" final.
const API_ORIGIN = String(import.meta.env.VITE_API_BASE_URL ?? "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

// ⚠️ À ADAPTER : reprends EXACTEMENT la même logique que dans
// services/tiktok.ts pour récupérer le token d'accès Stone.
async function getAccessToken(): Promise<string> {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("You are not signed in.");
  return token;
}

/* ──────────────────────────────────────────────────────────────
   Status / Login / Disconnect
   ────────────────────────────────────────────────────────────── */

export async function getYouTubeStatus(): Promise<YouTubeStatusResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_ORIGIN}/api/youtube/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Could not load YouTube status (HTTP ${response.status}).`);
  }

  return (await response.json()) as YouTubeStatusResponse;
}

export async function startYouTubeLogin(): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(`${API_ORIGIN}/api/youtube/login`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Could not start YouTube login (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as { url?: string; auth_url?: string };
  const url = data.url ?? data.auth_url;

  if (!url) {
    throw new Error("The server did not return a YouTube authorization URL.");
  }

  window.location.href = url;
}

export async function disconnectYouTube(): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(`${API_ORIGIN}/api/youtube/disconnect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Could not disconnect YouTube (HTTP ${response.status}).`);
  }
}

/* ──────────────────────────────────────────────────────────────
   Publication
   ────────────────────────────────────────────────────────────── */

export async function publishToYouTube(
  input: YouTubePublishInput
): Promise<YouTubePublishResult> {
  const token = await getAccessToken();

  const form = new FormData();
  form.append("title", input.title);
  form.append("description", input.description);
  form.append("tags", JSON.stringify(input.tags));
  form.append("privacy_level", input.privacy);
  form.append("made_for_kids", input.madeForKids ? "true" : "false");
  if (input.publishAt) form.append("publish_at", input.publishAt);
  // Le fichier en DERNIER : le serveur lit les champs avant le fichier.
  form.append("video", input.video, input.video.name);

  // XMLHttpRequest plutôt que fetch : seul moyen d'avoir la progression d'upload.
  return new Promise<YouTubePublishResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_ORIGIN}/api/youtube/publish`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        input.onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        // réponse non JSON
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.success) {
        resolve(data as unknown as YouTubePublishResult);
        return;
      }

      reject(
        new Error(
          (data.error as string) ||
            `YouTube publishing failed (HTTP ${xhr.status}).`
        )
      );
    };

    xhr.onerror = () =>
      reject(new Error("Network error while uploading to YouTube."));
    xhr.ontimeout = () =>
      reject(new Error("The upload to YouTube timed out."));
    xhr.timeout = 10 * 60 * 1000;

    xhr.send(form);
  });
}