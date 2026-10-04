// src/components/DashboardSidebar.tsx
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { useTheme, type Theme } from "../hooks/useTheme";
import { navigate, useHashRoute } from "../hooks/useHashRoute";
import {
  useConnectedChannels,
  type ConnectedChannel,
} from "../hooks/useConnectedChannels";
import {
  getCurrentUser,
  signOut,
  type UserProfile,
} from "../services/supabase";
import { useUser } from "../contexts/UserContext";
import {
  XIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
  PinterestIcon,
  ThreadsIcon,
} from "./IntegrationIcons";
import ConnectChannelModal, {
  type ConnectChannelModalProps,
} from "./ConnectChannelModal";
import {
  CHANNELS,
  PLAN,
  REAL_OAUTH,
  type ChannelKey,
  type ConnectionState,
} from "../pages/channels";
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
   Types
============================================================================ */

type IconProps = { className?: string };
type IconComponent = (props: IconProps) => React.ReactElement;

type NavItem = {
  label: string;
  icon: IconComponent;
  route: string;
  badge?: string;
};

type NavSection = { label: string; items: NavItem[] };

type MenuItem = {
  label: string;
  icon: IconComponent;
  badge?: string;
  route?: string;
  action?: "logout";
};

type ThemeTokens = {
  aside: string;
  brand: string;
  divider: string;
  navActive: string;
  navIdle: string;
  bar: string;
  count: string;
  dotRing: string;
  rail: string;
  sub: string;
  subActive: string;
  row: string;
  rowOpen: string;
  avatar: string;
  title: string;
  muted: string;
  menu: string;
  menuDivider: string;
  menuItem: string;
  menuIcon: string;
  upgrade: string;
  badge: string;
  ring: string;
  kbd: string;
  meter: string;
  meterFill: string;
};

type ToggleThemeFn = (origin?: { x: number; y: number }) => void;

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
   Keyframes + guards
============================================================================ */

const SIDEBAR_KEYFRAMES = `
@keyframes sbMenuIn {
  from { opacity: 0; transform: translateY(6px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}
@keyframes sbTipIn {
  from { opacity: 0; transform: translate(-4px, -50%); }
  to   { opacity: 1; transform: translate(0, -50%); }
}
.sb-menu { animation: sbMenuIn 160ms cubic-bezier(0.32, 0.72, 0, 1) both; }
.sb-tip  { animation: sbTipIn 140ms cubic-bezier(0.32, 0.72, 0, 1) both; }

#app-sidebar button,
#app-sidebar svg,
#app-sidebar img {
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .sb-menu, .sb-tip { animation: none; }
}
`;

/* ============================================================================
   Icons
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
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const OverviewIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12.5 12 5l8 7.5" />
    <path d="M6 10.5V18h12v-7.5" />
  </Svg>
);
const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
    <path d="M8 3.5v4M16 3.5v4M3.5 9.5h17" />
  </Svg>
);
const AnalyticsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 18V9M12 18V5M19 18v-7M3 20h18" />
  </Svg>
);
const TemplatesIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 5.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
    <path d="M8 10h8M8 14h8" />
  </Svg>
);
const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);
const ChannelsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7.5" cy="7.5" r="2.5" />
    <circle cx="16.5" cy="7.5" r="2.5" />
    <circle cx="7.5" cy="16.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </Svg>
);
const BillingIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.2 5 4 0 1.1-1.1 1.9-2.5 1.9-1.2 0-2.2-.6-2.6-1.6M12 6.5V8M12 16v1.5" />
  </Svg>
);
const HelpIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.6-2.4 2.1-2.4 3.6M12 16.8v.1" />
  </Svg>
);
const LightbulbIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.3V16h6v-.2c0-.9.4-1.7 1-2.3A6 6 0 0 0 12 3Z" />
  </Svg>
);
const AppsIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </Svg>
);
const BetaIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 4h5M10.5 4v5.2L5.6 17.6A2 2 0 0 0 7.3 20.5h9.4a2 2 0 0 0 1.7-2.9l-4.9-8.4V4" />
    <path d="M8 15h8" />
  </Svg>
);
const LogoutIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10" />
    <path d="M14 8.5 18 12l-4 3.5M18 12H9.5" />
  </Svg>
);
const BoltIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 3.5 5.5 13.2h5.6L10 20.5l7.5-9.7h-5.6L13 3.5Z" />
  </Svg>
);
const PanelIcon = ({
  className,
  collapsed,
}: IconProps & { collapsed: boolean }) => (
  <Svg className={className}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <path d="M9.5 4.5v15" />
    <path d={collapsed ? "m13.5 10 2 2-2 2" : "m15.5 10-2 2 2 2"} />
  </Svg>
);
const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
const PublishIcon = CalendarIcon;
const CommunityIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5h10a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H8.5L5.5 16v-2.5H4A1.5 1.5 0 0 1 2.5 12V7A1.5 1.5 0 0 1 4 5.5Z" />
    <path d="M18.5 9.5H20a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-1.5V20l-3-2.5H11" />
  </Svg>
);
const InsightsIcon = AnalyticsIcon;

/* ============================================================================
   Tooltip (portail → jamais coupé par overflow, utile quand la sidebar est réduite)
============================================================================ */

