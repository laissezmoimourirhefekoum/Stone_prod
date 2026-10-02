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
  icon: IconComponent;
};

type Connection = { connected: boolean; handle?: string };
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

const CHANNELS: Channel[] = [
  { key: "instagram", name: "Instagram", icon: InstagramIcon },
  { key: "tiktok", name: "TikTok", icon: TikTokIcon },
  { key: "youtube", name: "YouTube", icon: YouTubeIcon },
  { key: "facebook", name: "Facebook", icon: FacebookIcon },
  { key: "pinterest", name: "Pinterest", icon: PinterestIcon },
  { key: "threads", name: "Threads", icon: ThreadsIcon },
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
  t: ThemeTokens;
  isDark: boolean;
};

function ConnectModal({
  channels,
  connections,
  pendingKey,
  onToggle,
  onClose,
  errorMessage,
  t,
  isDark,
}: ConnectModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const buttonLabel = (key: ChannelKey): string => {
    const connected = connections[key].connected;

    if (pendingKey === key) {
      if (key === "tiktok") {
        return connected ? "Disconnecting..." : "Redirecting...";
      }
      return "...";
    }

    return connected ? "Disconnect" : "Connect";
  };

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      className={[
        "fixed inset-0 z-[100] flex items-center justify-center px-4",
        "backdrop-blur-sm",
        isDark ? "bg-black/70" : "bg-black/40",
      ].join(" ")}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect a channel"
        onClick={(event) => event.stopPropagation()}
        className={[
          "max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5",
          isDark
            ? "border-white/10 bg-[#101011] text-[#f3f3ef] shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
            : "border-black/10 bg-white text-[#151515] shadow-[0_18px_40px_rgba(0,0,0,0.12)]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">Connect a channel</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={[
              "flex h-7 w-7 items-center justify-center rounded-full",
              "transition-colors duration-150",
              isDark
                ? "text-white/70 hover:bg-white/10"
                : "text-black/50 hover:bg-black/[0.06]",
            ].join(" ")}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className={[
              "mt-3 rounded-lg border px-3 py-2 text-[12.5px]",
              isDark
                ? "border-red-400/30 bg-red-500/10 text-red-300"
                : "border-red-300 bg-red-50 text-red-700",
            ].join(" ")}
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {channels.map((channel) => {
            const connection = connections[channel.key];
            const Icon = channel.icon;
            const isPending = pendingKey === channel.key;

            return (
              <div
                key={channel.key}
                className={[
                  "flex flex-col items-center gap-2",
                  "rounded-xl border px-3 py-4",
                  "transition-colors duration-150",
                  isDark
                    ? connection.connected
                      ? "border-white/20 bg-[#131316]"
                      : "border-white/10 bg-[#0c0c0d] hover:border-white/20"
                    : connection.connected
                    ? "border-black/[0.12] bg-[#faf9f7]"
                    : "border-black/[0.08] bg-white hover:border-black/[0.16]",
                ].join(" ")}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg">
                  <Icon className="h-5 w-5" />
                </span>

                <span className="text-center text-[12px] font-medium leading-tight">
                  {channel.name}
                </span>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onToggle(channel.key)}
                  className={[
                    "w-full rounded-lg py-1.5",
                    "text-[11.5px] font-semibold",
                    "transition-[background-color,opacity] duration-150",
                    "disabled:opacity-50",
                    connection.connected ? t.disconnectBtn : t.connectBtn,
                  ].join(" ")}
                >
                  {buttonLabel(channel.key)}
                </button>
              </div>
            );
          })}
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

        setConnections((current) => ({
          ...current,
          tiktok: status.connected
            ? {
                connected: true,
                handle: status.account?.display_name ?? undefined,
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
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
              }}
            >
              {connectedChannels.map((channel) => {
                const connection = connections[channel.key];
                const Icon = channel.icon;
                const isPending = pendingKey === channel.key;

                return (
                  <div
                    key={channel.key}
                    className={[
                      "flex flex-col items-center gap-3",
                      "rounded-2xl border px-4 py-6",
                      "transition-colors duration-150",
                      t.cardConnected,
                    ].join(" ")}
                  >
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="h-6 w-6" />

                      <span
                        aria-hidden="true"
                        className={[
                          "absolute -right-1 -top-1 h-3 w-3 rounded-full ring-2",
                          isDark
                            ? "bg-[#7fe0a2] ring-[#101011]"
                            : "bg-[#1f7a42] ring-white",
                        ].join(" ")}
                      />
                    </span>

                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={["text-[13px] font-medium", t.title].join(
                          " "
                        )}
                      >
                        {channel.name}
                      </span>

                      {/* Seul TikTok expose un vrai nom de compte */}
                      {channel.key === "tiktok" && connection.handle && (
                        <span
                          className={[
                            "max-w-[110px] truncate text-[11.5px]",
                            t.muted,
                          ].join(" ")}
                        >
                          {connection.handle}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggle(channel.key)}
                      className={[
                        "w-full rounded-lg py-2",
                        "text-[12.5px] font-semibold",
                        "transition-[background-color,opacity] duration-150",
                        "disabled:opacity-50",
                        t.disconnectBtn,
                      ].join(" ")}
                    >
                      {isPending
                        ? channel.key === "tiktok"
                          ? "Disconnecting..."
                          : "Working..."
                        : "Disconnect"}
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
          t={t}
          isDark={isDark}
        />
      )}
    </div>
  );
}