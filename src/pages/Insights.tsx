// src/pages/Insights.tsx
// Page Insights — redesign aligné sur la maquette :
//  • Header : avatar + handle, icônes (réglages, recherche, export)
//  • Bannière « A Path to Growth with Weekly Takeaways » + bouton Create Post
//    + cartes de tips empilées à droite
//  • « All Insights » : filtre de période (7d / 30d / MTD / Custom + Tags)
//  • « Summary » : grille de boîtes métriques (nombre + label),
//    comparaison « cette période vs période précédente »
//  • « Metrics » : graphique Followers/Posts avec toggle This / Comparison / Both
//  • « Performance per Post » : cartes de posts avec métriques
// Style : dark par défaut, accent vert (emerald). Contrats conservés :
// useInsights, useConnectedChannels, CalendarPicker, useHashRoute, useTheme.
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
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  MessageCircle,
  PenLine,
  Play,
  Plus,
  Search,
  Settings,
  Share2,
  TrendingDown,
  TrendingUp,
  Users,
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
type Metric = "followers" | "posts";
type Tab = "engagement" | "video" | "reach";
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

const METRICS: { key: Metric; label: string }[] = [
  { key: "followers", label: "Followers" },
  { key: "posts", label: "Posts" },
];

const TABS: { key: Tab; label: string }[] = [
  { key: "engagement", label: "Engagement" },
  { key: "video", label: "Video" },
  { key: "reach", label: "Reach" },
];

const CHART_VIEWS: { key: ChartView; label: string }[] = [
  { key: "this", label: "This Period" },
  { key: "comparison", label: "Comparison" },
  { key: "both", label: "Both" },
];

/* ============================================================
   TOKENS — dashboard dark avec accent vert (comme la maquette)
============================================================ */

type Tokens = {
  page: string;
  text: string;
  muted: string;
  soft: string;
  card: string;
  inner: string;
  border: string;
  chipOn: string;
  chipOff: string;
  greenBtn: string;
  ghostBtn: string;
  iconBox: string;
  ring: string;
  hover: string;
  accentText: string;
  blueBanner: string;
};

