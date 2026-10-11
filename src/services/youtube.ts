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

// Le serveur ajoute lui-même "/api/..." : on retire un éventuel "/api" final.
const API_ORIGIN = String(import.meta.env.VITE_API_BASE_URL ?? "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

// ⚠️ À ADAPTER : reprends EXACTEMENT la même logique que dans
// services/tiktok.ts pour récupérer le token d'accès Stone
// (idéalement, exporte-la depuis un fichier commun et importe-la ici).
async function getAccessToken(): Promise<string> {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("You are not signed in.");
  return token;
}

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
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // réponse non JSON
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.success) {
        resolve(data as YouTubePublishResult);
        return;
      }

      reject(
        new Error(
          data?.error || `YouTube publishing failed (HTTP ${xhr.status}).`
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