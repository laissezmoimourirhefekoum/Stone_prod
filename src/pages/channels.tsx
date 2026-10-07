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
   THEME
============================================================================ */

type ThemeTokens = {
  page: string;
  text: string;
  muted: string;

  surface: string;
  surfaceStrong: string;
  border: string;
  borderHover: string;

  card: string;
  cardHover: string;
  cardConnected: string;

  primary: string;
  primaryHover: string;

  icon: string;
  iconSoft: string;

  success: string;
  danger: string;

  input: string;
  ring: string;
};

/* ============================================================================
   CONFIG
============================================================================ */

export const PLAN = {
  name: "Free",
  maxChannels: 3,
};

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
  instagram: {
    connected: false,
  },

  facebook: {
    connected: false,
  },

  threads: {
    connected: false,
  },

  youtube: {
    connected: false,
  },

  tiktok: {
    connected: false,
  },

  pinterest: {
    connected: false,
  },
};

/* ============================================================================
   ICONS
============================================================================ */

function Svg({
  className = "h-4 w-4",
  children,
}: IconProps & {
  children: ReactNode;
}) {
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

function ArrowUpRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </Svg>
  );
}

function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12 4 4L19 6" />
    </Svg>
  );
}

function MoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle
        cx="5"
        cy="12"
        r="1"
        fill="currentColor"
        stroke="none"
      />
      <circle
        cx="12"
        cy="12"
        r="1"
        fill="currentColor"
        stroke="none"
      />
      <circle
        cx="19"
        cy="12"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  );
}

function DisconnectIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 12h8" />
      <path d="M10 7 5 12l5 5" />
      <path d="M14 7 19 12l-5 5" />
    </Svg>
  );
}

function SparkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
    </Svg>
  );
}

function WarningIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 21 19H3L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
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

/* ============================================================================
   HELPERS
============================================================================ */

function formatOAuthError(
  provider: string,
  error: unknown
): string {
  const raw =
    error instanceof Error
      ? error.message
      : "";

  if (
    /failed to fetch|networkerror|load failed/i.test(
      raw
    )
  ) {
    return "Unable to reach the server. Check your backend and VITE_API_URL.";
  }

  return raw
    ? `Unable to connect to ${provider}. ${raw}`
    : `Unable to connect to ${provider}.`;
}

function mockHandleFor(
  key: ChannelKey
): string {
  const handles: Record<
    ChannelKey,
    string
  > = {
    instagram: "@ronan.studio",
    tiktok: "",
    youtube: "",
    facebook: "Ronan Studio",
    pinterest: "",
    threads: "@ronan.studio",
  };

  return handles[key];
}

function toConnection(
  status: StatusResponse
): Connection {
  if (!status.connected) {
    return {
      connected: false,
    };
  }

  const account =
    status.account;

  return {
    connected: true,
    handle:
      account?.display_name ??
      undefined,
    avatarUrl:
      account?.avatar_url ??
      account?.avatarUrl ??
      undefined,
  };
}

/* ============================================================================
   CHANNEL ICON
============================================================================ */

function ChannelLogo({
  channel,
  connection,
  size = "normal",
}: {
  channel: Channel;
  connection: Connection;
  size?: "normal" | "large";
}) {
  const Icon = channel.icon;

  const [failed, setFailed] =
    useState(false);

  const showAvatar =
    Boolean(
      connection.connected &&
        connection.avatarUrl
    ) && !failed;

  const dimensions =
    size === "large"
      ? "h-14 w-14"
      : "h-11 w-11";

  return (
    <div
      className={[
        "relative shrink-0",
        dimensions,
      ].join(" ")}
    >
      {showAvatar ? (
        <img
          src={connection.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() =>
            setFailed(true)
          }
          className={[
            "h-full w-full rounded-[18px]",
            "object-cover",
          ].join(" ")}
        />
      ) : (
        <div
          className={[
            "flex h-full w-full items-center justify-center",
            "rounded-[18px]",
            "border",
            "transition-transform duration-300",
            "group-hover:scale-[1.04]",
          ].join(" ")}
        >
          <Icon
            className={
              size === "large"
                ? "h-7 w-7"
                : "h-5 w-5"
            }
            size={
              size === "large"
                ? 28
                : 20
            }
          />
        </div>
      )}

      {connection.connected &&
        showAvatar && (
          <span
            className={[
              "absolute -bottom-1 -right-1",
              "flex h-5 w-5 items-center justify-center",
              "rounded-full",
              "border-2",
              "border-white",
              "bg-emerald-500",
              "text-white",
              "shadow-sm",
            ].join(" ")}
          >
            <CheckIcon className="h-2.5 w-2.5" />
          </span>
        )}
    </div>
  );
}

