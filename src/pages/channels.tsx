// src/pages/Channels.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";

import DashboardSidebar, {
  useSidebarOffset,
} from "../components/DashboardSidebar";
import ConnectChannelModal from "../components/ConnectChannelModal";
import { useTheme, type Theme } from "../hooks/useTheme";
import { useUser } from "../contexts/UserContext";

import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
  PinterestIcon,
  ThreadsIcon,
} from "../components/IntegrationIcons";

import {
  getTikTokStatus,
  startTikTokLogin,
  disconnectTikTok,
} from "../services/tiktok";
import {
  getPinterestStatus,
  startPinterestLogin,
  disconnectPinterest,
  connectPinterestWithToken,
} from "../services/pinterest";
import {
  getYouTubeStatus,
  startYouTubeLogin,
  disconnectYouTube,
} from "../services/youtube";
import {
  CACHE_MAX_AGE_MS,
  clearCache,
  readCache,
  writeCache,
  type CacheProvider,
  type Connection,
} from "../services/channelsCache";

/* ============================================================================
   Types (exportés pour ConnectChannelModal)
============================================================================ */

export type ChannelKey =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "threads";

export type IconComponent = ComponentType<{
  className?: string;
  size?: number;
}>;

export type Channel = {
  key: ChannelKey;
  name: string;
  subtitle: string;
  accountLabel: string;
  icon: IconComponent;
};

export type ConnectionState = Record<ChannelKey, Connection>;

type ToggleOrigin = { x: number; y: number };
type ToggleThemeFn = (origin?: ToggleOrigin) => void;

type ChannelsProps = {
  theme?: Theme;
  onToggleTheme?: ToggleThemeFn;
};

type IconProps = { className?: string };

// Réponse commune des endpoints /status (TikTok, Pinterest, YouTube).
type StatusResponse = {
  connected: boolean;
  account:
    | {
        display_name?: string | null;
        avatar_url?: string | null;
        avatarUrl?: string | null;
      }
    | null
    | undefined;
};

type ThemeTokens = {
  page: string;
  title: string;
  muted: string;
  card: string;
  cardHover: string;
  surface: string;
  connectBtn: string;
  secondaryBtn: string;
  progressOn: string;
  progressOff: string;
  iconBtn: string;
  menu: string;
  menuItem: string;
  danger: string;
  ring: string;
  dashed: string;
  tile: string;
  success: string;
  pill: string;
};

/* ============================================================================
   Config : plan + réseaux + état initial
============================================================================ */

export const PLAN = { name: "Free", maxChannels: 3 };

/** Réseaux branchés sur un vrai OAuth (les autres sont des placeholders). */
export const REAL_OAUTH: ChannelKey[] = ["tiktok", "pinterest", "youtube"];

export const CHANNELS: Channel[] = [
  {
    key: "instagram",
    name: "Instagram",
    subtitle: "Business or Creator",
    accountLabel: "Instagram Account",
    icon: InstagramIcon,
  },
  {
    key: "facebook",
    name: "Facebook",
    subtitle: "Page",
    accountLabel: "Facebook Page",
    icon: FacebookIcon,
  },
  {
    key: "threads",
    name: "Threads",
    subtitle: "Profile",
    accountLabel: "Threads Profile",
    icon: ThreadsIcon,
  },
  {
    key: "youtube",
    name: "YouTube",
    subtitle: "Channel",
    accountLabel: "YouTube Channel",
    icon: YouTubeIcon,
  },
  {
    key: "tiktok",
    name: "TikTok",
    subtitle: "Business or Personal",
    accountLabel: "TikTok Account",
    icon: TikTokIcon,
  },
  {
    key: "pinterest",
    name: "Pinterest",
    subtitle: "Business or Profile",
    accountLabel: "Pinterest Account",
    icon: PinterestIcon,
  },
];

const initialConnections: ConnectionState = {
  instagram: { connected: false },
  tiktok: { connected: false },
  youtube: { connected: false },
  facebook: { connected: false },
  pinterest: { connected: false },
  threads: { connected: false },
};

/* ============================================================================
   Icônes locales
============================================================================ */

function Svg({
  className = "h-4 w-4",
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </Svg>
  );
}

function GearIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.62.8 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09c-.76 0-1.36.41-1.51 1Z" />
    </Svg>
  );
}

function DotsIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

/* ============================================================================
   Helpers
============================================================================ */

function formatOAuthError(provider: string, error: unknown): string {
  const raw = error instanceof Error ? error.message : "";

  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "Unable to reach the server (network or CORS error). Check that the backend is running and that VITE_API_URL is correct.";
  }

  return raw
    ? `Unable to connect to ${provider}. ${raw}`
    : `Unable to connect to ${provider}.`;
}

function mockHandleFor(key: ChannelKey): string {
  // Valeurs fictives utilisées uniquement par les placeholders.
  const handles: Record<ChannelKey, string> = {
    instagram: "@ronan.studio",
    tiktok: "",
    youtube: "",
    facebook: "Ronan Studio Page",
    pinterest: "",
    threads: "@ronan.studio",
  };

  return handles[key];
}

function toConnection(status: StatusResponse): Connection {
  if (!status.connected) return { connected: false };

  const account = status.account;

  return {
    connected: true,
    handle: account?.display_name ?? undefined,
    // Le nom du champ dépend du backend : avatar_url ou avatarUrl.
    avatarUrl: account?.avatar_url ?? account?.avatarUrl ?? undefined,
  };
}

/* ============================================================================
   Avatar (photo de profil + badge du réseau en bas à droite)
============================================================================ */

type AvatarProps = {
  channel: Channel;
  connection: Connection;
  isDark: boolean;
};

function Avatar({ channel, connection, isDark }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const Icon = channel.icon;

  const label = connection.handle || channel.name;
  const initial = label.replace(/^@/, "").charAt(0).toUpperCase() || "?";
  const showImage = Boolean(connection.avatarUrl) && !imgFailed;

  // Si l'URL change (reconnexion), on retente le chargement.
  useEffect(() => {
    setImgFailed(false);
  }, [connection.avatarUrl]);

  return (
    <span className="relative flex h-11 w-11 shrink-0">
      {showImage ? (
        <img
          src={connection.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-11 w-11 rounded-full object-cover"
        />
      ) : (
        <span
          className={[
            "flex h-11 w-11 items-center justify-center rounded-full",
            "text-[15px] font-semibold",
            isDark
              ? "bg-white/10 text-white/80"
              : "bg-black/[0.07] text-black/60",
          ].join(" ")}
        >
          {initial}
        </span>
      )}

      <span
        className={[
          "absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center",
          "rounded-full bg-white ring-2",
          isDark ? "ring-[#141416]" : "ring-white",
        ].join(" ")}
      >
        <Icon className="h-3 w-3" size={12} />
      </span>
    </span>
  );
}

/* ============================================================================
   Menu "⋮" d'une carte (Disconnect)
============================================================================ */

type RowMenuProps = {
  t: ThemeTokens;
  disabled: boolean;
  onDisconnect: () => void;
};

function RowMenu({ t, disabled, onDisconnect }: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={[
          "flex h-8 w-8 items-center justify-center rounded-lg",
          "transition-colors duration-150 disabled:opacity-50",
          t.iconBtn,
          t.ring,
        ].join(" ")}
      >
        <DotsIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className={[
            "absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden",
            "rounded-xl border p-1 shadow-xl",
            t.menu,
          ].join(" ")}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDisconnect();
            }}
            className={[
              "w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium",
              "transition-colors duration-150",
              t.menuItem,
              t.danger,
            ].join(" ")}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   EmptyState
============================================================================ */

type EmptyStateProps = {
  t: ThemeTokens;
  onConnect: () => void;
};

