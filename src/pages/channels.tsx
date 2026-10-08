// src/pages/Channels.tsx

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ComponentType,
  ReactNode,
} from "react";

import DashboardSidebar, {
  useSidebarOffset,
} from "../components/DashboardSidebar";

import ConnectChannelModal from "../components/ConnectChannelModal";

import {
  ConfirmAccountModal,
  queueFrequencyOnboarding,
  type OnboardingAccount,
} from "../components/OnboardingModals";

import {
  useTheme,
  type Theme,
} from "../hooks/useTheme";

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
   TYPES
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

export type ConnectionState = Record<
  ChannelKey,
  Connection
>;

type ToggleOrigin = {
  x: number;
  y: number;
};

type ToggleThemeFn = (
  origin?: ToggleOrigin
) => void;

type ChannelsProps = {
  theme?: Theme;
  onToggleTheme?: ToggleThemeFn;
};

type IconProps = {
  className?: string;
};

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
   THEME TOKENS (Black & White)
============================================================================ */

type ThemeTokens = {
  page: string;
  text: string;
  muted: string;
  card: string;
  cardHover: string;
  border: string;
  borderHover: string;
  icon: string;
  iconConnected: string;
  button: string;
  buttonHover: string;
  danger: string;
  success: string;
  ring: string;
};

/* ============================================================================
   CONFIG
============================================================================ */

export const PLAN = {
  name: "Free",
  maxChannels: 3,
};

/** Route où s'affiche la 2e popup (fréquence de publication). */
export const INSIGHT_ROUTE = "/insight";

export const REAL_OAUTH: ChannelKey[] = [
  "tiktok",
  "pinterest",
  "youtube",
];

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
  facebook: { connected: false },
  tiktok: { connected: false },
  youtube: { connected: false },
  pinterest: { connected: false },
  threads: { connected: false },
};

/* ============================================================================
   ICONS
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

function MoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

function DisconnectIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h11" />
      <path d="M15 7h3v10h-3" />
    </Svg>
  );
}

function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </Svg>
  );
}

function LayersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </Svg>
  );
}

/* ============================================================================
   HELPERS
============================================================================ */

function formatOAuthError(
  provider: string,
  error: unknown
): string {
  const raw = error instanceof Error ? error.message : "";
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "Unable to reach the server. Check that the backend is running and VITE_API_URL is correct.";
  }
  return raw
    ? `Unable to connect to ${provider}. ${raw}`
    : `Unable to connect to ${provider}.`;
}

function mockHandleFor(key: ChannelKey): string {
  const handles: Record<ChannelKey, string> = {
    instagram: "@ronan.studio",
    facebook: "Ronan Studio",
    threads: "@ronan.studio",
    tiktok: "",
    youtube: "",
    pinterest: "",
  };
  return handles[key];
}

function toConnection(status: StatusResponse): Connection {
  if (!status.connected) {
    return { connected: false };
  }
  const account = status.account;
  return {
    connected: true,
    handle: account?.display_name ?? undefined,
    avatarUrl: account?.avatar_url ?? account?.avatarUrl ?? undefined,
  };
}

function buildAccount(
  channel: Channel,
  connection: Connection
): OnboardingAccount {
  return {
    key: channel.key,
    name: channel.name,
    accountLabel: channel.accountLabel,
    handle: connection.handle,
    avatarUrl: connection.avatarUrl,
  };
}

/* ============================================================================
   CHANNEL ICON
============================================================================ */

