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

/* Config + services des réseaux : la sidebar est autonome, elle gère
   elle-même l'état des connexions (comme la page Channels). */
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

type IconProps = {
  className?: string;
};

type IconComponent = (props: IconProps) => React.ReactElement;

type NavChild = {
  label: string;
  route: string;
};

type NavItem = {
  label: string;
  icon: IconComponent;
  route?: string;
  badge?: string;
  children?: NavChild[];
};

type NavSection = {
  label: string;
  items: NavItem[];
};

type MenuItem = {
  label: string;
  icon: IconComponent;
  badge?: string;
  route?: string;
  action?: "logout" | "toggleTheme";
};

type ThemeTokens = {
  aside: string;
  brand: string;
  divider: string;
  navActive: string;
  navIdle: string;
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
};

type ToggleOrigin = {
  x: number;
  y: number;
};

type ToggleThemeFn = (origin?: ToggleOrigin) => void;

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
   Animation
   Minimaliste : un seul mouvement, l'élargissement de la barre. Les textes
   apparaissent en fondu (sans glissement), les icônes ne bougent jamais.
============================================================================ */

const SIDEBAR_WIDTH_MS = 300;
const LABEL_DELAY_MS = 100;

const SIDEBAR_KEYFRAMES = `
@keyframes sbFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sb-menu,
.sb-item,
.sb-tip {
  animation: sbFadeIn 140ms ease-out both;
}

#app-sidebar button,
#app-sidebar [role="menuitem"],
#app-sidebar svg,
#app-sidebar img {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .sb-menu,
  .sb-item,
  .sb-tip {
    animation: none;
  }
}
`;

/* ============================================================================
   Raccourcis clavier
   - Ctrl/⌘ + B : réduire / ouvrir la sidebar
   - Ctrl + touche : chaque partie de la sidebar
============================================================================ */

const IS_MAC =
  typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform);

/** Libellé du raccourci clavier de la sidebar selon la plateforme. */
const TOGGLE_SHORTCUT_LABEL = IS_MAC ? "⌘B" : "Ctrl B";

/**
 * lettre → route
 * (« d » pour Calendar : Ctrl+C est réservé à la copie.)
 */
const SHORTCUT_ROUTES: Record<string, string> = {
  h: "home",
  d: "schedule",
  t: "template",
  s: "settings",
  l: "channels",
  u: "pricing",
  f: "faq",
  k: "create",
  i: "integrations",
};

/** Libellé affiché : "Ctrl S" ou "⌃S". */
function shortcutLabel(key: string): string {
  return IS_MAC ? `⌃${key.toUpperCase()}` : `Ctrl ${key.toUpperCase()}`;
}

/** Valeur ARIA : "Control+S". */
function ariaShortcut(key: string): string {
  return `Control+${key.toUpperCase()}`;
}

/** Lettre associée à une route (undefined si aucune). */
function shortcutKeyForRoute(route?: string): string | undefined {
  if (!route) return undefined;
  return Object.entries(SHORTCUT_ROUTES).find(([, r]) => r === route)?.[0];
}

/** Raccourci associé à une route (undefined si aucun). */
function shortcutForRoute(route?: string): string | undefined {
  const key = shortcutKeyForRoute(route);
  return key ? shortcutLabel(key) : undefined;
}

/** Lettre pressée (event.key, avec repli sur event.code). */
function shortcutKey(event: KeyboardEvent): string {
  if (/^[a-z]$/i.test(event.key)) return event.key.toLowerCase();
  return /^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase() : "";
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;

  return Boolean(
    el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
  );
}

/** Petite pastille « touche » affichée à côté des libellés. */
function Kbd({ children, className }: { children: ReactNode; className: string }) {
  return (
    <kbd
      className={[
        "select-none rounded px-1.5 py-0.5 font-sans text-[10px] font-medium",
        className,
      ].join(" ")}
    >
      {children}
    </kbd>
  );
}

/* ============================================================================
   Icons (trait fin, uniforme)
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
      className={["select-none", className].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12.5 12 5l8 7.5" />
      <path d="M6 10.5V18h12v-7.5" />
    </Svg>
  );
}

function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M3.5 9.5h17" />
    </Svg>
  );
}

function TemplatesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 5.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
      <path d="M8 10h8M8 14h8" />
    </Svg>
  );
}

function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
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

function BillingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.2 5 4 0 1.1-1.1 1.9-2.5 1.9-1.2 0-2.2-.6-2.6-1.6M12 6.5V8M12 16v1.5" />
    </Svg>
  );
}

function HelpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.6-2.4 2.1-2.4 3.6M12 16.8v.1" />
    </Svg>
  );
}

function LightbulbIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.3V16h6v-.2c0-.9.4-1.7 1-2.3A6 6 0 0 0 12 3Z" />
    </Svg>
  );
}

function AppsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </Svg>
  );
}

function BetaIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 4h5M10.5 4v5.2L5.6 17.6A2 2 0 0 0 7.3 20.5h9.4a2 2 0 0 0 1.7-2.9l-4.9-8.4V4" />
      <path d="M8 15h8" />
    </Svg>
  );
}

function LogoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10" />
      <path d="M14 8.5 18 12l-4 3.5M18 12H9.5" />
    </Svg>
  );
}

/** Icône « panneau latéral » : le panneau gauche se remplit quand la sidebar est ouverte. */
function SidebarToggleIcon({
  className,
  open,
}: IconProps & {
  open: boolean;
}) {
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
          "transition-opacity duration-200",
          "motion-reduce:transition-none",
          open ? "opacity-30" : "opacity-0",
        ].join(" ")}
      />
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M9.5 4.5v15" />
    </Svg>
  );
}