function EmptyState({ t, onConnect }: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-5",
        "rounded-2xl border border-dashed px-6 py-14 text-center",
        t.dashed,
      ].join(" ")}
    >
      <div className="flex items-center gap-2" aria-hidden="true">
        {CHANNELS.map((channel, index) => {
          const Icon = channel.icon;
          return (
            <span
              key={channel.key}
              className={[
                "flex h-9 w-9 items-center justify-center rounded-xl",
                "bg-white shadow-sm ring-1 ring-black/10",
                index % 2 === 0 ? "-translate-y-0.5" : "translate-y-0.5",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" size={16} />
            </span>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className={["text-[15px] font-semibold", t.title].join(" ")}>
          Connect your first channel
        </h2>
        <p
          className={[
            "max-w-sm text-[12px] leading-relaxed",
            t.muted,
          ].join(" ")}
        >
          Link an account to see it here and manage it from one place. Your{" "}
          {PLAN.name} plan includes up to {PLAN.maxChannels} channels.
        </p>
      </div>

      <button
        type="button"
        onClick={onConnect}
        className={[
          "inline-flex items-center gap-1.5 rounded-lg px-4 py-2",
          "text-[12px] font-semibold",
          "transition-[background-color,transform] duration-150",
          "active:scale-[0.98]",
          t.connectBtn,
          t.ring,
        ].join(" ")}
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Connect channel
      </button>
    </div>
  );
}

/* ============================================================================
   Page
============================================================================ */

export default function Channels({
  theme: themeProp,
  onToggleTheme: onToggleThemeProp,
}: ChannelsProps) {
  const themeContext = useTheme();

  const theme = themeProp ?? themeContext.theme;
  const onToggleTheme = onToggleThemeProp ?? themeContext.toggle;
  const isDark = theme === "dark";

  // Largeur dynamique de la sidebar (identique à la Home).
  const sidebarOffset = useSidebarOffset();

  const { user } = useUser();
  const userId = user?.id ?? null;

  // État initial lu depuis le cache : les profils TikTok, Pinterest et YouTube
  // s'affichent tout de suite quand on revient sur la page, sans clignotement.
  const [connections, setConnections] = useState<ConnectionState>(() => {
    if (!userId) return initialConnections;

    const tiktok = readCache(userId, "tiktok");
    const pinterest = readCache(userId, "pinterest");
    const youtube = readCache(userId, "youtube");

    return {
      ...initialConnections,
      ...(tiktok ? { tiktok: tiktok.connection } : {}),
      ...(pinterest ? { pinterest: pinterest.connection } : {}),
      ...(youtube ? { youtube: youtube.connection } : {}),
    };
  });

  const [pendingKey, setPendingKey] = useState<ChannelKey | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Empêche un double clic de lancer deux OAuth en parallèle.
  const tiktokBusy = useRef(false);
  const pinterestBusy = useRef(false);
  const youtubeBusy = useRef(false);

  const connectedChannels = useMemo(
    () => CHANNELS.filter((channel) => connections[channel.key].connected),
    [connections]
  );
  const connectedCount = connectedChannels.length;
  const limitReached = connectedCount >= PLAN.maxChannels;

  /* ── Retour OAuth + statut des comptes (avec cache) ── */

  useEffect(() => {
    if (!userId) return;

    /* 1) Retour d'un réseau : /#/channels?tiktok=connected, ?pinterest=connected,
          ?youtube=connected ou ?<réseau>_error=...
          Avec le routage par hash, la query est DANS le hash, pas dans
          window.location.search. */
    const hash = window.location.hash;
    const queryIndex = hash.indexOf("?");
    const basePath = queryIndex === -1 ? hash : hash.slice(0, queryIndex);
    const params = new URLSearchParams(
      queryIndex === -1 ? "" : hash.slice(queryIndex + 1)
    );

    const tiktokError = params.get("tiktok_error");
    const pinterestError = params.get("pinterest_error");
    const youtubeError = params.get("youtube_error");

    const returned: Record<CacheProvider, boolean> = {
      tiktok: params.has("tiktok") || Boolean(tiktokError),
      pinterest: params.has("pinterest") || Boolean(pinterestError),
      youtube: params.has("youtube") || Boolean(youtubeError),
    };

    if (tiktokError) {
      setErrorMessage(`Unable to connect to TikTok. ${tiktokError}`);
    }
    if (pinterestError) {
      setErrorMessage(`Unable to connect to Pinterest. ${pinterestError}`);
    }
    if (youtubeError) {
      setErrorMessage(`Unable to connect to YouTube. ${youtubeError}`);
    }

    // Nouvelle connexion : on force un rechargement du profil.
    if (returned.tiktok) clearCache(userId, "tiktok");
    if (returned.pinterest) clearCache(userId, "pinterest");
    if (returned.youtube) clearCache(userId, "youtube");

    if (returned.tiktok || returned.pinterest || returned.youtube) {
      [
        "tiktok",
        "tiktok_error",
        "pinterest",
        "pinterest_error",
        "youtube",
        "youtube_error",
      ].forEach((k) => params.delete(k));
      const query = params.toString();

      // On nettoie l'URL pour ne pas réafficher le message au rafraîchissement.
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}${basePath}${
          query ? `?${query}` : ""
        }`
      );
    }

    let cancelled = false;

    /* 2) Pour chaque réseau : cache affiché immédiatement, aucun appel réseau
          s'il est récent, sinon rechargement silencieux depuis le backend. */
    const sync = (
      provider: CacheProvider,
      justReturned: boolean,
      fetchStatus: () => Promise<StatusResponse>
    ) => {
      const cached = justReturned ? null : readCache(userId, provider);

      if (cached) {
        setConnections((current) => ({
          ...current,
          [provider]: cached.connection,
        }));

        if (Date.now() - cached.savedAt < CACHE_MAX_AGE_MS) return;
        // Cache ancien : on l'affiche quand même, puis on le met à jour en silence.
      }

      void (async () => {
        try {
          const status = await fetchStatus();
          if (cancelled) return;

          const connection = toConnection(status);

          if (connection.connected) {
            writeCache(userId, connection, provider);
          } else {
            clearCache(userId, provider);
          }

          setConnections((current) => ({
            ...current,
            [provider]: connection,
          }));
        } catch (error) {
          // Non bloquant : on garde ce qui est affiché (cache éventuel).
          console.warn(`[Stone] Could not load ${provider} status:`, error);
        }
      })();
    };

    sync("tiktok", returned.tiktok, getTikTokStatus);
    sync("pinterest", returned.pinterest, getPinterestStatus);
    sync("youtube", returned.youtube, getYouTubeStatus);

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* ── Thème : même palette que la Home ── */

  const t = useMemo<ThemeTokens>(
    () =>
      isDark
        ? {
            page: "bg-[#09090a] text-white",
            title: "text-white",
            muted: "text-neutral-500",
            card: "border-white/[0.07] bg-[#141416]",
            cardHover: "hover:border-white/[0.16]",
            surface: "border-white/[0.07] bg-white/[0.03]",
            connectBtn: "bg-white text-black hover:bg-neutral-200",
            secondaryBtn:
              "border border-white/10 text-white hover:bg-white/[0.07]",
            progressOn: "bg-white",
            progressOff: "bg-white/10",
            iconBtn:
              "text-neutral-500 hover:bg-white/[0.07] hover:text-white",
            menu: "border-white/10 bg-[#1c1c1f] text-white",
            menuItem: "hover:bg-white/[0.07]",
            danger: "text-red-400",
            ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            dashed: "border-white/[0.12] bg-white/[0.02]",
            tile: "border-white/10 bg-[#141416]",
            success: "bg-emerald-400",
            pill: "bg-emerald-500/10 text-emerald-300",
          }
        : {
            page: "bg-[#f5f3ef] text-neutral-900",
            title: "text-neutral-900",
            muted: "text-neutral-500",
            card: "border-black/[0.06] bg-white",
            cardHover: "hover:border-black/[0.14]",
            surface: "border-black/[0.06] bg-neutral-50",
            connectBtn: "bg-neutral-900 text-white hover:bg-neutral-800",
            secondaryBtn:
              "border border-black/10 text-neutral-900 hover:bg-neutral-100",
            progressOn: "bg-neutral-900",
            progressOff: "bg-black/10",
            iconBtn:
              "text-neutral-400 hover:bg-black/[0.05] hover:text-neutral-900",
            menu: "border-black/10 bg-white text-neutral-900",
            menuItem: "hover:bg-black/[0.05]",
            danger: "text-red-600",
            ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
            dashed: "border-black/[0.15] bg-black/[0.015]",
            tile: "border-black/10 bg-white",
            success: "bg-emerald-500",
            pill: "bg-emerald-50 text-emerald-700",
          },
    [isDark]
  );

  /* ── TikTok : vrai OAuth, aucune simulation ── */

  const handleTikTokToggle = async () => {
    if (tiktokBusy.current) return;
    tiktokBusy.current = true;

    setPendingKey("tiktok");

    let redirecting = false;

    try {
      if (connections.tiktok.connected) {
        console.log("[Stone] Disconnecting TikTok");
        await disconnectTikTok();

        // Le profil n'est plus valable : on vide le cache.
        if (userId) clearCache(userId, "tiktok");

        // Mise à jour de l'UI uniquement après succès du backend.
        setConnections((current) => ({
          ...current,
          tiktok: { connected: false },
        }));
      } else {
        console.log("[Stone] Starting TikTok OAuth");

        // POST /api/tiktok/auth/url puis window.location.assign(url).
        // Si ça réussit, le navigateur quitte la page.
        await startTikTokLogin();
        redirecting = true;
      }
    } catch (error) {
      console.error("[Stone] TikTok OAuth error:", error);
      setErrorMessage(formatOAuthError("TikTok", error));
    } finally {
      // Pendant la redirection, on garde le bouton désactivé.
      if (!redirecting) {
        setPendingKey(null);
        tiktokBusy.current = false;
      }
    }
  };

  /* ── Pinterest : vrai OAuth (app en mode sandbox/trial) ── */

  const handlePinterestToggle = async () => {
    if (pinterestBusy.current) return;
    pinterestBusy.current = true;

    setPendingKey("pinterest");

    let redirecting = false;

    try {
      if (connections.pinterest.connected) {
        console.log("[Stone] Disconnecting Pinterest");
        await disconnectPinterest();

        if (userId) clearCache(userId, "pinterest");

        setConnections((current) => ({
          ...current,
          pinterest: { connected: false },
        }));
      } else if (import.meta.env.VITE_PINTEREST_MANUAL_TOKEN === "true") {
        // Mode dev : pas de redirect URI tant que l'app n'est pas approuvée.
        const token = window.prompt(
          "Pinterest access token (généré dans le portail développeur) :"
        );

        if (!token?.trim()) return; // le finally réinitialise l'état

        const account = await connectPinterestWithToken(token.trim());

        const connection: Connection = {
          connected: true,
          handle: account?.display_name ?? undefined,
          avatarUrl: account?.avatar_url ?? undefined,
        };

        if (userId) writeCache(userId, connection, "pinterest");

        setConnections((current) => ({ ...current, pinterest: connection }));
      } else {
        console.log("[Stone] Starting Pinterest OAuth");

        // POST /api/pinterest/auth/url puis window.location.assign(url).
        await startPinterestLogin();
        redirecting = true;
      }
    } catch (error) {
      console.error("[Stone] Pinterest OAuth error:", error);
      setErrorMessage(formatOAuthError("Pinterest", error));
    } finally {
      if (!redirecting) {
        setPendingKey(null);
        pinterestBusy.current = false;
      }
    }
  };

  /* ── YouTube : vrai OAuth Google ── */

  const handleYouTubeToggle = async () => {
    if (youtubeBusy.current) return;
    youtubeBusy.current = true;

    setPendingKey("youtube");

    let redirecting = false;

    try {
      if (connections.youtube.connected) {
        console.log("[Stone] Disconnecting YouTube");
        await disconnectYouTube();

        if (userId) clearCache(userId, "youtube");

        setConnections((current) => ({
          ...current,
          youtube: { connected: false },
        }));
      } else {
        console.log("[Stone] Starting YouTube OAuth");

        // POST /api/youtube/auth/url puis window.location.assign(url).
        await startYouTubeLogin();
        redirecting = true;
      }
    } catch (error) {
      console.error("[Stone] YouTube OAuth error:", error);
      setErrorMessage(formatOAuthError("YouTube", error));
    } finally {
      if (!redirecting) {
        setPendingKey(null);
        youtubeBusy.current = false;
      }
    }
  };

  /* ── Autres réseaux : PLACEHOLDER uniquement (pas de vrai OAuth) ── */

  const handlePlaceholderToggle = (key: ChannelKey) => {
    // TODO: implement Instagram OAuth
    // TODO: implement Facebook OAuth
    // TODO: implement Threads OAuth
    setPendingKey(key);

    window.setTimeout(() => {
      setConnections((current) => ({
        ...current,
        [key]: current[key].connected
          ? { connected: false }
          : { connected: true, handle: mockHandleFor(key) },
      }));
      setPendingKey(null);
    }, 500);
  };

  const handleToggle = (key: ChannelKey) => {
    setErrorMessage(null);

    // Limite du plan : on bloque uniquement les NOUVELLES connexions.
    if (!connections[key].connected && limitReached) {
      setErrorMessage(
        `Your ${PLAN.name} plan allows up to ${PLAN.maxChannels} channels. Upgrade to connect more.`
      );
      return;
    }

    if (key === "tiktok") {
      console.log("[Stone] TikTok button clicked");
      void handleTikTokToggle();
      return;
    }

    if (key === "pinterest") {
      console.log("[Stone] Pinterest button clicked");
      void handlePinterestToggle();
      return;
    }

    if (key === "youtube") {
      console.log("[Stone] YouTube button clicked");
      void handleYouTubeToggle();
      return;
    }

    handlePlaceholderToggle(key);
  };

  const handleUpgrade = () => {
    // TODO: rediriger vers la page de facturation / des plans.
    console.log("[Stone] Upgrade plan clicked");
  };

  const handleSettings = (key: ChannelKey) => {
    // TODO: ouvrir les réglages du canal.
    console.log("[Stone] Channel settings clicked:", key);
  };

  const openModal = () => {
    setErrorMessage(null);
    setShowConnectModal(true);
  };

  const closeModal = () => setShowConnectModal(false);

  const remaining = Math.max(0, PLAN.maxChannels - connectedCount);

  return (
    <div
      className={[
        "relative h-full w-full overflow-hidden",
        "transition-colors duration-300",
        t.page,
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} onToggleTheme={onToggleTheme} />

      <main
        className={[
          "h-full overflow-y-auto overflow-x-hidden",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "transition-[padding-left] duration-[380ms]",
          "ease-[cubic-bezier(0.4,0,0.2,1)]",
          "motion-reduce:transition-none",
        ].join(" ")}
        style={{ paddingLeft: sidebarOffset }}
      >
        <div
          className={[
            "mx-auto flex w-full max-w-[1280px] flex-col",
            "px-[clamp(18px,3vw,40px)]",
            "pb-16 pt-[clamp(18px,3vw,30px)]",
          ].join(" ")}
        >
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1
                className={[
                  "text-[22px] font-semibold tracking-[-0.035em]",
                  t.title,
                ].join(" ")}
              >
                Channels
              </h1>
              <p className={["mt-0.5 text-[11px]", t.muted].join(" ")}>
                Manage the accounts you publish to.
              </p>
            </div>

            <button
              type="button"
              onClick={openModal}
              className={[
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2",
                "text-[12px] font-semibold",
                "transition-[background-color,transform] duration-150",
                "active:scale-[0.98]",
                t.connectBtn,
                t.ring,
              ].join(" ")}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Connect channel
            </button>
          </header>

          {/* Plan + utilisation */}
          <section
            aria-label="Plan usage"
            className={[
              "mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3",
              "rounded-2xl border px-4 py-3.5",
              t.surface,
            ].join(" ")}
          >
            <div className="min-w-[220px] flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className={["text-[12px] font-semibold", t.title].join(" ")}>
                  {PLAN.name} plan
                </h2>
                <span
                  className={["text-[11px] tabular-nums", t.muted].join(" ")}
                >
                  {connectedCount} of {PLAN.maxChannels} channels used
                </span>
              </div>

              <div
                className="mt-2.5 flex gap-1.5"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={PLAN.maxChannels}
                aria-valuenow={connectedCount}
                aria-label="Channels used"
              >
                {Array.from({ length: PLAN.maxChannels }, (_, i) => (
                  <span
                    key={i}
                    className={[
                      "h-1 flex-1 rounded-full transition-colors duration-300",
                      i < connectedCount ? t.progressOn : t.progressOff,
                    ].join(" ")}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpgrade}
              className={[
                "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold",
                "transition-colors duration-150",
                t.secondaryBtn,
                t.ring,
              ].join(" ")}
            >
              Upgrade plan
            </button>
          </section>

          {/* Erreur (page) — masquée si le modal est ouvert, il l'affiche lui-même */}
          {errorMessage && !showConnectModal && (
            <div
              role="alert"
              className={[
                "mt-3 flex items-start gap-2.5",
                "rounded-xl border px-3.5 py-2.5 text-[12px] leading-relaxed",
                isDark
                  ? "border-red-400/30 bg-red-500/10 text-red-300"
                  : "border-red-300 bg-red-50 text-red-700",
              ].join(" ")}
            >
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{errorMessage}</span>

              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setErrorMessage(null)}
                className={["rounded-md p-0.5", t.ring].join(" ")}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Liste */}
          <div className="mb-3 mt-8 flex items-center justify-between gap-4">
            <p
              className={[
                "text-[12px] font-semibold",
                isDark ? "text-neutral-300" : "text-neutral-700",
              ].join(" ")}
            >
              Connected channels
              {connectedCount > 0 && (
                <span className={["ml-1.5 font-normal", t.muted].join(" ")}>
                  · {connectedCount}/{PLAN.maxChannels}
                </span>
              )}
            </p>
          </div>

          {connectedCount === 0 ? (
            <EmptyState t={t} onConnect={openModal} />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {connectedChannels.map((channel) => {
                const connection = connections[channel.key];
                const isPending = pendingKey === channel.key;

                return (
                  <li
                    key={channel.key}
                    className={[
                      "flex flex-col rounded-2xl border p-4",
                      "transition-colors duration-150",
                      t.card,
                      t.cardHover,
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Avatar
                        channel={channel}
                        connection={connection}
                        isDark={isDark}
                      />

                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          aria-label={`${channel.name} settings`}
                          title="Settings"
                          disabled={isPending}
                          onClick={() => handleSettings(channel.key)}
                          className={[
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            "transition-colors duration-150 disabled:opacity-50",
                            t.iconBtn,
                            t.ring,
                          ].join(" ")}
                        >
                          <GearIcon className="h-4 w-4" />
                        </button>

                        <RowMenu
                          t={t}
                          disabled={isPending}
                          onDisconnect={() => handleToggle(channel.key)}
                        />
                      </div>
                    </div>

                    <div className="mt-3.5 min-w-0">
                      <p
                        className={[
                          "truncate text-[14px] font-semibold leading-tight",
                          "tracking-[-0.01em]",
                          t.title,
                        ].join(" ")}
                        title={connection.handle || channel.name}
                      >
                        {connection.handle || channel.name}
                      </p>
                      <p
                        className={["mt-0.5 truncate text-[11px]", t.muted].join(
                          " "
                        )}
                      >
                        {channel.accountLabel}
                      </p>
                    </div>

                    <div className="mt-4">
                      <span
                        className={[
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
                          "text-[10px] font-semibold",
                          t.pill,
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-1.5 w-1.5 rounded-full",
                            t.success,
                            isPending ? "animate-pulse" : "",
                          ].join(" ")}
                          aria-hidden="true"
                        />
                        {isPending ? "Updating..." : "Connected"}
                      </span>
                    </div>
                  </li>
                );
              })}

              {/* Emplacement libre */}
              {remaining > 0 && (
                <li className="flex">
                  <button
                    type="button"
                    onClick={openModal}
                    className={[
                      "flex min-h-[150px] w-full flex-col items-center justify-center",
                      "gap-2 rounded-2xl border border-dashed p-4 text-center",
                      "transition-colors duration-150",
                      t.dashed,
                      t.cardHover,
                      t.ring,
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-full border",
                        t.tile,
                        t.muted,
                      ].join(" ")}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </span>
                    <span
                      className={["text-[12px] font-semibold", t.title].join(
                        " "
                      )}
                    >
                      Connect another channel
                    </span>
                    <span className={["text-[11px]", t.muted].join(" ")}>
                      {remaining} {remaining === 1 ? "slot" : "slots"} left on
                      your {PLAN.name} plan
                    </span>
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </main>

      {showConnectModal && (
        <ConnectChannelModal
          channels={CHANNELS}
          connections={connections}
          pendingKey={pendingKey}
          limitReached={limitReached}
          planName={PLAN.name}
          realOAuthKeys={REAL_OAUTH}
          errorMessage={errorMessage}
          isDark={isDark}
          onToggle={handleToggle}
          onClose={closeModal}
        />
      )}
    </div>
  );
}