// src/pages/Channels.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { createPortal } from "react-dom";

import DashboardSidebar from "../components/DashboardSidebar";
import { useTheme, type Theme } from "../hooks/useTheme";
import {
  getTikTokStatus,
  startTikTokLogin,
  disconnectTikTok,
} from "../services/tiktok";
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
  subtitle: string;
  icon: IconComponent;
  /** Couleur de fond + couleur de l'icône de la pastille (modal + badge). */
  tile: string;
};

type Connection = {
  connected: boolean;
  handle?: string;
  avatarUrl?: string;
};
type ConnectionState = Record<ChannelKey, Connection>;

type ThemeTokens = {
  page: string;
  title: string;
  muted: string;
  cardConnected: string;
  divider: string;
  connectBtn: string;
  disconnectBtn: string;
  chipIdle: string;
  titleIconWrap: string;
};

/* ============================================================================
   Réseaux + état initial
============================================================================ */

// URL / mailto utilisé par la carte "Can't find it? Request a channel".
const REQUEST_CHANNEL_URL = "mailto:hello@example.com?subject=Channel%20request";

const CHANNELS: Channel[] = [
  {
    key: "instagram",
    name: "Instagram",
    subtitle: "Business or Creator",
    icon: InstagramIcon,
    tile: "bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white",
  },
  {
    key: "facebook",
    name: "Facebook",
    subtitle: "Page",
    icon: FacebookIcon,
    tile: "bg-[#1877f2] text-white",
  },
  {
    key: "threads",
    name: "Threads",
    subtitle: "Profile",
    icon: ThreadsIcon,
    tile: "bg-black text-white",
  },
  {
    key: "youtube",
    name: "YouTube",
    subtitle: "Channel",
    icon: YouTubeIcon,
    tile: "bg-[#ff0000] text-white",
  },
  {
    key: "tiktok",
    name: "TikTok",
    subtitle: "Business or Personal",
    icon: TikTokIcon,
    tile: "bg-white text-black",
  },
  {
    key: "pinterest",
    name: "Pinterest",
    subtitle: "Business or Profile",
    icon: PinterestIcon,
    tile: "bg-[#e60023] text-white",
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

function ChannelsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="7.5" r="2.5" />
      <circle cx="7.5" cy="16.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </Svg>
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

/* ============================================================================
   Helpers
============================================================================ */

function formatTikTokError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";

  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "Unable to reach the server (network or CORS error). Check that the backend is running and that VITE_API_URL is correct.";
  }

  return raw
    ? `Unable to connect to TikTok. ${raw}`
    : "Unable to connect to TikTok.";
}

