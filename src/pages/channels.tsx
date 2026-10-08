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

type ThemeTokens = {
  page: string;
  text: string;
  muted: string;
  card: string;
  border: string;
  surface: string;
  solidButton: string;
  softButton: string;
  ring: string;
};

type ToastState = {
  id: number;
  message: string;
  type: "success" | "error";
};

/* ============================================================================
   CONFIG
============================================================================ */

export const PLAN = {
  name: "Free",
  maxChannels: 3,
};

/** Route où s'affiche la 2e popup (fréquence de publication). */
export const INSIGHT_ROUTE = "/insights";

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

function CheckCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12.5 3 3 5-6" />
    </Svg>
  );
}

function AlertCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
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

const RETURN_KEY = "stone:oauth-returned";

function readReturned(): CacheProvider[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as CacheProvider[]) : [];
  } catch {
    return [];
  }
}

function writeReturned(list: CacheProvider[]) {
  try {
    if (list.length === 0) sessionStorage.removeItem(RETURN_KEY);
    else sessionStorage.setItem(RETURN_KEY, JSON.stringify(list));
  } catch {
    /* storage indisponible */
  }
}

/** À appeler juste avant la redirection OAuth : au retour on saura qu'il faut ouvrir l'onboarding. */
function markReturning(provider: CacheProvider) {
  writeReturned(Array.from(new Set([...readReturned(), provider])));
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
   TOAST (minimal)
============================================================================ */

function Toast({
  toast,
  isDark,
  onClose,
}: {
  toast: ToastState;
  isDark: boolean;
  onClose: () => void;
}) {
  const Icon = toast.type === "success" ? CheckCircleIcon : AlertCircleIcon;

  return (
    <>
      <style>{`
        @keyframes stone-toast-in {
          from { opacity: 0; transform: translate(-50%, 12px) scale(0.98); }
          to   { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .stone-toast { animation-duration: 0.01ms !important; }
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        className={[
          "stone-toast fixed bottom-6 left-1/2 z-[110] flex max-w-[calc(100vw-32px)] items-center gap-3.5 rounded-2xl border py-3.5 pl-4 pr-3 shadow-2xl",
          isDark
            ? "border-[#2a2a2a] bg-[#161616] text-white"
            : "border-zinc-200 bg-white text-zinc-950",
        ].join(" ")}
        style={{ animation: "stone-toast-in 0.28s cubic-bezier(.2,.9,.25,1) both" }}
      >
        <Icon
          className={[
            "h-[22px] w-[22px] shrink-0",
            toast.type === "error" ? "text-red-400" : isDark ? "text-white" : "text-zinc-950",
          ].join(" ")}
        />
        <span className="text-[14px] font-medium tracking-[-0.01em]">{toast.message}</span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          className={[
            "ml-1 flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
            isDark ? "text-zinc-500 hover:bg-white/[0.07] hover:text-white" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950",
          ].join(" ")}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

/* ============================================================================
   CHANNEL ICON
============================================================================ */

function ChannelIcon({
  channel,
  connection,
  isDark,
}: {
  channel: Channel;
  connection: Connection;
  isDark: boolean;
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
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
        isDark ? "border-[#2a2a2a] bg-[#1a1a1a] text-white" : "border-zinc-200 bg-zinc-50 text-zinc-900",
      ].join(" ")}
    >
      <Icon className="h-[18px] w-[18px]" size={18} />
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
  isDark: boolean;
  t: ThemeTokens;
  onToggle: () => void;
};

function ChannelCard({
  channel,
  connection,
  pending,
  isDark,
  t,
  onToggle,
}: ChannelCardProps) {
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
        "relative rounded-2xl border p-4 transition-colors duration-150",
        t.card,
        t.border,
        isDark ? "hover:border-[#333]" : "hover:border-zinc-300",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <ChannelIcon channel={channel} connection={connection} isDark={isDark} />

        <div className="min-w-0 flex-1">
          <p className={["truncate text-[13px] font-medium", t.text].join(" ")}>
            {connection.handle || channel.name}
          </p>
          <p className={["mt-0.5 truncate text-[11px]", t.muted].join(" ")}>
            {channel.accountLabel}
          </p>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label={`Options for ${channel.name}`}
            onClick={() => setMenuOpen((value) => !value)}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              t.muted,
              isDark ? "hover:bg-white/[0.06] hover:text-white" : "hover:bg-zinc-100 hover:text-zinc-950",
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
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-medium text-red-500 transition-colors hover:bg-red-500/[0.08] disabled:opacity-40"
              >
                <DisconnectIcon className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </div>
          )}
        </div>
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
  const [toast, setToast] = useState<ToastState | null>(null);

  // Onboarding : étape 1 (confirmation) ici, étape 2 (fréquence) sur /insights
  const [onboardingAccount, setOnboardingAccount] = useState<OnboardingAccount | null>(null);
  const [confirming, setConfirming] = useState(false);

  const tiktokBusy = useRef(false);
  const pinterestBusy = useRef(false);
  const youtubeBusy = useRef(false);
  const toastTimer = useRef<number | null>(null);

  /* --------------------------------------------------------------------------
     TOAST
  -------------------------------------------------------------------------- */

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, type });
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  };

  const dismissToast = () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(null);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
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
    showNotification(`${channel.name} connected successfully!`);
  };

  const handleConfirmAccount = () => {
    if (!onboardingAccount || confirming) return;
    setConfirming(true);
    queueFrequencyOnboarding(onboardingAccount);
    window.setTimeout(() => {
      setOnboardingAccount(null);
      setConfirming(false);
      window.location.hash = `#${INSIGHT_ROUTE}`;
    }, 300);
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

    const fromUrl: Record<CacheProvider, boolean> = {
      tiktok: params.has("tiktok") || Boolean(tiktokError),
      pinterest: params.has("pinterest") || Boolean(pinterestError),
      youtube: params.has("youtube") || Boolean(youtubeError),
    };
    const oauthErrors: Record<CacheProvider, string | null> = {
      tiktok: tiktokError,
      pinterest: pinterestError,
      youtube: youtubeError,
    };

    // StrictMode relance l'effet après le nettoyage de l'URL : on garde donc
    // le "je reviens d'OAuth" en sessionStorage jusqu'à ce que le statut soit lu.
    const providers: CacheProvider[] = ["tiktok", "pinterest", "youtube"];
    const pendingReturn = new Set<CacheProvider>(readReturned());
    providers.forEach((p) => {
      if (fromUrl[p]) pendingReturn.add(p);
      if (oauthErrors[p]) pendingReturn.delete(p);
    });
    writeReturned([...pendingReturn]);

    const returned: Record<CacheProvider, boolean> = {
      tiktok: pendingReturn.has("tiktok"),
      pinterest: pendingReturn.has("pinterest"),
      youtube: pendingReturn.has("youtube"),
    };

    if (tiktokError) setErrorMessage(`Unable to connect to TikTok. ${tiktokError}`);
    if (pinterestError) setErrorMessage(`Unable to connect to Pinterest. ${pinterestError}`);
    if (youtubeError) setErrorMessage(`Unable to connect to YouTube. ${youtubeError}`);

    if (returned.tiktok) clearCache(userId, "tiktok");
    if (returned.pinterest) clearCache(userId, "pinterest");
    if (returned.youtube) clearCache(userId, "youtube");

    if (fromUrl.tiktok || fromUrl.pinterest || fromUrl.youtube) {
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
          if (justReturned) {
            writeReturned(readReturned().filter((p) => p !== provider));
          }
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
            card: "bg-[#111111]",
            border: "border-[#222222]",
            surface: "bg-[#161616]",
            solidButton: "bg-white text-black hover:bg-zinc-200",
            softButton: "bg-[#1a1a1a] text-white hover:bg-[#242424]",
            ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
          }
        : {
            page: "bg-[#fafafa] text-black",
            text: "text-black",
            muted: "text-zinc-500",
            card: "bg-white",
            border: "border-zinc-200",
            surface: "bg-zinc-50",
            solidButton: "bg-zinc-950 text-white hover:bg-zinc-800",
            softButton: "bg-zinc-100 text-zinc-950 hover:bg-zinc-200",
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
        showNotification("TikTok disconnected successfully!");
      } else {
        markReturning("tiktok");
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
        showNotification("Pinterest disconnected successfully!");
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
        markReturning("pinterest");
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
        showNotification("YouTube disconnected successfully!");
      } else {
        markReturning("youtube");
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
        showNotification(`${name} disconnected successfully!`);
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
        className="h-full overflow-y-auto transition-[padding-left] duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ paddingLeft: sidebarOffset }}
      >
        <div className="mx-auto flex min-h-full w-full max-w-[920px] flex-col px-[clamp(18px,4vw,44px)] py-[clamp(24px,5vh,48px)]">
          {/* HEADER */}
          <header className="flex shrink-0 items-center justify-between gap-4">
            <div>
              <h1 className={["text-[24px] font-semibold tracking-[-0.03em]", t.text].join(" ")}>
                Channels
              </h1>
              <p className={["mt-1 text-[13px]", t.muted].join(" ")}>
                {connectedCount} of {PLAN.maxChannels} connected · {PLAN.name} plan
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUpgrade}
                className={[
                  "hidden h-9 items-center rounded-lg px-3.5 text-[12.5px] font-medium transition-colors sm:inline-flex",
                  t.softButton,
                  t.ring,
                ].join(" ")}
              >
                Upgrade
              </button>
              <button
                type="button"
                onClick={openModal}
                className={[
                  "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[12.5px] font-medium transition-all active:scale-[0.98]",
                  t.solidButton,
                  t.ring,
                ].join(" ")}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Connect
              </button>
            </div>
          </header>

          {/* ERROR MESSAGE */}
          {errorMessage && (
            <div
              role="alert"
              className="mt-6 flex shrink-0 items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12.5px] text-red-500"
            >
              <span className="flex-1">{errorMessage}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setErrorMessage(null)}
                className="rounded-md p-1 hover:bg-red-500/10"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* CONTENT */}
          {connectedChannels.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center pb-24 pt-16 text-center">
              <button
                type="button"
                onClick={openModal}
                aria-label="Connect a channel"
                className={[
                  "group flex h-14 w-14 items-center justify-center rounded-full border transition-colors",
                  t.border,
                  t.surface,
                  isDark ? "hover:bg-[#1e1e1e]" : "hover:bg-zinc-100",
                  t.ring,
                ].join(" ")}
              >
                <PlusIcon className={["h-6 w-6 transition-colors", t.muted, isDark ? "group-hover:text-white" : "group-hover:text-black"].join(" ")} />
              </button>
              <h2 className={["mt-5 text-[16px] font-semibold tracking-[-0.01em]", t.text].join(" ")}>
                Connect a channel to get started
              </h2>
              <p className={["mt-1.5 max-w-xs text-[13px]", t.muted].join(" ")}>
                Once connected, your channels will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 content-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {connectedChannels.map((channel) => (
                <ChannelCard
                  key={channel.key}
                  channel={channel}
                  connection={connections[channel.key]}
                  pending={pendingKey === channel.key}
                  isDark={isDark}
                  t={t}
                  onToggle={() => handleToggle(channel.key)}
                />
              ))}
            </div>
          )}
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

      {/* ONBOARDING ÉTAPE 1 : EST-CE LE BON COMPTE ? (étape 2 -> /insights) */}
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

      {/* TOAST */}
      {toast && <Toast key={toast.id} toast={toast} isDark={isDark} onClose={dismissToast} />}
    </div>
  );
}