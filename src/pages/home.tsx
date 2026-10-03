import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useDragControls } from "framer-motion";
import { navigate } from "../hooks/useHashRoute";
import { useTheme } from "../hooks/useTheme";
import {
  useConnectedChannels,
  type ConnectedChannel,
} from "../hooks/useConnectedChannels";
import DashboardSidebar from "../components/DashboardSidebar";
import NewPostModal, { type NewPostPayload } from "../components/Newpostmodal";
import HelpChatButton from "../components/Helpchatbutton";
import BottomBar, { type BottomBarTab } from "../components/Bottombar";
import Folder from "../components/Folder";
import { getCurrentUser, type UserProfile } from "../services/supabase";
import {
  XIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
  PinterestIcon,
  ThreadsIcon,
} from "../components/IntegrationIcons";

const SIDEBAR_OFFSET = 104;
const userProfileCache = { profile: null as UserProfile | null };

/* ============================== Réseaux ============================== */

type IconFC = (props: { className?: string }) => JSX.Element;
type NetworkKey =
  | "x" | "facebook" | "instagram" | "linkedin"
  | "tiktok" | "youtube" | "pinterest" | "threads";

const NETWORK_ICONS: Record<NetworkKey, IconFC> = {
  x: XIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
  threads: ThreadsIcon as IconFC,
};

