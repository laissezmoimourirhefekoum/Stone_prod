import React, { useEffect, useRef, useState, useCallback } from "react";

/* ============================================================
   Dashboard Sidebar — Redesign
   Principes UI/UX :
   1. Sidebar collée au bord gauche : pleine hauteur, zéro arrondi,
      zéro ombre, une seule bordure à droite.
   2. Rail d'icônes : 64px réduite / 232px ouverte, avec labels
      en fondu (jamais de glissement horizontal des textes).
   3. État actif = pilule pleine + barre d'accent 3px à gauche.
   4. Groupes dépliables animés (grid-template-rows), mémoire
      d'ouverture conservée entre réductions.
   5. Tooltips en portal quand réduite (delay 300ms).
   6. Raccourcis : Ctrl/⌘+B toggle, Ctrl+N connect.
   7. Thème clair/sombre, transitions douces, reduced-motion respecté.
============================================================ */

const IS_MAC =
  typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform);
const TOGGLE_LABEL = IS_MAC ? "⌘B" : "Ctrl B";

function Svg({ className = "h-4 w-4", children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
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

const Icon = {
  home: (p) => (
    <Svg {...p}>
      <path d="M4 12.5 12 5l8 7.5" />
      <path d="M6 10.5V18h12v-7.5" />
    </Svg>
  ),
  calendar: (p) => (
    <Svg {...p}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M3.5 9.5h17" />
    </Svg>
  ),
  templates: (p) => (
    <Svg {...p}>
      <rect x="5" y="5.5" width="14" height="13" rx="2" />
      <path d="M8.5 10h7M8.5 14h7" />
    </Svg>
  ),
  settings: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
    </Svg>
  ),
  channels: (p) => (
    <Svg {...p}>
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="7.5" r="2.5" />
      <circle cx="7.5" cy="16.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </Svg>
  ),
  billing: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.2 5 4 0 1.1-1.1 1.9-2.5 1.9-1.2 0-2.2-.6-2.6-1.6M12 6.5V8M12 16v1.5" />
    </Svg>
  ),
  help: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.6-2.4 2.1-2.4 3.6M12 16.8v.1" />
    </Svg>
  ),
  bulb: (p) => (
    <Svg {...p}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.3V16h6v-.2c0-.9.4-1.7 1-2.3A6 6 0 0 0 12 3Z" />
    </Svg>
  ),
  logout: (p) => (
    <Svg {...p}>
      <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10" />
      <path d="M14 8.5 18 12l-4 3.5M18 12H9.5" />
    </Svg>
  ),
  plus: (p) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  chevron: (p) => (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  ),
  panel: ({ className = "h-4 w-4", open }) => (
    <Svg className={className}>
      <rect
        x="3.5"
        y="4.5"
        width="6"
        height="15"
        rx="2"
        fill="currentColor"
        stroke="none"
        className={open ? "opacity-30" : "opacity-0"}
      />
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M9.5 4.5v15" />
    </Svg>
  ),
  insights: (p) => (
    <Svg {...p}>
      <path d="M5 18V9M12 18V5M19 18v-7M3 20h18" />
    </Svg>
  ),
  community: (p) => (
    <Svg {...p}>
      <path d="M4 5.5h10a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H8.5L5.5 16v-2.5H4A1.5 1.5 0 0 1 2.5 12V7A1.5 1.5 0 0 1 4 5.5Z" />
      <path d="M18.5 9.5H20a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-1.5V20l-3-2.5H11" />
    </Svg>
  ),
  publish: (p) => (
    <Svg {...p}>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M3.5 9.5h17" />
    </Svg>
  ),
  search: (p) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Svg>
  ),
};

/* ---------- Mock data ---------- */

const NAV = [
  { section: "Workspace", items: [
    { label: "Home", icon: "home", route: "home", shortcut: "H" },
    { label: "Calendar", icon: "calendar", route: "schedule", shortcut: "D" },
    { label: "Templates", icon: "templates", route: "template", shortcut: "T" },
  ]},
  { section: "Manage", items: [
    { label: "Channels", icon: "channels", route: "channels", shortcut: "L" },
    { label: "Settings", icon: "settings", route: "settings", shortcut: "S" },
    { label: "Plans & Billing", icon: "billing", route: "pricing", shortcut: "U" },
    { label: "Help & Support", icon: "help", route: "faq", shortcut: "F" },
  ]},
];

const CHANNELS = [
  { key: "ig", handle: "ronan.studio", name: "Instagram", color: "#E1306C", initial: "R" },
  { key: "tt", handle: "ronan.creates", name: "TikTok", color: "#010101", initial: "R" },
  { key: "yt", handle: "Ronan Studio", name: "YouTube", color: "#FF0000", initial: "R" },
];