function ChannelIcon({
  channel,
  connection,
}: {
  channel: Channel;
  connection: Connection;
}) {
  const Icon = channel.icon;
  const [imageFailed, setImageFailed] = useState(false);
  const hasAvatar = Boolean(connection.avatarUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [connection.avatarUrl]);

  if (connection.connected && hasAvatar) {
    return (
      <img
        src={connection.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className="h-11 w-11 rounded-[14px] object-cover"
      />
    );
  }

  return (
    <div
      className={[
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border",
        connection.connected
          ? "border-white/20 bg-white/10 text-white"
          : "border-white/[0.08] bg-white/[0.045] text-zinc-300",
      ].join(" ")}
    >
      <Icon className="h-[21px] w-[21px]" size={21} />
    </div>
  );
}

/* ============================================================================
   CHANNEL CARD
============================================================================ */

type ChannelCardProps = {
  channel: Channel;
  connection: Connection;
  pending: boolean;
  disabled: boolean;
  t: ThemeTokens;
  onToggle: () => void;
};

function ChannelCard({
  channel,
  connection,
  pending,
  disabled,
  t,
  onToggle,
}: ChannelCardProps) {
  const isConnected = connection.connected;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <article
      className={[
        "group relative rounded-[20px] border px-4 py-4 transition-all duration-200",
        t.card,
        t.border,
        !disabled && "hover:-translate-y-[1px]",
        !disabled && "hover:shadow-[0_12px_35px_rgba(0,0,0,0.2)]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3.5">
        <ChannelIcon channel={channel} connection={connection} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={["truncate text-[13px] font-semibold tracking-[-0.01em]", t.text].join(" ")}>
              {isConnected ? connection.handle || channel.name : channel.name}
            </p>
            {isConnected && (
              <span className={["h-1.5 w-1.5 shrink-0 rounded-full bg-current", t.text].join(" ")} />
            )}
          </div>
          <p className={["mt-0.5 truncate text-[10px]", t.muted].join(" ")}>
            {isConnected ? channel.accountLabel : channel.subtitle}
          </p>
        </div>

        {isConnected && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              aria-label={`Options for ${channel.name}`}
              onClick={() => setMenuOpen((value) => !value)}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                t.muted,
                "hover:bg-white/[0.06]",
                t.ring,
              ].join(" ")}
            >
              <MoreIcon className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div
                className={[
                  "absolute right-0 top-10 z-50 w-40 rounded-xl border p-1 shadow-xl",
                  t.card,
                  t.border,
                ].join(" ")}
              >
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setMenuOpen(false);
                    onToggle();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-red-400 hover:bg-red-500/[0.07] disabled:opacity-40"
                >
                  <DisconnectIcon className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/* ============================================================================
   PAGE
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

  /* --------------------------------------------------------------------------
     STATE
  -------------------------------------------------------------------------- */

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
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Onboarding : étape 1 (confirmation) ici, étape 2 (fréquence) sur /insight
  const [onboardingAccount, setOnboardingAccount] = useState<OnboardingAccount | null>(null);
  const [confirming, setConfirming] = useState(false);

  const tiktokBusy = useRef(false);
  const pinterestBusy = useRef(false);
  const youtubeBusy = useRef(false);
  const notificationTimer = useRef<number | null>(null);

  /* --------------------------------------------------------------------------
     NOTIFICATIONS
  -------------------------------------------------------------------------- */

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    if (notificationTimer.current) window.clearTimeout(notificationTimer.current);
    setNotification({ message, type });
    notificationTimer.current = window.setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (notificationTimer.current) window.clearTimeout(notificationTimer.current);
    };
  }, []);

  /* --------------------------------------------------------------------------
     ONBOARDING
  -------------------------------------------------------------------------- */

  /** Ouvre "Est-ce le bon compte ?" juste après une VRAIE connexion. */
  const startOnboarding = (key: ChannelKey, connection: Connection) => {
    const channel = CHANNELS.find((c) => c.key === key);
    if (!channel) return;
    setShowConnectModal(false);
    setConfirming(false);
    setOnboardingAccount(buildAccount(channel, connection));
    showNotification(`${channel.name} connected successfully`);
  };

  const handleConfirmAccount = () => {
    if (!onboardingAccount || confirming) return;
    setConfirming(true);
    queueFrequencyOnboarding(onboardingAccount);
    window.setTimeout(() => {
      setOnboardingAccount(null);
      setConfirming(false);
      window.location.hash = `#${INSIGHT_ROUTE}`;
    }, 350);
  };

  const handleRejectAccount = () => {
    if (!onboardingAccount) return;
    const key = onboardingAccount.key;
    setOnboardingAccount(null);
    handleToggle(key); // le canal est connecté -> ça le déconnecte
  };

  const handleCloseOnboarding = () => {
    setOnboardingAccount(null);
    setConfirming(false);
  };

  /* --------------------------------------------------------------------------
     DERIVED
  -------------------------------------------------------------------------- */

  const connectedChannels = useMemo(() => {
    return CHANNELS.filter((channel) => connections[channel.key].connected);
  }, [connections]);

  const connectedCount = connectedChannels.length;
  const limitReached = connectedCount >= PLAN.maxChannels;
  const slotsLeft = Math.max(0, PLAN.maxChannels - connectedCount);

  /* --------------------------------------------------------------------------
     SYNC OAUTH
  -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!userId) return;
    const hash = window.location.hash;
    const queryIndex = hash.indexOf("?");
    const basePath = queryIndex === -1 ? hash : hash.slice(0, queryIndex);
    const params = new URLSearchParams(queryIndex === -1 ? "" : hash.slice(queryIndex + 1));

    const tiktokError = params.get("tiktok_error");
    const pinterestError = params.get("pinterest_error");
    const youtubeError = params.get("youtube_error");

    const returned: Record<CacheProvider, boolean> = {
      tiktok: params.has("tiktok") || Boolean(tiktokError),
      pinterest: params.has("pinterest") || Boolean(pinterestError),
      youtube: params.has("youtube") || Boolean(youtubeError),
    };

    if (tiktokError) setErrorMessage(`Unable to connect to TikTok. ${tiktokError}`);
    if (pinterestError) setErrorMessage(`Unable to connect to Pinterest. ${pinterestError}`);
    if (youtubeError) setErrorMessage(`Unable to connect to YouTube. ${youtubeError}`);

    if (returned.tiktok) clearCache(userId, "tiktok");
    if (returned.pinterest) clearCache(userId, "pinterest");
    if (returned.youtube) clearCache(userId, "youtube");

    if (returned.tiktok || returned.pinterest || returned.youtube) {
      ["tiktok", "tiktok_error", "pinterest", "pinterest_error", "youtube", "youtube_error"].forEach((key) => params.delete(key));
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${basePath}${query ? `?${query}` : ""}`);
    }

    let cancelled = false;

    const sync = (provider: CacheProvider, justReturned: boolean, fetchStatus: () => Promise<StatusResponse>) => {
      const cached = justReturned ? null : readCache(userId, provider);
      if (cached) {
        setConnections((current) => ({ ...current, [provider]: cached.connection }));
        if (Date.now() - cached.savedAt < CACHE_MAX_AGE_MS) return;
      }

      void (async () => {
        try {
          const status = await fetchStatus();
          if (cancelled) return;
          const connection = toConnection(status);
          if (connection.connected) writeCache(userId, connection, provider);
          else clearCache(userId, provider);
          setConnections((current) => ({ ...current, [provider]: connection }));

          // Retour d'OAuth réussi -> "Est-ce le bon compte ?"
          if (justReturned && connection.connected) {
            startOnboarding(provider, connection);
          }
        } catch (error) {
          console.warn(`[Stone] Could not load ${provider} status:`, error);
        }
      })();
    };

    sync("tiktok", returned.tiktok, getTikTokStatus);
    sync("pinterest", returned.pinterest, getPinterestStatus);
    sync("youtube", returned.youtube, getYouTubeStatus);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* --------------------------------------------------------------------------
     THEME TOKENS (Black & White)
  -------------------------------------------------------------------------- */

  const t = useMemo<ThemeTokens>(
    () =>
      isDark
        ? {
            page: "bg-[#0a0a0a] text-white",
            text: "text-white",
            muted: "text-zinc-500",
            card: "bg-[#141414]",
            cardHover: "hover:bg-[#1a1a1a]",
            border: "border-[#262626]",
            borderHover: "hover:border-[#333333]",
            icon: "border-[#262626] bg-[#1a1a1a] text-zinc-400",
            iconConnected: "border-[#333333] bg-[#262626] text-white",
            button: "bg-[#1a1a1a] hover:bg-[#262626]",
            buttonHover: "hover:bg-[#262626]",
            danger: "text-red-400",
            success: "text-white",
            ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          }
        : {
            page: "bg-[#f7f7f5] text-black",
            text: "text-black",
            muted: "text-zinc-500",
            card: "bg-white",
            cardHover: "hover:bg-zinc-50",
            border: "border-zinc-200",
            borderHover: "hover:border-zinc-300",
            icon: "border-zinc-200 bg-zinc-50 text-zinc-600",
            iconConnected: "border-zinc-300 bg-zinc-100 text-black",
            button: "bg-zinc-100 hover:bg-zinc-200",
            buttonHover: "hover:bg-zinc-200",
            danger: "text-red-600",
            success: "text-black",
            ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
          },
    [isDark]
  );

  /* --------------------------------------------------------------------------
     OAUTH
  -------------------------------------------------------------------------- */

  const handleTikTokToggle = async () => {
    if (tiktokBusy.current) return;
    tiktokBusy.current = true;
    setPendingKey("tiktok");
    let redirecting = false;
    try {
      if (connections.tiktok.connected) {
        await disconnectTikTok();
        if (userId) clearCache(userId, "tiktok");
        setConnections((current) => ({ ...current, tiktok: { connected: false } }));
        showNotification("TikTok disconnected");
      } else {
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

  const handlePinterestToggle = async () => {
    if (pinterestBusy.current) return;
    pinterestBusy.current = true;
    setPendingKey("pinterest");
    let redirecting = false;
    try {
      if (connections.pinterest.connected) {
        await disconnectPinterest();
        if (userId) clearCache(userId, "pinterest");
        setConnections((current) => ({ ...current, pinterest: { connected: false } }));
        showNotification("Pinterest disconnected");
      } else if (import.meta.env.VITE_PINTEREST_MANUAL_TOKEN === "true") {
        const token = window.prompt("Pinterest access token:");
        if (!token?.trim()) {
          setPendingKey(null);
          return;
        }
        const account = await connectPinterestWithToken(token.trim());
        const connection: Connection = {
          connected: true,
          handle: account?.display_name ?? undefined,
          avatarUrl: account?.avatar_url ?? undefined,
        };
        if (userId) writeCache(userId, connection, "pinterest");
        setConnections((current) => ({ ...current, pinterest: connection }));
        startOnboarding("pinterest", connection);
      } else {
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

  const handleYouTubeToggle = async () => {
    if (youtubeBusy.current) return;
    youtubeBusy.current = true;
    setPendingKey("youtube");
    let redirecting = false;
    try {
      if (connections.youtube.connected) {
        await disconnectYouTube();
        if (userId) clearCache(userId, "youtube");
        setConnections((current) => ({ ...current, youtube: { connected: false } }));
        showNotification("YouTube disconnected");
      } else {
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

  const handlePlaceholderToggle = (key: ChannelKey) => {
    const wasConnected = connections[key].connected;
    const name = CHANNELS.find((c) => c.key === key)?.name ?? key;
    setPendingKey(key);
    window.setTimeout(() => {
      if (wasConnected) {
        setConnections((current) => ({ ...current, [key]: { connected: false } }));
        showNotification(`${name} disconnected`);
      } else {
        const connection: Connection = { connected: true, handle: mockHandleFor(key) };
        setConnections((current) => ({ ...current, [key]: connection }));
        startOnboarding(key, connection);
      }
      setPendingKey(null);
    }, 450);
  };

  function handleToggle(key: ChannelKey) {
    setErrorMessage(null);
    if (!connections[key].connected && limitReached) {
      setErrorMessage(`Your ${PLAN.name} plan allows up to ${PLAN.maxChannels} channels. Upgrade to connect more.`);
      return;
    }
    if (key === "tiktok") return void handleTikTokToggle();
    if (key === "pinterest") return void handlePinterestToggle();
    if (key === "youtube") return void handleYouTubeToggle();
    handlePlaceholderToggle(key);
  }

  const handleUpgrade = () => console.log("[Stone] Upgrade clicked");
  const openModal = () => { setErrorMessage(null); setShowConnectModal(true); };
  const closeModal = () => setShowConnectModal(false);

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className={["relative h-full w-full overflow-hidden", t.page, "transition-colors duration-300"].join(" ")}>
      <DashboardSidebar theme={theme} onToggleTheme={onToggleTheme} />

      <main
        className="h-full overflow-hidden transition-[padding-left] duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ paddingLeft: sidebarOffset }}
      >
        <div className="mx-auto flex h-full w-full max-w-[980px] flex-col px-[clamp(18px,4vw,44px)] py-[clamp(22px,4vh,38px)]">
          {/* HEADER */}
          <header className="flex shrink-0 items-center justify-between gap-4">
            <h1 className={["text-[28px] font-semibold tracking-[-0.03em]", t.text].join(" ")}>
              Channels
            </h1>
            <button
              type="button"
              onClick={openModal}
              className={[
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium transition-all duration-150 hover:-translate-y-px active:scale-[0.98]",
                isDark ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-950 text-white hover:bg-zinc-800",
                t.ring,
              ].join(" ")}
            >
              Connect Channel
            </button>
          </header>

          {/* PLAN BANNER */}
          <div className={["mt-8 flex items-start gap-4 rounded-2xl border p-6", t.card, t.border].join(" ")}>
            <div className={["p-2 rounded-lg", isDark ? "bg-[#262626]" : "bg-zinc-100"].join(" ")}>
              <LayersIcon className={["w-5 h-5", t.muted].join(" ")} />
            </div>
            <div className="flex-1">
              <h3 className={["text-sm font-semibold", t.text].join(" ")}>Get to know your plan</h3>
              <p className={["mt-1 text-sm", t.muted].join(" ")}>
                You are on the {PLAN.name} plan and can connect up to {PLAN.maxChannels} channels.
              </p>
              <button
                type="button"
                onClick={handleUpgrade}
                className={[
                  "mt-4 px-4 py-2 text-xs font-medium rounded-lg transition-colors",
                  isDark ? "bg-[#262626] text-white hover:bg-[#333]" : "bg-zinc-100 text-black hover:bg-zinc-200",
                  t.ring,
                ].join(" ")}
              >
                Upgrade Plan
              </button>
            </div>
          </div>

          {/* ERROR MESSAGE */}
          {errorMessage && (
            <div role="alert" className="mt-4 flex shrink-0 items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-xs text-red-400">
              <span className="flex-1">{errorMessage}</span>
              <button type="button" aria-label="Dismiss" onClick={() => setErrorMessage(null)} className="rounded-md p-1 hover:bg-red-500/10">
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* CONTENT */}
          {connectedChannels.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center mt-12 pb-20">
              <button
                type="button"
                onClick={openModal}
                className={[
                  "w-16 h-16 rounded-full flex items-center justify-center transition-colors group",
                  isDark ? "bg-[#1a1a1a] border border-[#262626] hover:bg-[#262626]" : "bg-zinc-100 border border-zinc-200 hover:bg-zinc-200",
                  t.ring,
                ].join(" ")}
              >
                <PlusIcon className={["w-8 h-8 transition-colors", isDark ? "text-zinc-400 group-hover:text-white" : "text-zinc-500 group-hover:text-black"].join(" ")} />
              </button>
              <h2 className={["mt-6 text-lg font-semibold", t.text].join(" ")}>Connect a channel to get started</h2>
              <p className={["mt-2 text-sm text-center max-w-sm", t.muted].join(" ")}>
                Once connected, you'll see your channels listed here.
              </p>
              <button
                type="button"
                onClick={openModal}
                className={[
                  "mt-8 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isDark ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-950 text-white hover:bg-zinc-800",
                  t.ring,
                ].join(" ")}
              >
                Connect Channel
              </button>
            </div>
          ) : (
            <div className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 content-start">
              {connectedChannels.map((channel) => (
                <ChannelCard
                  key={channel.key}
                  channel={channel}
                  connection={connections[channel.key]}
                  pending={pendingKey === channel.key}
                  disabled={false}
                  t={t}
                  onToggle={() => handleToggle(channel.key)}
                />
              ))}
            </div>
          )}

          {/* FOOTER */}
          <div className={["mt-4 flex shrink-0 items-center justify-between text-[10px]", t.muted].join(" ")}>
            <span>{slotsLeft > 0 ? `${slotsLeft} ${slotsLeft === 1 ? "slot" : "slots"} remaining` : "Plan limit reached"}</span>
            <span>Secure OAuth connections</span>
          </div>
        </div>
      </main>

      {/* MODAL: CONNECT CHANNEL */}
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

      {/* ONBOARDING ÉTAPE 1 : EST-CE LE BON COMPTE ? (étape 2 -> /insight) */}
      {onboardingAccount && (
        <ConfirmAccountModal
          account={onboardingAccount}
          isDark={isDark}
          loading={confirming}
          onConfirm={handleConfirmAccount}
          onReject={handleRejectAccount}
          onClose={handleCloseOnboarding}
        />
      )}

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div
          role="status"
          className={[
            "fixed bottom-6 right-6 z-[110] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in",
            isDark ? "border-[#333] bg-[#1a1a1a] text-white" : "border-zinc-200 bg-white text-black",
          ].join(" ")}
        >
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}
    </div>
  );
}