// src/pages/Insights.tsx
// Page Insights — reproduction fidèle de la maquette :
//  • Top bar : avatar + handle + roue crantée à gauche ; recherche, cloche
//    verte, bouton « Export » à droite.
//  • Bannière dégradé bleu-nuit : « A Path to Growth with Weekly Takeaways »
//    + sous-titre + bouton vert « Create Post », cartes empilées blanches à
//    texte violet à droite (Repost Your Popular Post, Use Your Drafts,
//    Evergreen Ideas, Duplicate Post).
//  • « All Insights » : onglets texte soulignés (30 Days sélectionné, soulign
//    vert) + « Custom » avec icône sparkle + dropdown « Tags ».
//  • « Summary » : 10 boîtes (5 colonnes × 2 lignes), label + icône AU-DESSUS
//    du chiffre, ligne de comparaison de périodes.
//  • « Metrics » : onglets This Period / Previous Period, toggle This Period /
//    Comparison / Both, bandeau bleu, graphique lignes (Posts violet clair /
//    Followers bleu clair, double axe Y).
//  • « Performance per Post » : carte avec miniature à gauche, « #1 Media
//    only » + date, métriques en colonnes (valeur au-dessus du label).
// Contrats conservés : useInsights, useConnectedChannels, CalendarPicker,
// useHashRoute, useTheme, DashboardSidebar.
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  MessageCircle,
  Play,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  FileText,
  Repeat2,
  PenLine,
} from "lucide-react";
import { navigate, useHashRoute } from "../hooks/useHashRoute";
import { useTheme } from "../hooks/useTheme";
import DashboardSidebar, { useSidebarOffset } from "../components/DashboardSidebar";
import { CalendarPicker } from "../components/CalendarPicker";
import { useConnectedChannels, type ConnectedChannel } from "../hooks/useConnectedChannels";
import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
  PinterestIcon,
  ThreadsIcon,
} from "../components/IntegrationIcons";

/* ============================================================
   TYPES
============================================================ */

type IconComponent = ComponentType<{ className?: string; size?: number }>;

type Range = "7d" | "30d" | "mtd" | "custom";
type ChartView = "this" | "comparison" | "both";

type Point = { date: Date; posts: number; followers: number };

type Summary = {
  followers: number;
  posts: number;
  reactions: number;
  comments: number;
  engRate: number;
  videoViews: number;
  shares: number;
  reach: number;
  watchMin: number;
  avgWatchSec: number;
};

type PostRow = {
  id: string;
  label: string;
  date: Date;
  media: "image" | "video" | "text";
  thumbnailUrl?: string;
  reactions: number;
  comments: number;
  engRate: number;
  videoViews: number;
};

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "mtd", label: "Month to Date" },
  { key: "custom", label: "Custom" },
];

const CHART_VIEWS: { key: ChartView; label: string }[] = [
  { key: "this", label: "This Period" },
  { key: "comparison", label: "Comparison" },
  { key: "both", label: "Both" },
];

/* ============================================================
   STYLE — palette de la maquette
   fond #0b0b10 · cartes #16161d · bordures #26262f
   vert (CTA / sélection) : emerald-500
   violet (tips) : violet-400 · bleu (bandeau) : sky/indigo
============================================================ */

type Tokens = {
  page: string;
  text: string;
  muted: string;
  soft: string;
  card: string;
  inner: string;
  border: string;
  greenBtn: string;
  outlineBtn: string;
  iconBox: string;
  ring: string;
  hover: string;
  accent: string;
};

const tokens = (isDark: boolean): Tokens =>
  isDark
    ? {
        page: "bg-[#0b0b10] text-white",
        text: "text-white",
        muted: "text-zinc-500",
        soft: "text-zinc-400",
        card: "bg-[#16161d] border-[#26262f]",
        inner: "bg-[#1c1c25] border-[#2c2c37]",
        border: "border-[#26262f]",
        greenBtn: "bg-emerald-500 text-black hover:bg-emerald-400",
        outlineBtn: "border border-[#2c2c37] text-white hover:border-white/40 hover:bg-white/[0.04]",
        iconBox: "bg-[#222230] text-zinc-300",
        ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
        hover: "hover:bg-white/[0.05]",
        accent: "text-emerald-400",
      }
    : {
        page: "bg-[#f6f6f7] text-black",
        text: "text-black",
        muted: "text-zinc-500",
        soft: "text-zinc-600",
        card: "bg-white border-zinc-200",
        inner: "bg-zinc-50 border-zinc-200",
        border: "border-zinc-200",
        greenBtn: "bg-emerald-600 text-white hover:bg-emerald-500",
        outlineBtn: "border border-zinc-300 text-black hover:border-black/50 hover:bg-black/[0.03]",
        iconBox: "bg-zinc-100 text-zinc-700",
        ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
        hover: "hover:bg-black/[0.04]",
        accent: "text-emerald-600",
      };

