import { useEffect, useState } from "react";

/**
 * Routeur minimal basé sur le pathname (History API).
 *
 *   "/"          -> ""          (landing)
 *   "/home"      -> "home"      (dashboard)
 *   "/signup"    -> "signup"
 *   "/signin"    -> "signin"
 *   "/settings"  -> "settings"
 *   "/schedule"  -> "schedule"
 */

/* Anciennes URLs `/#/home` -> `/home` (favoris, liens déjà partagés).
   Les retours OAuth (#access_token=..., #error=...) sont ignorés : ils
   sont traités dans App.tsx. Exécuté avant le premier rendu. */
(function migrateLegacyHash() {
  if (typeof window === "undefined") return;

  const { hash } = window.location;

  if (!/^#\/./.test(hash)) return;
  if (/(access_token|refresh_token|error|code)=/.test(hash)) return;

  window.history.replaceState(null, "", hash.slice(1));
})();

function readRoute(): string {
  return window.location.pathname
    .replace(/^\/+|\/+$/g, "") // enlève les "/" de début/fin
    .split("/")[0] // garde le 1er segment
    .toLowerCase();
}

export function useHashRoute(): string {
  const [route, setRoute] = useState<string>(readRoute);

  useEffect(() => {
    const onRouteChange = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    window.addEventListener("popstate", onRouteChange);
    return () => window.removeEventListener("popstate", onRouteChange);
  }, []);

  return route;
}

/**
 * Navigation programmatique SPA.
 *   navigate("")                 -> "/"        (landing)
 *   navigate("home")             -> "/home"    (dashboard)
 *   navigate("signin?x=1")       -> "/signin?x=1"
 *   navigate("home", { replace: true })  -> remplace l'entrée d'historique
 */
export function navigate(to: string, options: { replace?: boolean } = {}) {
  const clean = to.replace(/^[#/]+/, "").replace(/\/+$/, "");
  const url = clean === "" ? "/" : `/${clean}`;

  const current = window.location.pathname + window.location.search;
  if (current === url) return; // évite les doublons d'historique

  if (options.replace) {
    window.history.replaceState({}, "", url);
  } else {
    window.history.pushState({}, "", url);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
}