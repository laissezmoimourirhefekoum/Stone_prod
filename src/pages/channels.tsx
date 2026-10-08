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

function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12 4 4L19 6" />
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

function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </Svg>
  );
}

function HelpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
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
            {isConnected && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />}
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
   ONBOARDING MODALS (Buffer style)
============================================================================ */

const ACCENT = "#8fd98f";

const CONFETTI = [
  { l: "11%", t: 18, c: "#22e03a", w: 7, h: 7, r: 0, d: "0s", s: "circle" },
  { l: "16%", t: 52, c: "#22e03a", w: 12, h: 4, r: 20, d: "0.2s", s: "rect" },
  { l: "22%", t: 30, c: "#22e03a", w: 16, h: 6, r: 10, d: "0.1s", s: "rect" },
  { l: "27%", t: 66, c: "#f5c518", w: 8, h: 14, r: 25, d: "0.3s", s: "rect" },
  { l: "20%", t: 70, c: "#2aa8ff", w: 8, h: 6, r: 0, d: "0.15s", s: "tri" },
  { l: "39%", t: 8, c: "#f5c518", w: 14, h: 5, r: -15, d: "0.05s", s: "rect" },
  { l: "46%", t: 72, c: "#ffffff", w: 14, h: 10, r: 15, d: "0.25s", s: "rect" },
  { l: "50%", t: 4, c: "#f5c518", w: 14, h: 12, r: 10, d: "0.12s", s: "rect" },
  { l: "55%", t: 76, c: "#2aa8ff", w: 6, h: 6, r: 0, d: "0.35s", s: "tri" },
  { l: "68%", t: 28, c: "#6f6fe0", w: 18, h: 9, r: 5, d: "0.08s", s: "rect" },
  { l: "75%", t: 6, c: "#22e03a", w: 10, h: 4, r: -30, d: "0.22s", s: "rect" },
  { l: "80%", t: 10, c: "#f5c518", w: 12, h: 12, r: 8, d: "0.18s", s: "rect" },
  { l: "82%", t: 58, c: "#22e03a", w: 12, h: 4, r: 15, d: "0.28s", s: "rect" },
  { l: "88%", t: 40, c: "#ff2d8a", w: 8, h: 8, r: 0, d: "0.1s", s: "circle" },
  { l: "89%", t: 6, c: "#ffffff", w: 14, h: 12, r: 25, d: "0.3s", s: "rect" },
  { l: "86%", t: 52, c: "#f5c518", w: 8, h: 16, r: 18, d: "0.2s", s: "rect" },
];

