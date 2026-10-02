import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ReactNode } from "react";

import { useTheme, type Theme } from "../hooks/useTheme";
import { navigate, useHashRoute } from "../hooks/useHashRoute";
import {
  getCurrentUser,
  signOut,
  type UserProfile,
} from "../services/supabase";

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
  handle: string;
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

/* ============================================================================
   Keyframes + global UI guards
============================================================================ */

const SIDEBAR_KEYFRAMES = `
@keyframes sbMenuIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes sbItemIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.sb-menu {
  animation: sbMenuIn 180ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

.sb-item {
  animation: sbItemIn 240ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

/* Empêche la sélection de texte et le surlignage bleu sur tous les
   contrôles interactifs de la sidebar (icônes, boutons, items de menu,
   avatar, badges). Les éléments restent cliquables et interactifs :
   on ne touche jamais à pointer-events. */
#app-sidebar button,
#app-sidebar [role="menuitem"],
#app-sidebar [role="button"],
#app-sidebar svg,
#app-sidebar img {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Annule tout surlignage accidentel lors d'un drag qui démarrerait
   sur un bouton / une icône. */
#app-sidebar button::selection,
#app-sidebar button *::selection,
#app-sidebar svg::selection,
#app-sidebar svg *::selection {
  background: transparent;
  color: inherit;
}

@media (prefers-reduced-motion: reduce) {
  .sb-menu,
  .sb-item {
    animation: none;
  }
}
`;

/* ============================================================================
   Icons
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function OverviewIcon(props: IconProps) {
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

function QueueIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 7h10M7 12h10M7 17h6" />
      <circle cx="4.5" cy="7" r="1.5" />
      <circle cx="4.5" cy="12" r="1.5" />
      <circle cx="4.5" cy="17" r="1.5" />
    </Svg>
  );
}

function AnalyticsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 18V9" />
      <path d="M12 18V5" />
      <path d="M19 18v-7" />
      <path d="M3 20h18" />
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

/**
 * Icône "Integrations" : grille 2×2 de nœuds creux.
 * Le nœud en haut à gauche est relié à celui de droite et à celui du bas ;
 * le nœud en bas à droite reste isolé (intégration non connectée).
 */
function IntegrationsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="6.5" r="2.5" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <path d="M9 6.5h6" />
      <path d="M6.5 9v6" />
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

function BoltIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 3.5 5.5 13.2h5.6L10 20.5l7.5-9.7h-5.6L13 3.5Z" />
    </Svg>
  );
}

