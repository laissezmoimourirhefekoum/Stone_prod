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

/* ============================================================================
   Design tokens — palette douce, hovers systématiques sur tout élément cliquable
============================================================================ */

type ThemeTokens = {
  page: string;
  title: string;
  muted: string;
  card: string;
  cardHover: string;
  surface: string;
  connectBtn: string;
  connectBtnHover: string;
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
  pillNeutral: string;
  ghostHover: string;
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

function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
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
  connected: boolean;
};

function Avatar({ channel, connection, isDark, connected }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const Icon = channel.icon;

  const label = connection.handle || channel.name;
  const initial = label.replace(/^@/, "").charAt(0).toUpperCase() || "?";
  const showImage = Boolean(connection.avatarUrl) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [connection.avatarUrl]);

  return (
    <span className="relative flex h-12 w-12 shrink-0">
      {connected && showImage ? (
        <img
          src={connection.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-12 w-12 rounded-full object-cover"
        />
      ) : (
        <span
          className={[
            "flex h-12 w-12 items-center justify-center rounded-2xl",
            isDark
              ? "bg-white/[0.06] text-white/70"
              : "bg-black/[0.04] text-black/50",
          ].join(" ")}
        >
          <Icon className="h-5 w-5" size={20} />
        </span>
      )}

      {connected && (
        <span
          className={[
            "absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center",
            "rounded-full bg-white ring-2 transition-transform duration-150",
            isDark ? "ring-[#161619]" : "ring-white",
          ].join(" ")}
        >
          <Icon className="h-3 w-3" size={12} />
        </span>
      )}
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
          "transition-all duration-150 enabled:hover:scale-105 disabled:opacity-50",
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
            "absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden",
            "rounded-xl border p-1.5 shadow-2xl",
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

  const tiktokBusy = useRef(false);
  const pinterestBusy = useRef(false);
  const youtubeBusy = useRef(false);

  const connectedCount = useMemo(
    () =>
      CHANNELS.filter((channel) => connections[channel.key].connected).length,
    [connections]
  );
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

  /* ── Thème ── */

  const t = useMemo<ThemeTokens>(
    () =>
      isDark
        ? {
            page: "bg-[#0b0b0d] text-white",
            title: "text-white",
            muted: "text-neutral-500",
            card: "border-white/[0.07] bg-[#161619]",
            cardHover: "hover:border-white/20 hover:-translate-y-0.5",
            surface: "border-white/[0.07] bg-white/[0.03]",
            connectBtn: "bg-white text-black",
            connectBtnHover: "hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]",
            secondaryBtn:
              "border border-white/10 text-white hover:bg-white/[0.07] hover:border-white/20",
            progressOn: "bg-white",
            progressOff: "bg-white/10",
            iconBtn: "text-neutral-500 hover:bg-white/[0.08] hover:text-white",
            menu: "border-white/10 bg-[#1c1c1f] text-white",
            menuItem: "hover:bg-red-500/10",
            danger: "text-red-400",
            ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            dashed: "border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.05]",
            tile: "border-white/10 bg-white/[0.04]",
            success: "bg-emerald-400",
            pill: "bg-emerald-500/10 text-emerald-300",
            pillNeutral: "bg-white/[0.06] text-neutral-400",
            ghostHover: "hover:bg-white/[0.07]",
          }
        : {
            page: "bg-[#f6f5f2] text-neutral-900",
            title: "text-neutral-900",
            muted: "text-neutral-500",
            card: "border-black/[0.06] bg-white",
            cardHover: "hover:border-black/20 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
            surface: "border-black/[0.06] bg-white",
            connectBtn: "bg-neutral-900 text-white",
            connectBtnHover: "hover:bg-neutral-800 hover:shadow-[0_8px_20px_rgba(0,0,0,0.18)]",
            secondaryBtn:
              "border border-black/10 text-neutral-900 hover:bg-neutral-100 hover:border-black/20",
            progressOn: "bg-neutral-900",
            progressOff: "bg-black/10",
            iconBtn: "text-neutral-400 hover:bg-black/[0.06] hover:text-neutral-900",
            menu: "border-black/10 bg-white text-neutral-900",
            menuItem: "hover:bg-red-50",
            danger: "text-red-600",
            ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
            dashed: "border-black/[0.15] bg-white/60 hover:bg-white",
            tile: "border-black/[0.08] bg-black/[0.03]",
            success: "bg-emerald-500",
            pill: "bg-emerald-50 text-emerald-700",
            pillNeutral: "bg-black/[0.05] text-neutral-500",
            ghostHover: "hover:bg-black/[0.05]",
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

        if (userId) clearCache(userId, "tiktok");

        setConnections((current) => ({
          ...current,
          tiktok: { connected: false },
        }));
      } else {
        console.log("[Stone] Starting TikTok OAuth");
        await startTikTokLogin();
        redirecting = true;
      }
    } catch (error) {
      console.error("[Stone] TikTok OAuth error:", error);
      setErrorMessage(formatOAuthError("TikTok", error));
    } finally {
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
        const token = window.prompt(
          "Pinterest access token (généré dans le portail développeur) :"
        );

        if (!token?.trim()) return;

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

  /* ── Autres réseaux : PLACEHOLDER uniquement ── */

  const handlePlaceholderToggle = (key: ChannelKey) => {
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

    if (!connections[key].connected && limitReached) {
      setErrorMessage(
        `Your ${PLAN.name} plan allows up to ${PLAN.maxChannels} channels. Upgrade to connect more.`
      );
      return;
    }

    if (key === "tiktok") {
      void handleTikTokToggle();
      return;
    }

    if (key === "pinterest") {
      void handlePinterestToggle();
      return;
    }

    if (key === "youtube") {
      void handleYouTubeToggle();
      return;
    }

    handlePlaceholderToggle(key);
  };

  const handleUpgrade = () => {
    console.log("[Stone] Upgrade plan clicked");
  };

  const handleSettings = (key: ChannelKey) => {
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
            "mx-auto flex w-full max-w-[1100px] flex-col",
            "px-[clamp(18px,3vw,40px)]",
            "pb-16 pt-[clamp(24px,4vw,40px)]",
          ].join(" ")}
        >
          {/* ── Header ── */}
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p
                className={[
                  "mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                  t.muted,
                ].join(" ")}
              >
                Workspace
              </p>
              <h1
                className={[
                  "text-[26px] font-semibold tracking-[-0.04em]",
                  t.title,
                ].join(" ")}
              >
                Channels
              </h1>
              <p className={["mt-1 text-[13px]", t.muted].join(" ")}>
                Connect the accounts you publish to —{" "}
                {connectedCount}/{PLAN.maxChannels} active on the {PLAN.name}{" "}
                plan.
              </p>
            </div>

            <button
              type="button"
              onClick={openModal}
              className={[
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5",
                "text-[13px] font-semibold",
                "transition-all duration-150 active:scale-[0.97]",
                t.connectBtn,
                t.connectBtnHover,
                t.ring,
              ].join(" ")}
            >
              <PlusIcon className="h-4 w-4" />
              Connect channel
            </button>
          </header>

          {/* ── Bandeau plan ── */}
          <section
            aria-label="Plan usage"
            className={[
              "mt-8 flex flex-wrap items-center gap-x-6 gap-y-4",
              "rounded-2xl border p-5",
              "transition-colors duration-150",
              t.surface,
            ].join(" ")}
          >
            <div className="min-w-[240px] flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center rounded-md px-2 py-0.5",
                    "text-[10px] font-bold uppercase tracking-wider",
                    isDark
                      ? "bg-white/10 text-white"
                      : "bg-neutral-900 text-white",
                  ].join(" ")}
                >
                  {PLAN.name}
                </span>
                <span
                  className={["text-[12px] tabular-nums", t.muted].join(" ")}
                >
                  {connectedCount} of {PLAN.maxChannels} channels used
                </span>
              </div>

              <div
                className="mt-3 flex gap-1.5"
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
                      "h-1.5 flex-1 rounded-full transition-all duration-300",
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
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2",
                "text-[12px] font-semibold",
                "transition-all duration-150 active:scale-[0.97]",
                t.secondaryBtn,
                t.ring,
              ].join(" ")}
            >
              Upgrade plan
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          </section>

          {/* ── Erreur (page) ── */}
          {errorMessage && !showConnectModal && (
            <div
              role="alert"
              className={[
                "mt-4 flex items-start gap-2.5",
                "rounded-xl border px-4 py-3 text-[12px] leading-relaxed",
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
                className={[
                  "rounded-md p-1 transition-colors duration-150",
                  isDark
                    ? "hover:bg-red-400/20"
                    : "hover:bg-red-200/60",
                  t.ring,
                ].join(" ")}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Grille des canaux ── */}
          <div className="mb-4 mt-10 flex items-center justify-between gap-4">
            <h2 className={["text-[13px] font-semibold", t.title].join(" ")}>
              All channels
            </h2>
            {remaining > 0 && (
              <p className={["text-[11px]", t.muted].join(" ")}>
                {remaining} {remaining === 1 ? "slot" : "slots"} left
              </p>
            )}
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CHANNELS.map((channel) => {
              const connection = connections[channel.key];
              const isConnected = connection.connected;
              const isPending = pendingKey === channel.key;
              const isReal = REAL_OAUTH.includes(channel.key);

              return (
                <li key={channel.key}>
                  <div
                    className={[
                      "group flex h-full flex-col rounded-2xl border p-5",
                      "transition-all duration-200 ease-out",
                      t.card,
                      t.cardHover,
                    ].join(" ")}
                  >
                    {/* Ligne 1 : identité + actions */}
                    <div className="flex items-start justify-between gap-2">
                      <Avatar
                        channel={channel}
                        connection={connection}
                        isDark={isDark}
                        connected={isConnected}
                      />

                      {isConnected && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label={`${channel.name} settings`}
                            title="Settings"
                            disabled={isPending}
                            onClick={() => handleSettings(channel.key)}
                            className={[
                              "flex h-8 w-8 items-center justify-center rounded-lg",
                              "transition-all duration-150",
                              "enabled:hover:scale-105 disabled:opacity-50",
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
                      )}
                    </div>

                    {/* Ligne 2 : nom + handle */}
                    <div className="mt-4 min-w-0">
                      <p
                        className={[
                          "truncate text-[15px] font-semibold leading-tight",
                          "tracking-[-0.01em]",
                          t.title,
                        ].join(" ")}
                        title={connection.handle || channel.name}
                      >
                        {connection.handle || channel.name}
                      </p>
                      <p
                        className={[
                          "mt-0.5 truncate text-[11.5px]",
                          t.muted,
                        ].join(" ")}
                      >
                        {isConnected
                          ? channel.accountLabel
                          : channel.subtitle}
                      </p>
                    </div>

                    {/* Ligne 3 : statut + action */}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                      {isConnected ? (
                        <span
                          className={[
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
                            "text-[10.5px] font-semibold",
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
                      ) : (
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-1",
                            "text-[10.5px] font-semibold",
                            t.pillNeutral,
                          ].join(" ")}
                        >
                          Not connected
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggle(channel.key)}
                        disabled={isPending || (!isConnected && limitReached)}
                        className={[
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5",
                          "text-[11.5px] font-semibold",
                          "transition-all duration-150",
                          "enabled:hover:-translate-y-px enabled:active:scale-[0.97]",
                          "disabled:cursor-not-allowed disabled:opacity-45",
                          isConnected ? t.secondaryBtn : t.connectBtn,
                          isConnected ? "" : t.connectBtnHover,
                          t.ring,
                        ].join(" ")}
                      >
                        {isPending ? (
                          "Working..."
                        ) : isConnected ? (
                          "Disconnect"
                        ) : (
                          <>
                            <PlusIcon className="h-3 w-3" />
                            Connect
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* ── Aide ── */}
          <p
            className={[
              "mt-6 text-center text-[11px] leading-relaxed",
              t.muted,
            ].join(" ")}
          >
            TikTok, Pinterest and YouTube use a secure OAuth flow. Instagram,
            Facebook and Threads are coming soon.
          </p>
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