/* ============================================================
   DATES & FORMAT
============================================================ */

const DAY = 86_400_000;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const toInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmt = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
const fmtFull = (d: Date) =>
  d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
const nf = (n: number) => n.toLocaleString("en-US");
const signed = (n: number) => (n === 0 ? "0" : `${n > 0 ? "+" : "−"}${nf(Math.abs(n))}`);

function resolveRange(range: Range, customStart: Date, customEnd: Date) {
  const today = startOfDay(new Date());
  if (range === "7d") return { start: addDays(today, -6), end: today };
  if (range === "30d") return { start: addDays(today, -29), end: today };
  if (range === "mtd") return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: today };

  let s = startOfDay(customStart);
  let e = startOfDay(customEnd);
  if (isNaN(s.getTime())) s = addDays(today, -29);
  if (isNaN(e.getTime())) e = today;
  if (s > e) [s, e] = [e, s];
  if (e > today) e = today;
  if (s > e) s = e;
  if ((e.getTime() - s.getTime()) / DAY > 365) s = addDays(e, -365);
  return { start: s, end: e };
}

/* ============================================================
   DONNÉES (à remplacer par ton API)
============================================================ */

function useInsights(
  start: Date,
  end: Date
): { current: Point[]; previous: Point[]; summary: Summary; posts: PostRow[] } {
  const s = start.getTime();
  const e = end.getTime();

  return useMemo(() => {
    const days = Math.round((e - s) / DAY) + 1;
    const build = (from: Date, base: number): Point[] =>
      Array.from({ length: days }, (_, i) => ({
        date: addDays(from, i),
        posts: 0,
        followers: Math.round(base + Math.sin(i / 3) * 2 + (i % 5 === 0 ? 1 : 0)),
      }));

    const current = build(new Date(s), 108);
    return {
      current,
      previous: build(addDays(new Date(s), -days), 105),
      summary: {
        followers: current[current.length - 1]?.followers ?? 0,
        posts: 0,
        reactions: 0,
        comments: 0,
        engRate: 0,
        videoViews: 0,
        shares: 0,
        reach: 0,
        watchMin: 0,
        avgWatchSec: 0,
      },
      // À remplir depuis ton API : posts publiés dans la période,
      // avec thumbnailUrl pour la miniature de la carte.
      posts: [] as PostRow[],
    };
  }, [s, e]);
}