function ChevronIcon({
  className = "h-3.5 w-3.5",
  collapsed,
}: IconProps & {
  collapsed: boolean;
}) {
  return (
    <Svg
      className={[
        className,
        "transition-transform duration-[380ms]",
        "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        "motion-reduce:transition-none",
        collapsed ? "" : "rotate-180",
      ].join(" ")}
    >
      <path d="m9 6 6 6-6 6" />
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
   Navigation data
============================================================================ */

const navSections: NavSection[] = [
  {
    label: "General",
    items: [
      { label: "Overview", icon: OverviewIcon, route: "home" },
      { label: "Calendar", icon: CalendarIcon, route: "schedule" },
      { label: "Queue", icon: QueueIcon, route: "queue" },
      { label: "Analytics", icon: AnalyticsIcon, route: "analytics" },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Templates",
        icon: TemplatesIcon,
        children: [
          { label: "Captions", route: "captions" },
          { label: "Hashtags", route: "hashtags" },
          { label: "Replies", route: "replies" },
        ],
      },
      { label: "Integrations", icon: IntegrationsIcon, route: "integrations" },
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
    { label: "Apps & Integrations", icon: AppsIcon },
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

  const labelStyle = {
    transitionDelay: isCollapsed ? "0ms" : `${90 + index * 35}ms`,
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
    <div>
      <button
        type="button"
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        aria-expanded={hasChildren ? isOpen : undefined}
        title={isCollapsed ? item.label : undefined}
        onClick={onClick}
        className={[
          "group relative flex h-10 w-full",
          "select-none",
          "items-center gap-3 overflow-hidden",
          "rounded-xl px-3",
          "text-[13px] font-medium",
          "transition-[background-color,color,transform]",
          "duration-200",
          "active:scale-[0.97]",
          "motion-reduce:transition-none",
          "motion-reduce:active:scale-100",
          focus,
          isActive ? t.navActive : t.navIdle,
        ].join(" ")}
      >
        <span
          className={[
            "relative flex shrink-0",
            "select-none",
            "transition-transform duration-200",
            "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            "group-hover:scale-110",
            "motion-reduce:transition-none",
            "motion-reduce:group-hover:scale-100",
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />

          {item.badge && (
            <span
              aria-hidden="true"
              className={[
                "absolute -right-0.5 -top-0.5",
                "h-2 w-2 rounded-full",
                "select-none",
                "bg-[#ff5ec4] ring-2",
                t.dotRing,
                isCollapsed
                  ? "opacity-100 delay-150 duration-200"
                  : "opacity-0 duration-100",
              ].join(" ")}
            />
          )}
        </span>

        <span
          className={["flex-1 select-none text-left", labelClass].join(" ")}
          style={labelStyle}
        >
          {item.label}
        </span>

        {item.badge && (
          <span
            style={labelStyle}
            className={[
              "select-none",
              "rounded-md px-1.5 py-0.5",
              "text-[11px] font-medium",
              t.count,
              labelClass,
            ].join(" ")}
          >
            <span aria-hidden="true">{item.badge}</span>
            <span className="sr-only">{item.badge} en attente</span>
          </span>
        )}

        {hasChildren && (
          <span
            className={["flex shrink-0 select-none", labelClass].join(" ")}
            style={labelStyle}
          >
            <ChevronDownIcon
              className={[
                "h-4 w-4",
                "transition-transform duration-300",
                "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
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
            "grid",
            "transition-[grid-template-rows]",
            "duration-300",
            "ease-[cubic-bezier(0.4,0,0.2,1)]",
            "motion-reduce:transition-none",
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          ].join(" ")}
        >
          <div className="overflow-hidden">
            <div
              className={[
                "ml-[22px] mt-1 flex",
                "flex-col gap-0.5",
                "border-l pl-[13px]",
                t.rail,
              ].join(" ")}
            >
              {item.children!.map((child, childIndex) => {
                const childActive = child.route === currentRoute;

                return (
                  <button
                    key={child.route}
                    type="button"
                    tabIndex={isOpen ? 0 : -1}
                    aria-current={childActive ? "page" : undefined}
                    onClick={() => onNavigate(child.route)}
                    style={{
                      transitionDelay: isOpen
                        ? `${80 + childIndex * 45}ms`
                        : "0ms",
                    }}
                    className={[
                      "flex h-9 w-full",
                      "select-none",
                      "items-center",
                      "whitespace-nowrap",
                      "rounded-lg px-2",
                      "text-left text-[13px]",
                      "font-medium",
                      "transition-[background-color,color,opacity,transform]",
                      "duration-300",
                      "ease-[cubic-bezier(0.32,0.72,0,1)]",
                      "motion-reduce:transition-none",
                      isOpen
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-2 opacity-0",
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
    </div>
  );
}

const NavItemView = memo(NavItemViewImpl);

/* ============================================================================
   Sidebar memory
============================================================================ */

const sidebarMemory = {
  collapsed: true,
  openGroup: null as string | null,
  entered: false,
};

/**
 * Cache du profil utilisateur, partagé entre tous les montages de la
 * sidebar. Sans ça, chaque changement de page qui démonte/remonte le
 * composant repart de `userProfile = null`, ce qui fait clignoter
 * l'avatar/le nom et relance systématiquement getCurrentUser().
 */
const userProfileCache = {
  profile: null as UserProfile | null,
};

/** Remet à zéro tout l'état de module (à appeler à la déconnexion). */
function resetSidebarModuleState() {
  userProfileCache.profile = null;
  sidebarMemory.collapsed = true;
  sidebarMemory.openGroup = null;
  sidebarMemory.entered = false;
}

/* ============================================================================
   Sidebar
============================================================================ */

type DashboardSidebarProps = {
  /**
   * Optionnel : si non fourni, la sidebar utilise directement le
   * contexte partagé de useTheme().
   */
  theme?: Theme;
  /** Conservée pour compatibilité avec les pages existantes ; inutilisée. */
  onToggleTheme?: ToggleThemeFn;
};

export default function DashboardSidebar({
  theme: themeProp,
}: DashboardSidebarProps) {
  const themeContext = useTheme();
  const theme = themeProp ?? themeContext.theme;
  const isDark = theme === "dark";

  const currentRoute = useHashRoute();

  const [isCollapsed, setIsCollapsed] = useState(sidebarMemory.collapsed);
  const [openGroup, setOpenGroup] = useState<string | null>(
    sidebarMemory.openGroup
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(sidebarMemory.entered);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    userProfileCache.profile
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    sidebarMemory.collapsed = isCollapsed;
    sidebarMemory.openGroup = openGroup;
  }, [isCollapsed, openGroup]);

  /* --------------------------------------------------------------------------
     Account menu events
  -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

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

  /* --------------------------------------------------------------------------
     Theme tokens
  -------------------------------------------------------------------------- */

  const t = useMemo<ThemeTokens>(
    () =>
      isDark
        ? {
            aside:
              "border-white/10 bg-[#050506] shadow-[0_10px_40px_rgba(0,0,0,0.6)]",
            brand: "text-white",
            divider: "bg-white/10",
            navActive: "bg-white/15 text-white",
            navIdle: "text-white hover:bg-white/10",
            handle:
              "border-white/15 bg-[#1c1c1c]/90 text-[#d7d7d2] hover:bg-[#262626]",
            count: "bg-white/10 text-[#d7d7d2]",
            dotRing: "ring-[#050506]",
            rail: "border-white/10",
            sub: "text-[#99a2a2] hover:bg-white/[0.06] hover:text-white",
            subActive: "bg-white/[0.08] text-white",
            row: "hover:bg-white/10",
            rowOpen: "bg-white/10",
            avatar: "bg-[#f0f0ed] text-[#111111]",
            title: "text-[#f3f3ef]",
            muted: "text-[#99a2a2]",
            menu: "border-white/10 bg-[#1c1d1d] text-[#f3f3ef] shadow-[0_18px_40px_rgba(0,0,0,0.55)]",
            menuDivider: "border-white/10",
            menuItem:
              "text-[#ecece8] hover:bg-white/[0.06] focus-visible:bg-white/[0.06]",
            menuIcon: "text-[#a9aeae]",
            upgrade:
              "border-white/10 bg-white/[0.04] text-[#f3f3ef] hover:bg-white/[0.08]",
            badge: "bg-[#4a2f4a] text-[#f0bdf0]",
            ring: "focus-visible:ring-white/30",
          }
        : {
            aside:
              "border-black/10 bg-white shadow-[0_10px_40px_rgba(20,20,40,0.10)]",
            brand: "text-[#151515]",
            divider: "bg-black/[0.07]",
            navActive: "bg-black/[0.06] text-[#151515]",
            navIdle: "text-[#3f3f3d] hover:bg-black/[0.04]",
            handle:
              "border-black/10 bg-white/90 text-[#4d4d4b] hover:bg-white",
            count: "bg-black/[0.05] text-[#3f3f3d]",
            dotRing: "ring-white",
            rail: "border-black/[0.08]",
            sub: "text-[#71706d] hover:bg-black/[0.04] hover:text-[#151515]",
            subActive: "bg-black/[0.06] text-[#151515]",
            row: "hover:bg-black/[0.04]",
            rowOpen: "bg-black/[0.04]",
            avatar: "bg-[#1d1d1d] text-white",
            title: "text-[#1b1b1a]",
            muted: "text-[#71706d]",
            menu: "border-black/10 bg-white text-[#1a1a1a] shadow-[0_18px_40px_rgba(0,0,0,0.12)]",
            menuDivider: "border-black/[0.07]",
            menuItem:
              "text-[#1f1f1e] hover:bg-black/[0.04] focus-visible:bg-black/[0.04]",
            menuIcon: "text-[#6b6a67]",
            upgrade:
              "border-black/10 bg-[#f6f5f3] text-[#1a1a1a] hover:bg-[#efeeeb]",
            badge: "bg-[#f3dcf3] text-[#7a2f7a]",
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
     Label animation
  -------------------------------------------------------------------------- */

  const labelClass = useMemo(
    () =>
      [
        "select-none",
        "whitespace-nowrap",
        "transition-[opacity,transform]",
        "ease-[cubic-bezier(0.4,0,0.2,1)]",
        "motion-reduce:transition-none",
        isCollapsed
          ? "-translate-x-1 opacity-0 duration-150"
          : "translate-x-0 opacity-100 duration-300",
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

  const handleNavigate = useCallback((route: string) => {
    navigate(route);
  }, []);

  const handleToggleGroup = useCallback((label: string) => {
    setOpenGroup((current) => (current === label ? null : label));
  }, []);

  const handleExpandAndOpen = useCallback((label: string) => {
    setIsCollapsed(false);
    setOpenGroup(label);
  }, []);

  /* --------------------------------------------------------------------------
     Logout
     Déconnexion → nettoyage des caches → retour à la landing page.
     On fait un rechargement complet sur l'URL sans hash pour que
     UserContext reparte de zéro (user = null) : sans ça, le useEffect de
     App.tsx renverrait aussitôt vers "home" tant que user est non nul.
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
  let menuItemIndex = 0;

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
        channels: 0,
        avatarUrl: userProfile.avatar_url || undefined,
      }
    : defaultAccount;

  const showAvatarImage = Boolean(account.avatarUrl) && !avatarLoadFailed;

  /* ==========================================================================
     Render
  ========================================================================== */

  return (
    <div
      className={[
        "fixed inset-y-8 left-4 z-20",
        "transition-[opacity,transform]",
        "duration-500",
        "ease-[cubic-bezier(0.32,0.72,0,1)]",
        "motion-reduce:transition-none",
        hasMounted
          ? "translate-x-0 opacity-100"
          : "-translate-x-6 opacity-0",
      ].join(" ")}
    >
      <style>{SIDEBAR_KEYFRAMES}</style>

      <aside
        id="app-sidebar"
        className={[
          "relative flex h-full flex-col",
          "overflow-visible rounded-[36px]",
          "border px-3 py-5",
          "transition-[width,box-shadow]",
          "duration-[380ms]",
          "ease-[cubic-bezier(0.4,0,0.2,1)]",
          "motion-reduce:transition-none",
          "will-change-[width]",
          t.aside,
          isCollapsed ? "w-[68px]" : "w-[200px]",
        ].join(" ")}
      >
        {/* Collapse button */}
        <button
          type="button"
          aria-expanded={!isCollapsed}
          aria-controls="app-sidebar"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggleCollapsed}
          className={[
            "absolute -right-3 top-[44%]",
            "z-10 flex h-6 w-6",
            "select-none",
            "items-center justify-center",
            "rounded-full border",
            "backdrop-blur",
            "transition-[background-color,transform]",
            "duration-300",
            "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            "hover:scale-110",
            "active:scale-90",
            "motion-reduce:transition-none",
            focus,
            t.handle,
          ].join(" ")}
        >
          <ChevronIcon className="h-3 w-3" collapsed={isCollapsed} />
        </button>

        {/* Logo */}
        <div
          className={[
            "flex items-center gap-2",
            "select-none",
            "overflow-hidden px-1.5",
            t.brand,
          ].join(" ")}
        >
          <img
            src={isDark ? "/images/icon_nav.png" : "/images/icon.png"}
            alt="Stone logo"
            draggable={false}
            className="h-9 w-8 shrink-0 select-none object-contain"
          />

          <span
            className={[
              "select-none",
              "text-[20px] font-semibold",
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
            "-mx-1 mt-5 flex min-h-0 flex-1",
            "flex-col overflow-y-auto",
            "overflow-x-hidden px-1",
            "[scrollbar-width:none]",
            "[&::-webkit-scrollbar]:hidden",
          ].join(" ")}
          aria-label="Main"
        >
          {navSections.map((section, sectionIndex) => (
            <div
              key={section.label}
              className={sectionIndex === 0 ? "" : "mt-3"}
            >
              {sectionIndex > 0 && (
                <div className={["mx-1 mb-3 h-px", t.divider].join(" ")} />
              )}

              <div
                className={[
                  "select-none",
                  "overflow-hidden",
                  "whitespace-nowrap",
                  "px-3 text-[12px]",
                  "font-medium leading-4",
                  "transition-[height,margin,opacity,transform]",
                  "duration-300",
                  "ease-[cubic-bezier(0.4,0,0.2,1)]",
                  "motion-reduce:transition-none",
                  t.muted,
                  isCollapsed
                    ? "mb-0 h-0 -translate-x-1 opacity-0"
                    : "mb-1.5 h-4 translate-x-0 opacity-100 delay-100",
                ].join(" ")}
              >
                {section.label}
              </div>

              <div className="flex flex-col gap-1">
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
            </div>
          ))}
        </nav>

        {/* Account */}
        <div ref={profileRef} className="mt-3 flex flex-col gap-3">
          <div className="relative">
            {/* Account menu */}
            {menuOpen && (
              <div
                id="account-menu"
                role="menu"
                aria-label="Account menu"
                className={[
                  "sb-menu absolute",
                  "bottom-full left-[6px]",
                  "z-50 mb-2 w-[264px]",
                  "origin-bottom-left",
                  "overflow-hidden",
                  "rounded-[16px]",
                  "border",
                  t.menu,
                ].join(" ")}
              >
                {/* Account header */}
                <div
                  className="sb-item px-3.5 pb-3 pt-3.5"
                  style={{ animationDelay: "30ms" }}
                >
                  <div className={["truncate text-[11px]", t.muted].join(" ")}>
                    {account.email}
                  </div>

                  <div className="mt-2.5 truncate text-[14px] font-semibold">
                    {account.name}
                  </div>

                  <div className={["mt-0.5 text-[11px]", t.muted].join(" ")}>
                    {account.plan} · {account.channels} channels
                  </div>

                  <button
                    type="button"
                    className={[
                      "group mt-3 flex w-full",
                      "select-none",
                      "items-center justify-center",
                      "gap-2 rounded-[10px]",
                      "border px-3 py-2",
                      "text-[12px] font-semibold",
                      "transition-[background-color,transform]",
                      "duration-150",
                      "active:scale-[0.98]",
                      "motion-reduce:transition-none",
                      focus,
                      t.upgrade,
                    ].join(" ")}
                  >
                    <BoltIcon
                      className={[
                        "h-4 w-4",
                        "transition-transform duration-300",
                        "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        "group-hover:-rotate-12",
                        "group-hover:scale-110",
                        "motion-reduce:transition-none",
                      ].join(" ")}
                    />
                    Upgrade Plan
                  </button>
                </div>

                {/* Menu groups */}
                {menuGroups.map((group, groupIndex) => (
                  <div
                    key={group[0]?.label ?? groupIndex}
                    role="none"
                    className={["border-t px-1.5 py-1.5", t.menuDivider].join(
                      " "
                    )}
                  >
                    {group.map((item) => {
                      const Icon = item.icon;
                      const delay = 60 + menuItemIndex++ * 25;
                      const isLogout = item.action === "logout";

                      return (
                        <button
                          key={item.label}
                          type="button"
                          role="menuitem"
                          disabled={isLogout && loggingOut}
                          style={{ animationDelay: `${delay}ms` }}
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
                            "sb-item group flex",
                            "w-full cursor-pointer",
                            "select-none",
                            "items-center gap-3",
                            "rounded-[10px]",
                            "px-2.5 py-2",
                            "text-left text-[12.5px]",
                            "font-medium",
                            "transition-[background-color,transform] duration-150",
                            "active:scale-[0.98]",
                            "motion-reduce:transition-none",
                            "disabled:cursor-wait disabled:opacity-60",
                            focus,
                            t.menuItem,
                          ].join(" ")}
                        >
                          <Icon
                            className={[
                              "h-4 w-4 shrink-0",
                              "transition-transform duration-200",
                              "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                              "group-hover:scale-110",
                              "motion-reduce:transition-none",
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
                                "select-none",
                                "rounded-full",
                                "px-2 py-0.5",
                                "text-[10px]",
                                "font-semibold",
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
              aria-controls="account-menu"
              aria-label="Open account menu"
              title={isCollapsed ? account.name : undefined}
              onClick={() => setMenuOpen((value) => !value)}
              className={[
                "group flex h-11 w-full",
                "select-none",
                "items-center gap-3",
                "overflow-hidden",
                "rounded-xl px-1.5",
                "transition-[background-color,transform]",
                "duration-200",
                "active:scale-[0.97]",
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
                  className={[
                    "h-8 w-8 shrink-0",
                    "select-none",
                    "rounded-full object-cover",
                    "transition-transform duration-300",
                    "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    "group-hover:scale-105",
                    "motion-reduce:transition-none",
                  ].join(" ")}
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <span
                  className={[
                    "flex h-8 w-8 shrink-0",
                    "select-none",
                    "items-center justify-center",
                    "rounded-full",
                    "text-[10px] font-semibold",
                    "transition-transform duration-300",
                    "ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                    "group-hover:scale-105",
                    "motion-reduce:transition-none",
                    t.avatar,
                  ].join(" ")}
                >
                  {account.initials}
                </span>
              )}

              <span
                className={[
                  "min-w-0 flex-1",
                  "select-none",
                  "truncate text-left",
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
      </aside>
    </div>
  );
}