function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

/* ============================================================================
   Tooltip flottant (portal)
   La nav a overflow hidden : un tooltip absolu serait rogné. On le rend donc
   dans document.body, en position fixed, calée sur le bord droit de l'élément.
============================================================================ */

type TipProps = {
  label: string;
  /** Raccourci clavier affiché à droite du libellé (optionnel). */
  shortcut?: string;
  /** Tooltip actif uniquement quand la sidebar est réduite. */
  enabled: boolean;
  menuClass: string;
  countClass: string;
  children: ReactNode;
};

const TIP_DELAY_MS = 280;

function Tip({
  label,
  shortcut,
  enabled,
  menuClass,
  countClass,
  children,
}: TipProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const hide = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setPos(null);
  }, []);

  const show = useCallback(() => {
    if (!enabled) return;

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) {
        setPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
      }
    }, TIP_DELAY_MS);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) hide();
  }, [enabled, hide]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <div
      ref={anchorRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onPointerDown={hide}
    >
      {children}

      {pos &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
            className={[
              "sb-tip pointer-events-none fixed z-[70] -translate-y-1/2",
              "flex items-center gap-2",
              "whitespace-nowrap rounded-md border px-2 py-1",
              "text-[11.5px] font-medium",
              menuClass,
            ].join(" ")}
          >
            {label}
            {shortcut && <Kbd className={countClass}>{shortcut}</Kbd>}
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
    label: "General",
    items: [
      { label: "Home", icon: HomeIcon, route: "home" },
      { label: "Calendar", icon: CalendarIcon, route: "schedule" },
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
  index: number;
  currentRoute: string;
  isCollapsed: boolean;
  isOpen: boolean;
  labelClass: string;
  focus: string;
  t: ThemeTokens;
  onNavigate: (route: string) => void;
  onToggleGroup: (label: string) => void;
  onExpandAndOpen: (label: string) => void;
};

function NavItemViewImpl({
  item,
  index,
  currentRoute,
  isCollapsed,
  isOpen,
  labelClass,
  focus,
  t,
  onNavigate,
  onToggleGroup,
  onExpandAndOpen,
}: NavItemViewProps) {
  const Icon = item.icon;

  const hasChildren = Boolean(item.children?.length);
  const shortcut = shortcutForRoute(item.route);
  const shortcutLetter = shortcutKeyForRoute(item.route);

  /* Ouverture : léger décalage par ligne. Fermeture : aucun délai. */
  const labelStyle = {
    transitionDelay: isCollapsed
      ? "0ms"
      : `${LABEL_DELAY_MS + index * 25}ms`,
  };

  const isActive =
    (item.route !== undefined && item.route === currentRoute) ||
    Boolean(item.children?.some((child) => child.route === currentRoute));

  const onClick = () => {
    if (!hasChildren) {
      if (item.route) {
        onNavigate(item.route);
      }
      return;
    }

    if (isCollapsed) {
      onExpandAndOpen(item.label);
      return;
    }

    onToggleGroup(item.label);
  };

  return (
    <Tip
      label={item.label}
      shortcut={shortcut}
      enabled={isCollapsed}
      menuClass={t.menu}
      countClass={t.count}
    >
      <button
        type="button"
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-keyshortcuts={
          shortcutLetter ? ariaShortcut(shortcutLetter) : undefined
        }
        onClick={onClick}
        className={[
          "flex h-9 w-full items-center gap-3 overflow-hidden",
          "rounded-md px-3 text-[13px] font-medium",
          "transition-colors duration-150",
          "motion-reduce:transition-none",
          focus,
          isActive ? t.navActive : t.navIdle,
        ].join(" ")}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />

        <span
          className={["flex-1 text-left", labelClass].join(" ")}
          style={labelStyle}
        >
          {item.label}
        </span>

        {item.badge && (
          <span
            style={labelStyle}
            className={[
              "rounded px-1.5 py-0.5 text-[10.5px] font-medium",
              t.count,
              labelClass,
            ].join(" ")}
          >
            {item.badge}
          </span>
        )}

        {hasChildren && (
          <span
            className={["flex shrink-0", labelClass].join(" ")}
            style={labelStyle}
          >
            <ChevronDownIcon
              className={[
                "h-4 w-4 transition-transform duration-200",
                "motion-reduce:transition-none",
                isOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </span>
        )}
      </button>

      {hasChildren && (
        <div
          className={[
            "grid transition-[grid-template-rows] duration-200",
            "motion-reduce:transition-none",
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          ].join(" ")}
        >
          <div className="overflow-hidden">
            <div
              className={[
                "ml-[21px] mt-0.5 flex flex-col gap-0.5",
                "border-l pl-3",
                t.rail,
              ].join(" ")}
            >
              {item.children!.map((child) => {
                const childActive = child.route === currentRoute;

                return (
                  <button
                    key={child.route}
                    type="button"
                    tabIndex={isOpen ? 0 : -1}
                    aria-current={childActive ? "page" : undefined}
                    onClick={() => onNavigate(child.route)}
                    className={[
                      "flex h-8 w-full items-center whitespace-nowrap",
                      "rounded-md px-2 text-left text-[12.5px] font-medium",
                      "transition-colors duration-150",
                      "motion-reduce:transition-none",
                      focus,
                      childActive ? t.subActive : t.sub,
                    ].join(" ")}
                  >
                    {child.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Tip>
  );
}

const NavItemView = memo(NavItemViewImpl);

/* ============================================================================
   Section Channels (réseaux connectés)
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

/** Canal ciblé par /#/insights?channel=<key> ou /#/community?channel=<key> (null si absent). */
function getHashChannel(): string | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash;
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return null;

  return new URLSearchParams(hash.slice(queryIndex + 1)).get("channel");
}

const PublishIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
    <path d="M8 3.5v4M16 3.5v4M3.5 9.5h17" />
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

const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

const CHANNEL_LINKS: {
  label: string;
  route: string;
  icon: IconComponent;
  badge?: string;
  /** Le lien porte le canal : /#/<route>?channel=<key> */
  perChannel?: boolean;
}[] = [
  { label: "Publish", route: "schedule", icon: PublishIcon },
  {
    label: "Community",
    route: "community",
    icon: CommunityIcon,
    perChannel: true,
  },
  {
    label: "Insights",
    route: "insights",
    icon: InsightsIcon,
    badge: "New",
    perChannel: true,
  },
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
    <span className="relative h-6 w-6 shrink-0">
      {channel.avatarUrl && !failed ? (
        <img
          src={channel.avatarUrl}
          alt=""
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full select-none rounded-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-neutral-700 text-[10px] font-semibold text-white">
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

function SidebarChannelsImpl({
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

  // currentRoute change à chaque navigation : on relit le canal du hash au rendu.
  const hashChannel = CHANNEL_ROUTES.has(currentRoute) ? getHashChannel() : null;

  const toggleKey = (key: string) =>
    setOpenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const openKey = (key: string) =>
    setOpenKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));

  const headerButton = [
    "flex h-6 w-6 items-center justify-center rounded-md",
    "transition-colors duration-150 motion-reduce:transition-none",
    t.menuIcon,
    focus,
    t.row,
  ].join(" ");

  return (
    <div>
      <div
        aria-hidden={isCollapsed}
        className={[
          "flex items-center justify-between overflow-hidden whitespace-nowrap px-3",
          "transition-[height,margin,opacity] duration-200",
          "motion-reduce:transition-none",
          isCollapsed
            ? "mb-0 h-0 opacity-0 delay-0"
            : "mb-1 h-6 opacity-100 delay-100",
        ].join(" ")}
      >
        <span className={["text-[12px] font-medium", t.muted].join(" ")}>
          Channels
        </span>

        <button
          type="button"
          tabIndex={isCollapsed ? -1 : 0}
          aria-label="Connect a channel"
          aria-keyshortcuts="Control+N"
          title={`Connect a channel (${shortcutLabel("n")})`}
          onClick={onConnect}
          className={headerButton}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-0.5">
        {channels.map((channel) => {
          const id = getNetworkId(channel);
          const NetworkIcon = id ? NETWORK_ICONS[id] : undefined;
          const label = channel.handle || channel.name;
          const groupKey = `channel:${channel.key}`;
          const isOpen = openKeys.includes(groupKey) && !isCollapsed;

          return (
            <div key={channel.key}>
              <Tip
                label={label}
                enabled={isCollapsed}
                menuClass={t.menu}
                countClass={t.count}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={label.replace(/^@/, "")}
                  onClick={() => {
                    if (isCollapsed) {
                      onExpand();
                      openKey(groupKey);
                    } else {
                      toggleKey(groupKey);
                    }
                  }}
                  className={[
                    "group flex h-9 w-full items-center gap-3 overflow-hidden",
                    "rounded-md px-[9px] text-[13px] font-medium",
                    "transition-colors duration-150 motion-reduce:transition-none",
                    focus,
                    t.navIdle,
                  ].join(" ")}
                >
                  <ChannelAvatar
                    channel={channel}
                    NetworkIcon={NetworkIcon}
                    dotRing={t.dotRing}
                  />
                  <span
                    className={[
                      "min-w-0 flex-1 truncate text-left",
                      labelClass,
                    ].join(" ")}
                  >
                    {label.replace(/^@/, "")}
                  </span>
                  <span className={["flex shrink-0", labelClass].join(" ")}>
                    <ChevronDownIcon
                      className={[
                        "h-3.5 w-3.5 opacity-50",
                        "transition-transform duration-200",
                        "motion-reduce:transition-none",
                        isOpen ? "rotate-0" : "-rotate-90",
                      ].join(" ")}
                    />
                  </span>
                </button>
              </Tip>

              <div
                className={[
                  "grid transition-[grid-template-rows] duration-200",
                  "motion-reduce:transition-none",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                ].join(" ")}
              >
                <div className="overflow-hidden">
                  <div
                    className={[
                      "ml-[21px] mt-0.5 flex flex-col gap-0.5 border-l pl-3",
                      t.rail,
                    ].join(" ")}
                  >
                    {CHANNEL_LINKS.map((link) => {
                      const Icon = link.icon;

                      const target = link.perChannel
                        ? `${link.route}?channel=${encodeURIComponent(
                            channel.key
                          )}`
                        : link.route;

                      // Un lien "par canal" n'est actif que pour le canal ouvert.
                      const active = link.perChannel
                        ? link.route === currentRoute &&
                          (hashChannel === null
                            ? channels[0]?.key === channel.key
                            : hashChannel === channel.key)
                        : link.route === currentRoute;

                      return (
                        <button
                          key={link.route}
                          type="button"
                          tabIndex={isOpen ? 0 : -1}
                          aria-current={active ? "page" : undefined}
                          onClick={() => onNavigate(target)}
                          className={[
                            "flex h-8 w-full items-center gap-2.5 whitespace-nowrap",
                            "rounded-md px-2 text-left text-[12.5px] font-medium",
                            "transition-colors duration-150 motion-reduce:transition-none",
                            focus,
                            active ? t.subActive : t.sub,
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{link.label}</span>
                          {link.badge && (
                            <span
                              className={[
                                "rounded px-1.5 py-0.5 text-[10.5px] font-medium",
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

      {isCollapsed && (
        <Tip
          label="Connect a channel"
          shortcut={shortcutLabel("n")}
          enabled
          menuClass={t.menu}
          countClass={t.count}
        >
          <button
            type="button"
            aria-label="Connect a channel"
            aria-keyshortcuts="Control+N"
            onClick={onConnect}
            className={[
              "mt-0.5 flex h-9 w-full items-center gap-3 rounded-md px-3",
              "transition-colors duration-150 motion-reduce:transition-none",
              focus,
              t.navIdle,
            ].join(" ")}
          >
            <PlusIcon className="h-[18px] w-[18px] shrink-0" />
          </button>
        </Tip>
      )}
    </div>
  );
}

const SidebarChannels = memo(SidebarChannelsImpl);

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

const sidebarMemory = {
  collapsed: readStoredCollapsed(),
  openGroup: null as string | null,
  entered: false,
};

/* Décalage du contenu des pages : la sidebar est collée au bord gauche,
   sa largeur (60px réduite / 208px ouverte) + un espace de respiration. */
export const SIDEBAR_COLLAPSED_OFFSET = 84;
export const SIDEBAR_EXPANDED_OFFSET = 232;

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
  sidebarMemory.openGroup = null;
  sidebarMemory.entered = false;
  channelsMemory.open = [];
}

/* ============================================================================
   Channel-connections helpers (self-contained modal)
============================================================================ */

type OAuthProvider = "tiktok" | "pinterest" | "youtube";

const OAUTH_LABELS: Record<OAuthProvider, string> = {
  tiktok: "TikTok",
  pinterest: "Pinterest",
  youtube: "YouTube",
};

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

function pluralizeChannels(count: number): string {
  return `${count} channel${count === 1 ? "" : "s"}`;
}

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
  const [openGroup, setOpenGroup] = useState<string | null>(
    sidebarMemory.openGroup
  );
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

  /** Verrou anti double-clic, un par fournisseur OAuth. */
  const oauthBusy = useRef<Record<OAuthProvider, boolean>>({
    tiktok: false,
    pinterest: false,
    youtube: false,
  });
  const placeholderTimer = useRef<number | undefined>(undefined);

  const profileRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* --------------------------------------------------------------------------
     Load profile
  -------------------------------------------------------------------------- */

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

  /* --------------------------------------------------------------------------
     Sync channel statuses (cache + backend), + parse OAuth return
  -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!userId) return;

    const hash = window.location.hash;
    const queryIndex = hash.indexOf("?");
    const basePath = queryIndex === -1 ? hash : hash.slice(0, queryIndex);
    const params = new URLSearchParams(
      queryIndex === -1 ? "" : hash.slice(queryIndex + 1)
    );

    const errors: Record<CacheProvider, string | null> = {
      tiktok: params.get("tiktok_error"),
      pinterest: params.get("pinterest_error"),
      youtube: params.get("youtube_error"),
    };

    const returned: Record<CacheProvider, boolean> = {
      tiktok: params.has("tiktok") || Boolean(errors.tiktok),
      pinterest: params.has("pinterest") || Boolean(errors.pinterest),
      youtube: params.has("youtube") || Boolean(errors.youtube),
    };

    (Object.keys(errors) as CacheProvider[]).forEach((provider) => {
      const message = errors[provider];

      if (message) {
        setConnectError(
          `Unable to connect to ${OAUTH_LABELS[provider]}. ${message}`
        );
      }

      if (returned[provider]) clearCache(userId, provider);
    });

    // Nettoyage de l'URL uniquement si on est bien sur la route "channels".
    // (Les autres pages gèrent leur propre hash — ex. insights?channel=… —
    // et ne doivent pas être polluées par un replaceState.)
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

  /* --------------------------------------------------------------------------
     Sidebar entrance
  -------------------------------------------------------------------------- */

  useEffect(() => {
    if (sidebarMemory.entered) {
      return;
    }

    const id = requestAnimationFrame(() => {
      sidebarMemory.entered = true;
      setHasMounted(true);
    });

    return () => cancelAnimationFrame(id);
  }, []);

  /* --------------------------------------------------------------------------
     Persist sidebar state
  -------------------------------------------------------------------------- */

  useEffect(() => {
    setSidebarCollapsed(isCollapsed);
    sidebarMemory.openGroup = openGroup;
  }, [isCollapsed, openGroup]);

  /* --------------------------------------------------------------------------
     Cleanup des timers
  -------------------------------------------------------------------------- */

  useEffect(
    () => () => window.clearTimeout(placeholderTimer.current),
    []
  );

  /* --------------------------------------------------------------------------
     Account menu : fermeture auto à chaque navigation
  -------------------------------------------------------------------------- */

  useEffect(() => {
    setMenuOpen(false);
  }, [currentRoute]);

  /* --------------------------------------------------------------------------
     Account menu events (clic extérieur, Échap) + focus initial
  -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
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

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    // Place le focus sur le premier élément : la navigation clavier démarre ici.
    const id = requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
        ?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  /** Flèches haut/bas, Home, End dans le menu compte (pattern WAI-ARIA menu). */
  const onMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
          '[role="menuitem"]:not([disabled])'
        )
      );

      if (items.length === 0) return;

      const current = items.indexOf(document.activeElement as HTMLElement);
      let next = -1;

      if (event.key === "ArrowDown") next = (current + 1) % items.length;
      else if (event.key === "ArrowUp")
        next = (current - 1 + items.length) % items.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = items.length - 1;

      if (next >= 0) {
        event.preventDefault();
        items[next].focus();
      }
    },
    []
  );

  /* --------------------------------------------------------------------------
     Theme tokens (plat : pas d'ombre, une seule bordure, aucun dégradé)
  -------------------------------------------------------------------------- */

  const t = useMemo<ThemeTokens>(
    () =>
      isDark
        ? {
            aside: "border-white/[0.08] bg-[#0c0c0e]",
            brand: "text-white",
            divider: "bg-white/[0.08]",
            navActive: "bg-white/[0.08] text-white",
            navIdle: "text-[#a1a1a6] hover:bg-white/[0.05] hover:text-white",
            count: "bg-white/[0.08] text-[#c8c8cc]",
            dotRing: "ring-[#0c0c0e]",
            rail: "border-white/[0.08]",
            sub: "text-[#8a8a90] hover:bg-white/[0.05] hover:text-white",
            subActive: "bg-white/[0.08] text-white",
            row: "hover:bg-white/[0.06]",
            rowOpen: "bg-white/[0.06]",
            avatar: "bg-[#ececea] text-[#111111]",
            title: "text-[#f3f3ef]",
            muted: "text-[#7d7d83]",
            menu: "border-white/[0.1] bg-[#161618] text-[#f3f3ef]",
            menuDivider: "border-white/[0.08]",
            menuItem:
              "text-[#e4e4e0] hover:bg-white/[0.06] focus-visible:bg-white/[0.06]",
            menuIcon: "text-[#8a8a90]",
            upgrade:
              "border-white/[0.1] text-[#f3f3ef] hover:bg-white/[0.06]",
            badge: "bg-white/[0.08] text-[#c8c8cc]",
            ring: "focus-visible:ring-white/30",
          }
        : {
            aside: "border-black/[0.08] bg-white",
            brand: "text-[#151515]",
            divider: "bg-black/[0.07]",
            navActive: "bg-black/[0.06] text-[#151515]",
            navIdle: "text-[#5c5c59] hover:bg-black/[0.04] hover:text-[#151515]",
            count: "bg-black/[0.05] text-[#4d4d4b]",
            dotRing: "ring-white",
            rail: "border-black/[0.08]",
            sub: "text-[#77766f] hover:bg-black/[0.04] hover:text-[#151515]",
            subActive: "bg-black/[0.06] text-[#151515]",
            row: "hover:bg-black/[0.04]",
            rowOpen: "bg-black/[0.04]",
            avatar: "bg-[#1d1d1d] text-white",
            title: "text-[#1b1b1a]",
            muted: "text-[#8a8983]",
            menu: "border-black/[0.1] bg-white text-[#1a1a1a]",
            menuDivider: "border-black/[0.07]",
            menuItem:
              "text-[#1f1f1e] hover:bg-black/[0.04] focus-visible:bg-black/[0.04]",
            menuIcon: "text-[#77766f]",
            upgrade:
              "border-black/[0.1] text-[#1a1a1a] hover:bg-black/[0.04]",
            badge: "bg-black/[0.06] text-[#4d4d4b]",
            ring: "focus-visible:ring-black/20",
          },
    [isDark]
  );

  const focus = [
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    t.ring,
  ].join(" ");

  /* --------------------------------------------------------------------------
     Label animation : simple fondu, sans glissement.
     Ouverture : après LABEL_DELAY_MS, le temps que la largeur démarre.
     Fermeture : fondu immédiat, avant la réduction de largeur.
  -------------------------------------------------------------------------- */

  const labelClass = useMemo(
    () =>
      [
        "whitespace-nowrap",
        "transition-opacity",
        "motion-reduce:transition-none",
        isCollapsed
          ? "opacity-0 delay-0 duration-100"
          : "opacity-100 delay-100 duration-200",
      ].join(" "),
    [isCollapsed]
  );

  /* --------------------------------------------------------------------------
     Sidebar actions
  -------------------------------------------------------------------------- */

  const toggleCollapsed = useCallback(() => {
    setMenuOpen(false);
    setIsCollapsed((previous) => !previous);
    setOpenGroup(null);
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

      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      toggleCollapsed();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  const handleNavigate = useCallback((route: string) => {
    navigate(route);
  }, []);

  const handleToggleGroup = useCallback((label: string) => {
    setOpenGroup((current) => (current === label ? null : label));
  }, []);

  /**
   * Ouvre toujours le modal « Connect a New Channel » (le même composant que
   * sur /channels). La sidebar ne redirige pas vers /channels.
   */
  const openConnect = useCallback(() => {
    setMenuOpen(false);
    setConnectError(null);
    setConnectOpen(true);
  }, []);

  const closeConnect = useCallback(() => setConnectOpen(false), []);

  /* Raccourcis Ctrl + touche (ignorés pendant la saisie ou si le modal est ouvert).
       Ctrl P       menu du compte
       Ctrl N       modal « Connect a channel »
       Ctrl H/D/T   Home / Calendar / Templates
       Ctrl S/L/U/F/K/I  Settings / Channels / Billing / FAQ / Create / Integrations */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        return;
      }

      if (connectOpen || isTypingTarget(event.target)) return;

      const key = shortcutKey(event);
      if (!key) return;

      // Menu du compte
      if (key === "p") {
        event.preventDefault();
        setMenuOpen((value) => !value);
        return;
      }

      // Modal de connexion d'un canal
      if (key === "n") {
        event.preventDefault();
        openConnect();
        return;
      }

      // Pages
      const route = SHORTCUT_ROUTES[key];

      if (route) {
        event.preventDefault();
        setMenuOpen(false);
        navigate(route);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [connectOpen, openConnect]);

  const handleExpandAndOpen = useCallback((label: string) => {
    setIsCollapsed(false);
    setOpenGroup(label);
  }, []);

  const handleExpand = useCallback(() => setIsCollapsed(false), []);

  /* --------------------------------------------------------------------------
     Channel connect handlers (self-contained)
  -------------------------------------------------------------------------- */

  const limitReached =
    Object.values(connections).filter((c) => c.connected).length >=
    PLAN.maxChannels;

  /**
   * Bascule générique d'un fournisseur OAuth :
   *  - connecté  → déconnexion + purge du cache
   *  - sinon     → saisie manuelle de token (si fournie) ou redirection OAuth
   * `manual` renvoie null quand l'utilisateur annule.
   */
  const toggleOAuth = async (
    provider: OAuthProvider,
    api: {
      login: () => Promise<unknown>;
      disconnect: () => Promise<unknown>;
      manual?: () => Promise<Connection | null>;
    }
  ) => {
    if (oauthBusy.current[provider]) return;
    oauthBusy.current[provider] = true;

    setPendingKey(provider);
    let redirecting = false;

    try {
      if (connections[provider].connected) {
        await api.disconnect();
        if (userId) clearCache(userId, provider);
        setConnections((current) => ({
          ...current,
          [provider]: { connected: false },
        }));
      } else if (api.manual) {
        const connection = await api.manual();
        if (!connection) return;

        if (userId) writeCache(userId, connection, provider);
        setConnections((current) => ({ ...current, [provider]: connection }));
      } else {
        await api.login();
        redirecting = true;
      }
    } catch (error) {
      console.error(`[Stone] ${OAUTH_LABELS[provider]} OAuth error:`, error);
      setConnectError(formatOAuthError(OAUTH_LABELS[provider], error));
    } finally {
      // En cas de redirection, on garde le verrou : la page va être quittée.
      if (!redirecting) {
        setPendingKey(null);
        oauthBusy.current[provider] = false;
      }
    }
  };

  const pinterestManualToken = async (): Promise<Connection | null> => {
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
  };

  const handlePlaceholderToggle = (key: ChannelKey) => {
    setPendingKey(key);

    window.clearTimeout(placeholderTimer.current);
    placeholderTimer.current = window.setTimeout(() => {
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

    switch (key) {
      case "tiktok":
        void toggleOAuth("tiktok", {
          login: startTikTokLogin,
          disconnect: disconnectTikTok,
        });
        return;

      case "pinterest":
        void toggleOAuth("pinterest", {
          login: startPinterestLogin,
          disconnect: disconnectPinterest,
          manual:
            import.meta.env.VITE_PINTEREST_MANUAL_TOKEN === "true"
              ? pinterestManualToken
              : undefined,
        });
        return;

      case "youtube":
        void toggleOAuth("youtube", {
          login: startYouTubeLogin,
          disconnect: disconnectYouTube,
        });
        return;

      default:
        handlePlaceholderToggle(key);
    }
  };

  /* --------------------------------------------------------------------------
     Logout
  -------------------------------------------------------------------------- */

  const handleLogout = useCallback(async () => {
    if (loggingOut) {
      return;
    }

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

  /* --------------------------------------------------------------------------
     Account data
  -------------------------------------------------------------------------- */

  let itemIndex = 0;

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
        organization: "My Organization",
        plan: "Free plan",
        channels: connectedChannels.length,
        avatarUrl: userProfile.avatar_url || undefined,
      }
    : { ...defaultAccount, channels: connectedChannels.length };

  const showAvatarImage = Boolean(account.avatarUrl) && !avatarLoadFailed;

  /* --------------------------------------------------------------------------
     Modal props
  -------------------------------------------------------------------------- */

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

  /* ==========================================================================
     Render
     Collée au bord gauche : pleine hauteur, aucun arrondi, aucune ombre,
     une seule bordure à droite.
  ========================================================================== */

  return (
    <div
      className={[
        "fixed inset-y-0 left-0 z-20",
        "transition-opacity duration-300",
        "motion-reduce:transition-none",
        hasMounted ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <style>{SIDEBAR_KEYFRAMES}</style>

      {/* Largeur : 300 ms (garder la classe en dur en phase avec SIDEBAR_WIDTH_MS). */}
      <aside
        id="app-sidebar"
        data-width-ms={SIDEBAR_WIDTH_MS}
        className={[
          "relative flex h-full flex-col",
          "overflow-visible border-r px-2 py-4",
          "transition-[width] duration-300",
          "ease-[cubic-bezier(0.4,0,0.2,1)]",
          "motion-reduce:transition-none",
          t.aside,
          isCollapsed ? "w-[60px] delay-100" : "w-[208px] delay-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div
          className={[
            "flex items-center gap-2.5 overflow-hidden px-2.5",
            t.brand,
          ].join(" ")}
        >
          <img
            src={isDark ? "/images/icon_nav.png" : "/images/icon.png"}
            alt="Stone logo"
            draggable={false}
            className="h-8 w-7 shrink-0 select-none object-contain"
          />

          <span
            className={[
              "text-[17px] font-semibold",
              "leading-none tracking-tight",
              labelClass,
            ].join(" ")}
          >
            Stone
          </span>
        </div>

        {/* Navigation */}
        <nav
          className={[
            "-mx-1 mt-6 flex min-h-0 flex-1",
            "flex-col overflow-y-auto",
            "overflow-x-hidden px-1",
            "[scrollbar-width:none]",
            "[&::-webkit-scrollbar]:hidden",
          ].join(" ")}
          aria-label="Main"
        >
          {navSections.map((section) => (
            <div key={section.label} className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const hasChildren = Boolean(item.children?.length);

                const isOpen =
                  hasChildren && openGroup === item.label && !isCollapsed;

                return (
                  <NavItemView
                    key={item.label}
                    index={itemIndex++}
                    item={item}
                    currentRoute={currentRoute}
                    isCollapsed={isCollapsed}
                    isOpen={isOpen}
                    labelClass={labelClass}
                    focus={focus}
                    t={t}
                    onNavigate={handleNavigate}
                    onToggleGroup={handleToggleGroup}
                    onExpandAndOpen={handleExpandAndOpen}
                  />
                );
              })}
            </div>
          ))}

          {/* Channels */}
          <div className="mt-4">
            <div className={["mx-1 mb-3 h-px", t.divider].join(" ")} />
            <SidebarChannels
              channels={connectedChannels}
              isCollapsed={isCollapsed}
              currentRoute={currentRoute}
              labelClass={labelClass}
              focus={focus}
              t={t}
              onNavigate={handleNavigate}
              onExpand={handleExpand}
              onConnect={openConnect}
            />
          </div>
        </nav>

        {/* Account */}
        <div
          ref={profileRef}
          className={["mt-3 border-t pt-3", t.rail].join(" ")}
        >
          {/*
            Fermée : le toggle est au-dessus de la photo de profil (colonne).
            Ouverte : le toggle est à droite, aligné avec le profil (ligne).
          */}
          <div
            className={[
              "flex gap-1",
              isCollapsed ? "flex-col" : "flex-row items-center",
            ].join(" ")}
          >
            {/* Toggle sidebar */}
            <button
              type="button"
              aria-expanded={!isCollapsed}
              aria-controls="app-sidebar"
              aria-keyshortcuts="Control+B Meta+B"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleCollapsed}
              className={[
                "group/toggle relative flex shrink-0",
                "items-center justify-center rounded-md",
                "transition-colors duration-150",
                "motion-reduce:transition-none",
                isCollapsed
                  ? "order-first h-9 w-full"
                  : "order-last h-9 w-9",
                focus,
                t.menuIcon,
                t.row,
              ].join(" ")}
            >
              <SidebarToggleIcon className="h-[18px] w-[18px]" open={!isCollapsed} />

              {/* Infobulle : libellé + raccourci */}
              <span
                role="tooltip"
                className={[
                  "pointer-events-none absolute z-50 flex items-center gap-2",
                  "whitespace-nowrap rounded-md border px-2 py-1",
                  "text-[11.5px] font-medium",
                  "opacity-0 transition-opacity duration-150 delay-0",
                  "group-hover/toggle:opacity-100 group-hover/toggle:delay-500",
                  "group-focus-visible/toggle:opacity-100",
                  "motion-reduce:transition-none",
                  isCollapsed
                    ? "left-full top-1/2 ml-3 -translate-y-1/2"
                    : "bottom-full right-0 mb-2",
                  t.menu,
                ].join(" ")}
              >
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                <Kbd className={t.count}>{TOGGLE_SHORTCUT_LABEL}</Kbd>
              </span>
            </button>

            {/* Profil */}
            <div className="relative min-w-0 flex-1">
              {/* Account menu */}
              {menuOpen && (
                <div
                  ref={menuRef}
                  id="account-menu"
                  role="menu"
                  aria-label="Account menu"
                  onKeyDown={onMenuKeyDown}
                  className={[
                    "sb-menu absolute",
                    "bottom-full left-0",
                    "z-50 mb-2 w-[248px]",
                    "overflow-hidden rounded-lg border",
                    t.menu,
                  ].join(" ")}
                >
                  {/* Account header */}
                  <div className="px-3.5 pb-3 pt-3.5">
                    <div className="truncate text-[14px] font-semibold">
                      {account.name}
                    </div>

                    <div
                      className={["mt-0.5 truncate text-[11.5px]", t.muted].join(
                        " "
                      )}
                    >
                      {account.email}
                    </div>

                    <div className={["mt-0.5 text-[11.5px]", t.muted].join(" ")}>
                      {account.plan} · {pluralizeChannels(account.channels)}
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("pricing");
                      }}
                      className={[
                        "mt-3 flex w-full items-center justify-center",
                        "rounded-md border px-3 py-1.5",
                        "text-[12px] font-medium",
                        "transition-colors duration-150",
                        "motion-reduce:transition-none",
                        focus,
                        t.upgrade,
                      ].join(" ")}
                    >
                      Upgrade plan
                    </button>
                  </div>

                  {/* Menu groups */}
                  {menuGroups.map((group, groupIndex) => (
                    <div
                      key={group[0]?.label ?? groupIndex}
                      role="none"
                      className={["border-t p-1.5", t.menuDivider].join(" ")}
                    >
                      {group.map((item) => {
                        const Icon = item.icon;
                        const isLogout = item.action === "logout";

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
                              "flex w-full cursor-pointer items-center gap-3",
                              "rounded-md px-2.5 py-1.5",
                              "text-left text-[12.5px] font-medium",
                              "transition-colors duration-150",
                              "motion-reduce:transition-none",
                              "disabled:cursor-wait disabled:opacity-60",
                              focus,
                              t.menuItem,
                            ].join(" ")}
                          >
                            <Icon
                              className={[
                                "h-4 w-4 shrink-0",
                                t.menuIcon,
                              ].join(" ")}
                            />

                            <span className="flex-1 truncate">
                              {isLogout && loggingOut
                                ? "Logging out..."
                                : item.label}
                            </span>

                            {item.badge && (
                              <span
                                className={[
                                  "rounded px-1.5 py-0.5",
                                  "text-[10px] font-medium",
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

              {/* Profile trigger */}
              <button
                ref={triggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? "account-menu" : undefined}
                aria-keyshortcuts="Control+P"
                aria-label="Open account menu"
                title={isCollapsed ? account.name : "Account menu"}
                onClick={() => setMenuOpen((value) => !value)}
                className={[
                  "flex h-11 w-full items-center gap-3",
                  "overflow-hidden rounded-md px-1.5",
                  "transition-colors duration-150",
                  "motion-reduce:transition-none",
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
                    className="h-8 w-8 shrink-0 select-none rounded-full object-cover"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center",
                      "rounded-full text-[10px] font-semibold",
                      t.avatar,
                    ].join(" ")}
                  >
                    {account.initials}
                  </span>
                )}

                <span
                  className={[
                    "min-w-0 flex-1 truncate text-left",
                    "text-[13px] font-medium",
                    t.title,
                    labelClass,
                  ].join(" ")}
                >
                  {account.name}
                </span>
              </button>
            </div>
          </div>
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