/** Canal demandé via #/insights?channel=<key>. */
function useHashChannel(): string | null {
  const [, force] = useState(0);
  useHashRoute();
  useEffect(() => {
    const onHash = () => force((v) => v + 1);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const hash = window.location.hash;
  const i = hash.indexOf("?");
  return i === -1 ? null : new URLSearchParams(hash.slice(i + 1)).get("channel");
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
   COURBE LISSÉE (spline cubique monotone)
============================================================ */

function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++)
    t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const q = a * a + b * b;
    if (q > 9) {
      const k = 3 / Math.sqrt(q);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(
      pts[i + 1][1] - t[i + 1] * h
    ).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/* ============================================================
   CHART — 2 séries (Posts violet clair, Followers bleu clair),
   double axe Y, toggle This / Comparison / Both.
   Interactions clavier + pointer conservées.
============================================================ */

function Chart({
  dates,
  posts,
  followers,
  prevPosts,
  prevFollowers,
  view,
  isDark,
}: {
  dates: Date[];
  posts: number[];
  followers: number[];
  prevPosts: number[];
  prevFollowers: number[];
  view: ChartView;
  isDark: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId().replace(/:/g, "");
  const W = 720;
  const H = 260;
  const pad = { l: 36, r: 36, t: 16, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = dates.length;

  const showThis = view === "this" || view === "both";
  const showPrev = view === "comparison" || view === "both";

  const POSTS_COLOR = isDark ? "#c4b5fd" : "#8b5cf6"; // violet clair
  const FOLLOWERS_COLOR = isDark ? "#93c5fd" : "#3b82f6"; // bleu clair
  const axis = isDark ? "#6b6b73" : "#9a9aa3";
  const grid = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const allPosts = [...(showThis ? posts : []), ...(showPrev ? prevPosts : [])];
  const allFollowers = [...(showThis ? followers : []), ...(showPrev ? prevFollowers : [])];
  const maxPosts = Math.max(4, ...allPosts);
  const maxFollowers = Math.max(4, ...allFollowers);

  const x = (i: number) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const yL = (v: number) => pad.t + ih - (v / maxPosts) * ih; // axe gauche : Posts
  const yR = (v: number) => pad.t + ih - (v / maxFollowers) * ih; // axe droit : Followers

  const path = (vals: number[], y: (v: number) => number) =>
    smoothPath(vals.map((v, i) => [x(i), y(v)] as [number, number]));

  const thisPostsPath = path(posts, yL);
  const thisFollowersPath = path(followers, yR);
  const prevPostsPath = path(prevPosts, yL);
  const prevFollowersPath = path(prevFollowers, yR);
  const area = `${thisPostsPath} L${x(n - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;

  const ticks = [0, 1, 2, 3, 4];
  const labelIdx = Array.from(
    new Set([0, 0.5, 1].map((r) => Math.round(r * (n - 1))))
  );

  const onPointer = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = n === 1 ? 0 : Math.round(((px - pad.l) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") setHover((h) => (h === null ? 0 : Math.min(n - 1, h + 1)));
    else if (e.key === "ArrowLeft") setHover((h) => (h === null ? n - 1 : Math.max(0, h - 1)));
    else if (e.key === "Home") setHover(0);
    else if (e.key === "End") setHover(n - 1);
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  return (
    <div
      className="relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
      tabIndex={0}
      role="group"
      aria-label="Metrics chart. Use the left and right arrow keys to inspect each day."
      onKeyDown={onKey}
      onBlur={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setHover(null)}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={POSTS_COLOR} stopOpacity="0.22" />
            <stop offset="100%" stopColor={POSTS_COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => {
          const y = pad.t + ih - (t / 4) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke={grid} />
              {/* axe gauche (Posts) */}
              <text x={pad.l - 8} y={y + 3.5} fontSize="10" fill={axis} textAnchor="end" className="tabular-nums">
                {Math.round((t / 4) * maxPosts)}
              </text>
              {/* axe droit (Followers) */}
              <text x={W - pad.r + 8} y={y + 3.5} fontSize="10" fill={axis} textAnchor="start" className="tabular-nums">
                {Math.round((t / 4) * maxFollowers)}
              </text>
            </g>
          );
        })}
        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            fontSize="10"
            fill={axis}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
          >
            {fmt(dates[i])}
          </text>
        ))}

        {/* Période précédente : pointillés */}
        {showPrev && (
          <>
            <path d={prevPostsPath} fill="none" stroke={POSTS_COLOR} strokeOpacity="0.45" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
            <path d={prevFollowersPath} fill="none" stroke={FOLLOWERS_COLOR} strokeOpacity="0.45" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
          </>
        )}

        {/* Période courante : traits pleins + aire Posts */}
        {showThis && (
          <>
            <path d={area} fill={`url(#${gradId})`} />
            <path d={thisPostsPath} fill="none" stroke={POSTS_COLOR} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <path d={thisFollowersPath} fill="none" stroke={FOLLOWERS_COLOR} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke={axis} strokeOpacity="0.6" strokeDasharray="3 3" />
            {showThis && (
              <>
                <circle cx={x(hover)} cy={yL(posts[hover])} r="4.5" fill={isDark ? "#16161d" : "#fff"} stroke={POSTS_COLOR} strokeWidth="2.5" />
                <circle cx={x(hover)} cy={yR(followers[hover])} r="4.5" fill={isDark ? "#16161d" : "#fff"} stroke={FOLLOWERS_COLOR} strokeWidth="2.5" />
              </>
            )}
          </g>
        )}
      </svg>

      {/* Légende : Posts (violet) / Followers (bleu) */}
      <div className={`mt-1 flex items-center gap-4 text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: POSTS_COLOR }} />
          Posts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: FOLLOWERS_COLOR }} />
          Followers
        </span>
        {showPrev && <span className="flex items-center gap-1.5 opacity-60">
          <span className="h-0 w-4 border-t-2 border-dashed border-current" />
          Previous period
        </span>}
      </div>

      {hover !== null && (
        <div
          className={`pointer-events-none absolute top-1 min-w-[160px] rounded-xl px-3.5 py-2.5 text-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${
            isDark ? "bg-[#222230] text-white ring-1 ring-white/10" : "bg-white text-black ring-1 ring-black/10"
          }`}
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > n / 2 ? "-110%" : "10%"})`,
          }}
        >
          <div className="mb-1 text-[11px] opacity-50">{fmtFull(dates[hover])}</div>
          {showThis && (
            <>
              <div className="flex justify-between gap-5">
                <span>Posts</span>
                <b className="tabular-nums">{nf(posts[hover])}</b>
              </div>
              <div className="flex justify-between gap-5">
                <span>Followers</span>
                <b className="tabular-nums">{nf(followers[hover])}</b>
              </div>
            </>
          )}
          {showPrev && (
            <div className="mt-1 flex justify-between gap-5 opacity-60">
              <span>Previous</span>
              <b className="tabular-nums">
                {nf(prevPosts[hover])} · {nf(prevFollowers[hover])}
              </b>
            </div>
          )}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {hover !== null ? `${fmtFull(dates[hover])}: ${posts[hover]} posts, ${followers[hover]} followers` : ""}
      </p>
    </div>
  );
}

/* ============================================================
   PETITS COMPOSANTS
============================================================ */

/** Onglets texte soulignés (All Insights) — le sélectionné : vert. */
function UnderlineTabs({
  value,
  options,
  onChange,
  t,
  label,
}: {
  value: Range;
  options: { key: Range; label: string }[];
  onChange: (k: Range) => void;
  t: Tokens;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap items-center gap-5">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`relative whitespace-nowrap pb-2 pt-1 text-[13px] transition-colors ${t.ring} ${
              active ? "font-semibold text-white" : t.soft
            }`}
          >
            {o.label}
            {o.key === "custom" && (
              <Sparkles className="ml-1 inline h-3 w-3 text-violet-400" aria-hidden="true" />
            )}
            {active && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-emerald-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented pill (toggles du graphique). */
function PillTabs<T extends string>({
  value,
  options,
  onChange,
  t,
  label,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (k: T) => void;
  t: Tokens;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-xl border p-1">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors motion-reduce:transition-none ${t.ring} ${
              active ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Delta({ value, isDark }: { value: number; isDark: boolean }) {
  const tone =
    value > 0
      ? isDark
        ? "bg-emerald-500/10 text-emerald-400"
        : "bg-emerald-50 text-emerald-700"
      : value < 0
      ? isDark
        ? "bg-rose-500/10 text-rose-400"
        : "bg-rose-50 text-rose-700"
      : isDark
      ? "bg-white/[0.06] text-zinc-400"
      : "bg-zinc-100 text-zinc-500";
  const Icon = value < 0 ? TrendingDown : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`}>
      {value !== 0 && <Icon className="h-3 w-3" aria-hidden="true" />}
      {signed(value)}
    </span>
  );
}