const tokens = (isDark: boolean): Tokens =>
  isDark
    ? {
        page: "bg-[#101012] text-white",
        text: "text-white",
        muted: "text-zinc-500",
        soft: "text-zinc-400",
        card: "bg-[#171719] border-[#26262a]",
        inner: "bg-[#1d1d21] border-[#2c2c31]",
        border: "border-[#26262a]",
        chipOn: "bg-emerald-500 text-black",
        chipOff: "text-zinc-400 hover:text-white hover:bg-white/[0.06]",
        greenBtn: "bg-emerald-500 text-black hover:bg-emerald-400",
        ghostBtn: "border border-[#2c2c31] text-white hover:border-white/40 hover:bg-white/[0.04]",
        iconBox: "bg-[#222226] text-zinc-300",
        ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
        hover: "hover:bg-white/[0.05]",
        accentText: "text-emerald-400",
        blueBanner:
          "bg-gradient-to-r from-sky-500/15 to-indigo-500/15 border border-sky-400/25 text-sky-200",
      }
    : {
        page: "bg-[#f6f6f7] text-black",
        text: "text-black",
        muted: "text-zinc-500",
        soft: "text-zinc-600",
        card: "bg-white border-zinc-200",
        inner: "bg-zinc-50 border-zinc-200",
        border: "border-zinc-200",
        chipOn: "bg-emerald-600 text-white",
        chipOff: "text-zinc-500 hover:text-black hover:bg-black/[0.05]",
        greenBtn: "bg-emerald-600 text-white hover:bg-emerald-500",
        ghostBtn: "border border-zinc-300 text-black hover:border-black/50 hover:bg-black/[0.03]",
        iconBox: "bg-zinc-100 text-zinc-700",
        ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
        hover: "hover:bg-black/[0.04]",
        accentText: "text-emerald-600",
        blueBanner: "bg-sky-50 border border-sky-200 text-sky-800",
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
const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

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
      // À remplir depuis ton API : posts publiés dans la période.
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
   CHART — interactions clavier + pointer conservées.
   view : this | comparison | both (toggle comme la maquette).
============================================================ */

function Chart({
  dates,
  current,
  previous,
  view,
  isDark,
  unit,
}: {
  dates: Date[];
  current: number[];
  previous: number[];
  view: ChartView;
  isDark: boolean;
  unit: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId().replace(/:/g, "");
  const W = 720;
  const H = 260;
  const pad = { l: 34, r: 12, t: 16, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = current.length;

  const showCur = view === "this" || view === "both";
  const showPrev = view === "comparison" || view === "both";

  const all = [...(showCur ? current : []), ...(showPrev ? previous : [])];
  const lo = all.length ? Math.min(...all) : 0;
  let min = Math.floor(lo);
  let max = Math.ceil(all.length ? Math.max(...all) : 4);
  if (max - min < 4) max = min + 4;
  else {
    min -= 1;
    max += 1;
  }
  if (min < 0 && lo >= 0) min = 0;

  const x = (i: number) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  const toPts = (vals: number[]): [number, number][] => vals.map((v, i) => [x(i), y(v)]);
  const line = smoothPath(toPts(current));
  const area = `${line} L${x(n - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;

  const ink = isDark ? "#34d399" : "#059669"; // accent vert
  const prevInk = isDark ? "#a5b4fc" : "#6366f1"; // violet/indigo comme la maquette
  const grid = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const axis = isDark ? "#6b6b73" : "#9a9aa3";

  const ticks = Array.from(
    new Set(Array.from({ length: 5 }, (_, i) => Math.round(min + ((max - min) * i) / 4)))
  );
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
      className={`relative rounded-2xl ${isDark ? "ring-emerald-400/40" : "ring-emerald-600/30"} focus-visible:outline-none focus-visible:ring-2`}
      tabIndex={0}
      role="group"
      aria-label={`${unit} chart. Use the left and right arrow keys to inspect each day.`}
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
            <stop offset="0%" stopColor={ink} stopOpacity="0.25" />
            <stop offset="100%" stopColor={ink} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={grid} />
            <text x={pad.l - 8} y={y(t) + 3.5} fontSize="10" fill={axis} textAnchor="end" className="tabular-nums">
              {t}
            </text>
          </g>
        ))}
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

        {showPrev && (
          <path
            d={smoothPath(toPts(previous))}
            fill="none"
            stroke={prevInk}
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
        )}
        {showCur && (
          <>
            <path d={area} fill={`url(#${gradId})`} />
            <path d={line} fill="none" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke={axis} strokeOpacity="0.6" strokeDasharray="3 3" />
            {showCur && (
              <circle cx={x(hover)} cy={y(current[hover])} r="5" fill={isDark ? "#171719" : "#fff"} stroke={ink} strokeWidth="2.5" />
            )}
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className={`pointer-events-none absolute top-1 min-w-[150px] rounded-xl px-3.5 py-2.5 text-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.25)] ${
            isDark ? "bg-[#222226] text-white ring-1 ring-white/10" : "bg-white text-black ring-1 ring-black/10"
          }`}
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > n / 2 ? "-110%" : "10%"})`,
          }}
        >
          <div className="mb-1 text-[11px] opacity-50">{fmtFull(dates[hover])}</div>
          {showCur && (
            <div className="flex justify-between gap-5">
              <span>{unit}</span>
              <b className="tabular-nums">{nf(current[hover])}</b>
            </div>
          )}
          {showPrev && (
            <div className="flex justify-between gap-5 opacity-60">
              <span>Previous</span>
              <b className="tabular-nums">{nf(previous[hover])}</b>
            </div>
          )}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {hover !== null ? `${fmtFull(dates[hover])}: ${current[hover]} ${unit.toLowerCase()}` : ""}
      </p>
    </div>
  );
}

/* ============================================================
   PETITS COMPOSANTS
============================================================ */

function Segmented<T extends string>({
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
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-xl p-1">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors motion-reduce:transition-none ${t.ring} ${
              active ? t.chipOn : t.chipOff
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

/** Boîte métrique du Summary : grand chiffre + label (comme la maquette). */
function MetricBox({
  label,
  value,
  delta,
  isDark,
  t,
}: {
  label: string;
  value: string;
  delta?: number;
  isDark: boolean;
  t: Tokens;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-4 ${t.inner}`}>
      <span className={`text-[24px] font-semibold leading-none tabular-nums ${t.text}`}>
        {value}
      </span>
      <span className={`flex items-center gap-2 text-[12px] ${t.muted}`}>
        {label}
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
    <span className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ${"bg-[#171719]"}`}>
      <span className="flex h-[19px] w-[19px] items-center justify-center">
        <Icon className="h-[11px] w-[11px]" size={size} />
      </span>
    </span>
  );
}

function Avatar({
  channel,
  size = 36,
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
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={!canSwitch}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition-colors disabled:cursor-default ${t.ring} ${
          canSwitch ? t.hover : ""
        }`}
      >
        <Avatar channel={current} />
        <span className="min-w-0 text-left">
          <span className={`block max-w-[140px] truncate text-[13px] font-semibold ${t.text}`}>{name(current)}</span>
        </span>
        {canSwitch && (
          <ChevronDown
            className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""} ${t.muted}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute left-0 z-30 mt-2 w-64 rounded-2xl border p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${
            isDark ? "border-[#2c2c31] bg-[#1d1d21]" : "border-zinc-200 bg-white"
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
                {active && <Check className={`h-4 w-4 ${t.accentText}`} aria-hidden="true" />}
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
          active ? t.chipOn : t.chipOff
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
          className={`absolute left-0 top-full z-30 mt-2 w-[300px] overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.45)] ${
            isDark ? "border-[#2c2c31] bg-[#1d1d21]" : "border-zinc-200 bg-white"
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
              className={`flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors ${t.ring} ${t.hover} ${t.text}`}
            >
              {field === "from" ? "Next: To" : "Back: From"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors ${t.ring} ${t.hover} ${t.accentText}`}
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
   PAGE — structure de la maquette :
   1. Header : avatar + handle, icônes settings / search / export
   2. Bannière « A Path to Growth » + bouton Create Post + tips
   3. « All Insights » : filtres période + Tags
   4. « Summary » : boîtes métriques + comparaison de périodes
   5. « Metrics » : sous-onglets + graphique (This / Comparison / Both)
   6. « Performance per Post » : cartes de posts
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
  const [metric, setMetric] = useState<Metric>("followers");
  const [tab, setTab] = useState<Tab>("engagement");

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
  const totalPosts = summary.posts;

  const prevStart = previous[0].date;
  const prevEnd = previous[days - 1].date;
  const handle = channel ? (channel.handle || channel.name).replace(/^@/, "") : "";

  const series =
    metric === "followers"
      ? { cur: current.map((p) => p.followers), prev: previous.map((p) => p.followers), unit: "Followers" }
      : { cur: current.map((p) => p.posts), prev: previous.map((p) => p.posts), unit: "Posts" };

  /* Summary — boîtes comme la maquette (Total Followers, Posts, …). */
  const summaryBoxes: { label: string; value: string; delta?: number }[] = [
    { label: "Total Followers", value: nf(summary.followers), delta },
    { label: "Posts", value: nf(summary.posts) },
    { label: "Reactions", value: nf(summary.reactions) },
    { label: "Comments", value: nf(summary.comments) },
    { label: "Engagement Rate", value: `${summary.engRate}%` },
    { label: "Video Views", value: nf(summary.videoViews) },
    { label: "Shares", value: nf(summary.shares) },
    { label: "Reach", value: nf(summary.reach) },
    { label: "Watch Time", value: `${nf(summary.watchMin)} min` },
    { label: "Avg. Watch Time", value: `${nf(summary.avgWatchSec)} sec` },
  ];

  /* Tips de la bannière (statiques — à personnaliser via ton API). */
  const tips: { icon: ReactNode; title: string; text: string }[] = [
    {
      icon: <Activity className="h-4 w-4" />,
      title: "Repost Your Popular Post",
      text: "Bring back your best-performing post to reach new followers.",
    },
    {
      icon: <FileText className="h-4 w-4" />,
      title: "Use Your Drafts",
      text: "You have drafts waiting — publish them to keep your streak alive.",
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
        {/* HEADER — avatar + handle, icônes, export (comme la maquette) */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <ChannelMenu channels={channels} current={channel} t={t} isDark={isDark} />
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              aria-label="Settings"
              onClick={() => navigate("settings")}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${t.ring} ${t.border} ${t.card} ${t.hover} ${t.soft}`}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Search"
              onClick={() => navigate("search")}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${t.ring} ${t.border} ${t.card} ${t.hover} ${t.soft}`}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!channel}
              className={`flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-medium transition-colors disabled:opacity-40 ${t.ring} ${t.border} ${t.card} ${t.hover} ${t.text}`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </header>

        {!channel ? (
          <section className={`flex flex-col items-center gap-3 rounded-[20px] border px-6 py-20 text-center ${t.card}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${t.iconBox}`}>
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-[17px] font-semibold">Connect a channel to see insights</h2>
            <p className={`max-w-[360px] text-[14px] ${t.soft}`}>
              Followers, reach and engagement show up here once a social account is connected.
            </p>
            <button
              type="button"
              onClick={() => navigate("channels")}
              className={`mt-2 flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium ${t.ring} ${t.greenBtn}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Connect a channel
            </button>
          </section>
        ) : (
          <>
            {/* BANNIÈRE « A Path to Growth » + Create Post + cartes tips */}
            <section className={`grid grid-cols-1 gap-4 rounded-[20px] border p-5 lg:grid-cols-[1.2fr_1fr] lg:p-6 ${t.card}`}>
              <div className="flex flex-col items-start gap-3">
                <div>
                  <h2 className="text-[19px] font-semibold tracking-[-0.02em]">
                    A Path to Growth with Weekly Takeaways
                  </h2>
                  <p className={`mt-1.5 max-w-[440px] text-[13.5px] ${t.soft}`}>
                    We watch your numbers and hand you a simple plan each week: what to post,
                    what to repost, and what to write next.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("new-post")}
                  className={`mt-1 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-150 hover:-translate-y-px active:scale-[0.98] ${t.ring} ${t.greenBtn}`}
                >
                  <PenLine className="h-4 w-4" aria-hidden="true" />
                  Create Post
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {tips.map((tip) => (
                  <div key={tip.title} className={`flex items-start gap-3 rounded-xl border p-3.5 ${t.inner}`}>
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.iconBox}`}>
                      {tip.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold">{tip.title}</p>
                      <p className={`mt-0.5 text-[12.5px] leading-snug ${t.soft}`}>{tip.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ALL INSIGHTS — titre + filtres (période, Tags) */}
            <section aria-labelledby="all-title">
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-[20px] border px-3 py-2.5 ${t.card}`}>
                <h2 id="all-title" className="pl-1 text-[15px] font-semibold">
                  All Insights
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Segmented label="Date range" value={range} options={RANGES} onChange={setRange} t={t} />
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
                  {/* Filtre Tags : placeholder branché sur rien pour l'instant */}
                  <button
                    type="button"
                    onClick={() => navigate("tags")}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-colors ${t.ring} ${t.border} ${t.card} ${t.hover} ${t.soft}`}
                  >
                    <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                    Tags
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* SUMMARY — boîtes métriques + comparaison de périodes */}
              <div className={`mt-4 rounded-[20px] border p-5 ${t.card}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[14.5px] font-semibold">Summary</h3>
                  <p className={`flex items-center gap-1.5 text-[12px] ${t.muted}`}>
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {fmtFull(start)} – {fmtFull(end)}{" "}
                    <span className="opacity-60">
                      compared to {fmtFull(prevStart)} – {fmtFull(prevEnd)}
                    </span>
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {summaryBoxes.map((b) => (
                    <MetricBox key={b.label} label={b.label} value={b.value} delta={b.delta} isDark={isDark} t={t} />
                  ))}
                </div>
              </div>
            </section>

            {/* METRICS — sous-onglets + graphique This / Comparison / Both */}
            <section className={`rounded-[20px] border p-5 ${t.card}`} aria-labelledby="metrics-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 id="metrics-title" className="text-[15px] font-semibold">
                    Metrics
                  </h2>
                  <Segmented label="Metric" value={metric} options={METRICS} onChange={setMetric} t={t} />
                  <Segmented label="Category" value={tab} options={TABS} onChange={setTab} t={t} />
                </div>
                <Segmented label="Chart view" value={chartView} options={CHART_VIEWS} onChange={setChartView} t={t} />
              </div>

              {/* Bandeau bleu comme la maquette */}
              <p className={`mt-4 rounded-xl px-4 py-3 text-[13px] ${t.blueBanner}`}>
                {metric === "followers" && delta === 0
                  ? "Your audience held steady this period."
                  : metric === "followers" && delta > 0
                  ? `Your audience grew by ${nf(delta)} followers this period.`
                  : metric === "followers"
                  ? `Your audience declined by ${nf(Math.abs(delta))} followers this period.`
                  : totalPosts === 0
                  ? "Your content impact held steady this period."
                  : `${nf(totalPosts)} posts drove your content impact this period.`}
              </p>

              <div className="mt-4">
                <Chart
                  dates={dates}
                  current={series.cur}
                  previous={series.prev}
                  view={chartView}
                  isDark={isDark}
                  unit={series.unit}
                />
              </div>

              <div className={`mt-3 flex flex-wrap items-center gap-4 text-[11px] ${t.muted}`} aria-hidden="true">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-emerald-500" />
                  This period
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0 w-4 border-t-2 border-dashed border-indigo-400" />
                  {fmtFull(prevStart)} – {fmtFull(prevEnd)}
                </span>
              </div>
            </section>

            {/* PERFORMANCE PER POST — cartes de posts */}
            <section className={`rounded-[20px] border p-5 ${t.card}`} aria-labelledby="perf-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="perf-title" className="text-[15px] font-semibold">
                  Performance per Post
                </h2>
                <p className={`text-[12px] ${t.muted}`}>
                  {fmtFull(start)} – {fmtFull(end)}
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
                    <li key={p.id} className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${t.inner}`}>
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.iconBox}`}>
                        {mediaIcon(p.media)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold">
                          #{idx + 1} {p.label}
                        </p>
                        <p className={`text-[12px] ${t.muted}`}>{fmtFull(p.date)}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]">
                        <span className={`flex items-center gap-1.5 ${t.soft}`}>
                          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                          <b className="tabular-nums">{nf(p.reactions)}</b> Reactions
                        </span>
                        <span className={`flex items-center gap-1.5 ${t.soft}`}>
                          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          <b className="tabular-nums">{nf(p.comments)}</b> Comments
                        </span>
                        <span className={`flex items-center gap-1.5 ${t.soft}`}>
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          <b className="tabular-nums">{p.engRate.toFixed(2)}%</b> Engagement
                        </span>
                        <span className={`flex items-center gap-1.5 ${t.soft}`}>
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          <b className="tabular-nums">{nf(p.videoViews)}</b> Views
                        </span>
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