const CHANNEL_LINKS = [
  { label: "Publish", icon: "publish" },
  { label: "Community", icon: "community" },
  { label: "Insights", icon: "insights", badge: "New" },
];

/* ---------- Tokens ---------- */

function useTokens(dark) {
  return dark
    ? {
        aside: "bg-[#0c0c0e] border-white/[0.08]",
        brand: "text-white",
        sectionLabel: "text-[#6f6f75]",
        divider: "bg-white/[0.08]",
        active: "bg-white/[0.09] text-white before:bg-white",
        idle: "text-[#a1a1a6] hover:bg-white/[0.05] hover:text-white",
        activeSub: "bg-white/[0.09] text-white",
        sub: "text-[#8a8a90] hover:bg-white/[0.05] hover:text-white",
        rail: "border-white/[0.08]",
        menu: "bg-[#161618] border-white/[0.1] text-[#f3f3ef]",
        muted: "text-[#7d7d83]",
        badge: "bg-white/[0.1] text-[#c8c8cc]",
        avatar: "bg-white text-[#111]",
        tooltip: "bg-[#161618] border-white/[0.1] text-[#f3f3ef]",
        ring: "focus-visible:ring-white/30",
        page: "bg-[#09090b] text-[#e7e7e9]",
        card: "bg-[#121214] border-white/[0.08]",
      }
    : {
        aside: "bg-white border-black/[0.08]",
        brand: "text-[#151515]",
        sectionLabel: "text-[#a0a09c]",
        divider: "bg-black/[0.07]",
        active: "bg-black/[0.06] text-[#151515] before:bg-[#151515]",
        idle: "text-[#5c5c59] hover:bg-black/[0.04] hover:text-[#151515]",
        activeSub: "bg-black/[0.06] text-[#151515]",
        sub: "text-[#77766f] hover:bg-black/[0.04] hover:text-[#151515]",
        rail: "border-black/[0.08]",
        menu: "bg-white border-black/[0.1] text-[#1a1a1a]",
        muted: "text-[#8a8983]",
        badge: "bg-black/[0.06] text-[#4d4d4b]",
        avatar: "bg-[#1d1d1d] text-white",
        tooltip: "bg-white border-black/[0.1] text-[#1a1a1a]",
        ring: "focus-visible:ring-black/20",
        page: "bg-[#f7f7f6] text-[#1b1b1a]",
        card: "bg-white border-black/[0.08]",
      };
}

/* ---------- Tooltip (portal-like, fixed) ---------- */