function getNetworkId(channel: ConnectedChannel): NetworkKey | null {
  const c = channel as unknown as Record<string, unknown>;
  const raw = String(c.platform ?? c.network ?? c.provider ?? channel.key).toLowerCase().trim();
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

const FOLLOWER_KEYS = ["followers", "followersCount", "followers_count", "subscribers", "subscribersCount"];
const LIKE_KEYS = ["likes", "likesCount", "likes_count"];
const COMMENT_KEYS = ["comments", "commentsCount", "comments_count"];

function readStat(channel: ConnectedChannel, keys: string[]): number {
  const c = channel as unknown as Record<string, unknown>;
  for (const key of keys) {
    const v = c[key];
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

const fmt = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });

function computeTotals(channels: ConnectedChannel[]) {
  return channels.reduce(
    (a, ch) => ({
      followers: a.followers + readStat(ch, FOLLOWER_KEYS),
      likes: a.likes + readStat(ch, LIKE_KEYS),
      comments: a.comments + readStat(ch, COMMENT_KEYS),
    }),
    { followers: 0, likes: 0, comments: 0 }
  );
}

/* Publications planifiées : à brancher. date = "YYYY-MM-DD" */
type Scheduled = { date: string; network: NetworkKey; title: string };
const SCHEDULED: Scheduled[] = [];
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* ============================== Layout ============================== */

type Size = "s" | "m" | "l";
type WidgetId = "audience" | "compose" | "week" | "channels" | "blog";

interface Layout {
  order: WidgetId[];
  sizes: Record<WidgetId, Size>;
  hidden: WidgetId[];
}

const ALL_IDS: WidgetId[] = ["audience", "compose", "week", "channels", "blog"];
const TITLES: Record<WidgetId, string> = {
  audience: "Audience",
  compose: "Nouvelle publication",
  week: "Semaine",
  channels: "Réseaux",
  blog: "À lire",
};
const SPAN: Record<Size, string> = { s: "lg:col-span-4", m: "lg:col-span-8", l: "lg:col-span-12" };
const NEXT: Record<Size, Size> = { s: "m", m: "l", l: "s" };
const SIZE_LABEL: Record<Size, string> = { s: "Petit", m: "Moyen", l: "Large" };

const DEFAULT_LAYOUT: Layout = {
  order: ["audience", "compose", "week", "channels", "blog"],
  sizes: { audience: "m", compose: "s", week: "l", channels: "m", blog: "s" },
  hidden: [],
};

const STORAGE_KEY = "home-layout-v1";

function loadLayout(): Layout {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Layout | null;
    if (!p) return DEFAULT_LAYOUT;
    const seen = [...p.order, ...p.hidden];
    const ok = ALL_IDS.every((id) => seen.includes(id)) && seen.length === ALL_IDS.length;
    return ok ? { ...p, sizes: { ...DEFAULT_LAYOUT.sizes, ...p.sizes } } : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

/* ============================== Thème ============================== */

function tone(isDark: boolean) {
  return {
    text: isDark ? "text-white" : "text-neutral-900",
    muted: isDark ? "text-neutral-400" : "text-neutral-500",
    faint: isDark ? "text-neutral-600" : "text-neutral-400",
    surface: isDark ? "border-white/10 bg-[#141416]" : "border-black/[0.06] bg-white",
    soft: isDark ? "bg-white/[0.06]" : "bg-black/[0.045]",
    hover: isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]",
    focus:
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
      (isDark
        ? "focus-visible:ring-white focus-visible:ring-offset-[#09090a]"
        : "focus-visible:ring-neutral-900 focus-visible:ring-offset-[#f3f1ed]"),
  };
}

const Svg = ({ d, className = "h-4 w-4", sw = 2 }: { d: string; className?: string; sw?: number }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const ICON = {
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  left: "m15 6-6 6 6 6",
  right: "m9 6 6 6-6 6",
  resize: "M4 14v6h6M20 10V4h-6M4 20l6-6M20 4l-6 6",
  sliders: "M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6",
};

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function Avatar({ src, label, isDark, size = 40 }: { src?: string | null; label: string; isDark: boolean; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img src={src} alt="" style={{ width: size, height: size }} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="shrink-0 rounded-full object-cover" />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className={["flex shrink-0 items-center justify-center rounded-full font-semibold", isDark ? "bg-[#2a2a2d] text-white" : "bg-neutral-900 text-white"].join(" ")}
    >
      {label.replace(/^@/, "").slice(0, 2).toUpperCase() || "?"}
    </div>
  );
}

/* ============================== Coque d'un widget ============================== */

interface ShellProps {
  id: WidgetId;
  size: Size;
  editing: boolean;
  isDark: boolean;
  invert?: boolean;
  first: boolean;
  last: boolean;
  register: (id: WidgetId, el: HTMLElement | null) => void;
  onDragOver: (id: WidgetId, p: { x: number; y: number }) => void;
  onResize: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  children: ReactNode;
}

function Shell(p: ShellProps) {
  const t = tone(p.isDark);
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const toolBtn = [
    "flex h-7 w-7 items-center justify-center rounded-full transition disabled:opacity-30",
    p.isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-black/[0.06] text-neutral-900 hover:bg-black/10",
    p.invert ? (p.isDark ? "!bg-neutral-900/10 !text-neutral-900" : "!bg-white/15 !text-white") : "",
    t.focus,
  ].join(" ");

  return (
    <motion.section
      ref={(el) => p.register(p.id, el as HTMLElement | null)}
      layout
      transition={{ type: "spring", stiffness: 520, damping: 44 }}
      drag={p.editing}
      dragControls={controls}
      dragListener={false}
      dragSnapToOrigin
      dragElastic={0.1}
      onDragStart={() => setDragging(true)}
      onDrag={(_, info) => p.onDragOver(p.id, { x: info.point.x - window.scrollX, y: info.point.y - window.scrollY })}
      onDragEnd={() => setDragging(false)}
      whileDrag={{ scale: 1.015, boxShadow: "0 30px 70px rgba(0,0,0,0.28)" }}
      aria-label={TITLES[p.id]}
      className={[
        "relative col-span-12 flex flex-col rounded-[24px] p-5",
        SPAN[p.size],
        p.invert
          ? p.isDark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white"
          : ["border", t.surface].join(" "),
        p.editing ? "ring-1 ring-dashed ring-offset-4 " + (p.isDark ? "ring-white/30 ring-offset-[#09090a]" : "ring-black/25 ring-offset-[#f3f1ed]") : "",
        dragging ? "z-50" : "",
      ].join(" ")}
    >
      {p.editing && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
          <button type="button" aria-label="Déplacer vers le début" disabled={p.first} onClick={() => p.onMove(-1)} className={toolBtn}><Svg d={ICON.left} className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Déplacer vers la fin" disabled={p.last} onClick={() => p.onMove(1)} className={toolBtn}><Svg d={ICON.right} className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label={`Taille : ${SIZE_LABEL[p.size]}. Changer`} title={SIZE_LABEL[p.size]} onClick={p.onResize} className={toolBtn}><Svg d={ICON.resize} className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Masquer ce widget" onClick={p.onRemove} className={toolBtn}><Svg d={ICON.close} className="h-3.5 w-3.5" /></button>
          <button
            type="button"
            aria-label="Glisser pour déplacer"
            onPointerDown={(e) => controls.start(e)}
            className={[toolBtn, "cursor-grab touch-none active:cursor-grabbing"].join(" ")}
          >
            <Svg d={ICON.grip} className="h-4 w-4" sw={3} />
          </button>
        </div>
      )}
      {p.children}
    </motion.section>
  );
}

function Title({ isDark, children, hint }: { isDark: boolean; children: ReactNode; hint?: string }) {
  const t = tone(isDark);
  return (
    <div className="mb-4 pr-44">
      <h2 className={["text-[15px] font-semibold leading-tight", t.text].join(" ")}>{children}</h2>
      {hint && <p className={["mt-0.5 text-[12.5px] font-medium", t.muted].join(" ")}>{hint}</p>}
    </div>
  );
}

/* ============================== Contenus ============================== */

function AudienceW({ isDark, size, totals, count }: { isDark: boolean; size: Size; totals: { followers: number; likes: number; comments: number }; count: number }) {
  const t = tone(isDark);
  const items = [
    { label: "Abonnés", value: totals.followers },
    { label: "Likes", value: totals.likes },
    { label: "Commentaires", value: totals.comments },
  ];
  return (
    <>
      <Title isDark={isDark} hint={count > 0 ? `Cumul de ${count} réseau${count > 1 ? "x" : ""}` : "Connectez un réseau pour voir vos chiffres"}>
        Audience
      </Title>
      <dl className={["grid flex-1 gap-4", size === "s" ? "grid-cols-1" : "grid-cols-3"].join(" ")}>
        {items.map((i) => (
          <div key={i.label} className={["flex flex-col justify-end rounded-2xl p-4", t.soft].join(" ")}>
            <dt className={["text-[12.5px] font-medium", t.muted].join(" ")}>{i.label}</dt>
            <dd className={["mt-1 font-display text-[clamp(30px,3.4vw,46px)] font-semibold leading-none tracking-[-0.03em] tabular-nums", i.value > 0 ? t.text : t.faint].join(" ")}>
              {i.value > 0 ? fmt.format(i.value) : "0"}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function ComposeW({ isDark, onCompose }: { isDark: boolean; onCompose: () => void }) {
  return (
    <div className="flex h-full flex-col justify-between gap-8 pr-0">
      <p className={["max-w-[16ch] pt-8 font-display text-[clamp(22px,2.4vw,30px)] font-semibold leading-[1.1] tracking-[-0.02em]"].join(" ")}>
        Une idée à publier ?
      </p>
      <button
        type="button"
        onClick={onCompose}
        className={[
          "flex w-full items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold transition active:scale-[0.98]",
          isDark ? "bg-neutral-900 text-white hover:bg-neutral-700" : "bg-white text-neutral-900 hover:bg-neutral-200",
        ].join(" ")}
      >
        <Svg d={ICON.plus} className="h-4 w-4" sw={2.4} />
        Nouvelle publication
      </button>
    </div>
  );
}

function WeekW({ isDark, now, onCompose }: { isDark: boolean; now: Date; onCompose: () => void }) {
  const t = tone(isDark);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  return (
    <>
      <Title isDark={isDark} hint="Touchez un jour pour planifier une publication">Cette semaine</Title>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const count = SCHEDULED.filter((s) => s.date === dayKey(d)).length;
          const isToday = d.getTime() === today.getTime();
          const past = d.getTime() < today.getTime();
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={past}
              onClick={onCompose}
              aria-label={d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              className={[
                "flex min-h-[96px] flex-col items-center justify-between rounded-2xl px-1 py-3 transition",
                isToday ? (isDark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white") : [t.soft, past ? "opacity-50" : t.hover].join(" "),
                t.focus,
              ].join(" ")}
            >
              <span className={["text-[12px] font-semibold capitalize", isToday ? "opacity-70" : t.muted].join(" ")}>
                {d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
              </span>
              <span className={["font-display text-[24px] font-semibold leading-none tabular-nums", isToday ? "" : t.text].join(" ")}>{d.getDate()}</span>
              <span className={["text-[11px] font-semibold", isToday ? "opacity-70" : t.muted].join(" ")}>
                {count > 0 ? `${count} post${count > 1 ? "s" : ""}` : past ? "" : "Libre"}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function ChannelsW({ isDark, size, channels }: { isDark: boolean; size: Size; channels: ConnectedChannel[] }) {
  const t = tone(isDark);
  return (
    <>
      <Title isDark={isDark} hint={channels.length > 0 ? `${channels.length} connecté${channels.length > 1 ? "s" : ""}` : "Aucun réseau pour le moment"}>
        Réseaux
      </Title>
      <ul className={["grid gap-2", size === "s" ? "grid-cols-1" : "sm:grid-cols-2"].join(" ")}>
        {channels.map((c) => {
          const id = getNetworkId(c);
          const Icon = id ? NETWORK_ICONS[id] : undefined;
          return (
            <li key={c.key} className={["flex items-center gap-3 rounded-2xl p-2.5", t.soft].join(" ")}>
              <div className="relative">
                <Avatar src={c.avatarUrl} label={c.handle || c.name} isDark={isDark} size={38} />
                {Icon && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-black ring-2 ring-white dark:ring-[#141416]">
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className={["truncate text-[13.5px] font-semibold", t.text].join(" ")}>{c.handle || c.name}</p>
                <p className={["text-[12px] font-medium tabular-nums", t.muted].join(" ")}>{fmt.format(readStat(c, FOLLOWER_KEYS))} abonnés</p>
              </div>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => navigate("channels")}
            className={["flex h-full min-h-[58px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed text-[13px] font-semibold transition", isDark ? "border-white/15" : "border-black/15", t.text, t.hover, t.focus].join(" ")}
          >
            <Svg d={ICON.plus} className="h-3.5 w-3.5" />
            {channels.length > 0 ? "Ajouter un réseau" : "Connecter un réseau"}
          </button>
        </li>
      </ul>
    </>
  );
}

const BLOG_POSTS = [
  { title: "How to Create a Social Media Marketing Strategy in 2026 — 7-Step Guide", date: "24 juil. 2026", img: "stone-blog-strategy" },
  { title: "17 Best AI Tools for Social Media Content Creation (Tested for 2026)", date: "3 août 2026", img: "stone-blog-ai-tools" },
  { title: "How to Manage Multiple Social Media Accounts: 7 Tips to Do It Like a Pro", date: "6 juil. 2026", img: "stone-blog-multi-account" },
];

function BlogW({ isDark, size }: { isDark: boolean; size: Size }) {
  const t = tone(isDark);
  const wide = size === "l";
  return (
    <>
      <Title isDark={isDark}>À lire</Title>
      <ul className={wide ? "grid gap-5 sm:grid-cols-3" : "space-y-3"}>
        {BLOG_POSTS.map((p) => (
          <li key={p.img}>
            <a href="#" className={["group flex gap-3 rounded-xl", wide ? "flex-col" : "items-center", t.focus].join(" ")}>
              <img
                src={`https://picsum.photos/seed/${p.img}/${wide ? "640/400" : "160/160"}`}
                alt=""
                loading="lazy"
                className={["object-cover", wide ? "aspect-[8/5] w-full rounded-2xl" : "h-14 w-14 shrink-0 rounded-xl"].join(" ")}
              />
              <div className="min-w-0">
                <p className={["line-clamp-2 text-[13px] font-semibold leading-snug group-hover:underline", t.text].join(" ")}>{p.title}</p>
                <p className={["mt-1 text-[11.5px] font-medium", t.muted].join(" ")}>{p.date}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ============================== Page ============================== */

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const t = tone(isDark);
  const now = useNow();
  const [query, setQuery] = useState("");
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<Layout>(loadLayout);

  const refs = useRef<Partial<Record<WidgetId, HTMLElement | null>>>({});
  const lastSwap = useRef(0);

  const connectedChannels = useConnectedChannels();
  const totals = useMemo(() => computeTotals(connectedChannels), [connectedChannels]);
  const [user, setUser] = useState<UserProfile | null>(userProfileCache.profile);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      /* stockage indisponible */
    }
  }, [layout]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getCurrentUser();
        if (mounted && data) {
          userProfileCache.profile = data;
          setUser(data);
        }
      } catch (error) {
        console.error("Error loading user on Home:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const moveTo = (id: WidgetId, to: number) =>
    setLayout((l) => {
      const from = l.order.indexOf(id);
      if (from === -1 || from === to || to < 0 || to >= l.order.length) return l;
      const order = [...l.order];
      order.splice(from, 1);
      order.splice(to, 0, id);
      return { ...l, order };
    });

  const handleDragOver = (id: WidgetId, p: { x: number; y: number }) => {
    if (performance.now() - lastSwap.current < 260) return;
    for (const other of layout.order) {
      if (other === id) continue;
      const r = refs.current[other]?.getBoundingClientRect();
      if (r && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) {
        lastSwap.current = performance.now();
        moveTo(id, layout.order.indexOf(other));
        break;
      }
    }
  };

  const resize = (id: WidgetId) => setLayout((l) => ({ ...l, sizes: { ...l.sizes, [id]: NEXT[l.sizes[id]] } }));
  const hide = (id: WidgetId) => setLayout((l) => ({ ...l, order: l.order.filter((x) => x !== id), hidden: [...l.hidden, id] }));
  const show = (id: WidgetId) => setLayout((l) => ({ ...l, hidden: l.hidden.filter((x) => x !== id), order: [...l.order, id] }));

  const openCompose = () => {
    setIsFolderOpen(false);
    setIsNewPostOpen(true);
  };
  const handleCreatePost = async (payload: NewPostPayload) => {
    console.log("Nouveau post à envoyer :", payload);
  };
  const handleBottomBarChange = (id: BottomBarTab) => {
    if (id === "add") openCompose();
    if (id === "files") setIsFolderOpen((o) => !o);
  };

  const hour = now.getHours();
  const hello = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
  const initials = `${(user?.first_name || "")[0] || ""}${(user?.last_name || "")[0] || ""}` || "U";
  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const renderWidget = (id: WidgetId): ReactNode => {
    const size = layout.sizes[id];
    switch (id) {
      case "audience": return <AudienceW isDark={isDark} size={size} totals={totals} count={connectedChannels.length} />;
      case "compose": return <ComposeW isDark={isDark} onCompose={openCompose} />;
      case "week": return <WeekW isDark={isDark} now={now} onCompose={openCompose} />;
      case "channels": return <ChannelsW isDark={isDark} size={size} channels={connectedChannels} />;
      case "blog": return <BlogW isDark={isDark} size={size} />;
    }
  };

  const ghost = [
    "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold transition",
    t.soft, t.text, t.hover, t.focus,
  ].join(" ");

  return (
    <main className={["relative h-screen w-full overflow-hidden transition-colors duration-500", isDark ? "bg-[#09090a]" : "bg-[#f3f1ed]"].join(" ")}>
      <DashboardSidebar theme={theme} />

      <div className="h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-[clamp(16px,3vw,40px)] pb-[130px] pt-[clamp(20px,2.6vw,36px)]">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <Avatar src={user?.avatar_url} label={initials} isDark={isDark} size={48} />
                <div>
                  <h1 className={["font-display text-[clamp(24px,2.8vw,36px)] font-semibold leading-none tracking-[-0.03em]", t.text].join(" ")}>
                    {hello}{user?.first_name ? `, ${user.first_name}` : ""}
                  </h1>
                  <p className={["mt-1.5 text-[13px] font-medium capitalize", t.muted].join(" ")}>
                    {dateLabel} · {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editing && (
                  <button type="button" onClick={() => setLayout(DEFAULT_LAYOUT)} className={ghost}>
                    Réinitialiser
                  </button>
                )}
                <button type="button" onClick={() => setEditing((e) => !e)} aria-pressed={editing} className={ghost}>
                  <Svg d={ICON.sliders} className="h-4 w-4" />
                  {editing ? "Terminé" : "Personnaliser"}
                </button>
              </div>
            </header>

            {editing && (
              <p className={["rounded-2xl px-4 py-3 text-[13px] font-medium", t.soft, t.muted].join(" ")}>
                Glissez les widgets par la poignée, changez leur taille ou masquez-les. Votre disposition est enregistrée automatiquement.
              </p>
            )}

            <div className="grid grid-cols-12 gap-4">
              {layout.order.map((id, i) => (
                <Shell
                  key={id}
                  id={id}
                  size={layout.sizes[id]}
                  editing={editing}
                  isDark={isDark}
                  invert={id === "compose"}
                  first={i === 0}
                  last={i === layout.order.length - 1}
                  register={(wid, el) => { refs.current[wid] = el; }}
                  onDragOver={handleDragOver}
                  onResize={() => resize(id)}
                  onRemove={() => hide(id)}
                  onMove={(dir) => moveTo(id, i + dir)}
                >
                  {renderWidget(id)}
                </Shell>
              ))}
            </div>

            {editing && layout.hidden.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className={["text-[13px] font-medium", t.muted].join(" ")}>Widgets masqués</span>
                {layout.hidden.map((id) => (
                  <button key={id} type="button" onClick={() => show(id)} className={ghost}>
                    <Svg d={ICON.plus} className="h-3.5 w-3.5" sw={2.4} />
                    {TITLES[id]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Folder isOpen={isFolderOpen} onClose={() => setIsFolderOpen(false)} isDark={isDark} offsetLeft={SIDEBAR_OFFSET} />

      <BottomBar
        isDark={isDark}
        offsetLeft={SIDEBAR_OFFSET}
        active={isFolderOpen ? "files" : null}
        onChange={handleBottomBarChange}
        query={query}
        onQueryChange={setQuery}
      />

      <NewPostModal isOpen={isNewPostOpen} onClose={() => setIsNewPostOpen(false)} isDark={isDark} onSubmit={handleCreatePost} />
      <HelpChatButton isDark={isDark} />
    </main>
  );
}