/** Boîte du Summary : label + icône AU-DESSUS du chiffre. */
function MetricBox({
  label,
  value,
  icon,
  delta,
  isDark,
  t,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  delta?: number;
  isDark: boolean;
  t: Tokens;
}) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-xl border p-4 ${t.inner}`}>
      <span className={`flex items-center gap-1.5 text-[11.5px] ${t.muted}`}>
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span className="text-[22px] font-semibold leading-none tabular-nums">{value}</span>
        {delta !== undefined && delta !== 0 && <Delta value={delta} isDark={isDark} />}
      </span>
    </div>
  );
}

const NETWORK_ICONS: Record<string, IconComponent> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  threads: ThreadsIcon,
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
  pinterest: PinterestIcon,
};

function channelNetwork(c?: ConnectedChannel): string {
  if (!c) return "";
  const extra = c as ConnectedChannel & {
    network?: string;
    platform?: string;
    provider?: string;
  };
  const raw = c.key ?? extra.network ?? extra.platform ?? extra.provider ?? "";
  return String(raw).toLowerCase();
}

function NetworkIcon({ channel, size = 13 }: { channel?: ConnectedChannel; size?: number }) {
  const Icon = NETWORK_ICONS[channelNetwork(channel)];
  if (!Icon) return null;
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-[#0b0b10]">
      <span className="flex h-[19px] w-[19px] items-center justify-center">
        <Icon className="h-[11px] w-[11px]" size={size} />
      </span>
    </span>
  );
}

function Avatar({
  channel,
  size = 34,
  showNetwork = true,
}: {
  channel?: ConnectedChannel;
  size?: number;
  showNetwork?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [channel?.avatarUrl]);
  const label = (channel?.handle || channel?.name || "?").replace(/^@/, "");
  const box = { width: size, height: size };

  return (
    <span className="relative inline-flex shrink-0" style={box}>
      {channel?.avatarUrl && !failed ? (
        <img
          src={channel.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={box}
          className="rounded-full object-cover"
        />
      ) : (
        <span
          style={box}
          className="flex items-center justify-center rounded-full bg-zinc-700 text-[13px] font-semibold text-white"
        >
          {label.charAt(0).toUpperCase() || "?"}
        </span>
      )}
      {showNetwork && <NetworkIcon channel={channel} />}
    </span>
  );
}

function ChannelMenu({
  channels,
  current,
  t,
  isDark,
}: {
  channels: ConnectedChannel[];
  current?: ConnectedChannel;
  t: Tokens;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = (c?: ConnectedChannel) => (c ? (c.handle || c.name).replace(/^@/, "") : "No channel");
  const canSwitch = channels.length > 1;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={!canSwitch}
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-2.5 rounded-full py-1 transition-colors disabled:cursor-default ${t.ring} ${canSwitch ? t.hover : ""}`}
        >
          <Avatar channel={current} />
          <span className={`max-w-[140px] truncate text-[14px] font-semibold ${t.text}`}>{name(current)}</span>
          {canSwitch && <ChevronDown className={`h-4 w-4 ${t.muted}`} aria-hidden="true" />}
        </button>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate("settings")}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${t.ring} ${t.hover} ${t.soft}`}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className={`absolute left-0 z-30 mt-2 w-64 rounded-2xl border p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${
            isDark ? "border-[#2c2c37] bg-[#1c1c25]" : "border-zinc-200 bg-white"
          }`}
        >
          {channels.map((c) => {
            const active = c.key === current?.key;
            return (
              <button
                key={c.key}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setOpen(false);
                  navigate(`insights?channel=${encodeURIComponent(c.key)}`);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${t.ring} ${t.hover}`}
              >
                <Avatar channel={c} size={28} showNetwork={false} />
                <span className={`min-w-0 flex-1 truncate text-[13px] font-medium ${t.text}`}>{name(c)}</span>
                {active && <Check className={`h-4 w-4 ${t.accent}`} aria-hidden="true" />}
              </button>
            );
          })}
          <div className={`my-1 border-t ${t.border}`} />
          <button
            type="button"
            role="menuitem"
            onClick={() => navigate("channels")}
            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${t.ring} ${t.hover} ${t.soft}`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-current opacity-60">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            Manage channels
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   RANGE PICKER — CalendarPicker (From / To), inchangé
============================================================ */

function RangePicker({
  range,
  start,
  end,
  onStartChange,
  onEndChange,
  onRangeChange,
  t,
  isDark,
}: {
  range: Range;
  start: Date;
  end: Date;
  onStartChange: (d: Date) => void;
  onEndChange: (d: Date) => void;
  onRangeChange: (r: Range) => void;
  t: Tokens;
  isDark: boolean;
}) {
  const [field, setField] = useState<"from" | "to">("from");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label =
    range === "custom"
      ? `${fmt(start)} – ${fmt(end)}`
      : RANGES.find((r) => r.key === range)?.label ?? "";

  const pickDate = (d: Date) => {
    if (field === "from") {
      onStartChange(d);
      if (startOfDay(d).getTime() > startOfDay(end).getTime()) onEndChange(d);
      setField("to");
    } else {
      onEndChange(d);
      if (startOfDay(d).getTime() < startOfDay(start).getTime()) {
        onStartChange(d);
        setField("from");
      }
    }
  };

  const openPicker = (nextField: "from" | "to") => {
    if (range !== "custom") onRangeChange("custom");
    setField(nextField);
    setOpen(true);
  };

  const fieldTab = (id: "from" | "to") => {
    const active = open && field === id;
    const value = id === "from" ? start : end;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={active}
        onClick={() => openPicker(id)}
        className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors motion-reduce:transition-none ${t.ring} ${
          active ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
        }`}
      >
        {id === "from" ? "From" : "To"} · {fmt(value)}
      </button>
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker("from"))}
        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-colors ${t.ring} ${t.border} ${
          open ? t.inner : t.card
        } ${t.hover} ${t.text}`}
      >
        <CalendarClock className={`h-3.5 w-3.5 ${t.muted}`} aria-hidden="true" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""} ${t.muted}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full z-30 mt-2 w-[300px] overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${
            isDark ? "border-[#2c2c37] bg-[#1c1c25]" : "border-zinc-200 bg-white"
          }`}
        >
          <div className={`flex gap-1 border-b p-2 ${t.border}`}>
            {fieldTab("from")}
            {fieldTab("to")}
          </div>

          <div className="p-3">
            <p className={`mb-2 text-[12.5px] ${t.soft}`}>
              {field === "from"
                ? "Pick the first day of the period."
                : "Pick the last day of the period (today max)."}
            </p>
            <CalendarPicker
              key={field}
              value={field === "from" ? start : end}
              onChange={pickDate}
              isDark={isDark}
              disablePast={false}
              max={today}
              min={field === "to" ? startOfDay(start) : undefined}
            />
          </div>

          <div className={`flex items-center justify-between border-t px-3 py-2.5 ${t.border}`}>
            <button
              type="button"
              onClick={() => setField((f) => (f === "from" ? "to" : "from"))}
              className={`text-[12.5px] font-semibold transition-colors ${t.ring} ${t.hover} ${t.text}`}
            >
              {field === "from" ? "Next: To" : "Back: From"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors ${t.ring} ${t.hover} ${t.accent}`}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PAGE — structure exacte de la maquette
============================================================ */

export default function Insights() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const t = useMemo(() => tokens(isDark), [isDark]);
  const sidebarOffset = useSidebarOffset();
  const channels = useConnectedChannels();
  const channelKey = useHashChannel();
  const channel = channels.find((c) => c.key === channelKey) ?? channels[0];

  const [range, setRange] = useState<Range>("30d");
  const [customStart, setCustomStart] = useState(() => addDays(startOfDay(new Date()), -29));
  const [customEnd, setCustomEnd] = useState(() => startOfDay(new Date()));
  const [chartView, setChartView] = useState<ChartView>("this");

  const { start, end } = useMemo(
    () => resolveRange(range, customStart, customEnd),
    [range, customStart, customEnd]
  );
  const { current, previous, summary, posts } = useInsights(start, end);

  const days = current.length;
  const dates = current.map((p) => p.date);
  const first = current[0];
  const last = current[days - 1];
  const delta = last.followers - first.followers;

  const prevStart = previous[0].date;
  const prevEnd = previous[days - 1].date;

  /* Summary — 10 boîtes comme la maquette. */
  const summaryBoxes: { label: string; value: string; icon: ReactNode; delta?: number }[] = [
    { label: "Total Followers", value: nf(summary.followers), icon: <Users className="h-3.5 w-3.5" />, delta },
    { label: "Posts", value: nf(summary.posts), icon: <FileText className="h-3.5 w-3.5" /> },
    { label: "Reactions", value: nf(summary.reactions), icon: <Heart className="h-3.5 w-3.5" /> },
    { label: "Comments", value: nf(summary.comments), icon: <MessageCircle className="h-3.5 w-3.5" /> },
    { label: "Engagement Rate", value: `${summary.engRate}%`, icon: <Activity className="h-3.5 w-3.5" /> },
    { label: "Video Views", value: nf(summary.videoViews), icon: <Play className="h-3.5 w-3.5" /> },
    { label: "Shares", value: nf(summary.shares), icon: <Share2 className="h-3.5 w-3.5" /> },
    { label: "Reach", value: nf(summary.reach), icon: <Eye className="h-3.5 w-3.5" /> },
    { label: "Watch Time", value: `${nf(summary.watchMin)} min`, icon: <Clock className="h-3.5 w-3.5" /> },
    { label: "Avg. Watch Time", value: `${nf(summary.avgWatchSec)} sec`, icon: <Clock className="h-3.5 w-3.5" /> },
  ];

  /* Tips — cartes blanches à texte violet de la bannière. */
  const tips: { icon: ReactNode; title: string; text: string }[] = [
    {
      icon: <Repeat2 className="h-3.5 w-3.5" />,
      title: "Repost Your Popular Post",
      text: "Bring back your best performer to reach new followers.",
    },
    {
      icon: <FileText className="h-3.5 w-3.5" />,
      title: "Use Your Drafts",
      text: "You have drafts waiting — publish them to keep your streak.",
    },
    {
      icon: <Lightbulb className="h-3.5 w-3.5" />,
      title: "Evergreen Ideas",
      text: "Reuse the content ideas that always work for your audience.",
    },
    {
      icon: <PenLine className="h-3.5 w-3.5" />,
      title: "Duplicate Post",
      text: "Copy a past post and adapt it in a few clicks.",
    },
  ];

  const exportCsv = () => {
    const rows: (string | number)[][] = [["date", "followers", "posts", "previous_followers"]];
    current.forEach((p, i) => rows.push([toInput(p.date), p.followers, p.posts, previous[i].followers]));
    downloadCsv(`insights-${toInput(start)}-${toInput(end)}.csv`, rows);
  };

  const mediaIcon = (m: PostRow["media"]) =>
    m === "video" ? <Play className="h-4 w-4" /> : m === "text" ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />;

  return (
    <main
      className={`min-h-screen w-full transition-[padding-left] duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${t.page}`}
      style={{ paddingLeft: sidebarOffset }}
    >
      <DashboardSidebar theme={theme} />

      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-[clamp(20px,4vh,36px)] sm:px-6 lg:px-8">
        {/* TOP BAR — avatar + handle + roue crantée | recherche, cloche, Export */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <ChannelMenu channels={channels} current={channel} t={t} isDark={isDark} />
          <div className="flex items-center gap-2.5 print:hidden">
            <button
              type="button"
              aria-label="Search"
              onClick={() => navigate("search")}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${t.ring} ${t.hover} ${t.soft}`}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => navigate("notifications")}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${t.ring} ${t.hover} ${t.soft}`}
            >
              <Bell className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!channel}
              className={`flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-medium transition-colors disabled:opacity-40 ${t.ring} ${t.outlineBtn}`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export
              <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
            </button>
          </div>
        </header>

        {!channel ? (
          <section className={`flex flex-col items-center gap-3 rounded-[20px] border px-6 py-20 text-center ${t.card}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${t.iconBox}`}>
              <Activity className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-[17px] font-semibold">Connect a channel to see insights</h2>
            <p className={`max-w-[360px] text-[14px] ${t.soft}`}>
              Followers, reach and engagement show up here once a social account is connected.
            </p>
            <button
              type="button"
              onClick={() => navigate("channels")}
              className={`mt-2 flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold ${t.ring} ${t.greenBtn}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Connect a channel
            </button>
          </section>
        ) : (
          <>
            {/* BANNIÈRE — dégradé bleu-nuit, titre, CTA vert, cartes tips */}
            <section
              className={`relative overflow-hidden rounded-[20px] border p-5 sm:p-6 ${
                isDark
                  ? "border-indigo-400/20 bg-gradient-to-br from-[#141b33] via-[#101425] to-[#0d101c]"
                  : "border-indigo-200 bg-gradient-to-br from-indigo-50 via-sky-50 to-white"
              }`}
            >
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
                <div className="flex flex-col items-start gap-4">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                      A Path to Growth with Weekly Takeaways
                    </h2>
                    <p className={`mt-2 max-w-[460px] text-[13.5px] leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                      The more you post, the better your takeaways. Share a few posts and
                      we'll start showing you weekly insights to help you grow.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("new-post")}
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all duration-150 hover:-translate-y-px active:scale-[0.98] ${t.ring} ${t.greenBtn}`}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Create Post
                  </button>
                </div>

                {/* Cartes empilées blanches, texte violet */}
                <div className="flex flex-col gap-2.5">
                  {tips.map((tip) => (
                    <button
                      key={tip.title}
                      type="button"
                      onClick={() => navigate("new-post")}
                      className="flex w-full items-center gap-3 rounded-xl bg-white px-3.5 py-2.5 text-left shadow-[0_2px_10px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-px"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                        {tip.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-violet-700">
                          {tip.title}
                        </span>
                        <span className="block truncate text-[12px] text-violet-500">{tip.text}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ALL INSIGHTS — titre + onglets soulignés + Tags */}
            <section aria-labelledby="all-title">
              <div className={`flex flex-wrap items-end justify-between gap-4 border-b pb-0 ${t.border}`}>
                <h2 id="all-title" className="pb-2 text-[16px] font-semibold">
                  All Insights
                </h2>
                <div className="flex flex-wrap items-center gap-5">
                  <UnderlineTabs label="Date range" value={range} options={RANGES} onChange={setRange} t={t} />
                  {range === "custom" && (
                    <RangePicker
                      range={range}
                      start={start}
                      end={end}
                      onStartChange={setCustomStart}
                      onEndChange={setCustomEnd}
                      onRangeChange={setRange}
                      t={t}
                      isDark={isDark}
                    />
                  )}
                  {/* Dropdown Tags (placeholder — à brancher) */}
                  <button
                    type="button"
                    onClick={() => navigate("tags")}
                    className={`flex items-center gap-1.5 pb-2 text-[13px] transition-colors ${t.ring} ${t.soft} ${t.hover}`}
                  >
                    Tags
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* SUMMARY — 2 rangées × 5 boîtes, comparaison de périodes */}
              <div className="mt-5">
                <p className={`flex flex-wrap items-center gap-1.5 text-[12.5px] ${t.muted}`}>
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {fmtFull(start)} - {fmtFull(end)}
                  </span>
                  <span className="opacity-60">
                    - Compared to {fmtFull(prevStart)} - {fmtFull(prevEnd)}
                  </span>
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {summaryBoxes.map((b) => (
                    <MetricBox
                      key={b.label}
                      label={b.label}
                      value={b.value}
                      icon={b.icon}
                      delta={b.delta}
                      isDark={isDark}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* METRICS — onglets This/Previous, bandeau bleu, graphique */}
            <section className={`rounded-[20px] border p-5 ${t.card}`} aria-labelledby="metrics-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="metrics-title" className="text-[16px] font-semibold">
                  Metrics
                </h2>
                <PillTabs label="Chart view" value={chartView} options={CHART_VIEWS} onChange={setChartView} t={t} />
              </div>

              {/* Bandeau bleu */}
              <p
                className={`mt-4 rounded-xl border px-4 py-3 text-[13px] ${
                  isDark
                    ? "border-sky-400/25 bg-sky-500/10 text-sky-200"
                    : "border-sky-200 bg-sky-50 text-sky-800"
                }`}
              >
                {delta === 0
                  ? "Your content impact held steady this period."
                  : delta > 0
                  ? `Your audience grew by ${nf(delta)} followers this period.`
                  : `Your audience declined by ${nf(Math.abs(delta))} followers this period.`}
              </p>

              <div className="mt-5">
                <Chart
                  dates={dates}
                  posts={current.map((p) => p.posts)}
                  followers={current.map((p) => p.followers)}
                  prevPosts={previous.map((p) => p.posts)}
                  prevFollowers={previous.map((p) => p.followers)}
                  view={chartView}
                  isDark={isDark}
                />
              </div>
            </section>

            {/* PERFORMANCE PER POST — cartes avec miniature */}
            <section className={`rounded-[20px] border p-5 ${t.card}`} aria-labelledby="perf-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="perf-title" className="text-[16px] font-semibold">
                  Performance per Post
                </h2>
                <p className={`text-[12.5px] ${t.muted}`}>
                  {fmtFull(start)} - {fmtFull(end)}
                </p>
              </div>

              {posts.length === 0 ? (
                <div className={`mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center ${t.border}`}>
                  <Activity className={`h-6 w-6 ${t.muted}`} aria-hidden="true" />
                  <p className="text-[14px] font-medium">No posts in this period</p>
                  <p className={`max-w-[360px] text-[13px] ${t.soft}`}>
                    Choose a longer range to see how your earlier posts performed.
                  </p>
                  {days < 30 && (
                    <button
                      type="button"
                      onClick={() => setRange("30d")}
                      className={`mt-2 rounded-xl border px-4 py-2 text-[12px] font-semibold transition-colors ${t.ring} ${t.border} ${t.hover}`}
                    >
                      Show last 30 days
                    </button>
                  )}
                </div>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {posts.map((p, idx) => (
                    <li key={p.id} className={`flex flex-wrap items-center gap-5 rounded-2xl border p-4 ${t.inner}`}>
                      {/* Miniature du post */}
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ${t.iconBox}`}>
                        {p.thumbnailUrl ? (
                          <img src={p.thumbnailUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                        ) : (
                          mediaIcon(p.media)
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold">
                          #{idx + 1} {p.label}
                        </p>
                        <p className={`text-[12px] ${t.muted}`}>{fmtFull(p.date)}</p>
                      </div>
                      {/* Métriques : valeur au-dessus du label */}
                      <div className="flex flex-wrap gap-x-8 gap-y-2">
                        {[
                          { label: "Reactions", value: nf(p.reactions) },
                          { label: "Comments", value: nf(p.comments) },
                          { label: "Eng. Rate", value: `${p.engRate.toFixed(2)}%` },
                          { label: "Video Views", value: nf(p.videoViews) },
                        ].map((m) => (
                          <div key={m.label} className="flex min-w-[64px] flex-col gap-0.5 text-center sm:text-left">
                            <span className="text-[16px] font-semibold leading-none tabular-nums">{m.value}</span>
                            <span className={`text-[11.5px] ${t.muted}`}>{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}