function Confetti() {
  return (
    <>
      <style>{`
        @keyframes stone-confetti-fall {
          0%   { opacity: 0; transform: translateY(-40px) rotate(0deg); }
          20%  { opacity: 1; }
          100% { opacity: 1; transform: translateY(0) rotate(var(--rot)); }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[110px] overflow-hidden">
        {CONFETTI.map((p, i) => (
          <span
            key={i}
            className="absolute block"
            style={
              {
                left: p.l,
                top: p.t,
                width: p.w,
                height: p.h,
                background: p.s === "tri" ? "transparent" : p.c,
                borderRadius: p.s === "circle" ? "9999px" : 1,
                borderLeft: p.s === "tri" ? `${p.w / 2}px solid transparent` : undefined,
                borderRight: p.s === "tri" ? `${p.w / 2}px solid transparent` : undefined,
                borderBottom: p.s === "tri" ? `${p.h}px solid ${p.c}` : undefined,
                "--rot": `${p.r}deg`,
                transform: `rotate(${p.r}deg)`,
                animation: `stone-confetti-fall 0.9s ease-out ${p.d} both`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}

function ModalShell({
  isDark,
  onClose,
  children,
  footer,
}: {
  isDark: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "relative flex min-h-[560px] w-full max-w-[680px] flex-col overflow-hidden rounded-[20px] border shadow-2xl",
          isDark ? "border-[#3b3f3c] bg-[#222423]" : "border-zinc-200 bg-white",
        ].join(" ")}
      >
        <Confetti />

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-6 top-6 z-10 flex h-7 w-7 items-center justify-center rounded-md border text-white transition-colors hover:bg-white/10"
          style={{ borderColor: ACCENT, color: isDark ? "#fff" : "#000" }}
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>

        <div className="flex flex-1 flex-col items-center px-[115px] pb-8 pt-[78px]">
          {children}
        </div>

        <div
          className={[
            "flex h-[62px] shrink-0 items-center justify-between border-t px-7",
            isDark ? "border-[#34373a]" : "border-zinc-200",
          ].join(" ")}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

function ModalAvatar({
  channel,
  connection,
  isDark,
}: {
  channel: Channel;
  connection: Connection;
  isDark: boolean;
}) {
  const Icon = channel.icon;
  const [failed, setFailed] = useState(false);
  const hasAvatar = Boolean(connection.avatarUrl) && !failed;

  return (
    <div className="relative mb-9 h-[64px] w-[64px]">
      {hasAvatar ? (
        <img
          src={connection.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-[10px] object-cover"
        />
      ) : (
        <div
          className={[
            "flex h-full w-full items-center justify-center rounded-[10px]",
            isDark ? "bg-[#33373a] text-white" : "bg-zinc-100 text-black",
          ].join(" ")}
        >
          <Icon className="h-7 w-7" size={28} />
        </div>
      )}

      {/* check badge (top-left) */}
      <span
        className="absolute -left-[10px] -top-[10px] flex h-[24px] w-[24px] items-center justify-center rounded-full text-white"
        style={{ background: "#4c7a52" }}
      >
        <CheckIcon className="h-3 w-3" />
      </span>

      {/* platform badge (bottom-right) */}
      <span className="absolute -bottom-[10px] -right-[12px] flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-white text-black shadow">
        <Icon className="h-[14px] w-[14px]" size={14} />
      </span>
    </div>
  );
}

function PrimaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[34px] items-center gap-2 rounded-[8px] px-5 text-[14px] font-medium text-[#10230f] transition-all hover:brightness-110 active:scale-[0.98]"
      style={{ background: ACCENT }}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------------
   MODAL 1: CONFIRM ACCOUNT
--------------------------------------------------------------------------- */

function ConfirmAccountModal({
  channel,
  connection,
  t,
  isDark,
  onFinish,
  onClose,
}: {
  channel: Channel;
  connection: Connection;
  t: ThemeTokens;
  isDark: boolean;
  onFinish: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell
      isDark={isDark}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className={["flex items-center gap-2 text-[13px] font-semibold", t.text].join(" ")}
          >
            <HelpIcon className="h-4 w-4" /> Need Help?
          </button>
          <PrimaryButton onClick={onFinish}>
            Finish Connection <ArrowIcon className="h-4 w-4" />
          </PrimaryButton>
        </>
      }
    >
      <ModalAvatar channel={channel} connection={connection} isDark={isDark} />

      <h2 className={["text-center text-[20px] font-semibold tracking-[-0.01em]", t.text].join(" ")}>
        Confirm your account
      </h2>
      <p className={["mb-8 mt-3 text-center text-[14px]", t.text].join(" ")}>
        Is this the account you want to connect?
      </p>

      <div
        className={[
          "flex h-[52px] w-full items-center gap-3 rounded-[10px] border px-3",
          isDark ? "border-[#34373a] bg-[#1f2120]" : "border-zinc-200 bg-zinc-50",
        ].join(" ")}
        style={{ borderColor: ACCENT }}
      >
        <div className="flex-1">
          <p className={["text-[14px] font-medium", t.text].join(" ")}>
            {connection.handle || channel.name}
          </p>
          <p className={["text-[11px]", t.muted].join(" ")}>{channel.accountLabel}</p>
        </div>
        <span
          className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-2"
          style={{ borderColor: ACCENT }}
        >
          <span className="h-[8px] w-[8px] rounded-full" style={{ background: ACCENT }} />
        </span>
      </div>
    </ModalShell>
  );
}

/* ---------------------------------------------------------------------------
   MODAL 2: POSTING FREQUENCY
--------------------------------------------------------------------------- */

type FrequencyOption = {
  id: string;
  label: string;
  tile: ReactNode;
  tileBg: string;
  tileFg: string;
};

function PostingFrequencyModal({
  channel,
  connection,
  t,
  isDark,
  onNext,
  onClose,
}: {
  channel: Channel;
  connection: Connection;
  t: ThemeTokens;
  isDark: boolean;
  onNext: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState("3x");

  const options: FrequencyOption[] = [
    { id: "1x", label: "Keep it steady · 1 time/week", tile: "1x", tileBg: "#2a1f4a", tileFg: "#cdb8ff" },
    { id: "3x", label: "Build a presence · 3 times/week", tile: "3x", tileBg: "#5a2f10", tileFg: "#ffd2a8" },
    { id: "5x", label: "Reach new heights · 5 times/week", tile: "5x", tileBg: "#0f4a44", tileFg: "#a8f0e4" },
    { id: "custom", label: "Choose your goal", tile: <PencilIcon className="h-4 w-4" />, tileBg: "#4a1a4a", tileFg: "#f0a8f0" },
  ];

  return (
    <ModalShell
      isDark={isDark}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className={["flex items-center gap-2 text-[13px] font-semibold", t.text].join(" ")}
          >
            <HelpIcon className="h-4 w-4" /> What's a Recommended Time?
          </button>
          <PrimaryButton onClick={onNext}>
            Next <ArrowIcon className="h-4 w-4" />
          </PrimaryButton>
        </>
      }
    >
      <ModalAvatar channel={channel} connection={connection} isDark={isDark} />

      <h2 className={["text-center text-[20px] font-semibold tracking-[-0.01em]", t.text].join(" ")}>
        How many times a week would you like to post?
      </h2>
      <p className={["mb-8 mt-3 text-center text-[13.5px]", t.text].join(" ")}>
        This posting goal will tell us how many times to recommend per week.
      </p>

      <div className="flex w-full flex-col gap-[7px]">
        {options.map((opt) => {
          const active = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              className={[
                "flex h-[50px] w-full items-center gap-4 rounded-[10px] border px-[7px] text-left transition-colors",
                isDark ? "bg-[#222423]" : "bg-white",
                active
                  ? ""
                  : isDark
                  ? "border-[#2c2f2d] hover:border-[#3d413e]"
                  : "border-zinc-200 hover:border-zinc-300",
              ].join(" ")}
              style={active ? { borderColor: ACCENT } : undefined}
            >
              <span
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[7px] text-[16px] font-medium"
                style={{ background: opt.tileBg, color: opt.tileFg }}
              >
                {opt.tile}
              </span>

              <span className={["flex-1 text-[14px] font-medium", t.text].join(" ")}>
                {opt.label}
              </span>

              <span
                className="mr-3 flex h-[16px] w-[16px] items-center justify-center rounded-full border-2"
                style={{ borderColor: active ? ACCENT : isDark ? "#6b6f6c" : "#d4d4d8" }}
              >
                {active && (
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: ACCENT }} />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </ModalShell>
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

  // Onboarding Modals State
  const [onboardingChannel, setOnboardingChannel] = useState<ChannelKey | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);

  const tiktokBusy = useRef(false);
  const pinterestBusy = useRef(false);
  const youtubeBusy = useRef(false);
  const prevConnections = useRef<ConnectionState | null>(null);

  /* --------------------------------------------------------------------------
     NOTIFICATIONS & ONBOARDING TRIGGER
  -------------------------------------------------------------------------- */

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!prevConnections.current) {
      prevConnections.current = connections;
      return;
    }

    CHANNELS.forEach((channel) => {
      const prev = prevConnections.current![channel.key].connected;
      const curr = connections[channel.key].connected;

      if (prev !== curr) {
        if (curr) {
          showNotification(`${channel.name} connected successfully`);
          // Trigger Onboarding Flow
          setOnboardingChannel(channel.key);
          setShowConfirmModal(true);
        } else {
          showNotification(`${channel.name} disconnected`);
        }
      }
    });

    prevConnections.current = connections;
  }, [connections]);

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
        } catch (error) {
          console.warn(`[Stone] Could not load ${provider} status:`, error);
        }
      })();
    };

    sync("tiktok", returned.tiktok, getTikTokStatus);
    sync("pinterest", returned.pinterest, getPinterestStatus);
    sync("youtube", returned.youtube, getYouTubeStatus);

    return () => { cancelled = true; };
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
    setPendingKey(key);
    window.setTimeout(() => {
      setConnections((current) => ({
        ...current,
        [key]: current[key].connected
          ? { connected: false }
          : { connected: true, handle: mockHandleFor(key) },
      }));
      setPendingKey(null);
    }, 450);
  };

  const handleToggle = (key: ChannelKey) => {
    setErrorMessage(null);
    if (!connections[key].connected && limitReached) {
      setErrorMessage(`Your ${PLAN.name} plan allows up to ${PLAN.maxChannels} channels. Upgrade to connect more.`);
      return;
    }
    if (key === "tiktok") return void handleTikTokToggle();
    if (key === "pinterest") return void handlePinterestToggle();
    if (key === "youtube") return void handleYouTubeToggle();
    handlePlaceholderToggle(key);
  };

  const handleUpgrade = () => console.log("[Stone] Upgrade clicked");
  const openModal = () => { setErrorMessage(null); setShowConnectModal(true); };
  const closeModal = () => setShowConnectModal(false);

  // Onboarding Handlers
  const handleFinishConnection = () => {
    setShowConfirmModal(false);
    setShowFrequencyModal(true);
  };

  const handleFrequencyNext = () => {
    setShowFrequencyModal(false);
    setOnboardingChannel(null);
  };

  const handleCloseOnboarding = () => {
    setShowConfirmModal(false);
    setShowFrequencyModal(false);
    setOnboardingChannel(null);
  };

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

      {/* MODAL: ONBOARDING STEP 1 (CONFIRM ACCOUNT) */}
      {showConfirmModal && onboardingChannel && (
        <ConfirmAccountModal
          channel={CHANNELS.find((c) => c.key === onboardingChannel)!}
          connection={connections[onboardingChannel]}
          t={t}
          isDark={isDark}
          onFinish={handleFinishConnection}
          onClose={handleCloseOnboarding}
        />
      )}

      {/* MODAL: ONBOARDING STEP 2 (POSTING FREQUENCY) */}
      {showFrequencyModal && onboardingChannel && (
        <PostingFrequencyModal
          channel={CHANNELS.find((c) => c.key === onboardingChannel)!}
          connection={connections[onboardingChannel]}
          t={t}
          isDark={isDark}
          onNext={handleFrequencyNext}
          onClose={handleCloseOnboarding}
        />
      )}

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div
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