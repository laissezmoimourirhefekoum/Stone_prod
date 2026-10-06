import React, { useState, useEffect } from "react";

/* ============================================================================
   Sidebar redesign — style minimaliste fin + navigation plus claire
   - Largeur réduite : 56px repliée / 212px ouverte, coins 14px (fin)
   - Fond discret (gris très léger / presque noir), hairline borders
   - Rail actif : barre verticale + fond subtil → état actif évident
   - Groupes explicites, labels en petites capitales espacées
   - Mode replié : tooltips au survol pour chaque item
============================================================================ */

const SIDEBAR_KEYFRAMES = `
@keyframes rdFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.rd-anim { animation: rdFadeIn 200ms cubic-bezier(0.32,0.72,0,1) both; }
`;

/* ---------- Icons (inline SVG, stroke fin) ---------- */

const I = ({ d, className = "h-[17px] w-[17px]" }: { d: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const Overview = (p: { className?: string }) => <I {...p} d={<><path d="M4 12.5 12 5l8 7.5" /><path d="M6 10.5V18h12v-7.5" /></>} />;
const Calendar = (p: { className?: string }) => <I {...p} d={<><rect x="3.5" y="5.5" width="17" height="15" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M3.5 9.5h17" /></>} />;
const Templates = (p: { className?: string }) => <I {...p} d={<><rect x="4" y="4.5" width="16" height="15" rx="2.5" /><path d="M8 10h8M8 14h5" /></>} />;
const Channels = (p: { className?: string }) => <I {...p} d={<><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="7.5" r="2.5" /><circle cx="7.5" cy="16.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></>} />;
const Settings = (p: { className?: string }) => <I {...p} d={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>} />;
const Publish = (p: { className?: string }) => <I {...p} d={<><rect x="3.5" y="5.5" width="17" height="15" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M3.5 9.5h17" /></>} />;
const Community = (p: { className?: string }) => <I {...p} d={<><path d="M4 5.5h10a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H8.5L5.5 16v-2.5H4A1.5 1.5 0 0 1 2.5 12V7A1.5 1.5 0 0 1 4 5.5Z" /><path d="M18.5 9.5H20a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-1.5V20l-3-2.5H11" /></>} />;
const Insights = (p: { className?: string }) => <I {...p} d={<><path d="M5 18V9M12 18V5M19 18v-7M3 20h18" /></>} />;
const Plus = (p: { className?: string }) => <I {...p} d={<path d="M12 5v14M5 12h14" />} />;
const Chevron = ({ className = "h-3.5 w-3.5", open }: { className?: string; open: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 250ms cubic-bezier(0.34,1.56,0.64,1)" }}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const PanelIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="4.5" width="6" height="15" rx="1.5" fill="currentColor" stroke="none" style={{ opacity: open ? 0.35 : 0, transition: "opacity 250ms" }} />
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M9.5 4.5v15" />
  </svg>
);

/* ---------- Types + data ---------- */

type NavEntry = { label: string; icon: (p: { className?: string }) => React.ReactElement; route: string; badge?: string };

const navGroups: { label: string; entries: NavEntry[] }[] = [
  {
    label: "Workspace",
    entries: [
      { label: "Overview", icon: Overview, route: "home" },
      { label: "Calendar", icon: Calendar, route: "schedule" },
      { label: "Templates", icon: Templates, route: "template" },
    ],
  },
  {
    label: "Channels",
    entries: [],
  },
];

const channelLinks = [
  { label: "Publish", icon: Publish },
  { label: "Community", icon: Community },
  { label: "Insights", icon: Insights, badge: "New" },
];

const mockChannels = [
  { key: "instagram", name: "ronan.studio", network: "IG", color: "#E1306C" },
  { key: "tiktok", name: "ronan.creates", network: "TT", color: "#25F4EE" },
  { key: "youtube", name: "Ronan Studio", network: "YT", color: "#FF0000" },
];

/* ---------- Tooltip (mode replié) ---------- */

function Tooltip({ label, hint, side = "right" }: { label: string; hint?: string; side?: string }) {
  return (
    <span
      role="tooltip"
      className={[
        "pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium opacity-0 shadow-lg",
        "transition-opacity duration-150 delay-300 group-hover:opacity-100 group-focus-visible:opacity-100",
        side === "right" ? "left-full top-1/2 ml-3 -translate-y-1/2" : "right-0 bottom-full mb-2",
        "bg-white text-[#1b1b1a] border-black/10",
        "dark:bg-[#1c1d1d] dark:text-[#f3f3ef] dark:border-white/10",
      ].join(" ")}
    >
      {label}
      {hint && <span className="ml-1.5 text-[10px] opacity-50">{hint}</span>}
    </span>
  );
}

/* ---------- Main sidebar ---------- */

export default function App() {
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [route, setRoute] = useState("home");
  const [openChannel, setOpenChannel] = useState<string | null>(mockChannels[0].key);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.("#rd-profile")) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const navigate = (r: string) => setRoute(r.split("?")[0]);

  /* Theme tokens, minimalistes et discrets */
  const t = dark
    ? {
        page: "bg-[#0b0b0c] text-[#e8e8e4]",
        aside: "bg-[#121213] border-white/[0.06]",
        brand: "text-white",
        section: "text-[#8a8a86]",
        divider: "bg-white/[0.06]",
        rail: "border-white/[0.07]",
        idle: "text-[#b5b5b0] hover:bg-white/[0.05] hover:text-white",
        active: "bg-white/[0.08] text-white",
        railBar: "bg-white",
        sub: "text-[#95958f] hover:bg-white/[0.04] hover:text-white",
        subActive: "bg-white/[0.07] text-white",
        avatar: "bg-[#f0f0ed] text-[#111]",
        badge: "bg-white/10 text-[#ddd]",
        tooltip: "",
      }
    : {
        page: "bg-[#f7f7f5] text-[#1b1b1a]",
        aside: "bg-white border-black/[0.06]",
        brand: "text-[#151515]",
        section: "text-[#9a9a94]",
        divider: "bg-black/[0.05]",
        rail: "border-black/[0.06]",
        idle: "text-[#555551] hover:bg-black/[0.035] hover:text-[#151515]",
        active: "bg-black/[0.05] text-[#151515]",
        railBar: "bg-[#151515]",
        sub: "text-[#7c7c77] hover:bg-black/[0.03] hover:text-[#151515]",
        subActive: "bg-black/[0.05] text-[#151515]",
        avatar: "bg-[#1d1d1d] text-white",
        badge: "bg-black/[0.05] text-[#555551]",
        tooltip: "",
      };

  const labelCls = [
    "whitespace-nowrap transition-[opacity,transform] duration-200 ease-out",
    collapsed ? "translate-x-1 opacity-0" : "translate-x-0 opacity-100 delay-75",
  ].join(" ");

  const NavLink = ({ entry }: { entry: NavEntry }) => {
    const active = entry.route === route;
    const Icon = entry.icon;
    return (
      <button
        type="button"
        onClick={() => navigate(entry.route)}
        aria-current={active ? "page" : undefined}
        title={collapsed ? entry.label : undefined}
        className={[
          "group relative flex h-9 w-full items-center gap-3 rounded-[10px] px-2.5 text-[13px] font-medium",
          "transition-colors duration-150 outline-none focus-visible:ring-2",
          dark ? "focus-visible:ring-white/25" : "focus-visible:ring-black/15",
          active ? t.active : t.idle,
        ].join(" ")}
      >
        {/* Rail actif : marqueur vertical net à gauche */}
        <span
          aria-hidden="true"
          className={[
            "absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full",
            t.railBar,
            active ? "opacity-100" : "opacity-0",
          ].join(" ")}
          style={{ transition: "opacity 150ms" }}
        />
        <span className="flex shrink-0 items-center justify-center">
          <Icon className={active ? "h-[17px] w-[17px]" : "h-[17px] w-[17px] opacity-80"} />
        </span>
        <span className={["min-w-0 flex-1 truncate text-left", labelCls].join(" ")}>{entry.label}</span>
        {entry.badge && (
          <span className={["rounded-full px-1.5 py-0.5 text-[10px] font-semibold", t.badge, labelCls].join(" ")}>
            {entry.badge}
          </span>
        )}
        {collapsed && <Tooltip label={entry.label} />}
      </button>
    );
  };

  return (
    <div className={[dark ? "dark" : "", "min-h-screen w-full", t.page].join(" ")}>
      <style>{SIDEBAR_KEYFRAMES}</style>

      <div className="flex min-h-screen">
        {/* ================= Sidebar ================= */}
        <aside
          className={[
            "sticky top-0 flex h-screen shrink-0 flex-col border-r px-2.5 py-5",
            "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            t.aside,
            collapsed ? "w-[56px]" : "w-[212px]",
          ].join(" ")}
        >
          {/* Brand */}
          <div className={["mb-5 flex items-center gap-2.5 px-1.5", t.brand].join(" ")}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#151515] text-[12px] font-bold text-white dark:bg-white dark:text-black">S</span>
            <span className={["text-[15px] font-semibold tracking-tight", labelCls].join(" ")}>Stone</span>
          </div>

          {/* Nav scrollable */}
          <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Main">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className={["mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em]", t.section, labelCls].join(" ")}>
                  {group.label}
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.entries.map((e) => <NavLink key={e.route} entry={e} />)}
                </div>
              </div>
            ))}

            {/* Connected channels */}
            <div>
              <div className="mb-1.5 flex items-center justify-between px-2.5">
                <span className={["text-[10px] font-semibold uppercase tracking-[0.12em]", t.section, labelCls].join(" ")}>
                  Connected
                </span>
                <button
                  type="button"
                  aria-label="Connect a channel"
                  title="Connect a channel"
                  tabIndex={collapsed ? -1 : 0}
                  className={["flex h-5 w-5 items-center justify-center rounded-md", t.idle, labelCls].join(" ")}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-0.5">
                {mockChannels.map((ch) => {
                  const isOpen = openChannel === ch.key && !collapsed;
                  return (
                    <div key={ch.key}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        title={collapsed ? ch.name : undefined}
                        onClick={() => {
                          if (collapsed) { setCollapsed(false); setOpenChannel(ch.key); }
                          else setOpenChannel(isOpen ? null : ch.key);
                        }}
                        className={["group relative flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] font-medium", t.idle].join(" ")}
                      >
                        <span
                          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ backgroundColor: ch.color }}
                        >
                          {ch.network}
                        </span>
                        <span className={["min-w-0 flex-1 truncate text-left", labelCls].join(" ")}>{ch.name}</span>
                        <span className={["flex shrink-0 opacity-40 group-hover:opacity-100", labelCls].join(" ")}>
                          <Chevron open={isOpen} />
                        </span>
                        {collapsed && <Tooltip label={ch.name} />}
                      </button>

                      {/* Sub-links */}
                      <div
                        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                      >
                        <div className="overflow-hidden">
                          <div className={["ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l pl-3", t.rail].join(" ")}>
                            {channelLinks.map((l, i) => {
                              const LIcon = l.icon;
                              return (
                                <button
                                  key={l.label}
                                  type="button"
                                  tabIndex={isOpen ? 0 : -1}
                                  onClick={() => navigate(`${l.label.toLowerCase()}?channel=${ch.key}`)}
                                  style={{ transitionDelay: isOpen ? `${60 + i * 40}ms` : "0ms" }}
                                  className={[
                                    "flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[12.5px] font-medium",
                                    "transition-[background-color,color,opacity,transform] duration-250",
                                    isOpen ? "translate-x-0 opacity-100" : "-translate-x-1.5 opacity-0",
                                    t.sub,
                                  ].join(" ")}
                                >
                                  <LIcon className="h-[15px] w-[15px] shrink-0 opacity-70" />
                                  <span className="flex-1">{l.label}</span>
                                  {l.badge && <span className={["rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold", t.badge].join(" ")}>{l.badge}</span>}
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
          <div className={["mt-4 border-t pt-3", t.divider].join(" ")}>
            <div id="rd-profile" className="relative flex items-center gap-1.5">
              {/* Collapse toggle */}
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className={[
                  "group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
                  t.idle,
                ].join(" ")}
              >
                <PanelIcon open={!collapsed} />
                <Tooltip label={collapsed ? "Expand" : "Collapse"} hint="⌘B" />
              </button>

              {/* Profile trigger */}
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className={["group flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-1.5", menuOpen ? t.active : t.idle].join(" ")}
              >
                <span className={["flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", t.avatar].join(" ")}>
                  RN
                </span>
                <span className={["min-w-0 flex-1 truncate text-left text-[12.5px] font-medium", labelCls].join(" ")}>Ronan</span>
                <span className={["opacity-40", labelCls].join(" ")}>
                  <Chevron open={menuOpen} className="h-3 w-3" />
                </span>
              </button>

              {/* Account menu */}
              {menuOpen && (
                <div
                  role="menu"
                  className={[
                    "rd-anim absolute bottom-full left-0 z-50 mb-2 w-[220px] overflow-hidden rounded-[14px] border shadow-xl",
                    dark ? "bg-[#1c1d1d] border-white/10 text-[#f3f3ef]" : "bg-white border-black/10 text-[#1a1a1a]",
                  ].join(" ")}
                >
                  <div className="px-3.5 pb-2.5 pt-3">
                    <div className={["truncate text-[11px]", t.section].join(" ")}>ronan@stone.app</div>
                    <div className="mt-1 text-[13.5px] font-semibold">Ronan</div>
                    <div className={["mt-0.5 text-[11px]", t.section].join(" ")}>Free plan · 3 channels</div>
                  </div>
                  <div className={["border-t px-1.5 py-1.5", t.divider.replace("bg-", "border-")].join(" ")}>
                    {[
                      { label: "Settings", icon: Settings, r: "settings" },
                      { label: "Channels", icon: Channels, r: "channels" },
                    ].map((item) => {
                      const IIcon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          role="menuitem"
                          onClick={() => { setMenuOpen(false); navigate(item.r); }}
                          className={["flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left text-[12.5px] font-medium", t.idle].join(" ")}
                        >
                          <IIcon className="h-4 w-4 shrink-0 opacity-70" />
                          {item.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setDark((v) => !v)}
                      className={["flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left text-[12.5px] font-medium", t.idle].join(" ")}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center opacity-70">{dark ? "☀" : "☾"}</span>
                      {dark ? "Light mode" : "Dark mode"}
                    </button>
                  </div>
                  <div className={["border-t px-1.5 py-1.5", t.divider.replace("bg-", "border-")].join(" ")}>
                    <button
                      type="button"
                      role="menuitem"
                      className={["flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left text-[12.5px] font-medium", t.idle].join(" ")}
                    >
                      <span className="h-4 w-4 shrink-0" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ================= Mock page ================= */}
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-[22px] font-semibold tracking-tight capitalize">
              {route === "home" ? "Overview" : route}
            </h1>
            <p className={["mt-1 text-[13.5px]", t.section].join(" ")}>
              Prototype interactif — replie la sidebar (⌘B simulé via le bouton), navigue, ouvre les chaînes et le menu profil.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {["Posts this week", "Engagement", "Reach"].map((m, i) => (
                <div key={m} className={["rounded-[14px] border p-4", t.aside].join(" ")}>
                  <div className={["text-[11px] font-medium uppercase tracking-wide", t.section].join(" ")}>{m}</div>
                  <div className="mt-1.5 text-[20px] font-semibold">{[24, "3.2%", "12.4k"][i]}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className={["mt-6 rounded-[10px] border px-3.5 py-2 text-[12.5px] font-medium", t.aside, t.idle].join(" ")}
            >
              Toggle sidebar ({collapsed ? "collapsed" : "expanded"})
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}