function mockHandleFor(key: ChannelKey): string {
  // Valeurs fictives utilisées uniquement par les placeholders.
  const handles: Record<ChannelKey, string> = {
    instagram: "@ronan.studio",
    tiktok: "",
    youtube: "Ronan Studio",
    facebook: "Ronan Studio Page",
    pinterest: "Ronan Studio",
    threads: "@ronan.studio",
  };

  return handles[key];
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
            isDark ? "bg-white/10 text-white/80" : "bg-black/[0.07] text-black/60",
          ].join(" ")}
        >
          {initial}
        </span>
      )}

      <span
        className={[
          "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center",
          "rounded-md ring-2",
          channel.tile,
          isDark ? "ring-[#131316]" : "ring-white",
        ].join(" ")}
      >
        <Icon className="h-3 w-3" />
      </span>
    </span>
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
    <div className="flex flex-col items-center justify-center gap-5 px-6 py-24 text-center">
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
        <p
          className={[
            "max-w-sm text-[14px] leading-relaxed",
            t.muted,
          ].join(" ")}
        >
          Once connected, you'll see your channels listed here.
        </p>
      </div>

      <button
        type="button"
        onClick={onConnect}
        className={[
          "rounded-xl border px-6 py-2.5",
          "text-[13.5px] font-semibold",
          "shadow-sm transition-[background-color,transform] duration-150",
          "active:scale-[0.98]",
          "border-black/10 bg-white text-[#151515] hover:bg-[#f0f0ed]",
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
  onToggle: (key: ChannelKey) => void;
  onClose: () => void;
  errorMessage: string | null;
  isDark: boolean;
};

function ConnectModal({
  channels,
  connections,
  pendingKey,
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
    "flex min-h-[210px] flex-col items-center justify-center gap-1",
    "rounded-2xl border px-4 py-8 text-center",
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
          "flex h-full max-h-[760px] w-full max-w-[1000px] flex-col overflow-hidden rounded-2xl border",
          isDark
            ? "border-white/10 bg-[#1f2020] text-[#f3f3ef] shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            : "border-black/10 bg-white text-[#151515] shadow-[0_24px_60px_rgba(0,0,0,0.18)]",
        ].join(" ")}
      >
        {/* Header */}
        <div
          className={[
            "relative flex shrink-0 items-center justify-center border-b px-16 py-5",
            isDark ? "border-white/10" : "border-black/10",
          ].join(" ")}
        >
          <h2 className="text-[20px] font-medium">Connect a New Channel</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={[
              "absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2",
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
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-12">
          {errorMessage && (
            <p
              role="alert"
              className={[
                "mx-auto mb-5 max-w-[760px] rounded-lg border px-3 py-2 text-[13px]",
                isDark
                  ? "border-red-400/30 bg-red-500/10 text-red-300"
                  : "border-red-300 bg-red-50 text-red-700",
              ].join(" ")}
            >
              {errorMessage}
            </p>
          )}

          <div className="mx-auto grid max-w-[760px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => {
              const connected = connections[channel.key].connected;
              const isPending = pendingKey === channel.key;
              const Icon = channel.icon;

              return (
                <button
                  key={channel.key}
                  type="button"
                  disabled={isPending || connected}
                  onClick={() => onToggle(channel.key)}
                  className={[
                    cardBase,
                    connected ? "" : cardHover,
                    "disabled:cursor-default",
                    isPending ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mb-4 flex h-[70px] w-[70px] items-center justify-center rounded-2xl",
                      channel.tile,
                    ].join(" ")}
                  >
                    <Icon className="h-9 w-9" />
                  </span>

                  <span className="text-[19px] font-semibold leading-tight">
                    {channel.name}
                  </span>

                  <span className={["text-[16px] leading-snug", subtitleColor].join(" ")}>
                    {isPending ? (
                      channel.key === "tiktok" ? "Redirecting..." : "Connecting..."
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

            {/* Demander un réseau */}
            <a
              href={REQUEST_CHANNEL_URL}
              className={[cardBase, cardHover].join(" ")}
            >
              <PlusIcon className="mb-4 h-8 w-8 opacity-80" />
              <span className="text-[19px] font-semibold leading-tight">
                Can't find it?
              </span>
              <span className={["text-[16px] leading-snug", subtitleColor].join(" ")}>
                Request a channel
              </span>
            </a>
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

  const [connections, setConnections] =
    useState<ConnectionState>(initialConnections);
  const [pendingKey, setPendingKey] = useState<ChannelKey | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Empêche un double clic de lancer deux OAuth en parallèle.
  const tiktokBusy = useRef(false);

  const connectedChannels = useMemo(
    () => CHANNELS.filter((channel) => connections[channel.key].connected),
    [connections]
  );
  const connectedCount = connectedChannels.length;

  /* ── Statut réel de TikTok (source de vérité : le backend) ── */

  useEffect(() => {
    let cancelled = false;

    const loadTikTokStatus = async () => {
      try {
        const status = await getTikTokStatus();
        if (cancelled) return;

        // Le nom du champ de la photo dépend de ton backend : on accepte
        // avatar_url (TikTok API) ou avatarUrl. Adapte si besoin.
        const account = status.account as
          | {
              display_name?: string | null;
              avatar_url?: string | null;
              avatarUrl?: string | null;
            }
          | null
          | undefined;

        setConnections((current) => ({
          ...current,
          tiktok: status.connected
            ? {
                connected: true,
                handle: account?.display_name ?? undefined,
                avatarUrl: account?.avatar_url ?? account?.avatarUrl ?? undefined,
              }
            : { connected: false },
        }));
      } catch (error) {
        // Non bloquant : TikTok reste affiché comme non connecté.
        console.warn("[Stone] Could not load TikTok status:", error);
      }
    };

    void loadTikTokStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const t = useMemo<ThemeTokens>(
    () =>
      isDark
        ? {
            page: "bg-[#050506] text-[#f3f3ef]",
            title: "text-[#f3f3ef]",
            muted: "text-[#99a2a2]",
            cardConnected: "border-white/20 bg-[#131316]",
            divider: "bg-white/10",
            connectBtn: "bg-white text-[#111111] hover:bg-[#e9e9e6]",
            disconnectBtn:
              "border border-white/15 text-[#d7d7d2] hover:bg-white/[0.06]",
            chipIdle: "bg-white/[0.06] text-[#99a2a2]",
            titleIconWrap: "border-white/10 bg-white/[0.05] text-[#d7d7d2]",
          }
        : {
            page: "bg-[#faf9f7] text-[#151515]",
            title: "text-[#151515]",
            muted: "text-[#71706d]",
            cardConnected: "border-black/[0.12] bg-white",
            divider: "bg-black/[0.07]",
            connectBtn: "bg-[#151515] text-white hover:bg-[#2a2a2a]",
            disconnectBtn:
              "border border-black/10 text-[#3f3f3d] hover:bg-black/[0.04]",
            chipIdle: "bg-black/[0.04] text-[#71706d]",
            titleIconWrap: "border-black/[0.08] bg-black/[0.03] text-[#4d4d4b]",
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
      setErrorMessage(formatTikTokError(error));
    } finally {
      // Pendant la redirection, on garde le bouton désactivé.
      if (!redirecting) {
        setPendingKey(null);
        tiktokBusy.current = false;
      }
    }
  };

  /* ── Autres réseaux : PLACEHOLDER uniquement (pas de vrai OAuth) ── */

  const handlePlaceholderToggle = (key: ChannelKey) => {
    // TODO: implement Instagram OAuth
    // TODO: implement YouTube OAuth
    // TODO: implement Facebook OAuth
    // TODO: implement Pinterest OAuth
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

    if (key === "tiktok") {
      console.log("[Stone] TikTok button clicked");
      void handleTikTokToggle();
      return;
    }

    handlePlaceholderToggle(key);
  };

  const closeModal = () => setShowConnectModal(false);

  return (
    <div
      className={["relative h-full w-full overflow-hidden", t.page].join(" ")}
    >
      <DashboardSidebar theme={theme} onToggleTheme={onToggleTheme} />

      <main className="h-full overflow-y-auto py-10 pl-[104px] pr-6 sm:pr-10">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center",
                  "rounded-[11px] border",
                  t.titleIconWrap,
                ].join(" ")}
              >
                <ChannelsIcon className="h-5 w-5" />
              </span>

              <h1
                className={[
                  "text-[22px] font-semibold tracking-tight",
                  t.title,
                ].join(" ")}
              >
                Channels
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div
                className={[
                  "rounded-full px-3 py-1.5 text-[12px] font-medium",
                  t.chipIdle,
                ].join(" ")}
              >
                {connectedCount} of {CHANNELS.length} connected
              </div>

              {connectedCount > 0 && (
                <button
                  type="button"
                  aria-label="Add channel"
                  title="Add channel"
                  onClick={() => setShowConnectModal(true)}
                  className={[
                    "flex h-8 w-8 items-center justify-center",
                    "rounded-full transition-colors duration-150",
                    t.chipIdle,
                    isDark ? "hover:bg-white/10" : "hover:bg-black/[0.08]",
                  ].join(" ")}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className={["my-6 h-px", t.divider].join(" ")} />

          {/* Erreur (page) — masquée si le modal est ouvert, il l'affiche lui-même */}
          {errorMessage && !showConnectModal && (
            <div
              role="alert"
              className={[
                "mb-4 flex items-start justify-between gap-3",
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
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              }}
            >
              {connectedChannels.map((channel) => {
                const connection = connections[channel.key];
                const isPending = pendingKey === channel.key;

                return (
                  <div
                    key={channel.key}
                    className={[
                      "flex items-center gap-3",
                      "rounded-2xl border px-4 py-3.5",
                      "transition-colors duration-150",
                      t.cardConnected,
                    ].join(" ")}
                  >
                    <Avatar
                      channel={channel}
                      connection={connection}
                      isDark={isDark}
                    />

                    <span
                      className={[
                        "min-w-0 flex-1 truncate text-[16px] font-semibold",
                        t.title,
                      ].join(" ")}
                      title={connection.handle || channel.name}
                    >
                      {connection.handle || channel.name}
                    </span>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggle(channel.key)}
                      aria-label={`Disconnect ${channel.name}`}
                      title="Disconnect"
                      className={[
                        "shrink-0 rounded-lg px-3 py-1.5",
                        "text-[12px] font-semibold",
                        "transition-[background-color,opacity] duration-150",
                        "disabled:opacity-50",
                        t.disconnectBtn,
                      ].join(" ")}
                    >
                      {isPending ? "..." : "Disconnect"}
                    </button>
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
          onToggle={handleToggle}
          onClose={closeModal}
          errorMessage={errorMessage}
          isDark={isDark}
        />
      )}
    </div>
  );
}