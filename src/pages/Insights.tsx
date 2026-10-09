// src/pages/Insights.tsx
// Page Insights — hiérarchie progressive (1 focus principal, 1 colonne
// d'highlights, impact contenu, posts), style Black & White aligné sur Channels.
// Sélecteur de période « Custom » : utilise le même CalendarPicker que
// NewPostModal (panneau déroulant From / To), en remplacement des inputs date.
// Les données sont fournies par `useInsights` : branche-le sur ton backend.
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
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Check,
  ChevronDown,
  Download,
  Eye,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Play,
  Plus,
  Share2,
  TrendingDown,
  TrendingUp,
  Users,
  FileText,
} from "lucide-react";
import { navigate, useHashRoute } from "../hooks/useHashRoute";
import { useTheme } from "../hooks/useTheme";
import DashboardSidebar, {
  useSidebarOffset,
} from "../components/DashboardSidebar";
import { CalendarPicker } from "../components/CalendarPicker";
import {
  useConnectedChannels,
  type ConnectedChannel,
} from "../hooks/useConnectedChannels";
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

/** Composant d'icône de réseau (même signature que dans Channels.tsx). */
type IconComponent = ComponentType<{
  className?: string;
  size?: number;
}>;

type Range = "7d" | "30d" | "mtd" | "custom";
type Metric = "followers" | "posts";
type Tab = "engagement" | "video" | "reach";
/** Étape du panneau calendrier : 0 = choix de la plage, 1 = From, 2 = To. */
type CalendarStep = "menu" | "from" | "to";

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

const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "mtd", label: "Month to date" },
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

const CALENDAR_MENU: {
  id: Exclude<CalendarStep, "from" | "to"> | "from" | "to";
  label: string;
  description: string;
}[] = [
  {
    id: "from",
    label: "From date",
    description: "Pick the first day of the period.",
  },
  {
    id: "to",
    label: "To date",
    description: "Pick the last day of the period (today max).",
  },
];

/* ============================================================
   STYLE TOKENS — Black & White, aligné sur la page Channels
============================================================ */

type Tokens = {
  page: string;
  text: string;
  muted: string;
  soft: string;
  card: string;
  border: string;
  inner: string;
  chipOn: string;
  chipOff: string;
  accentBtn: string;
  iconBox: string;
  ring: string;
  hover: string;
  badgeBg: string;
  accentBg: string;
  accentBorder: string;
};

const tokens = (isDark: boolean): Tokens =>
  isDark
    ? {
        page: "bg-[#0a0a0a] text-white",
        text: "text-white",
        muted: "text-zinc-500",
        soft: "text-zinc-400",
        card: "bg-[#141414] border-[#262626]",
        border: "border-[#262626]",
        inner: "bg-[#0f0f0f] border-[#262626]",
        chipOn: "bg-white text-black",
        chipOff: "text-zinc-400 hover:text-white hover:bg-white/[0.06]",
        accentBtn: "bg-white text-black hover:bg-zinc-200",
        iconBox: "bg-[#262626] text-white",
        ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        hover: "hover:bg-white/[0.05]",
        badgeBg: "bg-white text-black",
        accentBg: "bg-white/10",
        accentBorder: "border-white/15",
      }
    : {
        page: "bg-[#f7f7f5] text-black",
        text: "text-black",
        muted: "text-zinc-500",
        soft: "text-zinc-600",
        card: "bg-white border-zinc-200",
        border: "border-zinc-200",
        inner: "bg-zinc-50 border-zinc-200",
        chipOn: "bg-zinc-950 text-white",
        chipOff: "text-zinc-500 hover:text-black hover:bg-black/[0.05]",
        accentBtn: "bg-zinc-950 text-white hover:bg-zinc-800",
        iconBox: "bg-zinc-100 text-black",
        ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
        hover: "hover:bg-black/[0.04]",
        badgeBg: "bg-white text-black",
        accentBg: "bg-zinc-200",
        accentBorder: "border-black/10",
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

/** Fusionne la date choisie dans le calendrier avec l'heure conservée. */
function keepTime(next: Date, previous: Date): Date {
  const merged = new Date(startOfDay(next));
  merged.setHours(previous.getHours(), previous.getMinutes(), 0, 0);
  return merged;
}

const fmt = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
const fmtFull = (d: Date) =>
  d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
const nf = (n: number) => n.toLocaleString("en-US");
const signed = (n: number) => (n === 0 ? "0" : `${n > 0 ? "+" : "−"}${nf(Math.abs(n))}`);
const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

type ResolvedRange = { start: Date; end: Date };

function resolveRange(
  range: Range,
  customStart: Date,
  customEnd: Date
): ResolvedRange {
  const today = startOfDay(new Date());
  if (range === "7d") return { start: addDays(today, -6), end: today };
  if (range === "30d") return { start: addDays(today, -29), end: today };
  if (range === "mtd")
    return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: today };

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
): { current: Point[]; previous: Point[]; summary: Summary } {
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
    };
  }, [s, e]);
}