function Tip({ label, enabled, className, children }) {
  const ref = useRef(null);
  const timer = useRef();
  const [pos, setPos] = useState(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setPos(null);
  }, []);

  const show = useCallback(() => {
    if (!enabled) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setPos({ top: r.top + r.height / 2, left: r.right + 10 });
    }, 300);
  }, [enabled]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="contents"
    >
      {children}
      {pos && (
        <span
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
          className={[
            "pointer-events-none fixed z-[80] -translate-y-1/2 whitespace-nowrap",
            "rounded-lg border px-2 py-1 text-[11.5px] font-medium",
            "animate-[fadeIn_.14s_ease-out]",
            className,
          ].join(" ")}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/* ---------- Sidebar ---------- */

function Sidebar({ dark, toggleTheme, route, setRoute }) {
  const t = useTokens(dark);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({ ig: true });
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef(null);
  const [dismissed, setDismissed] = useState(false);

  const focus = ["focus-visible:outline-none focus-visible:ring-2", t.ring].join(" ");

  const labelCls = [
    "whitespace-nowrap transition-opacity duration-200",
    collapsed ? "opacity-0 delay-0" : "opacity-100 delay-100",
  ].join(" ");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "b" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setCollapsed((c) => !c);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMenuOpen(false), [route]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (!profileRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const navBtn = (active) =>
    [
      "group relative flex h-9 w-full items-center gap-3 overflow-hidden rounded-xl px-2.5",
      "text-[13px] font-medium transition-colors duration-150 motion-reduce:transition-none",
      "before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2",
      "before:rounded-full before:scale-y-0 before:transition-transform",
      "hover:before:scale-y-100",
      active ? t.active : t.idle,
      active ? "before:scale-y-100" : "",
      focus,
    ].join(" ");

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-20 flex h-full flex-col border-r px-2.5 py-4 rounded-r-[28px]",
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
        t.aside,
        collapsed ? "w-[64px]" : "w-[232px]",
      ].join(" ")}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* Brand row */}
      <div className="mb-5 flex items-center gap-2.5 px-1.5">
        <div
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold",
            dark ? "bg-white text-black" : "bg-[#151515] text-white",
          ].join(" ")}
        >
          S
        </div>
        <span className={["text-[16px] font-semibold tracking-tight", labelCls, t.brand].join(" ")}>
          Stone
        </span>
      </div>

      {/* Search (nouveau) */}
      <Tip label="Search (Ctrl K)" enabled={collapsed} className={t.tooltip}>
        <button
          type="button"
          className={[
            "mb-3 flex h-9 w-full items-center gap-2.5 rounded-xl border px-2.5",
            "text-[12.5px] transition-colors duration-150",
            t.idle, t.rail, focus,
          ].join(" ")}
        >
          <Icon.search className="h-4 w-4 shrink-0" />
          <span className={["flex-1 truncate text-left", labelCls].join(" ")}>
            Search…
          </span>
          {!collapsed && (
            <kbd className={["rounded px-1.5 py-0.5 text-[10px] font-medium", t.badge].join(" ")}>
              ⌘K
            </kbd>
          )}
        </button>
      </Tip>

      {/* Nav */}
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((section) => (
          <div key={section.section}>
            <div
              className={[
                "mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider",
                "transition-opacity duration-200",
                t.sectionLabel, labelCls,
              ].join(" ")}
            >
              {section.section}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const I = Icon[item.icon];
                const active = item.route === route;
                return (
                  <Tip key={item.route} label={item.label} enabled={collapsed} className={t.tooltip}>
                    <button
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => setRoute(item.route)}
                      className={navBtn(active)}
                    >
                      <I className="h-[18px] w-[18px] shrink-0" />
                      <span className={["flex-1 text-left", labelCls].join(" ")}>
                        {item.label}
                      </span>
                      {!collapsed && item.badge}
                    </button>
                  </Tip>
                );
              })}
            </div>
          </div>
        ))}

        {/* Channels */}
        <div>
          <div className={["mx-1 mb-2 h-px", t.divider].join(" ")} />
          <div
            className={[
              "mb-1 flex items-center justify-between px-2.5",
              "transition-[height,margin,opacity] duration-200 motion-reduce:transition-none",
              "text-[11px] font-semibold uppercase tracking-wider",
              collapsed ? "h-0 overflow-hidden opacity-0" : "h-6 opacity-100",
              t.sectionLabel,
            ].join(" ")}
          >
            Channels
            <button
              type="button"
              title="Connect a channel (Ctrl N)"
              className={["rounded p-0.5 transition-colors hover:opacity-70", t.ring].join(" ")}
              onClick={() => setRoute("channels")}
            >
              <Icon.plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-0.5">
            {CHANNELS.map((c) => {
              const open = openGroups[c.key] && !collapsed;
              return (
                <div key={c.key}>
                  <Tip label={"@" + c.handle} enabled={collapsed} className={t.tooltip}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() =>
                        setRoute(`insights:${c.key}`)
                      }
                      className={[
                        "flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-xl px-2 text-[13px]",
                        "font-medium transition-colors duration-150 motion-reduce:transition-none",
                        route === `insights:${c.key}` ? t.active : t.idle, focus,
                      ].join(" ")}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: c.color === "#010101" && dark ? "#2a2a2e" : c.color }}
                      >
                        {c.initial}
                      </span>
                      <span className={["min-w-0 flex-1 truncate text-left", labelCls].join(" ")}>
                        {c.handle}
                      </span>
                      <span
                        className={labelCls}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenGroups((g) => ({ ...g, [c.key]: !g[c.key] }));
                        }}
                      >
                        <Icon.chevron
                          className={[
                            "h-3.5 w-3.5 opacity-50 transition-transform duration-200",
                            open ? "" : "-rotate-90",
                          ].join(" ")}
                        />
                      </span>
                    </button>
                  </Tip>

                  <div
                    className={[
                      "grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    ].join(" ")}
                  >
                    <div className="overflow-hidden">
                      <div className={["ml-[15px] mt-0.5 flex flex-col gap-0.5 border-l pl-3", t.rail].join(" ")}>
                        {CHANNEL_LINKS.map((l) => {
                          const L = Icon[l.icon];
                          const target = `${l.label}:${c.key}`;
                          const active = route === target;
                          return (
                            <button
                              key={l.label}
                              type="button"
                              tabIndex={open ? 0 : -1}
                              onClick={() => setRoute(target)}
                              className={[
                                "flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[12.5px]",
                                "font-medium transition-colors duration-150 motion-reduce:transition-none",
                                active ? t.activeSub : t.sub, focus,
                              ].join(" ")}
                            >
                              <L className="h-4 w-4 shrink-0" />
                              <span className="flex-1">{l.label}</span>
                              {l.badge && (
                                <span className={["rounded px-1.5 py-0.5 text-[10px] font-medium", t.badge].join(" ")}>
                                  {l.badge}
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
        </div>
      </nav>

      {/* Account */}
      <div className={["mt-3 border-t pt-3", t.rail].join(" ")} ref={profileRef}>
        {menuOpen && (
          <div
            role="menu"
            className={[
              "absolute bottom-full left-2.5 right-2.5 mb-2 overflow-hidden rounded-2xl border",
              "animate-[fadeIn_.14s_ease-out]", t.menu,
            ].join(" ")}
          >
            <div className="px-3.5 py-3">
              <div className="text-[13.5px] font-semibold">Ronan Martin</div>
              <div className={["mt-0.5 truncate text-[11.5px]", t.muted].join(" ")}>
                ronan@crew.io
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setRoute("pricing"); }}
                className={[
                  "mt-2.5 w-full rounded-lg border py-1.5 text-[12px] font-medium",
                  "transition-colors hover:bg-black/[0.04]", t.rail, focus,
                ].join(" ")}
              >
                Upgrade plan · Free
              </button>
            </div>
            <div className={["border-t p-1.5", t.divider].join(" ")}>
              <button role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-black/[0.04]" onClick={() => { setMenuOpen(false); setRoute("settings"); }}>
                <Icon.settings className="h-4 w-4" /> Settings
              </button>
              <button role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-black/[0.04]" onClick={toggleTheme}>
                <Icon.bulb className="h-4 w-4" /> {dark ? "Light" : "Dark"} theme
              </button>
            </div>
            <div className={["border-t p-1.5", t.divider].join(" ")}>
              <button role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-red-500 hover:bg-red-500/10">
                <Icon.logout className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              "transition-colors duration-150", t.idle, focus,
            ].join(" ")}
          >
            <Icon.panel className="h-[18px] w-[18px]" open={!collapsed} />
          </button>

          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={[
              "flex h-10 min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-xl px-1.5",
              "transition-colors duration-150", focus,
              menuOpen ? (dark ? "bg-white/[0.06]" : "bg-black/[0.04]") : "hover:bg-black/[0.04]",
            ].join(" ")}
          >
            <span className={["flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", t.avatar].join(" ")}>
              RM
            </span>
            <span className={["min-w-0 flex-1 truncate text-left text-[13px] font-medium", labelCls].join(" ")}>
              Ronan Martin
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ---------- Demo page behind the sidebar ---------- */

export default function App() {
  const [dark, setDark] = useState(true);
  const [route, setRoute] = useState("home");
  const [collapsed, setCollapsed] = useState(false);

  // Synchronise la largeur de la page avec l'état de la sidebar via l'événement.
  const [offset, setOffset] = useState(232);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "b" && (e.metaKey || e.ctrlKey)) {
        setCollapsed((c) => {
          setOffset(!c ? 64 : 232);
          return !c;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const t = useTokens(dark);
  const label = route.split(":");
  const title = label[0];
  const channel = label[1] ? CHANNELS.find((c) => c.key === label[1]) : null;

  return (
    <div className={["min-h-screen font-sans antialiased", t.page].join(" ")}>
      <Sidebar
        dark={dark}
        toggleTheme={() => setDark((d) => !d)}
        route={route}
        setRoute={setRoute}
      />
      <main
        className="transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ paddingLeft: offset }}
      >
        <div className="mx-auto max-w-4xl px-8 py-10">
          <div className="mb-1 text-[12px] font-medium uppercase tracking-wider opacity-50">
            {channel ? channel.name : "Workspace"}
          </div>
          <h1 className="mb-6 text-2xl font-semibold capitalize">
            {title === "insights" && channel ? `Insights — @${channel.handle}` : title}
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={["rounded-2xl border p-5", t.card].join(" ")}>
                <div className="text-[11px] font-semibold uppercase tracking-wider opacity-50">
                  Metric {i + 1}
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {["12.4k", "318", "94%"][i]}
                </div>
                <div className="mt-1 text-[12px] text-emerald-500">↑ 8.2% vs last week</div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-xl text-[13.5px] leading-relaxed opacity-60">
            Prototype du redesign de la sidebar. Essaie : <b>⌘/Ctrl + B</b> pour
            réduire, survole une icône en mode réduit pour voir le tooltip,
            déplie un canal, ou change de thème via le menu compte.
          </p>
        </div>
      </main>
    </div>
  );
}