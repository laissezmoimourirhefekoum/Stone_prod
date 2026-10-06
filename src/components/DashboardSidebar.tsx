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
};

type NavSection = {
  label: string;
  items: NavItem[];
};

type MenuItem = {
  label: string;
  icon: IconComponent;
  route?: string;
  action?: "logout";
};

type ThemeTokens = {
  aside: string;
  divider: string;
  navActive: string;
  navIdle: string;
  accent: string;
  muted: string;
  title: string;
  row: string;
  rowOpen: string;
  surface: string;
  track: string;
  cta: string;
  kbd: string;
  badge: string;
  tabActive: string;
  tabIdle: string;
  menu: string;
  menuDivider: string;
  menuItem: string;
  menuIcon: string;
  avatar: string;
  dotRing: string;
  ring: string;
};

type ToggleThemeFn = (origin?: { x: number; y: number }) => void;

/** Réponse des endpoints /status (TikTok, Pinterest, YouTube). */
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
   Keyframes
============================================================================ */

const SIDEBAR_KEYFRAMES = `
@keyframes sbMenuIn {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: none; }
}
@keyframes sbFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.sb-menu { animation: sbMenuIn 180ms cubic-bezier(0.32, 0.72, 0, 1) both; }
.sb-fade { animation: sbFade 220ms ease-out 120ms both; }

#app-sidebar button,
#app-sidebar svg,
#app-sidebar img {
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .sb-menu, .sb-fade { animation: none; }
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
      className={["select-none", className].join(" ")}
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

const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

const ChevronUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 15 6-6 6 6" />
  </Svg>
);

const PublishIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12 20 4l-6 16-3-6.5L4 12Z" />
  </Svg>
);

const CommunityIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5h10a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H8.5L5.5 16v-2.5H4A1.5 1.5 0 0 1 2.5 12V7A1.5 1.5 0 0 1 4 5.5Z" />
    <path d="M18.5 9.5H20a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-1.5V20l-3-2.5H11" />
  </Svg>
);

const InsightsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 18V9M12 18V5M19 18v-7M3 20h18" />
  </Svg>
);

/** Icône « panneau latéral » : le panneau gauche se remplit quand la sidebar est ouverte. */
function SidebarToggleIcon({ className, open }: IconProps & { open: boolean }) {
  return (
    <Svg className={className}>
      <rect
        x="3.5"
        y="4.5"
        width="6"
        height="15"
        rx="2"
        fill="currentColor"
        stroke="none"
        className={[
          "transition-opacity duration-300 motion-reduce:transition-none",
          open ? "opacity-30" : "opacity-0",
        ].join(" ")}
      />
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M9.5 4.5v15" />
    </Svg>
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
      { label: "Templates", icon: TemplatesIcon, route: "template" },
      { label: "Integrations", icon: AppsIcon, route: "integrations" },
    ],
  },
];

const defaultAccount = {
  name: "Ronan",
  initials: "RN",
  email: "workspace@crew.io",
  plan: "Free plan",
  channels: 0,
  avatarUrl: undefined as string | undefined,
};

const menuGroups: MenuItem[][] = [
  [
    { label: "Settings", icon: SettingsIcon, route: "settings" },
    { label: "Channels", icon: ChannelsIcon, route: "channels" },
    { label: "Plans and billing", icon: BillingIcon, route: "pricing" },
  ],
  [
    { label: "Help & support", icon: HelpIcon, route: "faq" },
    { label: "Beta features", icon: BetaIcon },
  ],
  [{ label: "Log out", icon: LogoutIcon, action: "logout" }],
];

/* ============================================================================
   Navigation item
============================================================================ */

/** Barre d'accent collée au bord gauche de la sidebar : indique l'élément actif. */
function ActiveBar({ accent }: { accent: string }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "absolute -left-3 bottom-2 top-2 w-[3px] rounded-r-full",
        accent,
      ].join(" ")}
    />
  );
}

type NavItemViewProps = {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  focus: string;
  t: ThemeTokens;
  onNavigate: (route: string) => void;
};

const NavItemView = memo(function NavItemView({
  item,
  isActive,
  isCollapsed,
  focus,
  t,
  onNavigate,
}: NavItemViewProps) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? item.label : undefined}
      onClick={() => onNavigate(item.route)}
      className={[
        "group relative flex h-10 w-full items-center gap-3 rounded-lg px-[14px]",
        "text-[13px] font-medium",
        "transition-[background-color,color,transform] duration-150",
        "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
        focus,
        isActive ? t.navActive : t.navIdle,
      ].join(" ")}
    >
      {isActive && <ActiveBar accent={t.accent} />}
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="sb-fade truncate">{item.label}</span>}
    </button>
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

const channelsMemory = { selected: null as string | null };

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

/** Canal ciblé par /#/insights?channel=<key> ou /#/community?channel=<key> (null si absent). */
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
  isNew?: boolean;
  /** Le lien porte le canal : /#/<route>?channel=<key> */
  perChannel?: boolean;
}[] = [
  { label: "Publish", route: "schedule", icon: PublishIcon },
  { label: "Community", route: "community", icon: CommunityIcon, perChannel: true },
  { label: "Insights", route: "insights", icon: InsightsIcon, isNew: true, perChannel: true },
];

/** Routes dont le canal ouvert est porté par le hash (?channel=<key>). */
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
    <span className="relative h-7 w-7 shrink-0">
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
            "absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center",
            "rounded-[4px] bg-white text-black ring-2",
            dotRing,
          ].join(" ")}
        >
          <NetworkIcon className="h-2 w-2" />
        </span>
      )}
    </span>
  );
}

type SidebarChannelsProps = {
  channels: ConnectedChannel[];
  isCollapsed: boolean;
  currentRoute: string;
  focus: string;
  t: ThemeTokens;
  onNavigate: (route: string) => void;
  onConnect: () => void;
};

/**
 * UX : un canal = une ligne. Un clic le sélectionne et garde la section en
 * cours (Community / Insights). Le sélecteur de section n'apparaît que sous le
 * canal actif, sous forme d'onglets compacts.
 */
function SidebarChannels({
  channels,
  isCollapsed,
  currentRoute,
  focus,
  t,
  onNavigate,
  onConnect,
}: SidebarChannelsProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(
    channelsMemory.selected
  );

  useEffect(() => {
    channelsMemory.selected = selectedKey;
  }, [selectedKey]);

  const exists = (key: string | null) =>
    key !== null && channels.some((c) => c.key === key);

  // currentRoute change à chaque navigation : on relit le canal du hash au rendu.
  const hashChannel = CHANNEL_ROUTES.has(currentRoute) ? getHashChannel() : null;

  const activeKey = exists(hashChannel)
    ? hashChannel
    : exists(selectedKey)
      ? selectedKey
      : (channels[0]?.key ?? null);

  const selectChannel = (key: string) => {
    setSelectedKey(key);
    const route = CHANNEL_ROUTES.has(currentRoute) ? currentRoute : "insights";
    onNavigate(`${route}?channel=${encodeURIComponent(key)}`);
  };

  return (
    <div>
      {/* En-tête : titre, quota, ajout */}
      {!isCollapsed && (
        <div className="sb-fade mb-1.5 flex h-6 items-center justify-between pl-[14px] pr-1">
          <span className="flex items-center gap-2">
            <span className={["text-[12px] font-medium", t.muted].join(" ")}>
              Channels
            </span>
            <span
              className={[
                "rounded-full px-1.5 py-px text-[10.5px] font-semibold tabular-nums",
                t.kbd,
              ].join(" ")}
            >
              {channels.length}/{PLAN.maxChannels}
            </span>
          </span>

          <button
            type="button"
            aria-label="Connect a channel"
            title="Connect a channel"
            onClick={onConnect}
            className={[
              "flex h-6 w-6 items-center justify-center rounded-md",
              "transition-colors duration-150 motion-reduce:transition-none",
              t.menuIcon,
              t.row,
              focus,
            ].join(" ")}
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {channels.map((channel) => {
          const id = getNetworkId(channel);
          const NetworkIcon = id ? NETWORK_ICONS[id] : undefined;
          const label = (channel.handle || channel.name).replace(/^@/, "");
          const selected = channel.key === activeKey;

          return (
            <div key={channel.key}>
              <button
                type="button"
                aria-pressed={selected}
                title={isCollapsed ? label : undefined}
                onClick={() => selectChannel(channel.key)}
                className={[
                  "relative flex h-11 w-full items-center gap-3 rounded-lg px-[10px]",
                  "text-[13px] font-medium",
                  "transition-[background-color,color,transform] duration-150",
                  "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
                  focus,
                  selected ? t.navActive : t.navIdle,
                ].join(" ")}
              >
                {selected && <ActiveBar accent={t.accent} />}
                <ChannelAvatar
                  channel={channel}
                  NetworkIcon={NetworkIcon}
                  dotRing={t.dotRing}
                />
                {!isCollapsed && (
                  <span className="sb-fade min-w-0 flex-1 truncate text-left">
                    {label}
                  </span>
                )}
              </button>

              {/* Sections du canal sélectionné */}
              {selected && !isCollapsed && (
                <div
                  role="group"
                  aria-label={`Sections for ${label}`}
                  className={[
                    "sb-fade mb-1 mt-1 grid grid-cols-3 gap-1 rounded-xl border p-1",
                    t.surface,
                  ].join(" ")}
                >
                  {CHANNEL_LINKS.map((link) => {
                    const Icon = link.icon;

                    const target = link.perChannel
                      ? `${link.route}?channel=${encodeURIComponent(channel.key)}`
                      : link.route;

                    const active = link.route === currentRoute;

                    return (
                      <button
                        key={link.route}
                        type="button"
                        aria-current={active ? "page" : undefined}
                        onClick={() => onNavigate(target)}
                        className={[
                          "relative flex flex-col items-center gap-1 rounded-lg py-2",
                          "text-[11px] font-medium",
                          "transition-colors duration-150 motion-reduce:transition-none",
                          focus,
                          active ? t.tabActive : t.tabIdle,
                        ].join(" ")}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        {link.label}
                        {link.isNew && (
                          <span
                            aria-label="New"
                            className={[
                              "absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full",
                              t.accent,
                            ].join(" ")}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* État vide / ajout */}
      {channels.length === 0 && !isCollapsed && (
        <button
          type="button"
          onClick={onConnect}
          className={[
            "sb-fade flex w-full flex-col items-start gap-1 rounded-xl border border-dashed p-3 text-left",
            "transition-colors duration-150 motion-reduce:transition-none",
            t.divider,
            t.navIdle,
            focus,
          ].join(" ")}
        >
          <span className="flex items-center gap-2 text-[13px] font-semibold">
            <PlusIcon className="h-4 w-4" />
            Connect your first channel
          </span>
          <span className={["text-[11.5px] leading-snug", t.muted].join(" ")}>
            Link an account to schedule posts and see your results.
          </span>
        </button>
      )}

      {isCollapsed && (
        <button
          type="button"
          aria-label="Connect a channel"
          title="Connect a channel"
          onClick={onConnect}
          className={[
            "mt-1 flex h-10 w-full items-center justify-center rounded-lg",
            "transition-colors duration-150 motion-reduce:transition-none",
            t.menuIcon,
            t.row,
            focus,
          ].join(" ")}
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

/* ============================================================================
   Sidebar memory
============================================================================ */

const SIDEBAR_STORAGE_KEY = "stone.sidebar.collapsed";

/** Dernier état choisi par l'utilisateur (fermée par défaut). */
function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

/** Libellé du raccourci clavier selon la plateforme. */
const TOGGLE_SHORTCUT_LABEL =
  typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform)
    ? "⌘B"
    : "Ctrl B";

const sidebarMemory = {
  collapsed: readStoredCollapsed(),
  entered: false,
};

/* Largeurs de la sidebar (collée au bord gauche) + 24px de respiration. */
const SIDEBAR_COLLAPSED_WIDTH = 72;
const SIDEBAR_EXPANDED_WIDTH = 264;
export const SIDEBAR_COLLAPSED_OFFSET = SIDEBAR_COLLAPSED_WIDTH + 24;
export const SIDEBAR_EXPANDED_OFFSET = SIDEBAR_EXPANDED_WIDTH + 24;

const sidebarListeners = new Set<() => void>();

function setSidebarCollapsed(value: boolean) {
  if (sidebarMemory.collapsed === value) return;

  sidebarMemory.collapsed = value;

  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
  } catch {
    /* stockage indisponible : on garde juste l'état en mémoire */
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

const userProfileCache = {
  profile: null as UserProfile | null,
};

function resetSidebarModuleState() {
  userProfileCache.profile = null;
  setSidebarCollapsed(true);
  sidebarMemory.entered = false;
  channelsMemory.selected = null;
}

/* ============================================================================
   Channel-connections helpers (self-contained modal)
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

/* ============================================================================
   Theme tokens
============================================================================ */

const DARK_TOKENS: ThemeTokens = {
  aside: "border-white/[0.07] bg-[#0b0b0d]",
  divider: "border-white/[0.07]",
  navActive: "bg-white/[0.08] text-white",
  navIdle: "text-white/65 hover:bg-white/[0.05] hover:text-white",
  accent: "bg-[#ff5ec4]",
  muted: "text-white/45",
  title: "text-white",
  row: "hover:bg-white/[0.06]",
  rowOpen: "bg-white/[0.08]",
  surface: "border-white/[0.07] bg-white/[0.03]",
  track: "bg-white/10",
  cta: "bg-white text-black hover:bg-white/90",
  kbd: "bg-white/10 text-white/70",
  badge: "bg-[#4a2f4a] text-[#f0bdf0]",
  tabActive: "bg-white/[0.12] text-white",
  tabIdle: "text-white/55 hover:bg-white/[0.06] hover:text-white",
  menu: "border-white/10 bg-[#161618] text-[#f3f3ef] shadow-[0_18px_40px_rgba(0,0,0,0.55)]",
  menuDivider: "border-white/10",
  menuItem: "text-white/85 hover:bg-white/[0.06] focus-visible:bg-white/[0.06]",
  menuIcon: "text-white/50",
  avatar: "bg-[#f0f0ed] text-[#111111]",
  dotRing: "ring-[#0b0b0d]",
  ring: "focus-visible:ring-white/30",
};

const LIGHT_TOKENS: ThemeTokens = {
  aside: "border-black/[0.08] bg-[#fbfaf8]",
  divider: "border-black/[0.08]",
  navActive: "bg-black/[0.06] text-[#151515]",
  navIdle: "text-[#4a4946] hover:bg-black/[0.04] hover:text-[#151515]",
  accent: "bg-[#e0359f]",
  muted: "text-[#76746f]",
  title: "text-[#1b1b1a]",
  row: "hover:bg-black/[0.05]",
  rowOpen: "bg-black/[0.06]",
  surface: "border-black/[0.07] bg-black/[0.025]",
  track: "bg-black/10",
  cta: "bg-[#151515] text-white hover:bg-[#2a2a29]",
  kbd: "bg-black/[0.06] text-[#4a4946]",
  badge: "bg-[#f3dcf3] text-[#7a2f7a]",
  tabActive: "bg-white text-[#151515] shadow-sm",
  tabIdle: "text-[#76746f] hover:bg-black/[0.04] hover:text-[#151515]",
  menu: "border-black/10 bg-white text-[#1a1a1a] shadow-[0_18px_40px_rgba(0,0,0,0.12)]",
  menuDivider: "border-black/[0.07]",
  menuItem: "text-[#1f1f1e] hover:bg-black/[0.04] focus-visible:bg-black/[0.04]",
  menuIcon: "text-[#6b6a67]",
  avatar: "bg-[#1d1d1d] text-white",
  dotRing: "ring-[#fbfaf8]",
  ring: "focus-visible:ring-black/20",
};

/* ============================================================================
   Sidebar
============================================================================ */

type DashboardSidebarProps = {
  theme?: Theme;
  onToggleTheme?: ToggleThemeFn;
};

export default function DashboardSidebar({
  theme: themeProp,
}: DashboardSidebarProps) {
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

  /* ── Channel connections (self-contained) ── */
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

  const tiktokBusy = useRef(false);
  const pinterestBusy = useRef(false);
  const youtubeBusy = useRef(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Load profile */
  useEffect(() => {
    let mounted = true;

    const loadUserProfile = async () => {
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
    };

    loadUserProfile();

    return () => {
      mounted = false;
    };
  }, []);

  /* Sync channel statuses (cache + backend), + parse OAuth return */
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

    if (tiktokError) {
      setConnectError(`Unable to connect to TikTok. ${tiktokError}`);
    }
    if (pinterestError) {
      setConnectError(`Unable to connect to Pinterest. ${pinterestError}`);
    }
    if (youtubeError) {
      setConnectError(`Unable to connect to YouTube. ${youtubeError}`);
    }

    if (returned.tiktok) clearCache(userId, "tiktok");
    if (returned.pinterest) clearCache(userId, "pinterest");
    if (returned.youtube) clearCache(userId, "youtube");

    // Nettoyage de l'URL uniquement si on est bien sur la route "channels".
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

  /* Sidebar entrance */
  useEffect(() => {
    if (sidebarMemory.entered) return;

    const id = requestAnimationFrame(() => {
      sidebarMemory.entered = true;
      setHasMounted(true);
    });

    return () => cancelAnimationFrame(id);
  }, []);

  /* Persist sidebar state */
  useEffect(() => {
    setSidebarCollapsed(isCollapsed);
  }, [isCollapsed]);

  /* Account menu events */
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const t = useMemo<ThemeTokens>(() => (isDark ? DARK_TOKENS : LIGHT_TOKENS), [isDark]);

  const focus = ["focus-visible:outline-none", "focus-visible:ring-2", t.ring].join(" ");

  /* Actions */
  const toggleCollapsed = useCallback(() => {
    setMenuOpen(false);
    setIsCollapsed((previous) => !previous);
  }, []);

  /* Raccourci Cmd/Ctrl + B (ignoré pendant la saisie de texte). */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "b" ||
        !(event.metaKey || event.ctrlKey) ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }

      event.preventDefault();
      toggleCollapsed();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  const handleNavigate = useCallback((route: string) => {
    navigate(route);
  }, []);

  /** Ouvre toujours le modal « Connect a New Channel » (sans quitter la page). */
  const openConnect = useCallback(() => {
    setMenuOpen(false);
    setConnectError(null);
    setConnectOpen(true);
  }, []);

  const closeConnect = useCallback(() => setConnectOpen(false), []);

  /* Channel connect handlers */
  const limitReached =
    Object.values(connections).filter((c) => c.connected).length >=
    PLAN.maxChannels;

  const handleTikTokToggle = async () => {
    if (tiktokBusy.current) return;
    tiktokBusy.current = true;

    setPendingKey("tiktok");
    let redirecting = false;

    try {
      if (connections.tiktok.connected) {
        await disconnectTikTok();
        if (userId) clearCache(userId, "tiktok");
        setConnections((current) => ({
          ...current,
          tiktok: { connected: false },
        }));
      } else {
        await startTikTokLogin();
        redirecting = true;
      }
    } catch (error) {
      console.error("[Stone] TikTok OAuth error:", error);
      setConnectError(formatOAuthError("TikTok", error));
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
        await startPinterestLogin();
        redirecting = true;
      }
    } catch (error) {
      console.error("[Stone] Pinterest OAuth error:", error);
      setConnectError(formatOAuthError("Pinterest", error));
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
        setConnections((current) => ({
          ...current,
          youtube: { connected: false },
        }));
      } else {
        await startYouTubeLogin();
        redirecting = true;
      }
    } catch (error) {
      console.error("[Stone] YouTube OAuth error:", error);
      setConnectError(formatOAuthError("YouTube", error));
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

  /* Logout */
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

  /* Account data */
  const account = userProfile
    ? {
        name:
          `${userProfile.first_name || ""} ${
            userProfile.last_name || ""
          }`.trim() || "User",
        initials:
          `${(userProfile.first_name || "")[0] || ""}${
            (userProfile.last_name || "")[0] || ""
          }`.toUpperCase() || "U",
        email: userProfile.email,
        plan: "Free plan",
        channels: connectedChannels.length,
        avatarUrl: userProfile.avatar_url || undefined,
      }
    : { ...defaultAccount, channels: connectedChannels.length };

  const showAvatarImage = Boolean(account.avatarUrl) && !avatarLoadFailed;
  const usage = Math.min(
    100,
    Math.round((account.channels / Math.max(PLAN.maxChannels, 1)) * 100)
  );

  /* Modal props */
  const channelConnectProps: Omit<
    ConnectChannelModalProps,
    "isDark" | "onClose"
  > = {
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
        "fixed inset-y-0 left-0 z-20",
        "transition-[opacity,transform] duration-500",
        "ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        hasMounted ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0",
      ].join(" ")}
    >
      <style>{SIDEBAR_KEYFRAMES}</style>

      <aside
        id="app-sidebar"
        className={[
          "relative flex h-full flex-col border-r px-3 py-4",
          "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "motion-reduce:transition-none",
          t.aside,
          isCollapsed ? "w-[72px]" : "w-[264px]",
        ].join(" ")}
      >
        {/* Header : logo + bascule */}
        <div
          className={[
            "flex h-10 items-center",
            isCollapsed ? "justify-center" : "justify-between pl-1.5",
          ].join(" ")}
        >
          {isCollapsed ? (
            <button
              type="button"
              aria-label="Expand sidebar"
              aria-expanded={false}
              aria-controls="app-sidebar"
              aria-keyshortcuts="Control+B Meta+B"
              title={`Expand sidebar (${TOGGLE_SHORTCUT_LABEL})`}
              onClick={toggleCollapsed}
              className={["flex h-10 w-10 items-center justify-center rounded-xl", t.row, focus].join(" ")}
            >
              <img
                src={isDark ? "/images/icon_nav.png" : "/images/icon.png"}
                alt="Stone logo"
                draggable={false}
                className="h-8 w-7 object-contain"
              />
            </button>
          ) : (
            <>
              <div className="sb-fade flex min-w-0 items-center gap-2.5">
                <img
                  src={isDark ? "/images/icon_nav.png" : "/images/icon.png"}
                  alt="Stone logo"
                  draggable={false}
                  className="h-8 w-7 shrink-0 object-contain"
                />
                <span
                  className={[
                    "text-[19px] font-semibold leading-none tracking-tight",
                    t.title,
                  ].join(" ")}
                >
                  Stone
                </span>
              </div>

              <button
                type="button"
                aria-label="Collapse sidebar"
                aria-expanded
                aria-controls="app-sidebar"
                aria-keyshortcuts="Control+B Meta+B"
                title={`Collapse sidebar (${TOGGLE_SHORTCUT_LABEL})`}
                onClick={toggleCollapsed}
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  "transition-colors duration-150 motion-reduce:transition-none",
                  t.menuIcon,
                  t.row,
                  focus,
                ].join(" ")}
              >
                <SidebarToggleIcon className="h-[18px] w-[18px]" open />
              </button>
            </>
          )}
        </div>

        {/* Action principale */}
        <button
          type="button"
          aria-label="New post"
          title={isCollapsed ? "New post" : undefined}
          onClick={() => handleNavigate("create")}
          className={[
            "mt-4 flex h-10 items-center rounded-xl text-[13px] font-semibold",
            "transition-[background-color,transform] duration-150",
            "active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
            isCollapsed ? "w-10 justify-center self-center" : "w-full gap-2 px-3.5",
            focus,
            t.cta,
          ].join(" ")}
        >
          <PlusIcon className="h-[18px] w-[18px] shrink-0" />
          {!isCollapsed && <span className="sb-fade">New post</span>}
        </button>

        {/* Navigation */}
        <nav
          className={[
            "-mx-3 mt-5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-3",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          ].join(" ")}
          aria-label="Main"
        >
          {navSections.map((section) => (
            <div key={section.label}>
              {!isCollapsed && (
                <div
                  className={[
                    "sb-fade mb-1.5 pl-[14px] text-[12px] font-medium leading-4",
                    t.muted,
                  ].join(" ")}
                >
                  {section.label}
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavItemView
                    key={item.label}
                    item={item}
                    isActive={item.route === currentRoute}
                    isCollapsed={isCollapsed}
                    focus={focus}
                    t={t}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className={["border-t pt-4", t.divider].join(" ")}>
            <SidebarChannels
              channels={connectedChannels}
              isCollapsed={isCollapsed}
              currentRoute={currentRoute}
              focus={focus}
              t={t}
              onNavigate={handleNavigate}
              onConnect={openConnect}
            />
          </div>
        </nav>

        {/* Compte */}
        <div
          ref={profileRef}
          className={["relative mt-3 border-t pt-3", t.divider].join(" ")}
        >
          {/* Menu du compte */}
          {menuOpen && (
            <div
              id="account-menu"
              role="menu"
              aria-label="Account menu"
              className={[
                "sb-menu absolute bottom-full left-0 z-50 mb-2 w-[264px]",
                "origin-bottom-left overflow-hidden rounded-2xl border",
                t.menu,
              ].join(" ")}
            >
              <div className="px-3.5 pb-3 pt-3.5">
                <div className="truncate text-[14px] font-semibold">
                  {account.name}
                </div>
                <div className={["mt-0.5 truncate text-[11.5px]", t.muted].join(" ")}>
                  {account.email}
                </div>
              </div>

              {menuGroups.map((group, groupIndex) => (
                <div
                  key={group[0]?.label ?? groupIndex}
                  role="none"
                  className={["border-t p-1.5", t.menuDivider].join(" ")}
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

                          if (item.route) {
                            navigate(item.route);
                          }
                        }}
                        className={[
                          "group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2",
                          "text-left text-[12.5px] font-medium",
                          "transition-[background-color,transform] duration-150",
                          "active:scale-[0.98] motion-reduce:transition-none",
                          "disabled:cursor-wait disabled:opacity-60",
                          focus,
                          t.menuItem,
                        ].join(" ")}
                      >
                        <Icon className={["h-4 w-4 shrink-0", t.menuIcon].join(" ")} />
                        <span className="flex-1 truncate">
                          {isLogout && loggingOut ? "Logging out..." : item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Quota de canaux + passage au plan supérieur */}
          {!isCollapsed && (
            <div className={["sb-fade mb-2 rounded-xl border p-3", t.surface].join(" ")}>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className={t.muted}>
                  {account.channels} of {PLAN.maxChannels} channels used
                </span>
              </div>

              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={PLAN.maxChannels}
                aria-valuenow={account.channels}
                aria-label="Channels used"
                className={["mt-2 h-1.5 overflow-hidden rounded-full", t.track].join(" ")}
              >
                <div
                  className={[
                    "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
                    t.accent,
                  ].join(" ")}
                  style={{ width: `${usage}%` }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleNavigate("pricing")}
                className={[
                  "mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5",
                  "text-[12px] font-semibold",
                  "transition-colors duration-150 motion-reduce:transition-none",
                  focus,
                  t.tabIdle,
                ].join(" ")}
              >
                <BoltIcon className="h-3.5 w-3.5" />
                Upgrade plan
              </button>
            </div>
          )}

          {/* Profil */}
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="account-menu"
            aria-label="Open account menu"
            title={isCollapsed ? account.name : undefined}
            onClick={() => setMenuOpen((value) => !value)}
            className={[
              "flex h-12 w-full items-center gap-3 rounded-xl px-2",
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

            {!isCollapsed && (
              <>
                <span className="sb-fade min-w-0 flex-1 text-left leading-tight">
                  <span className={["block truncate text-[13px] font-medium", t.title].join(" ")}>
                    {account.name}
                  </span>
                  <span className={["block truncate text-[11.5px]", t.muted].join(" ")}>
                    {account.plan}
                  </span>
                </span>

                <ChevronUpIcon
                  className={[
                    "h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                    t.menuIcon,
                    menuOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ConnectChannelModal fait lui-même son createPortal(document.body). */}
      {connectOpen && (
        <ConnectChannelModal
          {...channelConnectProps}
          isDark={isDark}
          onClose={closeConnect}
        />
      )}
    </div>
  );
}