// src/services/tiktok.ts
import { apiRequest } from "./supabase";

export interface TikTokAccount {
  display_name: string | null;
  avatar_url: string | null;
  scope?: string | null;
}

export interface TikTokCreatorInfo {
  creator_nickname?: string;
  creator_username?: string;
  creator_avatar_url?: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

export type TikTokPrivacy =
  | "PUBLIC_TO_EVERYONE"
  | "MUTUAL_FOLLOW_FRIENDS"
  | "FOLLOWER_OF_CREATOR"
  | "SELF_ONLY";

export interface TikTokPostOptions {
  privacy_level: TikTokPrivacy | "";
  disable_comment: boolean;
  disable_duet: boolean;
  disable_stitch: boolean;
}

export type TikTokPublishStatus =
  | "PROCESSING_UPLOAD"
  | "PROCESSING_DOWNLOAD"
  | "SEND_TO_USER_INBOX"
  | "PUBLISH_COMPLETE"
  | "FAILED";

// ── Connexion ────────────────────────────────────────────────

export async function getTikTokStatus(): Promise<{
  connected: boolean;
  account: TikTokAccount | null;
}> {
  return apiRequest("/api/tiktok/status", { method: "GET" });
}

/**
 * Demande l'URL d'autorisation au backend (POST /api/tiktok/auth/url),
 * vérifie qu'elle pointe bien vers tiktok.com, puis redirige le navigateur.
 *
 * Si tout va bien, la page quitte l'application : la promesse ne sert
 * qu'à remonter les erreurs (réseau, 401, URL manquante...).
 */
export async function startTikTokLogin(): Promise<void> {
  console.log("[Stone] TikTok : demande de l'URL d'autorisation");

  const data = await apiRequest<{ url?: string }>("/api/tiktok/auth/url", {
    method: "POST",
  });

  console.log("[Stone] TikTok : réponse du backend", data);

  if (!data || typeof data.url !== "string" || !data.url) {
    throw new Error(
      `Le backend n'a pas renvoyé d'URL TikTok (réponse : ${JSON.stringify(data)})`
    );
  }

  let target: URL;

  try {
    target = new URL(data.url);
  } catch {
    throw new Error(`URL TikTok invalide : ${data.url}`);
  }

  if (target.protocol !== "https:" || !target.hostname.endsWith("tiktok.com")) {
    throw new Error(`URL inattendue (hôte ${target.hostname}).`);
  }

  console.log("[Stone] TikTok : redirection vers", target.toString());

  window.location.assign(target.toString());
}

/** Appelé par la page /tiktok/callback avec les paramètres de l'URL. */
export async function completeTikTokLogin(
  code: string,
  state: string
): Promise<TikTokAccount> {
  const data = await apiRequest<{ account: TikTokAccount }>(
    "/api/tiktok/auth/callback",
    {
      method: "POST",
      body: JSON.stringify({ code, state }),
    }
  );

  return data.account;
}

export async function disconnectTikTok(): Promise<void> {
  await apiRequest("/api/tiktok/disconnect", { method: "DELETE" });
}

// ── Publication ──────────────────────────────────────────────

export async function getTikTokCreatorInfo(): Promise<TikTokCreatorInfo> {
  const data = await apiRequest<{ creator: TikTokCreatorInfo }>(
    "/api/tiktok/creator-info",
    { method: "GET" }
  );

  return data.creator;
}

/**
 * Envoie la vidéo au backend, qui la transmet à TikTok.
 * mode "direct" = publication (video.publish)
 * mode "draft"  = brouillon dans l'app TikTok (video.upload)
 */
export async function publishToTikTok(params: {
  video: File;
  caption: string;
  mode: "direct" | "draft";
  options: TikTokPostOptions;
}): Promise<string> {
  const form = new FormData();

  // Les champs texte AVANT le fichier
  form.append("mode", params.mode);
  form.append("title", params.caption);
  form.append("privacy_level", params.options.privacy_level || "SELF_ONLY");
  form.append("disable_comment", String(params.options.disable_comment));
  form.append("disable_duet", String(params.options.disable_duet));
  form.append("disable_stitch", String(params.options.disable_stitch));
  form.append("video", params.video);

  const data = await apiRequest<{ publish_id: string }>(
    "/api/tiktok/publish",
    { method: "POST", body: form }
  );

  return data.publish_id;
}

export async function getTikTokPublishStatus(publishId: string): Promise<{
  status: TikTokPublishStatus;
  fail_reason?: string;
}> {
  return apiRequest(
    `/api/tiktok/publish/status?publish_id=${encodeURIComponent(publishId)}`,
    { method: "GET" }
  );
}

/** Attend la fin du traitement TikTok (max ~2 min). */
export async function waitForTikTokPublish(
  publishId: string,
  onProgress?: (status: TikTokPublishStatus) => void
): Promise<TikTokPublishStatus> {
  for (let i = 0; i < 40; i++) {
    const { status, fail_reason } = await getTikTokPublishStatus(publishId);

    onProgress?.(status);

    if (status === "PUBLISH_COMPLETE" || status === "SEND_TO_USER_INBOX") {
      return status;
    }

    if (status === "FAILED") {
      throw new Error(fail_reason || "TikTok publication failed");
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("TikTok is taking too long to process the video");
}