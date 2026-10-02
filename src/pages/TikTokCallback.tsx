// src/pages/TikTokCallback.tsx
//
// Page atteinte après l'autorisation TikTok :
//   /tiktok/callback?code=XXX&state=XXX
// Elle envoie le code au backend (Railway), puis redirige vers /channels.

import { useEffect } from "react";

import { useTheme } from "../hooks/useTheme";
import { completeTikTokLogin } from "../services/tiktok";

// Le code TikTok est à usage unique. En dev, React StrictMode exécute les
// effets deux fois : on mémorise la requête par code pour ne l'envoyer qu'une fois.
const inflight = new Map<string, Promise<unknown>>();

function goToChannels(query = "") {
  // replace : le callback (avec son code) ne reste pas dans l'historique.
  window.location.replace(`/channels${query}`);
}

export default function TikTokCallback() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    // L'utilisateur a refusé, ou TikTok a renvoyé une erreur.
    if (error) {
      goToChannels(
        `?tiktok_error=${encodeURIComponent(errorDescription || error)}`
      );
      return;
    }

    if (!code || !state) {
      goToChannels(
        `?tiktok_error=${encodeURIComponent(
          "Missing authorization code from TikTok."
        )}`
      );
      return;
    }

    let request = inflight.get(code);
    if (!request) {
      request = completeTikTokLogin(code, state);
      inflight.set(code, request);
    }

    request
      .then(() => goToChannels("?tiktok=connected"))
      .catch((err: unknown) => {
        console.error("[Stone] TikTok callback error:", err);
        goToChannels(
          `?tiktok_error=${encodeURIComponent(
            err instanceof Error ? err.message : "Something went wrong."
          )}`
        );
      });
  }, []);

  return (
    <div
      className={[
        "flex h-full min-h-screen w-full flex-col items-center justify-center gap-4",
        isDark ? "bg-[#050506] text-[#f3f3ef]" : "bg-[#faf9f7] text-[#151515]",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "h-8 w-8 animate-spin rounded-full border-2",
          isDark
            ? "border-white/20 border-t-white"
            : "border-black/15 border-t-black",
        ].join(" ")}
      />
      <p className="text-[14px] font-medium">Connecting your TikTok account...</p>
    </div>
  );
}