// src/pages/TikTokCallback.tsx
import { useEffect, useRef, useState } from "react";
import { completeTikTokLogin } from "../services/tiktok";
import { navigate } from "../hooks/useHashRoute";

// App.tsx intercepte /tiktok/callback?code=...&state=... avant le
// montage de React, range les paramètres dans sessionStorage puis
// bascule sur la route hash /#/tiktok-callback (cette page).

const TIKTOK_OAUTH_STORAGE_KEY = "tiktok_oauth_params"; // même clé que App.tsx

type StoredParams = {
  code: string | null;
  state: string | null;
  error: string | null;
  error_description: string | null;
};

function readStoredParams(): StoredParams | null {
  try {
    const raw = sessionStorage.getItem(TIKTOK_OAUTH_STORAGE_KEY);
    sessionStorage.removeItem(TIKTOK_OAUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredParams) : null;
  } catch {
    return null;
  }
}

export default function TikTokCallback() {
  const [message, setMessage] = useState("Connecting your TikTok account...");
  const [failed, setFailed] = useState(false);

  // Le code TikTok n'est utilisable qu'une seule fois : on empêche
  // le double appel de React StrictMode.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = readStoredParams();

    if (!params) {
      setFailed(true);
      setMessage("No TikTok response found. Please try connecting again.");
      return;
    }

    if (params.error || !params.code || !params.state) {
      setFailed(true);
      setMessage(
        params.error === "access_denied"
          ? "TikTok connection was cancelled."
          : params.error_description || "Invalid TikTok response."
      );
      return;
    }

    completeTikTokLogin(params.code, params.state)
      .then(() => {
        setMessage("TikTok connected! Redirecting...");
        window.setTimeout(() => navigate("channels", { replace: true }), 800);
      })
      .catch((err: unknown) => {
        setFailed(true);
        setMessage(
          err instanceof Error ? err.message : "Could not connect TikTok."
        );
      });
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#faf9f7] px-6 text-center text-[#151515] dark:bg-[#050506] dark:text-[#f3f3ef]">
      <p className="text-[15px] font-medium">{message}</p>

      {failed && (
        <a
          href="#/channels"
          onClick={(e) => {
            e.preventDefault();
            navigate("channels", { replace: true });
          }}
          className="rounded-xl border border-black/10 bg-white px-5 py-2 text-[13px] font-semibold text-[#151515]"
        >
          Back to channels
        </a>
      )}
    </div>
  );
}