function Tooltip({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled: boolean;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const show = (e: React.SyntheticEvent<HTMLElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.right + 12, y: r.top + r.height / 2 });
  };
  const hide = () => setPos(null);

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={hide}
    >
      {children}
      {enabled &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            style={{ left: pos.x, top: pos.y }}
            className="sb-tip pointer-events-none fixed z-[60] whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg ring-1 ring-white/10"
          >
            {label}
          </span>,
          document.body
        )}
    </div>
  );
}

/* ============================================================================
   Navigation data
============================================================================ */

const navSections: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", icon: OverviewIcon, route: "home" },
      { label: "Calendar", icon: CalendarIcon, route: "schedule" },
      { label: "Analytics", icon: AnalyticsIcon, route: "analytics" },
      { label: "Templates", icon: TemplatesIcon, route: "template" },
    ],
  },
];

const defaultAccount = {
  name: "Ronan",
  initials: "RN",
  email: "workspace@crew.io",
  organization: "My Organization",
  plan: "Free plan",
  channels: 0,
  avatarUrl: undefined as string | undefined,
};

const menuGroups: MenuItem[][] = [
  [
    { label: "Settings", icon: SettingsIcon, route: "settings" },
    { label: "Channels", icon: ChannelsIcon, route: "channels" },
    { label: "Plans and Billing", icon: BillingIcon, route: "pricing" },
    { label: "Help & Support", icon: HelpIcon, route: "faq" },
  ],
  [
    { label: "Create", icon: LightbulbIcon, badge: "New", route: "create" },
    { label: "Integrations", icon: AppsIcon, route: "integrations" },
    { label: "Beta Features", icon: BetaIcon },
  ],
  [{ label: "Log out", icon: LogoutIcon, action: "logout" }],
];

/* ============================================================================
   Navigation item
============================================================================ */

type NavItemViewProps = {
  item: NavItem;
  active: boolean;
  isCollapsed: boolean;
  labelClass: string;
  focus: string;
  t: ThemeTokens;
  onNavigate: (route: string) => void;
};

