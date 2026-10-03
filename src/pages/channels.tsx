// src/pages/Channels.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { createPortal } from "react-dom";

import DashboardSidebar from "../components/DashboardSidebar";
import { useTheme, type Theme } from "../hooks/useTheme";
import { useUser } from "../contexts/UserContext";
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
import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
  PinterestIcon,
  ThreadsIcon,
} from "../components/IntegrationIcons";

/* ============================================================================
   Types
============================================================================ */

type ToggleOrigin = { x: number; y: number };
type ToggleThemeFn = (origin?: ToggleOrigin) => void;

type ChannelsProps = {
  theme?: Theme;
  onToggleTheme?: ToggleThemeFn;
};

type IconProps = { className?: string };

type IconComponent = ComponentType<{ className?: string; size?: number }>;

type ChannelKey =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "threads";

type Channel = {
  key: ChannelKey;
  name: string;
  subtitle: string; // affiché dans le modal de connexion
  accountLabel: string; // affiché sous le nom dans la liste (ex. "TikTok Account")
  icon: IconComponent;
};

type ConnectionState = Record<ChannelKey, Connection>;

type ThemeTokens = {
  page: string;
  title: string;
  muted: string;
  card: string;
  divider: string;
  connectBtn: string;
  secondaryBtn: string;
  planCard: string;
  progressOn: string;
  progressOff: string;
  iconBtn: string;
  menu: string;
  menuItem: string;
};

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
   Plan (TODO: à remplacer par le vrai plan de l'utilisateur, côté backend)
============================================================================ */

const PLAN = { name: "Free", maxChannels: 3 };

/* ============================================================================
   Réseaux + état initial
============================================================================ */

const CHANNELS: Channel[] = [
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

// Réseaux branchés sur un vrai OAuth (les autres sont encore des placeholders).
const REAL_OAUTH: ChannelKey[] = ["tiktok", "pinterest", "youtube"];

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

function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

function LayersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
      <path d="m3 12 9 4.5 9-4.5" />
      <path d="m3 16.5 9 4.5 9-4.5" />
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

function DotsIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={props.className ?? "h-4 w-4"}
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
  // Valeurs fictives utilisées uniquement par les placeholders
  // (TikTok, Pinterest et YouTube utilisent maintenant le vrai profil).
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
    <span className="relative flex h-10 w-10 shrink-0">
      {showImage ? (
        <img
          src={connection.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <span
          className={[
            "flex h-10 w-10 items-center justify-center rounded-full",
            "text-[15px] font-semibold",
            isDark ? "bg-white/10 text-white/80" : "bg-black/[0.07] text-black/60",
          ].join(" ")}
        >
          {initial}
        </span>
      )}

      <span
        className={[
          "absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center",
          "rounded-md bg-white ring-2",
          isDark ? "ring-[#131316]" : "ring-white",
        ].join(" ")}
      >
        <Icon className="h-3 w-3" size={12} />
      </span>
    </span>
  );
}

/* ============================================================================
   Menu "⋮" d'une ligne (Disconnect)
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
        ].join(" ")}
      >
        <DotsIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className={[
            "absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden",
            "rounded-xl border p-1 shadow-lg",
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
              "w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium",
              "transition-colors duration-150",
              t.menuItem,
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
  isDark: boolean;
  onConnect: () => void;
};

function EmptyState({ t, isDark, onConnect }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-6 py-20 text-center">
      <span
        className={[
          "flex h-20 w-20 items-center justify-center rounded-full",
          isDark ? "bg-white/10 text-white/70" : "bg-black/[0.06] text-black/45",
        ].join(" ")}
      >
        <PlusIcon className="h-8 w-8" />
      </span>

      <div className="flex flex-col gap-2">
        <h2 className={["text-[19px] font-semibold", t.title].join(" ")}>
          Connect a channel to get started
        </h2>
        <p className={["max-w-sm text-[14px] leading-relaxed", t.muted].join(" ")}>
          Once connected, you'll see your channels listed here.
        </p>
      </div>

      <button
        type="button"
        onClick={onConnect}
        className={[
          "rounded-xl px-6 py-2.5 text-[13.5px] font-semibold",
          "transition-[background-color,transform] duration-150",
          "active:scale-[0.98]",
          t.connectBtn,
        ].join(" ")}
      >
        Connect Channel
      </button>
    </div>
  );
}

/* ============================================================================
   ConnectModal
   Rendu dans document.body via un portail : aucun parent (sidebar, overflow,
   transform, pointer-events...) ne peut intercepter les clics.
============================================================================ */

type ConnectModalProps = {
  channels: Channel[];
  connections: ConnectionState;
  pendingKey: ChannelKey | null;
  limitReached: boolean;
  onToggle: (key: ChannelKey) => void;
  onClose: () => void;
  errorMessage: string | null;
  isDark: boolean;
};

function ConnectModal({
  channels,
  connections,
  pendingKey,
  limitReached,
  onToggle,
  onClose,
  errorMessage,
  isDark,
}: ConnectModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const cardBase = [
    "flex min-h-[148px] flex-col items-center justify-center gap-0.5",
    "rounded-2xl border px-3 py-5 text-center",
    "transition-colors duration-150",
    isDark
      ? "border-white/10 bg-transparent"
      : "border-black/10 bg-transparent",
  ].join(" ");

  const cardHover = isDark ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.03]";
  const subtitleColor = isDark ? "text-white/55" : "text-black/50";

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      className={[
        "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8",
        "backdrop-blur-sm",
        isDark ? "bg-black/70" : "bg-black/40",
      ].join(" ")}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect a New Channel"
        onClick={(event) => event.stopPropagation()}
        className={[
          "flex max-h-[560px] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border",
          isDark
            ? "border-white/10 bg-[#1f2020] text-[#f3f3ef] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            : "border-black/10 bg-white text-[#151515] shadow-[0_24px_60px_rgba(0,0,0,0.18)]",
        ].join(" ")}
      >
        {/* Header (sans barre de séparation) */}
        <div className="relative flex shrink-0 items-center justify-center px-14 py-4">
          <h2 className="text-[17px] font-medium">Connect a New Channel</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={[
              "absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2",
              "items-center justify-center rounded-xl border",
              "transition-colors duration-150",
              isDark
                ? "border-white/15 text-white/80 hover:bg-white/10"
                : "border-black/15 text-black/60 hover:bg-black/[0.05]",
            ].join(" ")}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {errorMessage && (
            <p
              role="alert"
              className={[
                "mx-auto mb-5 max-w-[600px] rounded-lg border px-3 py-2 text-[13px]",
                isDark
                  ? "border-red-400/30 bg-red-500/10 text-red-300"
                  : "border-red-300 bg-red-50 text-red-700",
              ].join(" ")}
            >
              {errorMessage}
            </p>
          )}

          {limitReached && (
            <p
              className={[
                "mx-auto mb-5 max-w-[600px] text-center text-[13px]",
                subtitleColor,
              ].join(" ")}
            >
              You've reached the channel limit of your {PLAN.name} plan.
              Upgrade to connect more.
            </p>
          )}

          <div className="mx-auto grid max-w-[600px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => {
              const connected = connections[channel.key].connected;
              const isPending = pendingKey === channel.key;
              const blocked = limitReached && !connected;
              const Icon = channel.icon;

              return (
                <button
                  key={channel.key}
                  type="button"
                  disabled={isPending || connected || blocked}
                  onClick={() => onToggle(channel.key)}
                  className={[
                    cardBase,
                    connected || blocked ? "" : cardHover,
                    "disabled:cursor-default",
                    isPending || blocked ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <span className="mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-white">
                    <Icon className="h-7 w-7" size={28} />
                  </span>

                  <span className="text-[16px] font-semibold leading-tight">
                    {channel.name}
                  </span>

                  <span className={["text-[13px] leading-snug", subtitleColor].join(" ")}>
                    {isPending ? (
                      REAL_OAUTH.includes(channel.key) ? "Redirecting..." : "Connecting..."
                    ) : connected ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CheckIcon className="h-4 w-4" />
                        Connected
                      </span>
                    ) : (
                      channel.subtitle
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
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

          setConnections((current) => ({ ...current, [provider]: connection }));
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

  /* ── Thème : mêmes couleurs que ta version précédente ── */

  const t = useMemo<ThemeTokens>(
    () =>
      isDark
        ? {
            page: "bg-[#050506] text-[#f3f3ef]",
            title: "text-[#f3f3ef]",
            muted: "text-[#99a2a2]",
            card: "border-white/20 bg-[#131316]",
            divider: "bg-white/10",
            connectBtn: "bg-white text-[#111111] hover:bg-[#e9e9e6]",
            secondaryBtn:
              "border border-white/15 bg-white/[0.04] text-[#f3f3ef] hover:bg-white/[0.08]",
            planCard: "border-white/10 bg-white/[0.04]",
            progressOn: "bg-[#f3f3ef]",
            progressOff: "bg-white/10",
            iconBtn: "text-[#99a2a2] hover:bg-white/[0.07] hover:text-[#f3f3ef]",
            menu: "border-white/10 bg-[#1f2020] text-[#f3f3ef]",
            menuItem: "hover:bg-white/[0.07]",
          }
        : {
            page: "bg-[#faf9f7] text-[#151515]",
            title: "text-[#151515]",
            muted: "text-[#71706d]",
            card: "border-black/[0.12] bg-white",
            divider: "bg-black/[0.07]",
            connectBtn: "bg-[#151515] text-white hover:bg-[#2a2a2a]",
            secondaryBtn:
              "border border-black/10 bg-white text-[#151515] hover:bg-black/[0.04]",
            planCard: "border-black/[0.08] bg-black/[0.03]",
            progressOn: "bg-[#151515]",
            progressOff: "bg-black/10",
            iconBtn: "text-[#71706d] hover:bg-black/[0.06] hover:text-[#151515]",
            menu: "border-black/10 bg-white text-[#151515]",
            menuItem: "hover:bg-black/[0.05]",
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

  const closeModal = () => setShowConnectModal(false);

  return (
    <div className={["relative h-full w-full overflow-hidden", t.page].join(" ")}>
      <DashboardSidebar theme={theme} onToggleTheme={onToggleTheme} />

      <main className="h-full overflow-y-auto py-12 pl-[104px] pr-6 sm:pr-10">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <h1
              className={[
                "text-[28px] font-semibold tracking-tight",
                t.title,
              ].join(" ")}
            >
              Channels
            </h1>
          </div>

          {/* Carte du plan */}
          <section
            className={[
              "mt-10 flex items-start gap-3 rounded-2xl border px-6 py-5",
              t.planCard,
            ].join(" ")}
          >
            <LayersIcon className={["mt-0.5 h-5 w-5 shrink-0", t.title].join(" ")} />

            <div className="flex min-w-0 flex-col items-start gap-1">
              <h2 className={["text-[16px] font-semibold", t.title].join(" ")}>
                Get to know your plan
              </h2>
              <p className={["text-[14.5px]", t.title].join(" ")}>
                You are on the {PLAN.name} plan and can connect up to{" "}
                {PLAN.maxChannels} channels.
              </p>

              <button
                type="button"
                onClick={handleUpgrade}
                className={[
                  "mt-2 rounded-lg px-4 py-2 text-[13.5px] font-medium",
                  "transition-colors duration-150",
                  t.secondaryBtn,
                ].join(" ")}
              >
                Upgrade Plan
              </button>
            </div>
          </section>

          {/* Compteur + segments de progression */}
          <div className="mt-10 flex items-center justify-between gap-4">
            <h2 className={["text-[18px] font-semibold", t.title].join(" ")}>
              {connectedCount}/{PLAN.maxChannels} Channels connected
            </h2>

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setShowConnectModal(true);
              }}
              className={[
                "shrink-0 rounded-xl px-5 py-2.5 text-[14px] font-semibold",
                "transition-[background-color,transform] duration-150",
                "active:scale-[0.98]",
                t.connectBtn,
              ].join(" ")}
            >
              Connect Channel
            </button>
          </div>

          {/* Erreur (page) — masquée si le modal est ouvert, il l'affiche lui-même */}
          {errorMessage && !showConnectModal && (
            <div
              role="alert"
              className={[
                "mt-4 flex items-start justify-between gap-3",
                "rounded-xl border px-4 py-3 text-[13px]",
                isDark
                  ? "border-red-400/30 bg-red-500/10 text-red-300"
                  : "border-red-300 bg-red-50 text-red-700",
              ].join(" ")}
            >
              <span>{errorMessage}</span>

              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setErrorMessage(null)}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Contenu */}
          {connectedCount === 0 ? (
            <EmptyState
              t={t}
              isDark={isDark}
              onConnect={() => setShowConnectModal(true)}
            />
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {connectedChannels.map((channel) => {
                const connection = connections[channel.key];
                const isPending = pendingKey === channel.key;

                return (
                  <div
                    key={channel.key}
                    className={[
                      "flex items-center gap-3",
                      "rounded-xl border px-4 py-2.5",
                      "transition-colors duration-150",
                      t.card,
                    ].join(" ")}
                  >
                    <Avatar
                      channel={channel}
                      connection={connection}
                      isDark={isDark}
                    />

                    <div className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={[
                          "truncate text-[14.5px] font-semibold leading-tight",
                          t.title,
                        ].join(" ")}
                        title={connection.handle || channel.name}
                      >
                        {connection.handle || channel.name}
                      </span>
                      <span className={["truncate text-[13px]", t.muted].join(" ")}>
                        {isPending ? "Updating..." : channel.accountLabel}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
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
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showConnectModal && (
        <ConnectModal
          channels={CHANNELS}
          connections={connections}
          pendingKey={pendingKey}
          limitReached={limitReached}
          onToggle={handleToggle}
          onClose={closeModal}
          errorMessage={errorMessage}
          isDark={isDark}
        />
      )}
    </div>
  );
}