/* ============================================================================
   CONNECTED CARD
============================================================================ */

type ConnectedCardProps = {
  channel: Channel;
  connection: Connection;
  pending: boolean;
  t: ThemeTokens;
  onDisconnect: () => void;
};

function ConnectedCard({
  channel,
  connection,
  pending,
  t,
  onDisconnect,
}: ConnectedCardProps) {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClick = (
      event: MouseEvent
    ) => {
      if (
        !menuRef.current?.contains(
          event.target as Node
        )
      ) {
        setMenuOpen(false);
      }
    };

    const handleKey = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClick
    );

    document.addEventListener(
      "keydown",
      handleKey
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClick
      );

      document.removeEventListener(
        "keydown",
        handleKey
      );
    };
  }, [menuOpen]);

  return (
    <article
      className={[
        "group relative overflow-visible",
        "rounded-[26px]",
        "border",
        "p-5",
        "transition-all duration-300",
        "hover:-translate-y-0.5",
        t.card,
        t.border,
        "hover:shadow-[0_18px_50px_rgba(0,0,0,0.08)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <ChannelLogo
          channel={channel}
          connection={connection}
          size="large"
        />

        <div
          ref={menuRef}
          className="relative"
        >
          <button
            type="button"
            aria-label={`More options for ${channel.name}`}
            onClick={() =>
              setMenuOpen(
                (value) => !value
              )
            }
            className={[
              "flex h-9 w-9 items-center justify-center",
              "rounded-xl",
              "transition-all duration-200",
              t.iconSoft,
              t.ring,
            ].join(" ")}
          >
            <MoreIcon className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              className={[
                "absolute right-0 top-11 z-30",
                "w-44 overflow-hidden",
                "rounded-2xl border",
                "p-1.5 shadow-2xl",
                t.surfaceStrong,
                t.border,
              ].join(" ")}
            >
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setMenuOpen(false);
                  onDisconnect();
                }}
                className={[
                  "flex w-full items-center gap-2.5",
                  "rounded-xl px-3 py-2.5",
                  "text-left text-xs font-medium",
                  "transition-colors",
                  "text-red-500",
                  "hover:bg-red-500/10",
                  "disabled:opacity-40",
                ].join(" ")}
              >
                <DisconnectIcon className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2">
          <h3
            className={[
              "truncate text-[15px] font-semibold",
              t.text,
            ].join(" ")}
          >
            {connection.handle ||
              channel.name}
          </h3>

          <span
            className={[
              "h-1.5 w-1.5 shrink-0 rounded-full",
              "bg-emerald-500",
            ].join(" ")}
          />
        </div>

        <p
          className={[
            "mt-1 text-xs",
            t.muted,
          ].join(" ")}
        >
          {channel.accountLabel}
        </p>
      </div>

      <div
        className={[
          "mt-5 flex items-center justify-between",
          "rounded-2xl border px-3.5 py-3",
          t.surface,
          t.border,
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <span
            className={[
              "flex h-6 w-6 items-center justify-center",
              "rounded-full",
              "bg-emerald-500/10",
              "text-emerald-500",
            ].join(" ")}
          >
            <CheckIcon className="h-3 w-3" />
          </span>

          <span
            className={[
              "text-[11px] font-medium",
              t.text,
            ].join(" ")}
          >
            {pending
              ? "Updating..."
              : "Connected"}
          </span>
        </div>

        <span
          className={[
            "text-[10px]",
            t.muted,
          ].join(" ")}
        >
          Active
        </span>
      </div>
    </article>
  );
}

/* ============================================================================
   AVAILABLE CARD
============================================================================ */

type AvailableCardProps = {
  channel: Channel;
  connection: Connection;
  pending: boolean;
  disabled: boolean;
  t: ThemeTokens;
  onConnect: () => void;
};

function AvailableCard({
  channel,
  connection,
  pending,
  disabled,
  t,
  onConnect,
}: AvailableCardProps) {
  return (
    <article
      className={[
        "group relative overflow-hidden",
        "rounded-[26px]",
        "border",
        "p-5",
        "transition-all duration-300",
        disabled
          ? "opacity-55"
          : "hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(0,0,0,0.07)]",
        t.card,
        t.border,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <ChannelLogo
          channel={channel}
          connection={connection}
          size="large"
        />

        <span
          className={[
            "rounded-full border px-2.5 py-1",
            "text-[9px] font-semibold uppercase tracking-[0.12em]",
            t.border,
            t.muted,
          ].join(" ")}
        >
          Available
        </span>
      </div>

      <div className="mt-5">
        <h3
          className={[
            "text-[15px] font-semibold",
            t.text,
          ].join(" ")}
        >
          {channel.name}
        </h3>

        <p
          className={[
            "mt-1 text-xs",
            t.muted,
          ].join(" ")}
        >
          {channel.subtitle}
        </p>
      </div>

      <button
        type="button"
        disabled={
          pending || disabled
        }
        onClick={onConnect}
        className={[
          "mt-5 flex w-full items-center justify-between",
          "rounded-2xl border px-4 py-3",
          "text-xs font-semibold",
          "transition-all duration-200",
          disabled
            ? "cursor-not-allowed"
            : "hover:-translate-y-px",
          t.surface,
          t.border,
          t.text,
          t.ring,
        ].join(" ")}
      >
        <span>
          {pending
            ? "Connecting..."
            : disabled
              ? "Upgrade to connect"
              : "Connect"}
        </span>

        {!disabled &&
          !pending && (
            <ArrowUpRightIcon className="h-4 w-4" />
          )}
      </button>
    </article>
  );
}

/* ============================================================================
   PAGE
============================================================================ */

export default function Channels({
  theme: themeProp,
  onToggleTheme:
    onToggleThemeProp,
}: ChannelsProps) {
  const themeContext =
    useTheme();

  const theme =
    themeProp ??
    themeContext.theme;

  const onToggleTheme =
    onToggleThemeProp ??
    themeContext.toggle;

  const isDark =
    theme === "dark";

  const sidebarOffset =
    useSidebarOffset();

  const { user } =
    useUser();

  const userId =
    user?.id ?? null;

  /* --------------------------------------------------------------------------
     CONNECTION STATE
  -------------------------------------------------------------------------- */

  const [
    connections,
    setConnections,
  ] =
    useState<ConnectionState>(
      () => {
        if (!userId) {
          return initialConnections;
        }

        const tiktok =
          readCache(
            userId,
            "tiktok"
          );

        const pinterest =
          readCache(
            userId,
            "pinterest"
          );

        const youtube =
          readCache(
            userId,
            "youtube"
          );

        return {
          ...initialConnections,

          ...(tiktok
            ? {
                tiktok:
                  tiktok.connection,
              }
            : {}),

          ...(pinterest
            ? {
                pinterest:
                  pinterest.connection,
              }
            : {}),

          ...(youtube
            ? {
                youtube:
                  youtube.connection,
              }
            : {}),
        };
      }
    );

  const [
    pendingKey,
    setPendingKey,
  ] =
    useState<ChannelKey | null>(
      null
    );

  const [
    showConnectModal,
    setShowConnectModal,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null
    );

  const tiktokBusy =
    useRef(false);

  const pinterestBusy =
    useRef(false);

  const youtubeBusy =
    useRef(false);

  /* --------------------------------------------------------------------------
     DERIVED DATA
  -------------------------------------------------------------------------- */

  const connectedChannels =
    useMemo(
      () =>
        CHANNELS.filter(
          (channel) =>
            connections[
              channel.key
            ].connected
        ),
      [connections]
    );

  const availableChannels =
    useMemo(
      () =>
        CHANNELS.filter(
          (channel) =>
            !connections[
              channel.key
            ].connected
        ),
      [connections]
    );

  const connectedCount =
    connectedChannels.length;

  const slotsLeft = Math.max(
    0,
    PLAN.maxChannels -
      connectedCount
  );

  const limitReached =
    connectedCount >=
    PLAN.maxChannels;

  const progress =
    Math.min(
      100,
      (connectedCount /
        PLAN.maxChannels) *
        100
    );

  /* --------------------------------------------------------------------------
     OAUTH RETURN + STATUS SYNC
  -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!userId) return;

    const hash =
      window.location.hash;

    const queryIndex =
      hash.indexOf("?");

    const basePath =
      queryIndex === -1
        ? hash
        : hash.slice(
            0,
            queryIndex
          );

    const params =
      new URLSearchParams(
        queryIndex === -1
          ? ""
          : hash.slice(
              queryIndex + 1
            )
      );

    const tiktokError =
      params.get(
        "tiktok_error"
      );

    const pinterestError =
      params.get(
        "pinterest_error"
      );

    const youtubeError =
      params.get(
        "youtube_error"
      );

    const returned: Record<
      CacheProvider,
      boolean
    > = {
      tiktok:
        params.has("tiktok") ||
        Boolean(tiktokError),

      pinterest:
        params.has(
          "pinterest"
        ) ||
        Boolean(pinterestError),

      youtube:
        params.has("youtube") ||
        Boolean(youtubeError),
    };

    if (tiktokError) {
      setErrorMessage(
        `Unable to connect to TikTok. ${tiktokError}`
      );
    }

    if (pinterestError) {
      setErrorMessage(
        `Unable to connect to Pinterest. ${pinterestError}`
      );
    }

    if (youtubeError) {
      setErrorMessage(
        `Unable to connect to YouTube. ${youtubeError}`
      );
    }

    if (returned.tiktok) {
      clearCache(
        userId,
        "tiktok"
      );
    }

    if (returned.pinterest) {
      clearCache(
        userId,
        "pinterest"
      );
    }

    if (returned.youtube) {
      clearCache(
        userId,
        "youtube"
      );
    }

    if (
      returned.tiktok ||
      returned.pinterest ||
      returned.youtube
    ) {
      [
        "tiktok",
        "tiktok_error",
        "pinterest",
        "pinterest_error",
        "youtube",
        "youtube_error",
      ].forEach((key) =>
        params.delete(key)
      );

      const query =
        params.toString();

      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}${basePath}${
          query
            ? `?${query}`
            : ""
        }`
      );
    }

    let cancelled =
      false;

    const sync = (
      provider: CacheProvider,
      justReturned: boolean,
      fetchStatus: () => Promise<StatusResponse>
    ) => {
      const cached =
        justReturned
          ? null
          : readCache(
              userId,
              provider
            );

      if (cached) {
        setConnections(
          (current) => ({
            ...current,
            [provider]:
              cached.connection,
          })
        );

        if (
          Date.now() -
            cached.savedAt <
          CACHE_MAX_AGE_MS
        ) {
          return;
        }
      }

      void (async () => {
        try {
          const status =
            await fetchStatus();

          if (cancelled) {
            return;
          }

          const connection =
            toConnection(
              status
            );

          if (
            connection.connected
          ) {
            writeCache(
              userId,
              connection,
              provider
            );
          } else {
            clearCache(
              userId,
              provider
            );
          }

          setConnections(
            (current) => ({
              ...current,
              [provider]:
                connection,
            })
          );
        } catch (error) {
          console.warn(
            `[Stone] Could not load ${provider} status:`,
            error
          );
        }
      })();
    };

    sync(
      "tiktok",
      returned.tiktok,
      getTikTokStatus
    );

    sync(
      "pinterest",
      returned.pinterest,
      getPinterestStatus
    );

    sync(
      "youtube",
      returned.youtube,
      getYouTubeStatus
    );

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* --------------------------------------------------------------------------
     THEME
  -------------------------------------------------------------------------- */

  const t =
    useMemo<ThemeTokens>(
      () =>
        isDark
          ? {
              page:
                "bg-[#09090b] text-white",

              text:
                "text-white",

              muted:
                "text-zinc-500",

              surface:
                "bg-white/[0.035]",

              surfaceStrong:
                "bg-[#17171a]",

              border:
                "border-white/[0.08]",

              borderHover:
                "hover:border-white/[0.16]",

              card:
                "bg-white/[0.025]",

              cardHover:
                "hover:bg-white/[0.045]",

              cardConnected:
                "bg-white/[0.04]",

              primary:
                "bg-white text-black",

              primaryHover:
                "hover:bg-zinc-200",

              icon:
                "border-white/[0.08] bg-white/[0.055] text-white",

              iconSoft:
                "text-zinc-500 hover:bg-white/[0.07] hover:text-white",

              success:
                "text-emerald-400",

              danger:
                "text-red-400",

              input:
                "bg-white/[0.04]",

              ring:
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
            }
          : {
              page:
                "bg-[#f7f7f5] text-zinc-950",

              text:
                "text-zinc-950",

              muted:
                "text-zinc-500",

              surface:
                "bg-black/[0.025]",

              surfaceStrong:
                "bg-white",

              border:
                "border-black/[0.08]",

              borderHover:
                "hover:border-black/[0.15]",

              card:
                "bg-white/75",

              cardHover:
                "hover:bg-white",

              cardConnected:
                "bg-white",

              primary:
                "bg-zinc-950 text-white",

              primaryHover:
                "hover:bg-zinc-800",

              icon:
                "border-black/[0.07] bg-black/[0.035] text-zinc-700",

              iconSoft:
                "text-zinc-400 hover:bg-black/[0.05] hover:text-zinc-950",

              success:
                "text-emerald-600",

              danger:
                "text-red-600",

              input:
                "bg-black/[0.025]",

              ring:
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
            },
      [isDark]
    );

  /* --------------------------------------------------------------------------
     OAUTH HANDLERS
  -------------------------------------------------------------------------- */

  const handleTikTokToggle =
    async () => {
      if (tiktokBusy.current) {
        return;
      }

      tiktokBusy.current = true;

      setPendingKey("tiktok");

      let redirecting =
        false;

      try {
        if (
          connections.tiktok
            .connected
        ) {
          await disconnectTikTok();

          if (userId) {
            clearCache(
              userId,
              "tiktok"
            );
          }

          setConnections(
            (current) => ({
              ...current,
              tiktok: {
                connected: false,
              },
            })
          );
        } else {
          await startTikTokLogin();

          redirecting = true;
        }
      } catch (error) {
        console.error(
          "[Stone] TikTok OAuth error:",
          error
        );

        setErrorMessage(
          formatOAuthError(
            "TikTok",
            error
          )
        );
      } finally {
        if (!redirecting) {
          setPendingKey(null);
          tiktokBusy.current =
            false;
        }
      }
    };

  const handlePinterestToggle =
    async () => {
      if (
        pinterestBusy.current
      ) {
        return;
      }

      pinterestBusy.current =
        true;

      setPendingKey(
        "pinterest"
      );

      let redirecting =
        false;

      try {
        if (
          connections.pinterest
            .connected
        ) {
          await disconnectPinterest();

          if (userId) {
            clearCache(
              userId,
              "pinterest"
            );
          }

          setConnections(
            (current) => ({
              ...current,
              pinterest: {
                connected: false,
              },
            })
          );
        } else if (
          import.meta.env
            .VITE_PINTEREST_MANUAL_TOKEN ===
          "true"
        ) {
          const token =
            window.prompt(
              "Pinterest access token:"
            );

          if (!token?.trim()) {
            setPendingKey(null);
            return;
          }

          const account =
            await connectPinterestWithToken(
              token.trim()
            );

          const connection: Connection =
            {
              connected: true,
              handle:
                account?.display_name ??
                undefined,
              avatarUrl:
                account?.avatar_url ??
                undefined,
            };

          if (userId) {
            writeCache(
              userId,
              connection,
              "pinterest"
            );
          }

          setConnections(
            (current) => ({
              ...current,
              pinterest:
                connection,
            })
          );
        } else {
          await startPinterestLogin();

          redirecting = true;
        }
      } catch (error) {
        console.error(
          "[Stone] Pinterest OAuth error:",
          error
        );

        setErrorMessage(
          formatOAuthError(
            "Pinterest",
            error
          )
        );
      } finally {
        if (!redirecting) {
          setPendingKey(null);
          pinterestBusy.current =
            false;
        }
      }
    };

  const handleYouTubeToggle =
    async () => {
      if (
        youtubeBusy.current
      ) {
        return;
      }

      youtubeBusy.current = true;

      setPendingKey("youtube");

      let redirecting =
        false;

      try {
        if (
          connections.youtube
            .connected
        ) {
          await disconnectYouTube();

          if (userId) {
            clearCache(
              userId,
              "youtube"
            );
          }

          setConnections(
            (current) => ({
              ...current,
              youtube: {
                connected: false,
              },
            })
          );
        } else {
          await startYouTubeLogin();

          redirecting = true;
        }
      } catch (error) {
        console.error(
          "[Stone] YouTube OAuth error:",
          error
        );

        setErrorMessage(
          formatOAuthError(
            "YouTube",
            error
          )
        );
      } finally {
        if (!redirecting) {
          setPendingKey(null);
          youtubeBusy.current =
            false;
        }
      }
    };

  /* --------------------------------------------------------------------------
     PLACEHOLDER PROVIDERS
  -------------------------------------------------------------------------- */

  const handlePlaceholderToggle =
    (key: ChannelKey) => {
      setPendingKey(key);

      window.setTimeout(() => {
        setConnections(
          (current) => ({
            ...current,
            [key]:
              current[key].connected
                ? {
                    connected: false,
                  }
                : {
                    connected: true,
                    handle:
                      mockHandleFor(
                        key
                      ),
                  },
          })
        );

        setPendingKey(null);
      }, 500);
    };

  const handleToggle =
    (key: ChannelKey) => {
      setErrorMessage(null);

      if (
        !connections[key]
          .connected &&
        limitReached
      ) {
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

  /* --------------------------------------------------------------------------
     ACTIONS
  -------------------------------------------------------------------------- */

  const handleUpgrade =
    () => {
      console.log(
        "[Stone] Upgrade plan clicked"
      );
    };

  const openModal = () => {
    setErrorMessage(null);
    setShowConnectModal(true);
  };

  const closeModal = () => {
    setShowConnectModal(false);
  };

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div
      className={[
        "relative h-full w-full",
        "overflow-hidden",
        "transition-colors duration-300",
        t.page,
      ].join(" ")}
    >
      <DashboardSidebar
        theme={theme}
        onToggleTheme={
          onToggleTheme
        }
      />

      <main
        className={[
          "h-full overflow-y-auto",
          "overflow-x-hidden",
          "[scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
          "transition-[padding-left]",
          "duration-[380ms]",
          "ease-[cubic-bezier(0.4,0,0.2,1)]",
        ].join(" ")}
        style={{
          paddingLeft:
            sidebarOffset,
        }}
      >
        <div
          className={[
            "mx-auto w-full",
            "max-w-[1120px]",
            "px-[clamp(18px,4vw,48px)]",
            "pb-24",
            "pt-[clamp(26px,5vw,58px)]",
          ].join(" ")}
        >
          {/* ================================================================
              HEADER
          ================================================================ */}

          <header>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div
                  className={[
                    "mb-3 flex items-center gap-2",
                    "text-[10px] font-semibold uppercase",
                    "tracking-[0.16em]",
                    t.muted,
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      connectedCount > 0
                        ? "bg-emerald-500"
                        : "bg-zinc-400",
                    ].join(" ")}
                  />

                  Social workspace
                </div>

                <h1
                  className={[
                    "text-[clamp(30px,4vw,42px)]",
                    "font-semibold",
                    "tracking-[-0.055em]",
                    t.text,
                  ].join(" ")}
                >
                  Channels
                </h1>

                <p
                  className={[
                    "mt-2 max-w-[520px]",
                    "text-[13px] leading-relaxed",
                    t.muted,
                  ].join(" ")}
                >
                  Connect your social accounts
                  and manage everything from
                  one place.
                </p>
              </div>

              <button
                type="button"
                onClick={openModal}
                className={[
                  "inline-flex shrink-0 items-center",
                  "justify-center gap-2",
                  "rounded-2xl px-5 py-3",
                  "text-[12px] font-semibold",
                  "shadow-sm",
                  "transition-all duration-200",
                  "hover:-translate-y-0.5",
                  "hover:shadow-lg",
                  "active:scale-[0.98]",
                  t.primary,
                  t.primaryHover,
                  t.ring,
                ].join(" ")}
              >
                <PlusIcon className="h-4 w-4" />
                Add channel
              </button>
            </div>
          </header>

          {/* ================================================================
              WORKSPACE SUMMARY
          ================================================================ */}

          <section
            className={[
              "relative mt-9 overflow-hidden",
              "rounded-[30px]",
              "border",
              "p-6 sm:p-7",
              t.cardConnected,
              t.border,
            ].join(" ")}
          >
            {/* decorative glow */}

            <div
              className={[
                "pointer-events-none absolute",
                "-right-24 -top-24",
                "h-64 w-64 rounded-full",
                "blur-3xl",
                isDark
                  ? "bg-white/[0.025]"
                  : "bg-black/[0.025]",
              ].join(" ")}
            />

            <div className="relative">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div
                    className={[
                      "flex items-center gap-2",
                      "text-[10px] font-semibold",
                      "uppercase tracking-[0.15em]",
                      t.muted,
                    ].join(" ")}
                  >
                    <SparkIcon className="h-3.5 w-3.5" />

                    Your workspace
                  </div>

                  <div className="mt-3 flex items-end gap-2">
                    <span
                      className={[
                        "text-4xl font-semibold",
                        "tracking-[-0.055em]",
                        t.text,
                      ].join(" ")}
                    >
                      {connectedCount}
                    </span>

                    <span
                      className={[
                        "mb-1.5 text-sm",
                        t.muted,
                      ].join(" ")}
                    >
                      / {PLAN.maxChannels} connected
                    </span>
                  </div>

                  <p
                    className={[
                      "mt-1 text-xs",
                      t.muted,
                    ].join(" ")}
                  >
                    {connectedCount === 0
                      ? "Connect your first social network to get started."
                      : connectedCount ===
                          PLAN.maxChannels
                        ? "Your workspace is fully connected."
                        : `${slotsLeft} ${
                            slotsLeft === 1
                              ? "slot"
                              : "slots"
                          } remaining on your ${PLAN.name} plan.`}
                  </p>
                </div>

                <div
                  className={[
                    "w-full lg:w-[300px]",
                  ].join(" ")}
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <span
                      className={[
                        "text-[10px] font-medium",
                        t.muted,
                      ].join(" ")}
                    >
                      {PLAN.name} plan
                    </span>

                    <span
                      className={[
                        "text-[10px] font-semibold",
                        t.text,
                      ].join(" ")}
                    >
                      {Math.round(
                        progress
                      )}
                      %
                    </span>
                  </div>

                  <div
                    className={[
                      "h-2 overflow-hidden",
                      "rounded-full",
                      isDark
                        ? "bg-white/[0.07]"
                        : "bg-black/[0.06]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "h-full rounded-full",
                        "transition-all duration-700",
                        isDark
                          ? "bg-white"
                          : "bg-zinc-950",
                      ].join(" ")}
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  {limitReached && (
                    <button
                      type="button"
                      onClick={
                        handleUpgrade
                      }
                      className={[
                        "mt-3 text-[11px]",
                        "font-semibold",
                        "underline underline-offset-4",
                        t.text,
                        t.ring,
                      ].join(" ")}
                    >
                      Upgrade your plan →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ================================================================
              ERROR
          ================================================================ */}

          {errorMessage && (
            <div
              role="alert"
              className={[
                "mt-5 flex items-start gap-3",
                "rounded-2xl border",
                "px-4 py-3.5",
                "text-xs",
                "border-red-500/20",
                "bg-red-500/[0.07]",
                "text-red-500",
              ].join(" ")}
            >
              <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />

              <span className="flex-1 leading-relaxed">
                {errorMessage}
              </span>

              <button
                type="button"
                aria-label="Dismiss"
                onClick={() =>
                  setErrorMessage(null)
                }
                className={[
                  "rounded-lg p-1",
                  "transition-colors",
                  "hover:bg-red-500/10",
                  t.ring,
                ].join(" ")}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ================================================================
              CONNECTED
          ================================================================ */}

          {connectedChannels.length >
            0 && (
            <section className="mt-12">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <h2
                    className={[
                      "text-[16px] font-semibold",
                      t.text,
                    ].join(" ")}
                  >
                    Connected
                  </h2>

                  <p
                    className={[
                      "mt-1 text-[11px]",
                      t.muted,
                    ].join(" ")}
                  >
                    Your active publishing
                    destinations.
                  </p>
                </div>

                <span
                  className={[
                    "rounded-full border",
                    "px-2.5 py-1",
                    "text-[9px] font-semibold",
                    t.border,
                    t.muted,
                  ].join(" ")}
                >
                  {connectedCount} active
                </span>
              </div>

              <div
                className={[
                  "grid gap-3.5",
                  "sm:grid-cols-2",
                  "lg:grid-cols-3",
                ].join(" ")}
              >
                {connectedChannels.map(
                  (channel) => (
                    <ConnectedCard
                      key={
                        channel.key
                      }
                      channel={
                        channel
                      }
                      connection={
                        connections[
                          channel.key
                        ]
                      }
                      pending={
                        pendingKey ===
                        channel.key
                      }
                      t={t}
                      onDisconnect={() =>
                        handleToggle(
                          channel.key
                        )
                      }
                    />
                  )
                )}
              </div>
            </section>
          )}

          {/* ================================================================
              AVAILABLE
          ================================================================ */}

          {availableChannels.length >
            0 && (
            <section
              className={
                connectedChannels.length >
                0
                  ? "mt-12"
                  : "mt-9"
              }
            >
              <div className="mb-5">
                <h2
                  className={[
                    "text-[16px] font-semibold",
                    t.text,
                  ].join(" ")}
                >
                  Add a channel
                </h2>

                <p
                  className={[
                    "mt-1 text-[11px]",
                    t.muted,
                  ].join(" ")}
                >
                  Choose where you want
                  Stone to publish.
                </p>
              </div>

              <div
                className={[
                  "grid gap-3.5",
                  "sm:grid-cols-2",
                  "lg:grid-cols-3",
                ].join(" ")}
              >
                {availableChannels.map(
                  (channel) => (
                    <AvailableCard
                      key={
                        channel.key
                      }
                      channel={
                        channel
                      }
                      connection={
                        connections[
                          channel.key
                        ]
                      }
                      pending={
                        pendingKey ===
                        channel.key
                      }
                      disabled={
                        limitReached
                      }
                      t={t}
                      onConnect={() =>
                        handleToggle(
                          channel.key
                        )
                      }
                    />
                  )
                )}
              </div>
            </section>
          )}

          {/* ================================================================
              BOTTOM INFO
          ================================================================ */}

          <section
            className={[
              "mt-10 flex flex-col gap-4",
              "rounded-[24px]",
              "border p-5",
              "sm:flex-row sm:items-center",
              "sm:justify-between",
              t.surface,
              t.border,
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <span
                className={[
                  "flex h-9 w-9 shrink-0",
                  "items-center justify-center",
                  "rounded-xl",
                  t.icon,
                ].join(" ")}
              >
                <SparkIcon className="h-4 w-4" />
              </span>

              <div>
                <p
                  className={[
                    "text-xs font-semibold",
                    t.text,
                  ].join(" ")}
                >
                  One place. Every network.
                </p>

                <p
                  className={[
                    "mt-0.5 text-[10px]",
                    t.muted,
                  ].join(" ")}
                >
                  Stone keeps your publishing
                  workflow in one workspace.
                </p>
              </div>
            </div>

            <div
              className={[
                "text-[10px]",
                t.muted,
              ].join(" ")}
            >
              OAuth is secured by each
              platform.
            </div>
          </section>
        </div>
      </main>

      {/* ================================================================
          CONNECT MODAL
      ================================================================ */}

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