const NavItemView = memo(function NavItemView({
  item,
  active,
  isCollapsed,
  labelClass,
  focus,
  t,
  onNavigate,
}: NavItemViewProps) {
  const Icon = item.icon;

  return (
    <Tooltip label={item.label} enabled={isCollapsed}>
      <button
        type="button"
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        onClick={() => onNavigate(item.route)}
        className={[
          "group relative flex h-10 w-full items-center gap-3 overflow-hidden",
          "rounded-xl px-3 text-[13px] font-medium",
          "transition-[background-color,color,transform] duration-150",
          "active:scale-[0.98] motion-reduce:transition-none",
          focus,
          active ? t.navActive : t.navIdle,
        ].join(" ")}
      >
        {/* Indicateur de page active */}
        <span
          aria-hidden="true"
          className={[
            "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full",
            "transition-opacity duration-200",
            t.bar,
            active ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />

        <span className="relative flex shrink-0">
          <Icon className="h-[18px] w-[18px]" />
          {item.badge && (
            <span
              aria-hidden="true"
              className={[
                "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#ff5ec4] ring-2",
                t.dotRing,
                isCollapsed ? "opacity-100" : "opacity-0",
              ].join(" ")}
            />
          )}
        </span>

        <span className={["flex-1 text-left", labelClass].join(" ")}>
          {item.label}
        </span>

        {item.badge && (
          <span
            className={[
              "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              t.count,
              labelClass,
            ].join(" ")}
          >
            {item.badge}
          </span>
        )}
      </button>
    </Tooltip>
  );
});

/* ============================================================================
   Channels
============================================================================ */

type NetworkKey =
  | "x"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "threads";

const channelsMemory = { open: [] as string[] };

const NETWORK_ICONS: Record<NetworkKey, IconComponent> = {
  x: XIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
  threads: ThreadsIcon as IconComponent,
};

function getNetworkId(channel: ConnectedChannel): NetworkKey | null {
  const c = channel as unknown as Record<string, unknown>;
  const raw = String(c.platform ?? c.network ?? c.provider ?? channel.key)
    .toLowerCase()
    .trim();

  if (raw.includes("tiktok")) return "tiktok";
  if (raw.includes("insta")) return "instagram";
  if (raw.includes("youtube") || raw === "yt") return "youtube";
  if (raw.includes("facebook") || raw === "fb") return "facebook";
  if (raw.includes("linkedin")) return "linkedin";
  if (raw.includes("pinterest")) return "pinterest";
  if (raw.includes("threads")) return "threads";
  if (raw === "x" || raw.includes("twitter")) return "x";
  return null;
}

/** Canal ciblé par /#/insights?channel=<key> ou /#/community?channel=<key>. */
function getHashChannel(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return null;
  return new URLSearchParams(hash.slice(queryIndex + 1)).get("channel");
}

const CHANNEL_LINKS: {
  label: string;
  route: string;
  icon: IconComponent;
  badge?: string;
  perChannel?: boolean;
}[] = [
  { label: "Publish", route: "schedule", icon: PublishIcon },
  { label: "Community", route: "community", icon: CommunityIcon, perChannel: true },
  { label: "Insights", route: "insights", icon: InsightsIcon, badge: "New", perChannel: true },
];

const CHANNEL_ROUTES = new Set(["insights", "community"]);

function ChannelAvatar({
  channel,
  NetworkIcon,
  dotRing,
}: {
  channel: ConnectedChannel;
  NetworkIcon?: IconComponent;
  dotRing: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [channel.avatarUrl]);

  const label = channel.handle || channel.name;
  const initial = label.replace(/^@/, "").charAt(0).toUpperCase() || "?";

  return (
    <span className="relative h-7 w-7 shrink-0 transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none">
      {channel.avatarUrl && !failed ? (
        <img
          src={channel.avatarUrl}
          alt=""
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-neutral-700 text-[11px] font-semibold text-white">
          {initial}
        </span>
      )}

      {NetworkIcon && (
        <span
          className={[
            "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center",
            "rounded-full bg-white text-black ring-2",
            dotRing,
          ].join(" ")}
        >
          <NetworkIcon className="h-2.5 w-2.5" />
        </span>
      )}
    </span>
  );
}

type SidebarChannelsProps = {
  channels: ConnectedChannel[];
  isCollapsed: boolean;
  currentRoute: string;
  labelClass: string;
  focus: string;
  t: ThemeTokens;
  onNavigate: (route: string) => void;
  onExpand: () => void;
  onConnect: () => void;
};

function SidebarChannels({
  channels,
  isCollapsed,
  currentRoute,
  labelClass,
  focus,
  t,
  onNavigate,
  onExpand,
  onConnect,
}: SidebarChannelsProps) {
  const [openKeys, setOpenKeys] = useState<string[]>(channelsMemory.open);

  useEffect(() => {
    channelsMemory.open = openKeys;
  }, [openKeys]);

  const hashChannel = CHANNEL_ROUTES.has(currentRoute) ? getHashChannel() : null;

  // Le canal de la page courante s'ouvre tout seul : on sait toujours « où on est ».
  const activeChannelKey = CHANNEL_ROUTES.has(currentRoute)
    ? hashChannel ?? channels[0]?.key ?? null
    : null;

  useEffect(() => {
    if (!activeChannelKey) return;
    const key = `channel:${activeChannelKey}`;
    setOpenKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, [activeChannelKey]);

  const toggleKey = (key: string) =>
    setOpenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const openKey = (key: string) =>
    setOpenKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));

  return (
    <div>
      {/* En-tête de section */}
      <div
        aria-hidden={isCollapsed}
        className={[
          "flex items-center justify-between overflow-hidden whitespace-nowrap px-3",
          "transition-[height,margin,opacity] duration-300 motion-reduce:transition-none",
          isCollapsed ? "mb-0 h-0 opacity-0" : "mb-1 h-6 opacity-100 delay-100",
        ].join(" ")}
      >
        <span className={["text-[12px] font-medium", t.muted].join(" ")}>
          Channels
          {channels.length > 0 && (
            <span className="ml-1.5 tabular-nums opacity-70">
              {channels.length}
            </span>
          )}
        </span>

        <button
          type="button"
          tabIndex={isCollapsed ? -1 : 0}
          aria-label="Connect a channel"
          title="Connect a channel"
          onClick={onConnect}
          className={[
            "flex h-6 w-6 items-center justify-center rounded-md",
            "transition-colors duration-150 motion-reduce:transition-none",
            t.menuIcon,
            focus,
            t.row,
          ].join(" ")}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        {channels.map((channel) => {
          const id = getNetworkId(channel);
          const NetworkIcon = id ? NETWORK_ICONS[id] : undefined;
          const label = (channel.handle || channel.name).replace(/^@/, "");
          const groupKey = `channel:${channel.key}`;
          const isOpen = openKeys.includes(groupKey) && !isCollapsed;
          const isCurrent = activeChannelKey === channel.key;

          return (
            <div key={channel.key}>
              <Tooltip label={label} enabled={isCollapsed}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={label}
                  onClick={() => {
                    if (isCollapsed) {
                      onExpand();
                      openKey(groupKey);
                    } else {
                      toggleKey(groupKey);
                    }
                  }}
                  className={[
                    "group flex h-10 w-full items-center gap-3 overflow-hidden",
                    "rounded-xl px-2.5 text-[13px] font-medium",
                    "transition-[background-color,transform] duration-150",
                    "active:scale-[0.98] motion-reduce:transition-none",
                    focus,
                    isCurrent && !isOpen ? t.navActive : t.navIdle,
                  ].join(" ")}
                >
                  <ChannelAvatar
                    channel={channel}
                    NetworkIcon={NetworkIcon}
                    dotRing={t.dotRing}
                  />
                  <span
                    className={["min-w-0 flex-1 truncate text-left", labelClass].join(" ")}
                  >
                    {label}
                  </span>
                  <span className={["flex shrink-0", labelClass].join(" ")}>
                    <ChevronDownIcon
                      className={[
                        "h-3.5 w-3.5 opacity-50 group-hover:opacity-100",
                        "transition-[transform,opacity] duration-200 motion-reduce:transition-none",
                        isOpen ? "rotate-0" : "-rotate-90",
                      ].join(" ")}
                    />
                  </span>
                </button>
              </Tooltip>

              <div
                className={[
                  "grid transition-[grid-template-rows] duration-250 motion-reduce:transition-none",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                ].join(" ")}
              >
                <div className="overflow-hidden">
                  <div
                    className={[
                      "ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l pl-2.5",
                      t.rail,
                    ].join(" ")}
                  >
                    {CHANNEL_LINKS.map((link) => {
                      const Icon = link.icon;
                      const target = link.perChannel
                        ? `${link.route}?channel=${encodeURIComponent(channel.key)}`
                        : link.route;

                      const active = link.perChannel
                        ? link.route === currentRoute && activeChannelKey === channel.key
                        : link.route === currentRoute;

                      return (
                        <button
                          key={link.route}
                          type="button"
                          tabIndex={isOpen ? 0 : -1}
                          aria-current={active ? "page" : undefined}
                          onClick={() => onNavigate(target)}
                          className={[
                            "flex h-9 w-full items-center gap-2.5 whitespace-nowrap",
                            "rounded-lg px-2 text-left text-[13px] font-medium",
                            "transition-[background-color,color] duration-150 motion-reduce:transition-none",
                            focus,
                            active ? t.subActive : t.sub,
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{link.label}</span>
                          {link.badge && (
                            <span
                              className={[
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                t.badge,
                              ].join(" ")}
                            >
                              {link.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* État vide : une vraie invitation à agir */}
      {channels.length === 0 && !isCollapsed && (
        <button
          type="button"
          onClick={onConnect}
          className={[
            "mt-1 flex w-full flex-col items-start gap-0.5 rounded-xl border border-dashed px-3 py-3",
            "text-left transition-colors duration-150 motion-reduce:transition-none",
            t.rail,
            focus,
            t.navIdle,
          ].join(" ")}
        >
          <span className="flex items-center gap-2 text-[13px] font-medium">
            <PlusIcon className="h-4 w-4" />
            Connect a channel
          </span>
          <span className={["text-[12px] leading-4", t.muted].join(" ")}>
            Link an account to start publishing.
          </span>
        </button>
      )}

      {isCollapsed && (
        <div className="mt-1">
          <Tooltip label="Connect a channel" enabled>
            <button
              type="button"
              aria-label="Connect a channel"
              onClick={onConnect}
              className={[
                "flex h-10 w-full items-center justify-center rounded-xl",
                "transition-[background-color,transform] duration-150 active:scale-[0.98]",
                "motion-reduce:transition-none",
                focus,
                t.navIdle,
              ].join(" ")}
            >
              <PlusIcon className="h-[18px] w-[18px]" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   Sidebar memory (état partagé + persistance de l'état réduit)
============================================================================ */

const COLLAPSE_KEY = "stone:sidebar-collapsed";

function readStoredCollapsed(): boolean {
  try {
    const v = window.localStorage.getItem(COLLAPSE_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

const sidebarMemory = {
  collapsed: typeof window === "undefined" ? true : readStoredCollapsed(),
  entered: false,
};

/* Largeur + marge gauche (12px) + respiration (16px). */
export const SIDEBAR_COLLAPSED_OFFSET = 100;
export const SIDEBAR_EXPANDED_OFFSET = 276;

const sidebarListeners = new Set<() => void>();

function setSidebarCollapsed(value: boolean) {
  if (sidebarMemory.collapsed === value) return;
  sidebarMemory.collapsed = value;
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    /* stockage indisponible : on ignore */
  }
  sidebarListeners.forEach((listener) => listener());
}

function subscribeSidebar(listener: () => void) {
  sidebarListeners.add(listener);
  return () => {
    sidebarListeners.delete(listener);
  };
}

/** Marge gauche que les pages doivent appliquer pour ne pas toucher la sidebar. */
export function useSidebarOffset(): number {
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    () => sidebarMemory.collapsed,
    () => true
  );
  return collapsed ? SIDEBAR_COLLAPSED_OFFSET : SIDEBAR_EXPANDED_OFFSET;
}

const userProfileCache = { profile: null as UserProfile | null };

function resetSidebarModuleState() {
  userProfileCache.profile = null;
  setSidebarCollapsed(true);
  sidebarMemory.entered = false;
  channelsMemory.open = [];
}

/* ============================================================================
   Channel-connections helpers
============================================================================ */

const initialConnections: ConnectionState = {
  instagram: { connected: false },
  tiktok: { connected: false },
  youtube: { connected: false },
  facebook: { connected: false },
  pinterest: { connected: false },
  threads: { connected: false },
};

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

const isMac =
  typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform);

/* ============================================================================
   Sidebar
============================================================================ */

type DashboardSidebarProps = {
  theme?: Theme;
  onToggleTheme?: ToggleThemeFn;
};

export default function DashboardSidebar({ theme: themeProp }: DashboardSidebarProps) {
  const themeContext = useTheme();
  const theme = themeProp ?? themeContext.theme;
  const isDark = theme === "dark";

  const currentRoute = useHashRoute();
  const connectedChannels = useConnectedChannels();

  const { user } = useUser();
  const userId = user?.id ?? null;

  const [isCollapsed, setIsCollapsed] = useState(sidebarMemory.collapsed);
  const [menuOpen, setMenuOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(sidebarMemory.entered);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    userProfileCache.profile
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

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
  const [connectError, setConnectError] = useState<string | null>(null);

  const busy = useRef<Record<string, boolean>>({});

  const profileRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* ── Profil ── */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const userData = await getCurrentUser();
        if (mounted && userData) {
          userProfileCache.profile = userData;
          setUserProfile(userData);
          setAvatarLoadFailed(false);
        }
      } catch (error) {
        console.error("Error loading user profile in sidebar:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ── Statuts des canaux (cache + backend) + retour OAuth ── */
  useEffect(() => {
    if (!userId) return;

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

    if (tiktokError) setConnectError(`Unable to connect to TikTok. ${tiktokError}`);
    if (pinterestError) setConnectError(`Unable to connect to Pinterest. ${pinterestError}`);
    if (youtubeError) setConnectError(`Unable to connect to YouTube. ${youtubeError}`);

    if (returned.tiktok) clearCache(userId, "tiktok");
    if (returned.pinterest) clearCache(userId, "pinterest");
    if (returned.youtube) clearCache(userId, "youtube");

    if (
      (returned.tiktok || returned.pinterest || returned.youtube) &&
      basePath.includes("channels")
    ) {
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

    const sync = (
      provider: CacheProvider,
      justReturned: boolean,
      fetchStatus: () => Promise<StatusResponse>
    ) => {
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

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /* ── Entrée ── */
  useEffect(() => {
    if (sidebarMemory.entered) return;
    const id = requestAnimationFrame(() => {
      sidebarMemory.entered = true;
      setHasMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  /* ── Persistance de l'état réduit ── */
  useEffect(() => {
    setSidebarCollapsed(isCollapsed);
  }, [isCollapsed]);

  /* ── Raccourci clavier : Ctrl/⌘ + B ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        const el = e.target as HTMLElement | null;
        if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) {
          return;
        }
        e.preventDefault();
        setMenuOpen(false);
        setIsCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── Le menu se ferme à chaque navigation ── */
  useEffect(() => {
    setMenuOpen(false);
  }, [currentRoute]);

  /* ── Menu compte : clic extérieur, Échap, flèches ── */
  useEffect(() => {
    if (!menuOpen) return;

    // Focus sur le premier élément pour une navigation clavier immédiate.
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const onPointerDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []
        );
        if (!items.length) return;
        event.preventDefault();

        const i = items.indexOf(document.activeElement as HTMLElement);
        const next =
          event.key === "ArrowDown"
            ? items[(i + 1) % items.length]
            : items[(i - 1 + items.length) % items.length];
        next.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  /* ── Tokens de thème ── */
  const t = useMemo<ThemeTokens>(
    () =>
      isDark
        ? {
            aside: "border-white/[0.08] bg-[#0c0c0e] shadow-[0_12px_40px_rgba(0,0,0,0.55)]",
            brand: "text-white",
            divider: "bg-white/[0.08]",
            navActive: "bg-violet-400/15 text-white",
            navIdle: "text-[#c9c9c5] hover:bg-white/[0.06] hover:text-white",
            bar: "bg-violet-400",
            count: "bg-white/10 text-[#d7d7d2]",
            dotRing: "ring-[#0c0c0e]",
            rail: "border-white/10",
            sub: "text-[#9a9a96] hover:bg-white/[0.06] hover:text-white",
            subActive: "bg-violet-400/15 text-white",
            row: "hover:bg-white/10",
            rowOpen: "bg-white/10",
            avatar: "bg-[#ecebe6] text-[#111]",
            title: "text-[#f3f3ef]",
            muted: "text-[#8e8e8a]",
            menu: "border-white/10 bg-[#18181b] text-[#f3f3ef] shadow-[0_18px_40px_rgba(0,0,0,0.55)]",
            menuDivider: "border-white/[0.08]",
            menuItem: "text-[#ecece8] hover:bg-white/[0.07] focus-visible:bg-white/[0.07]",
            menuIcon: "text-[#a2a29e]",
            upgrade: "border-violet-400/30 bg-violet-400/10 text-violet-200 hover:bg-violet-400/20",
            badge: "bg-violet-400/20 text-violet-200",
            ring: "focus-visible:ring-violet-300/50",
            kbd: "border-white/15 text-[#a2a29e]",
            meter: "bg-white/10",
            meterFill: "bg-violet-400",
          }
        : {
            aside: "border-black/[0.08] bg-white shadow-[0_12px_40px_rgba(20,20,40,0.10)]",
            brand: "text-[#151515]",
            divider: "bg-black/[0.07]",
            navActive: "bg-violet-600/10 text-violet-800",
            navIdle: "text-[#43433f] hover:bg-black/[0.045] hover:text-[#151515]",
            bar: "bg-violet-600",
            count: "bg-black/[0.05] text-[#3f3f3d]",
            dotRing: "ring-white",
            rail: "border-black/[0.09]",
            sub: "text-[#73726e] hover:bg-black/[0.045] hover:text-[#151515]",
            subActive: "bg-violet-600/10 text-violet-800",
            row: "hover:bg-black/[0.045]",
            rowOpen: "bg-black/[0.05]",
            avatar: "bg-[#1d1d1d] text-white",
            title: "text-[#1b1b1a]",
            muted: "text-[#73726e]",
            menu: "border-black/10 bg-white text-[#1a1a1a] shadow-[0_18px_40px_rgba(0,0,0,0.14)]",
            menuDivider: "border-black/[0.07]",
            menuItem: "text-[#1f1f1e] hover:bg-black/[0.045] focus-visible:bg-black/[0.045]",
            menuIcon: "text-[#6b6a67]",
            upgrade: "border-violet-600/20 bg-violet-600/[0.07] text-violet-800 hover:bg-violet-600/[0.12]",
            badge: "bg-violet-600/10 text-violet-800",
            ring: "focus-visible:ring-violet-500/40",
            kbd: "border-black/15 text-[#73726e]",
            meter: "bg-black/[0.08]",
            meterFill: "bg-violet-600",
          },
    [isDark]
  );

  const focus = ["focus-visible:outline-none", "focus-visible:ring-2", t.ring].join(" ");

  const labelClass = useMemo(
    () =>
      [
        "whitespace-nowrap transition-[opacity,transform] ease-[cubic-bezier(0.4,0,0.2,1)]",
        "motion-reduce:transition-none",
        isCollapsed
          ? "-translate-x-1 opacity-0 duration-100"
          : "translate-x-0 opacity-100 duration-250 delay-75",
      ].join(" "),
    [isCollapsed]
  );

  /* ── Actions ── */
  const toggleCollapsed = useCallback(() => {
    setMenuOpen(false);
    setIsCollapsed((v) => !v);
  }, []);

  const handleNavigate = useCallback((route: string) => navigate(route), []);

  const openConnect = useCallback(() => {
    setMenuOpen(false);
    setConnectError(null);
    setConnectOpen(true);
  }, []);

  const closeConnect = useCallback(() => setConnectOpen(false), []);

  /* ── Connexions OAuth (logique commune aux 3 réseaux réels) ── */
  const limitReached =
    Object.values(connections).filter((c) => c.connected).length >= PLAN.maxChannels;

  const runOAuthToggle = async (
    key: "tiktok" | "pinterest" | "youtube",
    name: string,
    disconnect: () => Promise<unknown>,
    login: () => Promise<unknown>,
    manualConnect?: () => Promise<Connection | null>
  ) => {
    if (busy.current[key]) return;
    busy.current[key] = true;

    setPendingKey(key);
    let redirecting = false;

    try {
      if (connections[key].connected) {
        await disconnect();
        if (userId) clearCache(userId, key);
        setConnections((c) => ({ ...c, [key]: { connected: false } }));
      } else if (manualConnect) {
        const connection = await manualConnect();
        if (connection) {
          if (userId) writeCache(userId, connection, key);
          setConnections((c) => ({ ...c, [key]: connection }));
        }
      } else {
        await login();
        redirecting = true;
      }
    } catch (error) {
      console.error(`[Stone] ${name} OAuth error:`, error);
      setConnectError(formatOAuthError(name, error));
    } finally {
      if (!redirecting) {
        setPendingKey(null);
        busy.current[key] = false;
      }
    }
  };

  const pinterestManual =
    import.meta.env.VITE_PINTEREST_MANUAL_TOKEN === "true"
      ? async (): Promise<Connection | null> => {
          const token = window.prompt(
            "Pinterest access token (généré dans le portail développeur) :"
          );
          if (!token?.trim()) return null;

          const account = await connectPinterestWithToken(token.trim());
          return {
            connected: true,
            handle: account?.display_name ?? undefined,
            avatarUrl: account?.avatar_url ?? undefined,
          };
        }
      : undefined;

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
    setConnectError(null);

    if (!connections[key].connected && limitReached) {
      setConnectError(
        `Your ${PLAN.name} plan allows up to ${PLAN.maxChannels} channels. Upgrade to connect more.`
      );
      return;
    }

    if (key === "tiktok") {
      void runOAuthToggle("tiktok", "TikTok", disconnectTikTok, startTikTokLogin);
    } else if (key === "pinterest") {
      void runOAuthToggle(
        "pinterest",
        "Pinterest",
        disconnectPinterest,
        startPinterestLogin,
        pinterestManual
      );
    } else if (key === "youtube") {
      void runOAuthToggle("youtube", "YouTube", disconnectYouTube, startYouTubeLogin);
    } else {
      handlePlaceholderToggle(key);
    }
  };

  /* ── Logout ── */
  const handleLogout = useCallback(async () => {
    if (loggingOut) return;

    setMenuOpen(false);
    setLoggingOut(true);

    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      resetSidebarModuleState();
      window.location.replace("/");
    }
  }, [loggingOut]);

  /* ── Données du compte ── */
  const account = userProfile
    ? {
        name:
          `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() || "User",
        initials:
          `${(userProfile.first_name || "")[0] || ""}${
            (userProfile.last_name || "")[0] || ""
          }`.toUpperCase() || "U",
        email: userProfile.email,
        organization: "My Organization",
        plan: "Free plan",
        channels: connectedChannels.length,
        avatarUrl: userProfile.avatar_url || undefined,
      }
    : { ...defaultAccount, channels: connectedChannels.length };

  const showAvatarImage = Boolean(account.avatarUrl) && !avatarLoadFailed;
  const usage = Math.min(100, (account.channels / Math.max(1, PLAN.maxChannels)) * 100);

  const channelConnectProps: Omit<ConnectChannelModalProps, "isDark" | "onClose"> = {
    channels: CHANNELS,
    connections,
    pendingKey,
    limitReached,
    planName: PLAN.name,
    realOAuthKeys: REAL_OAUTH,
    errorMessage: connectError,
    onToggle: handleToggle,
  };

  let menuItemIndex = 0;

  /* ==========================================================================
     Render
  ========================================================================== */

  return (
    <div
      className={[
        "fixed inset-y-3 left-3 z-20",
        "transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "motion-reduce:transition-none",
        hasMounted ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0",
      ].join(" ")}
    >
      <style>{SIDEBAR_KEYFRAMES}</style>

      <aside
        id="app-sidebar"
        className={[
          "relative flex h-full flex-col overflow-visible rounded-3xl border px-3 pb-3 pt-4",
          "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "motion-reduce:transition-none",
          t.aside,
          isCollapsed ? "w-[72px]" : "w-[248px]",
        ].join(" ")}
      >
        {/* Logo */}
        <div className={["flex h-10 items-center gap-2.5 overflow-hidden px-2", t.brand].join(" ")}>
          <img
            src={isDark ? "/images/icon_nav.png" : "/images/icon.png"}
            alt="Stone logo"
            draggable={false}
            className="h-8 w-7 shrink-0 object-contain"
          />
          <span
            className={["text-[18px] font-semibold leading-none tracking-tight", labelClass].join(" ")}
          >
            Stone
          </span>
        </div>

        {/* Navigation */}
        <nav
          className="-mx-1 mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Main"
        >
          {navSections.map((section) => (
            <div key={section.label}>
              <div
                aria-hidden={isCollapsed}
                className={[
                  "overflow-hidden whitespace-nowrap px-3 text-[12px] font-medium leading-4",
                  "transition-[height,margin,opacity] duration-300 motion-reduce:transition-none",
                  t.muted,
                  isCollapsed ? "mb-0 h-0 opacity-0" : "mb-1 h-4 opacity-100 delay-100",
                ].join(" ")}
              >
                {section.label}
              </div>

              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavItemView
                    key={item.label}
                    item={item}
                    active={item.route === currentRoute}
                    isCollapsed={isCollapsed}
                    labelClass={labelClass}
                    focus={focus}
                    t={t}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="mt-3">
            <div className={["mx-1 mb-3 h-px", t.divider].join(" ")} />
            <SidebarChannels
              channels={connectedChannels}
              isCollapsed={isCollapsed}
              currentRoute={currentRoute}
              labelClass={labelClass}
              focus={focus}
              t={t}
              onNavigate={handleNavigate}
              onExpand={() => setIsCollapsed(false)}
              onConnect={openConnect}
            />
          </div>
        </nav>

        {/* Bas de sidebar : réduire + compte */}
        <div ref={profileRef} className="mt-3 flex flex-col gap-1">
          <div className={["mx-1 mb-1 h-px", t.divider].join(" ")} />

          {/* Bouton réduire / agrandir, découvrable et avec son raccourci */}
          <Tooltip
            label={`Expand sidebar  ${isMac ? "⌘" : "Ctrl"}+B`}
            enabled={isCollapsed}
          >
            <button
              type="button"
              aria-expanded={!isCollapsed}
              aria-controls="app-sidebar"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleCollapsed}
              className={[
                "group flex h-9 w-full items-center gap-3 overflow-hidden rounded-xl px-3",
                "text-[13px] font-medium transition-colors duration-150 motion-reduce:transition-none",
                focus,
                t.navIdle,
              ].join(" ")}
            >
              <PanelIcon className="h-[18px] w-[18px] shrink-0" collapsed={isCollapsed} />
              <span className={["flex-1 text-left", labelClass].join(" ")}>Collapse</span>
              <kbd
                className={[
                  "rounded border px-1.5 py-px font-sans text-[10px] font-medium",
                  t.kbd,
                  labelClass,
                ].join(" ")}
              >
                {isMac ? "⌘" : "Ctrl"} B
              </kbd>
            </button>
          </Tooltip>

          <div className="relative">
            {menuOpen && (
              <div
                ref={menuRef}
                id="account-menu"
                role="menu"
                aria-label="Account menu"
                className={[
                  "sb-menu absolute bottom-full left-0 z-50 mb-2 w-[264px]",
                  "origin-bottom-left overflow-hidden rounded-2xl border",
                  t.menu,
                ].join(" ")}
              >
                {/* En-tête : qui + où j'en suis sur mon plan */}
                <div className="px-3.5 pb-3 pt-3.5">
                  <div className="truncate text-[14px] font-semibold">{account.name}</div>
                  <div className={["truncate text-[12px]", t.muted].join(" ")}>
                    {account.email}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span className={t.muted}>{account.plan}</span>
                      <span className="tabular-nums font-medium">
                        {account.channels}/{PLAN.maxChannels} channels
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={PLAN.maxChannels}
                      aria-valuenow={account.channels}
                      aria-label="Channels used"
                      className={["mt-1.5 h-1.5 overflow-hidden rounded-full", t.meter].join(" ")}
                    >
                      <div
                        className={["h-full rounded-full transition-[width] duration-500", t.meterFill].join(" ")}
                        style={{ width: `${usage}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("pricing");
                    }}
                    className={[
                      "group mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2",
                      "text-[12px] font-semibold transition-[background-color,transform] duration-150",
                      "active:scale-[0.98] motion-reduce:transition-none",
                      focus,
                      t.upgrade,
                    ].join(" ")}
                  >
                    <BoltIcon className="h-4 w-4 transition-transform duration-200 group-hover:-rotate-12" />
                    Upgrade plan
                  </button>
                </div>

                {menuGroups.map((group, groupIndex) => (
                  <div
                    key={group[0]?.label ?? groupIndex}
                    role="none"
                    className={["border-t px-1.5 py-1.5", t.menuDivider].join(" ")}
                  >
                    {group.map((item) => {
                      const Icon = item.icon;
                      const isLogout = item.action === "logout";
                      menuItemIndex++;

                      return (
                        <button
                          key={item.label}
                          type="button"
                          role="menuitem"
                          disabled={isLogout && loggingOut}
                          onClick={() => {
                            if (isLogout) {
                              void handleLogout();
                              return;
                            }
                            setMenuOpen(false);
                            if (item.route) navigate(item.route);
                          }}
                          className={[
                            "group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2",
                            "text-left text-[13px] font-medium",
                            "transition-colors duration-150 motion-reduce:transition-none",
                            "disabled:cursor-wait disabled:opacity-60",
                            focus,
                            t.menuItem,
                          ].join(" ")}
                        >
                          <Icon className={["h-4 w-4 shrink-0", t.menuIcon].join(" ")} />
                          <span className="flex-1 truncate">
                            {isLogout && loggingOut ? "Logging out…" : item.label}
                          </span>
                          {item.badge && (
                            <span
                              className={[
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                t.badge,
                              ].join(" ")}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Carte profil */}
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="account-menu"
              aria-label="Open account menu"
              title={isCollapsed ? account.name : undefined}
              onClick={() => setMenuOpen((v) => !v)}
              className={[
                "group flex h-12 w-full items-center gap-3 overflow-hidden rounded-xl px-2",
                "transition-[background-color,transform] duration-150",
                "active:scale-[0.98] motion-reduce:transition-none",
                focus,
                menuOpen ? t.rowOpen : t.row,
              ].join(" ")}
            >
              {showAvatarImage ? (
                <img
                  key={account.avatarUrl}
                  src={account.avatarUrl}
                  alt="Profile"
                  draggable={false}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    "text-[11px] font-semibold",
                    t.avatar,
                  ].join(" ")}
                >
                  {account.initials}
                </span>
              )}

              <span className={["min-w-0 flex-1 text-left", labelClass].join(" ")}>
                <span className={["block truncate text-[13px] font-medium leading-4", t.title].join(" ")}>
                  {account.name}
                </span>
                <span className={["block truncate text-[11px] leading-4", t.muted].join(" ")}>
                  {account.plan}
                </span>
              </span>

              <ChevronDownIcon
                className={[
                  "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                  t.muted,
                  labelClass,
                  menuOpen ? "" : "rotate-180",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
      </aside>

      {connectOpen && (
        <ConnectChannelModal {...channelConnectProps} isDark={isDark} onClose={closeConnect} />
      )}
    </div>
  );
}