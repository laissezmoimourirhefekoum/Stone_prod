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
  instagram: { connected: false },
  facebook: { connected: false },
  threads: { connected: false },
  youtube: { connected: false },
  tiktok: { connected: false },
  pinterest: { connected: false },
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
        r="1.3"
        fill="currentColor"
        stroke="none"
      />
      <circle
        cx="12"
        cy="12"
        r="1.3"
        fill="currentColor"
        stroke="none"
      />
      <circle
        cx="19"
        cy="12"
        r="1.3"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  );
}

function ArrowIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
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
    return "Unable to reach the server. Check that the backend is running.";
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
    facebook: "Ronan Studio",
    threads: "@ronan.studio",
    tiktok: "",
    youtube: "",
    pinterest: "",
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
   CHANNEL CARD
============================================================================ */

type ChannelCardProps = {
  channel: Channel;
  connection: Connection;
  pending: boolean;
  disabled: boolean;
  dark: boolean;
  onToggle: () => void;
};

function ChannelCard({
  channel,
  connection,
  pending,
  disabled,
  dark,
  onToggle,
}: ChannelCardProps) {
  const Icon = channel.icon;

  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const menuRef =
    useRef<HTMLDivElement>(null);

  const connected =
    connection.connected;

  const label =
    connection.handle ||
    channel.name;

  const showAvatar =
    connected &&
    Boolean(connection.avatarUrl) &&
    !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [connection.avatarUrl]);

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
    <div
      className={[
        "group relative flex min-h-[112px]",
        "items-center gap-3.5",
        "rounded-[22px] border px-4 py-3.5",
        "transition-all duration-200",
        connected
          ? dark
            ? "border-white/[0.09] bg-white/[0.035]"
            : "border-black/[0.07] bg-white"
          : dark
            ? "border-white/[0.07] bg-white/[0.018]"
            : "border-black/[0.06] bg-white/70",
        !disabled &&
          "hover:-translate-y-[1px]",
        !disabled &&
          (dark
            ? "hover:border-white/[0.14] hover:bg-white/[0.04]"
            : "hover:border-black/[0.11] hover:bg-white"),
        disabled &&
          "cursor-not-allowed opacity-45",
      ].join(" ")}
    >
      {/* Logo */}

      <div className="relative shrink-0">
        {showAvatar ? (
          <img
            src={connection.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() =>
              setImageFailed(true)
            }
            className={[
              "h-11 w-11 rounded-[15px]",
              "object-cover",
            ].join(" ")}
          />
        ) : (
          <div
            className={[
              "flex h-11 w-11 items-center justify-center",
              "rounded-[15px] border",
              dark
                ? "border-white/[0.08] bg-white/[0.045] text-white/75"
                : "border-black/[0.06] bg-black/[0.025] text-black/60",
              "transition-transform duration-200",
              "group-hover:scale-[1.03]",
            ].join(" ")}
          >
            <Icon
              className="h-5 w-5"
              size={20}
            />
          </div>
        )}

        {connected && (
          <span
            className={[
              "absolute -bottom-1 -right-1",
              "flex h-[17px] w-[17px]",
              "items-center justify-center",
              "rounded-full",
              "border-2",
              dark
                ? "border-[#09090b] bg-emerald-500"
                : "border-white bg-emerald-500",
              "text-white",
            ].join(" ")}
          >
            <CheckIcon className="h-2.5 w-2.5" />
          </span>
        )}
      </div>

      {/* Info */}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={[
              "truncate text-[13px] font-semibold",
              dark
                ? "text-white"
                : "text-zinc-950",
            ].join(" ")}
          >
            {label}
          </p>

          {connected && (
            <span
              className={[
                "h-1.5 w-1.5 shrink-0 rounded-full",
                "bg-emerald-500",
              ].join(" ")}
            />
          )}
        </div>

        <p
          className={[
            "mt-1 truncate text-[10.5px]",
            dark
              ? "text-zinc-500"
              : "text-zinc-500",
          ].join(" ")}
        >
          {connected
            ? channel.accountLabel
            : channel.subtitle}
        </p>
      </div>

      {/* Action */}

      {!connected ? (
        <button
          type="button"
          disabled={
            pending || disabled
          }
          onClick={onToggle}
          className={[
            "flex shrink-0 items-center gap-1.5",
            "rounded-xl border px-3 py-2",
            "text-[10.5px] font-semibold",
            "transition-all duration-200",
            "active:scale-[0.97]",
            dark
              ? "border-white/[0.1] bg-white/[0.045] text-white hover:bg-white/[0.08]"
              : "border-black/[0.08] bg-black/[0.025] text-zinc-900 hover:bg-black/[0.05]",
            "disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" ")}
        >
          {pending
            ? "..."
            : "Connect"}

          {!pending && (
            <ArrowIcon className="h-3 w-3" />
          )}
        </button>
      ) : (
        <div
          ref={menuRef}
          className="relative shrink-0"
        >
          <button
            type="button"
            aria-label={`Options for ${channel.name}`}
            onClick={() =>
              setMenuOpen(
                (value) => !value
              )
            }
            className={[
              "flex h-8 w-8 items-center justify-center",
              "rounded-xl transition-colors",
              dark
                ? "text-zinc-500 hover:bg-white/[0.06] hover:text-white"
                : "text-zinc-400 hover:bg-black/[0.05] hover:text-zinc-900",
            ].join(" ")}
          >
            <MoreIcon className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              className={[
                "absolute right-0 top-10 z-30",
                "w-32 rounded-xl border p-1",
                "shadow-xl",
                dark
                  ? "border-white/[0.08] bg-[#18181b]"
                  : "border-black/[0.08] bg-white",
              ].join(" ")}
            >
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setMenuOpen(false);
                  onToggle();
                }}
                className={[
                  "w-full rounded-lg px-2.5 py-2",
                  "text-left text-[10px]",
                  "font-medium text-red-500",
                  "hover:bg-red-500/[0.08]",
                ].join(" ")}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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
     STATE
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
     DERIVED
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

  /* --------------------------------------------------------------------------
     OAUTH STATUS
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

          if (cancelled) return;

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
     TIKTOK
  -------------------------------------------------------------------------- */

  const handleTikTokToggle =
    async () => {
      if (tiktokBusy.current)
        return;

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

  /* --------------------------------------------------------------------------
     PINTEREST
  -------------------------------------------------------------------------- */

  const handlePinterestToggle =
    async () => {
      if (
        pinterestBusy.current
      )
        return;

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

  /* --------------------------------------------------------------------------
     YOUTUBE
  -------------------------------------------------------------------------- */

  const handleYouTubeToggle =
    async () => {
      if (
        youtubeBusy.current
      )
        return;

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
     PLACEHOLDER
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
      }, 450);
    };

  /* --------------------------------------------------------------------------
     GLOBAL TOGGLE
  -------------------------------------------------------------------------- */

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
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <div
      className={[
        "relative h-full w-full overflow-hidden",
        "transition-colors duration-300",
        isDark
          ? "bg-[#09090b] text-white"
          : "bg-[#f7f7f5] text-zinc-950",
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
          "h-full overflow-hidden",
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
            "mx-auto flex h-full w-full",
            "max-w-[1080px]",
            "flex-col",
            "px-[clamp(18px,4vw,44px)]",
            "py-[clamp(22px,4vh,40px)]",
          ].join(" ")}
        >
          {/* ================================================================
              HEADER
          ================================================================ */}

          <header className="flex shrink-0 items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={[
                    "text-[27px] font-semibold",
                    "tracking-[-0.045em]",
                    isDark
                      ? "text-white"
                      : "text-zinc-950",
                  ].join(" ")}
                >
                  Channels
                </h1>

                <span
                  className={[
                    "rounded-full px-2 py-0.5",
                    "text-[9px] font-semibold",
                    isDark
                      ? "bg-white/[0.06] text-zinc-400"
                      : "bg-black/[0.04] text-zinc-500",
                  ].join(" ")}
                >
                  {connectedCount}/
                  {PLAN.maxChannels}
                </span>
              </div>

              <p
                className={[
                  "mt-1 text-[11px]",
                  isDark
                    ? "text-zinc-500"
                    : "text-zinc-500",
                ].join(" ")}
              >
                Connect the platforms
                you publish to.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowConnectModal(
                  true
                )
              }
              className={[
                "flex h-9 shrink-0 items-center gap-2",
                "rounded-xl px-3.5",
                "text-[11px] font-semibold",
                "transition-all duration-200",
                "active:scale-[0.97]",
                isDark
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "bg-zinc-950 text-white hover:bg-zinc-800",
              ].join(" ")}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add channel
            </button>
          </header>

          {/* ================================================================
              SIMPLE STATUS
          ================================================================ */}

          <div
            className={[
              "mt-5 flex h-11 shrink-0 items-center",
              "justify-between rounded-2xl border px-4",
              isDark
                ? "border-white/[0.07] bg-white/[0.02]"
                : "border-black/[0.06] bg-white/60",
            ].join(" ")}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  connectedCount > 0
                    ? "bg-emerald-500"
                    : isDark
                      ? "bg-zinc-600"
                      : "bg-zinc-300",
                ].join(" ")}
              />

              <span
                className={[
                  "text-[10.5px] font-medium",
                  isDark
                    ? "text-zinc-400"
                    : "text-zinc-500",
                ].join(" ")}
              >
                {connectedCount === 0
                  ? "No channels connected"
                  : `${connectedCount} ${
                      connectedCount === 1
                        ? "channel"
                        : "channels"
                    } connected`}
              </span>
            </div>

            <span
              className={[
                "text-[10px]",
                isDark
                  ? "text-zinc-600"
                  : "text-zinc-400",
              ].join(" ")}
            >
              {slotsLeft}{" "}
              {slotsLeft === 1
                ? "slot"
                : "slots"}{" "}
              left
            </span>
          </div>

          {/* ================================================================
              ERROR
          ================================================================ */}

          {errorMessage && (
            <div
              className={[
                "mt-3 flex shrink-0 items-center gap-2",
                "rounded-xl border px-3 py-2.5",
                "text-[10px]",
                "border-red-500/20",
                "bg-red-500/[0.06]",
                "text-red-500",
              ].join(" ")}
            >
              <span className="flex-1">
                {errorMessage}
              </span>

              <button
                type="button"
                onClick={() =>
                  setErrorMessage(null)
                }
                className="rounded-md p-1 hover:bg-red-500/10"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ================================================================
              ALL CHANNELS
          ================================================================ */}

          <section className="mt-5 min-h-0 flex-1">
            <div
              className={[
                "grid h-full",
                "grid-cols-2",
                "gap-2.5",
                "lg:grid-cols-3",
                "grid-rows-3",
              ].join(" ")}
            >
              {CHANNELS.map(
                (channel) => (
                  <ChannelCard
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
                      !connections[
                        channel.key
                      ].connected &&
                      limitReached
                    }
                    dark={isDark}
                    onToggle={() =>
                      handleToggle(
                        channel.key
                      )
                    }
                  />
                )
              )}
            </div>
          </section>

          {/* ================================================================
              FOOTER
          ================================================================ */}

          <div
            className={[
              "mt-4 flex shrink-0 items-center",
              "justify-between",
              "text-[9px]",
              isDark
                ? "text-zinc-600"
                : "text-zinc-400",
            ].join(" ")}
          >
            <span>
              Stone · {PLAN.name} plan
            </span>

            <span>
              Secure OAuth connections
            </span>
          </div>
        </div>
      </main>

      {/* ================================================================
          MODAL
      ================================================================ */}

      {showConnectModal && (
        <ConnectChannelModal
          channels={CHANNELS}
          connections={connections}
          pendingKey={pendingKey}
          limitReached={
            limitReached
          }
          planName={PLAN.name}
          realOAuthKeys={
            REAL_OAUTH
          }
          errorMessage={
            errorMessage
          }
          isDark={isDark}
          onToggle={
            handleToggle
          }
          onClose={() =>
            setShowConnectModal(
              false
            )
          }
        />
      )}
    </div>
  );
}