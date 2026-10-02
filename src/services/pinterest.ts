// src/services/pinterest.ts
import { apiRequest } from "./supabase";

export interface PinterestAccount {
  display_name: string | null; // username Pinterest
  avatar_url: string | null;
  account_type?: string | null; // PERSONAL | BUSINESS
}

export async function getPinterestStatus(): Promise<{
  connected: boolean;
  account: PinterestAccount | null;
}> {
  return apiRequest("/api/pinterest/status", { method: "GET" });
}

export async function startPinterestLogin(): Promise<void> {
  const data = await apiRequest<{ url?: string }>("/api/pinterest/auth/url", {
    method: "POST",
  });

  if (!data || typeof data.url !== "string" || !data.url) {
    throw new Error(
      `Le backend n'a pas renvoyé d'URL Pinterest (réponse : ${JSON.stringify(data)})`
    );
  }

  let target: URL;
  try {
    target = new URL(data.url);
  } catch {
    throw new Error(`URL Pinterest invalide : ${data.url}`);
  }

  // pinterest.com, fr.pinterest.com, etc.
  const host = target.hostname;
  if (
    target.protocol !== "https:" ||
    !(host === "pinterest.com" || host.endsWith(".pinterest.com"))
  ) {
    throw new Error(`URL inattendue (hôte ${host}).`);
  }

  window.location.assign(target.toString());
}

export async function completePinterestLogin(
  code: string,
  state: string
): Promise<PinterestAccount | null> {
  const data = await apiRequest<{
    connected?: boolean;
    account?: PinterestAccount | null;
  }>("/api/pinterest/auth/callback", {
    method: "POST",
    body: JSON.stringify({ code, state }),
  });

  return data?.account ?? null;
}

export async function disconnectPinterest(): Promise<void> {
  await apiRequest("/api/pinterest/disconnect", { method: "DELETE" });
}