/** Canal demandé via #/insights?channel=<key>. Se ré-actualise à chaque changement de hash. */
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
   CHART — interactions clavier + pointer conservées
============================================================ */

function Chart({
  dates,
  current,
  previous,
  compare,
  isDark,
  unit,
}: {
  dates: Date[];
  current: number[];
  previous: number[];
  compare: boolean;
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

  const all = [...current, ...(compare ? previous : [])];
  const lo = Math.min(...all);
  let min = Math.floor(lo);
  let max = Math.ceil(Math.max(...all));
  if (max - min < 4) {
    max = min + 4;
  } else {
    min -= 1;
    max += 1;
  }
  if (min < 0 && lo >= 0) min = 0;

  const x = (i: number) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  const toPts = (vals: number[]): [number, number][] =>
    vals.map((v, i) => [x(i), y(v)]);
  const line = smoothPath(toPts(current));
  const area = `${line} L${x(n - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;

  const ink = isDark ? "#ffffff" : "#171717";
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
      className={`relative rounded-2xl ${isDark ? "ring-white/30" : "ring-black/20"} focus-visible:outline-none focus-visible:ring-2`}
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
            <stop offset="0%" stopColor={isDark ? "#ffffff" : "#737373"} stopOpacity={isDark ? 0.12 : 0.24} />
            <stop offset="100%" stopColor={isDark ? "#ffffff" : "#737373"} stopOpacity="0" />
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

        {compare && (
          <path
            d={smoothPath(toPts(previous))}
            fill="none"
            stroke={ink}
            strokeOpacity="0.35"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
        )}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke={axis} strokeOpacity="0.6" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(current[hover])} r="5" fill={isDark ? "#141414" : "#fff"} stroke={ink} strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className={`pointer-events-none absolute top-1 min-w-[150px] rounded-xl px-3.5 py-2.5 text-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.18)] ${
            isDark ? "bg-[#1a1a1a] text-white ring-1 ring-white/10" : "bg-white text-black ring-1 ring-black/5"
          }`}
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > n / 2 ? "-110%" : "10%"})`,
          }}
        >
          <div className="mb-1 text-[11px] opacity-50">{fmtFull(dates[hover])}</div>
          <div className="flex justify-between gap-5">
            <span>{unit}</span>
            <b className="tabular-nums">{nf(current[hover])}</b>
          </div>
          {compare && (
            <div className="flex justify-between gap-5 opacity-50">
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

function Switch({
  checked,
  onChange,
  label,
  t,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  t: Tokens;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[12px] font-medium transition-colors ${t.ring} ${t.soft} ${t.hover}`}
    >
      <span
        className={`relative h-[18px] w-8 rounded-full transition-colors motion-reduce:transition-none ${
          checked ? (t.chipOn.includes("bg-white") ? "bg-white" : "bg-zinc-950") : "bg-zinc-400/40"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full transition-all motion-reduce:transition-none ${
            checked ? "left-[16px]" : "left-[2px]"
          } ${checked ? (t.chipOn.includes("bg-white") ? "bg-black" : "bg-white") : "bg-white"}`}
        />
      </span>
      {label}
    </button>
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

/** Icônes des réseaux (mêmes composants que la page Channels). */
const NETWORK_ICONS: Record<string, IconComponent> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  threads: ThreadsIcon,
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
  pinterest: PinterestIcon,
};

/** Clé du réseau du canal : `key` en priorité, sinon network/platform/provider. */
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
    <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-white text-black">
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
          className="flex items-center justify-center rounded-full bg-zinc-200 text-[13px] font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white"
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
        className={`flex items-center gap-2.5 rounded-xl border py-1.5 pl-1.5 pr-3 transition-colors disabled:cursor-default ${t.ring} ${t.border} ${
          isDark ? "bg-[#141414]" : "bg-white"
        } ${canSwitch ? t.hover : ""}`}
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
          className={`absolute right-0 z-30 mt-2 w-64 rounded-2xl border p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.25)] ${
            isDark ? "border-[#262626] bg-[#161616]" : "border-zinc-200 bg-white"
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
                <Avatar channel={c} size={28} />
                <span className={`min-w-0 flex-1 truncate text-[13px] font-medium ${t.text}`}>{name(c)}</span>
                {active && <Check className={`h-4 w-4 ${t.text}`} aria-hidden="true" />}
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
   RANGE PICKER — CalendarPicker de NewPostModal
   Bouton « Custom » → menu (From / To) → calendrier, même ergonomie
   que le panneau date/heure de la modale (Escape, clic extérieur, retour).
============================================================ */

function RangePicker({
  range,
  start,
  end,
  today,
  onStartChange,
  onEndChange,
  onRangeChange,
  t,
  isDark,
}: {
  range: Range;
  start: Date;
  end: Date;
  today: Date;
  onStartChange: (d: Date) => void;
  onEndChange: (d: Date) => void;
  onRangeChange: (r: Range) => void;
  t: Tokens;
  isDark: boolean;
}) {
  const [step, setStep] = useState<CalendarStep>("menu");
  const ref = useRef<HTMLDivElement>(null);

  const isOpen = step !== "menu";

  // Fermeture : Escape + clic extérieur (comme les dropdowns de NewPostModal).
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setStep("menu");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStep("menu");
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const close = () => setStep("menu");

  const openPicker = (next: CalendarStep) => {
    // Ouvrir le panneau passe automatiquement en plage personnalisée.
    if (range !== "custom") onRangeChange("custom");
    setStep(next);
  };

  const label =
    range === "custom"
      ? `${fmt(start)} – ${fmt(end)}`
      : RANGES.find((r) => r.key === range)?.label ?? "";

  const selectFrom = (d: Date) => {
    onStartChange(d);
    // Enchaîne directement sur le choix de la date de fin.
    setStep("to");
  };

  const selectTo = (d: Date) => {
    onEndChange(d);
    close();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setStep("menu") : setStep("from"))}
        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-colors ${t.ring} ${t.border} ${
          isOpen ? t.accentBg : isDark ? "bg-[#141414]" : "bg-white"
        } ${t.hover} ${t.text}`}
      >
        <CalendarClock className={`h-3.5 w-3.5 ${t.muted}`} aria-hidden="true" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""} ${t.muted}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 top-full z-30 mt-2 w-[300px] overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.25)] ${
            isDark ? "border-[#262626] bg-[#161616]" : "border-zinc-200 bg-white"
          }`}
        >
          {step === "from" || step === "to" ? (
            <>
              <div className="p-3">
                <p className={`mb-2 text-[13px] font-semibold ${t.text}`}>
                  {step === "from" ? "From date" : "To date"}
                </p>
                <CalendarPicker
                  value={step === "from" ? start : end}
                  onChange={step === "from" ? selectFrom : selectTo}
                  isDark={isDark}
                  // Pour « To », on empêche de dépasser aujourd'hui via min/max
                  // gérés dans resolveRange ; CalendarPicker reste utilisé tel quel.
                />
              </div>

              <div
                className={`flex items-center justify-between border-t px-3 py-2.5 ${
                  isDark ? "border-[#262626]" : "border-zinc-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setStep("menu")}
                  className={`flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors ${t.ring} ${t.hover} ${t.text}`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  More
                </button>
                <button
                  type="button"
                  onClick={close}
                  className={`flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors ${t.ring} ${t.hover} ${t.text}`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                  Done
                </button>
              </div>
            </>
          ) : (
            <div role="menu" className="p-2">
              {RANGES.map((r) => {
                const isSel = range === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    role="menuitem"
                    aria-checked={isSel}
                    onClick={() => {
                      onRangeChange(r.key);
                      close();
                    }}
                    className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${t.ring} ${
                      isSel ? `${t.accentBg} ${t.text}` : t.hover
                    }`}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {isSel && <Check className={`h-4 w-4 ${t.text}`} strokeWidth={3} aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13.5px] font-bold ${isSel ? t.text : t.text}`}>
                        {r.label}
                      </span>
                      {r.key === "custom" && (
                        <span className={`mt-0.5 block text-[12px] ${t.muted}`}>
                          {fmtFull(start)} – {fmtFull(end)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}

              <div className={`my-1 border-t ${t.border}`} />

              {CALENDAR_MENU.filter((c) => c.id === "from" || c.id === "to").map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="menuitem"
                  onClick={() => openPicker(c.id as CalendarStep)}
                  className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${t.ring} ${t.hover}`}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    <CalendarClock className={`h-4 w-4 ${t.muted}`} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13.5px] font-bold ${t.text}`}>
                      {c.label}
                    </span>
                    <span className={`mt-0.5 block text-[12px] leading-snug ${t.muted}`}>
                      {c.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PAGE — hiérarchie progressive
   1. Focus : tendance audience (grand chiffre + graphique)
   2. Highlights : métriques clés en liste compacte
   3. Impact du contenu
   4. Posts
============================================================ */

export default function Insights() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const t = useMemo(() => tokens(isDark), [isDark]);
  const sidebarOffset = useSidebarOffset();
  const channels = useConnectedChannels();
  const channelKey = useHashChannel();
  const channel = channels.find((c) => c.key === channelKey) ?? channels[0];

  // Plage personnalisée pilotée par le CalendarPicker (plus d'inputs date).
  const [range, setRange] = useState<Range>("30d");
  const [customStart, setCustomStart] = useState(() => addDays(startOfDay(new Date()), -29));
  const [customEnd, setCustomEnd] = useState(() => startOfDay(new Date()));
  const [compare, setCompare] = useState(true);
  const [metric, setMetric] = useState<Metric>("followers");
  const [tab, setTab] = useState<Tab>("engagement");

  const { start, end } = useMemo(
    () => resolveRange(range, customStart, customEnd),
    [range, customStart, customEnd]
  );
  const { current, previous, summary } = useInsights(start, end);

  const days = current.length;
  const dates = current.map((p) => p.date);
  const first = current[0];
  const last = current[days - 1];
  const delta = last.followers - first.followers;
  const prevDelta = previous[days - 1].followers - previous[0].followers;
  const totalPosts = current.reduce((a, p) => a + p.posts, 0);

  const compared = `${fmtFull(previous[0].date)} – ${fmtFull(previous[days - 1].date)}`;
  const name = channel ? (channel.handle || channel.name).replace(/^@/, "") : "";

  const series =
    metric === "followers"
      ? { cur: current.map((p) => p.followers), prev: previous.map((p) => p.followers), unit: "Followers" }
      : { cur: current.map((p) => p.posts), prev: previous.map((p) => p.posts), unit: "Posts" };

  /* --- Highlights : une seule carte, liste compacte plutôt que 6 tuiles --- */
  const highlights: { icon: ReactNode; label: string; value: string; delta?: number }[] = [
    { icon: <Users className="h-4 w-4" />, label: "Followers", value: nf(summary.followers), delta },
    { icon: <FileText className="h-4 w-4" />, label: "Posts", value: nf(summary.posts) },
    { icon: <Eye className="h-4 w-4" />, label: "Reach", value: nf(summary.reach) },
    { icon: <Heart className="h-4 w-4" />, label: "Reactions", value: nf(summary.reactions) },
    { icon: <MessageCircle className="h-4 w-4" />, label: "Comments", value: nf(summary.comments) },
    { icon: <Share2 className="h-4 w-4" />, label: "Shares", value: nf(summary.shares) },
    { icon: <Play className="h-4 w-4" />, label: "Video views", value: nf(summary.videoViews) },
  ];

  const impact: Record<
    Tab,
    { title: string; icon: ReactNode; headline: string; value: number; rows: { label: string; value: string }[] }
  > = {
    engagement: {
      title: "Engagement rate",
      icon: <Heart className="h-4 w-4" />,
      headline: `${summary.engRate}%`,
      value: Math.min(100, Math.round(summary.engRate)),
      rows: [
        { label: "Reactions", value: nf(summary.reactions) },
        { label: "Comments", value: nf(summary.comments) },
        { label: "Shares", value: nf(summary.shares) },
      ],
    },
    video: {
      title: "Views compared to reach",
      icon: <Play className="h-4 w-4" />,
      headline: `${pct(summary.videoViews, summary.reach)}%`,
      value: pct(summary.videoViews, summary.reach),
      rows: [
        { label: "Video views", value: nf(summary.videoViews) },
        { label: "Watch time (min)", value: nf(summary.watchMin) },
        { label: "Avg. watch time (sec)", value: nf(summary.avgWatchSec) },
      ],
    },
    reach: {
      title: "Reach compared to followers",
      icon: <Eye className="h-4 w-4" />,
      headline: `${pct(summary.reach, summary.followers)}%`,
      value: pct(summary.reach, summary.followers),
      rows: [
        { label: "Reach", value: nf(summary.reach) },
        { label: "Followers", value: nf(summary.followers) },
        { label: "Video views", value: nf(summary.videoViews) },
      ],
    },
  };
  const group = impact[tab];

  const exportCsv = () => {
    const rows: (string | number)[][] = [["date", "followers", "posts", "previous_followers"]];
    current.forEach((p, i) => rows.push([toInput(p.date), p.followers, p.posts, previous[i].followers]));
    downloadCsv(`insights-${name || "channel"}-${toInput(start)}-${toInput(end)}.csv`, rows);
  };

  const today = startOfDay(new Date());

  return (
    <main
      className={`min-h-screen w-full transition-[padding-left] duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${t.page}`}
      style={{ paddingLeft: sidebarOffset }}
    >
      <DashboardSidebar theme={theme} />

      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-[clamp(20px,4vh,36px)] sm:px-6 lg:px-8">
        {/* HEADER — titre + période en un coup d'œil, actions à droite */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Insights</h1>
            <p className={`mt-1 text-[13px] ${t.muted}`}>
              {fmtFull(start)} – {fmtFull(end)}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <ChannelMenu channels={channels} current={channel} t={t} isDark={isDark} />
            <button
              type="button"
              onClick={exportCsv}
              disabled={!channel}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all duration-150 hover:-translate-y-px active:scale-[0.98] disabled:opacity-40 disabled:hover:translate-y-0 ${t.ring} ${t.accentBtn}`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
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
              className={`mt-2 flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium ${t.ring} ${t.accentBtn}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Connect a channel
            </button>
          </section>
        ) : (
          <>
            {/* TOOLBAR — période à gauche (Segmented + RangePicker calendrier),
                comparaison à droite, une seule ligne */}
            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-[20px] border px-3 py-2.5 ${t.card}`}>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented
                  label="Date range"
                  value={range === "custom" ? "custom" : range}
                  options={RANGES}
                  onChange={(r) => {
                    setRange(r);
                  }}
                  t={t}
                />
                <RangePicker
                  range={range}
                  start={start}
                  end={end}
                  today={today}
                  onStartChange={setCustomStart}
                  onEndChange={setCustomEnd}
                  onRangeChange={setRange}
                  t={t}
                  isDark={isDark}
                />
              </div>
              <Switch checked={compare} onChange={setCompare} label="Compare with previous period" t={t} />
            </div>

            {/* NIVEAU 1 — FOCUS PRINCIPAL : audience */}
            <section className={`rounded-[20px] border p-5 sm:p-6 ${t.card}`} aria-labelledby="focus-title">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className={`text-[12px] font-medium uppercase tracking-wide ${t.muted}`}>
                    {metric === "followers" ? "Followers" : "Posts published"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
                      {metric === "followers" ? nf(last.followers) : nf(totalPosts)}
                    </span>
                    <span className="flex flex-col gap-1.5">
                      {metric === "followers" && <Delta value={delta} isDark={isDark} />}
                      {compare && metric === "followers" && (
                        <span className={`text-[11px] ${t.muted}`}>prev. {signed(prevDelta)}</span>
                      )}
                    </span>
                  </div>
                  <p className={`mt-2 text-[13px] ${t.soft}`}>
                    {metric === "followers"
                      ? delta === 0
                        ? "Your audience was flat in this period."
                        : delta > 0
                        ? `You gained ${nf(delta)} followers in this period.`
                        : `You lost ${nf(Math.abs(delta))} followers in this period.`
                      : totalPosts === 0
                      ? "No posts published in this period."
                      : `${nf(totalPosts)} posts published in this period.`}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <Segmented label="Metric" value={metric} options={METRICS} onChange={setMetric} t={t} />
                  <div className={`flex items-center gap-4 text-[11px] ${t.muted}`} aria-hidden="true">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-0.5 w-4 rounded-full ${isDark ? "bg-white" : "bg-zinc-950"}`} />
                      This period
                    </span>
                    {compare && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-0 w-4 border-t-2 border-dashed"
                          style={{ borderColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)" }}
                        />
                        {compared}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <h2 id="focus-title" className="sr-only">Trend</h2>
              <div className="mt-4">
                <Chart
                  dates={dates}
                  current={series.cur}
                  previous={series.prev}
                  compare={compare}
                  isDark={isDark}
                  unit={series.unit}
                />
              </div>
            </section>

            {/* NIVEAU 2 + 3 — highlights compactes + impact du contenu, côte à côte */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
              <section className={`rounded-[20px] border p-5 sm:p-6 ${t.card}`} aria-labelledby="highlights-title">
                <h2 id="highlights-title" className="text-[15px] font-semibold">
                  Highlights
                </h2>
                <ul className="mt-1">
                  {highlights.map((h) => (
                    <li
                      key={h.label}
                      className={`flex items-center justify-between gap-3 border-b py-3 last:border-b-0 ${t.border}`}
                    >
                      <span className={`flex items-center gap-3 text-[13px] ${t.soft}`}>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${t.iconBox}`}>{h.icon}</span>
                        {h.label}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold tabular-nums">{h.value}</span>
                        {h.delta !== undefined && <Delta value={h.delta} isDark={isDark} />}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={`flex flex-col rounded-[20px] border p-5 sm:p-6 ${t.card}`} aria-labelledby="impact-title">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="impact-title" className="text-[15px] font-semibold">
                    Content impact
                  </h2>
                  <Segmented label="Category" value={tab} options={TABS} onChange={setTab} t={t} />
                </div>

                <div className={`mt-4 flex items-center gap-4 rounded-2xl border p-4 ${t.inner}`}>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.iconBox}`}>{group.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[12px] ${t.muted}`}>{group.title}</p>
                    <p className="text-[24px] font-semibold leading-tight tabular-nums">{group.headline}</p>
                  </div>
                  <div
                    className="relative h-11 w-11"
                    role="img"
                    aria-label={`${group.value} percent`}
                  >
                    <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" className={isDark ? "stroke-white/10" : "stroke-black/10"} />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        strokeWidth="4"
                        stroke={isDark ? "#ffffff" : "#171717"}
                        strokeDasharray={`${(group.value / 100) * 97.4} 97.4`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums ${t.text}`}>
                      {group.value}
                    </span>
                  </div>
                </div>

                <dl className="mt-1 flex-1">
                  {group.rows.map((r) => (
                    <div
                      key={r.label}
                      className={`flex items-center justify-between border-b py-3 last:border-b-0 ${t.border}`}
                    >
                      <dt className={`text-[13px] ${t.soft}`}>{r.label}</dt>
                      <dd className="text-[14px] font-semibold tabular-nums">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            {/* NIVEAU 4 — performance par post */}
            <section className={`rounded-[20px] border p-5 sm:p-6 ${t.card}`} aria-labelledby="perf-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="perf-title" className="text-[15px] font-semibold">
                  Performance per post
                </h2>
                <button
                  type="button"
                  onClick={() => navigate("posts")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors ${t.ring} ${t.hover} ${t.soft}`}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                  View all posts
                </button>
              </div>

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
            </section>
          </>
        )}
      </div>
    </main>
  );
}