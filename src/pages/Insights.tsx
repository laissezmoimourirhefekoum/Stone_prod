// src/pages/Insights.tsx
// Page Insights : période, comparaison, graphique interactif, impact du contenu, export CSV.
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
  BarChart3,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  Play,
  Plus,
  Share2,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
  PinterestIcon,
  ThreadsIcon,
} from "../components/IntegrationIcons";

/** Composant d'icône de réseau (même signature que dans Channels.tsx). */
type IconComponent = ComponentType<{
  className?: string;
  size?: number;
}>;
import { navigate, useHashRoute } from "../hooks/useHashRoute";
import { useTheme } from "../hooks/useTheme";
import DashboardSidebar, {
  useSidebarOffset,
} from "../components/DashboardSidebar";
import {
  useConnectedChannels,
  type ConnectedChannel,
} from "../hooks/useConnectedChannels";

/* ============================================================
   TYPES
============================================================ */

type Range = "7d" | "30d" | "mtd" | "custom";
type Metric = "followers" | "posts";
type Tab = "engagement" | "video" | "reach";

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

/* ============================================================
   STYLE TOKENS (mêmes teintes que la Home, containers plus sombres)
============================================================ */

const cardClass = (d: boolean) =>
  d ? "border border-white/[0.06] bg-[#0d0d0f]" : "border border-black/[0.06] bg-white";

const innerClass = (d: boolean) =>
  d ? "border border-white/[0.06] bg-[#070708]" : "border border-black/[0.06] bg-neutral-50";

const mutedClass = (d: boolean) => (d ? "text-neutral-600" : "text-neutral-400");
const softClass = (d: boolean) => (d ? "text-neutral-400" : "text-neutral-500");
const strongClass = (d: boolean) => (d ? "text-white" : "text-neutral-900");
const hairClass = (d: boolean) => (d ? "border-white/[0.06]" : "border-black/[0.06]");
const iconBoxClass = (d: boolean) => (d ? "bg-white text-black" : "bg-neutral-900 text-white");
const ringClass = (d: boolean) =>
  d ? "focus-visible:ring-white/40" : "focus-visible:ring-black/30";
const hoverClass = (d: boolean) => (d ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]");

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
const fromInput = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const fmt = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
const fmtFull = (d: Date) =>
  d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
const nf = (n: number) => n.toLocaleString("en-US");
const signed = (n: number) => (n === 0 ? "0" : `${n > 0 ? "+" : "−"}${nf(Math.abs(n))}`);
const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

function resolveRange(range: Range, customStart: string, customEnd: string) {
  const today = startOfDay(new Date());
  if (range === "7d") return { start: addDays(today, -6), end: today };
  if (range === "30d") return { start: addDays(today, -29), end: today };
  if (range === "mtd") return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: today };

  let s = fromInput(customStart);
  let e = fromInput(customEnd);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return { start: addDays(today, -29), end: today };
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
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
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
      pts[i + 1][1] -
      t[i + 1] * h
    ).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/* ============================================================
   CHART
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
  const H = 280;
  const pad = { l: 34, r: 12, t: 16, b: 28 };
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
  const toPts = (vals: number[]): [number, number][] => vals.map((v, i) => [x(i), y(v)]);
  const line = smoothPath(toPts(current));
  const area = `${line} L${x(n - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;

  const ink = isDark ? "#ffffff" : "#171717";
  const grid = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const axis = isDark ? "#6b6b73" : "#9a9aa3";

  const ticks = Array.from(new Set(Array.from({ length: 5 }, (_, i) => Math.round(min + ((max - min) * i) / 4))));
  const labelIdx = Array.from(new Set([0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => Math.round(r * (n - 1)))));

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
      className={`relative rounded-2xl focus-visible:outline-none focus-visible:ring-2 ${ringClass(isDark)}`}
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
            <stop offset="0%" stopColor={isDark ? "#ffffff" : "#737373"} stopOpacity={isDark ? 0.14 : 0.28} />
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
        <path d={line} fill="none" stroke={ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke={axis} strokeOpacity="0.6" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(current[hover])} r="5" fill={isDark ? "#0d0d0f" : "#fff"} stroke={ink} strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className={`pointer-events-none absolute top-1 min-w-[140px] rounded-2xl px-3.5 py-2.5 text-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.18)] ${
            isDark ? "bg-[#0d0d0f] text-white ring-1 ring-white/10" : "bg-white text-neutral-900 ring-1 ring-black/5"
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
  isDark,
  label,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (k: T) => void;
  isDark: boolean;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1 ${
        isDark ? "bg-[#070708]" : "bg-neutral-100"
      }`}
    >
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${ringClass(
              isDark
            )} ${
              active
                ? isDark
                  ? "bg-white text-black"
                  : "bg-neutral-900 text-white"
                : isDark
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-500 hover:text-neutral-900"
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
  isDark,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ${ringClass(
        isDark
      )} ${softClass(isDark)} ${hoverClass(isDark)}`}
    >
      <span
        className={`relative h-5 w-9 rounded-full transition-colors motion-reduce:transition-none ${
          checked ? (isDark ? "bg-white" : "bg-neutral-900") : isDark ? "bg-white/15" : "bg-black/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full transition-all motion-reduce:transition-none ${
            checked ? "left-[18px]" : "left-0.5"
          } ${checked ? (isDark ? "bg-black" : "bg-white") : isDark ? "bg-neutral-400" : "bg-white"}`}
        />
      </span>
      {label}
    </button>
  );
}

function Chip({ value, isDark, children }: { value: number; isDark: boolean; children: ReactNode }) {
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
      ? "bg-white/[0.05] text-neutral-400"
      : "bg-neutral-100 text-neutral-500";
  const Icon = value < 0 ? TrendingDown : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`}>
      {value !== 0 && <Icon className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

function Bar({ value, isDark }: { value: number; isDark: boolean }) {
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-black/[0.06]"}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${isDark ? "bg-white" : "bg-neutral-900"}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function Kpi({
  isDark,
  icon,
  label,
  value,
  chip,
}: {
  isDark: boolean;
  icon: ReactNode;
  label: string;
  value: string;
  chip?: ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-4 rounded-3xl p-4 ${cardClass(isDark)}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBoxClass(isDark)}`}>{icon}</span>
        {chip}
      </div>
      <div className="min-w-0">
        <p className={`truncate text-[12px] ${mutedClass(isDark)}`}>{label}</p>
        <p className={`mt-0.5 text-[24px] font-semibold leading-tight tracking-tight tabular-nums ${strongClass(isDark)}`}>
          {value}
        </p>
      </div>
    </div>
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

function NetworkIcon({ channel, isDark, size = 13 }: { channel?: ConnectedChannel; isDark: boolean; size?: number }) {
  const Icon = NETWORK_ICONS[channelNetwork(channel)];
  if (!Icon) return null;
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-white text-black"
      style={{ width: size + 6, height: size + 6, boxShadow: `0 0 0 2px ${isDark ? "#0d0d0f" : "#fff"}` }}
      aria-hidden="true"
    >
      <Icon className="h-[11px] w-[11px]" size={size} />
    </span>
  );
}

function Avatar({
  channel,
  isDark,
  size = 36,
  showNetwork = true,
}: {
  channel?: ConnectedChannel;
  isDark: boolean;
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
          className={`flex items-center justify-center rounded-full text-[13px] font-semibold ${iconBoxClass(isDark)}`}
        >
          {label.charAt(0).toUpperCase() || "?"}
        </span>
      )}
      {showNetwork && <NetworkIcon channel={channel} isDark={isDark} />}
    </span>
  );
}

function ChannelMenu({
  channels,
  current,
  isDark,
}: {
  channels: ConnectedChannel[];
  current?: ConnectedChannel;
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
        className={`flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-default ${ringClass(
          isDark
        )} ${cardClass(isDark)} ${canSwitch ? hoverClass(isDark) : ""}`}
      >
        <Avatar channel={current} isDark={isDark} />
        <span className="min-w-0 text-left">
          <span className={`block max-w-[140px] truncate text-[13px] font-semibold ${strongClass(isDark)}`}>
            {name(current)}
          </span>
          <span className={`block text-[11px] ${mutedClass(isDark)}`}>
            {canSwitch ? "Switch channel" : "Connected channel"}
          </span>
        </span>
        {canSwitch && (
          <ChevronDown
            className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""} ${softClass(isDark)}`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-30 mt-2 w-64 rounded-2xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.25)] ${cardClass(isDark)}`}
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
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 ${ringClass(
                  isDark
                )} ${hoverClass(isDark)}`}
              >
                <Avatar channel={c} isDark={isDark} size={28} />
                <span className={`min-w-0 flex-1 truncate text-[13px] font-medium ${strongClass(isDark)}`}>{name(c)}</span>
                {active && <Check className={`h-4 w-4 ${strongClass(isDark)}`} aria-hidden="true" />}
              </button>
            );
          })}
          <div className={`my-1 border-t ${hairClass(isDark)}`} />
          <button
            type="button"
            role="menuitem"
            onClick={() => navigate("channels")}
            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ${ringClass(
              isDark
            )} ${hoverClass(isDark)} ${softClass(isDark)}`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${innerClass(isDark)}`}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            Manage channels
          </button>
        </div>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
  isDark,
}: {
  label: string;
  value: string;
  min?: string;
  max: string;
  onChange: (v: string) => void;
  isDark: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 text-[12px] ${mutedClass(isDark)}`}>
      {label}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className={`rounded-full px-3 py-1.5 text-[12px] focus-visible:outline-none focus-visible:ring-2 ${ringClass(
          isDark
        )} ${innerClass(isDark)} ${strongClass(isDark)} ${isDark ? "[color-scheme:dark]" : ""}`}
      />
    </label>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function Insights() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const sidebarOffset = useSidebarOffset();
  const channels = useConnectedChannels();
  const channelKey = useHashChannel();
  const channel = channels.find((c) => c.key === channelKey) ?? channels[0];

  const todayInput = toInput(new Date());
  const [range, setRange] = useState<Range>("30d");
  const [customStart, setCustomStart] = useState(() => toInput(addDays(new Date(), -29)));
  const [customEnd, setCustomEnd] = useState(todayInput);
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

  const period = `${fmtFull(start)} – ${fmtFull(end)}`;
  const compared = `${fmtFull(previous[0].date)} – ${fmtFull(previous[days - 1].date)}`;
  const name = channel ? (channel.handle || channel.name).replace(/^@/, "") : "";

  const series =
    metric === "followers"
      ? { cur: current.map((p) => p.followers), prev: previous.map((p) => p.followers), unit: "Followers" }
      : { cur: current.map((p) => p.posts), prev: previous.map((p) => p.posts), unit: "Posts" };

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
        { label: "Posts", value: nf(summary.posts) },
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

  const outer = isDark ? "bg-[#09090a] text-white" : "bg-[#f5f3ef] text-neutral-900";

  return (
    <main
      className={`min-h-screen w-full transition-[padding-left] duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${outer}`}
      style={{ paddingLeft: sidebarOffset }}
    >
      <DashboardSidebar theme={theme} />

      <div className="flex w-full flex-col gap-5 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold tracking-tight">Insights</h1>
            <p className={`mt-0.5 text-[13px] ${mutedClass(isDark)}`}>{period}</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <ChannelMenu channels={channels} current={channel} isDark={isDark} />
            <button
              type="button"
              onClick={exportCsv}
              disabled={!channel}
              className={`flex items-center gap-2 rounded-full px-4 py-3 text-[13px] font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40 ${ringClass(
                isDark
              )} ${isDark ? "bg-white text-black" : "bg-neutral-900 text-white"}`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </header>

        {!channel ? (
          <section
            className={`flex flex-col items-center gap-3 rounded-3xl px-6 py-20 text-center ${cardClass(isDark)}`}
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBoxClass(isDark)}`}>
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-[17px] font-semibold">Connect a channel to see insights</h2>
            <p className={`max-w-[360px] text-[14px] ${softClass(isDark)}`}>
              Followers, reach and engagement show up here once a social account is connected.
            </p>
            <button
              type="button"
              onClick={() => navigate("channels")}
              className={`mt-2 flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 ${ringClass(
                isDark
              )} ${isDark ? "bg-white text-black" : "bg-neutral-900 text-white"}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Connect a channel
            </button>
          </section>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Segmented label="Date range" value={range} options={RANGES} onChange={setRange} isDark={isDark} />
                {range === "custom" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <DateField
                      label="From"
                      value={toInput(start)}
                      max={toInput(end)}
                      onChange={setCustomStart}
                      isDark={isDark}
                    />
                    <DateField
                      label="To"
                      value={toInput(end)}
                      min={toInput(start)}
                      max={todayInput}
                      onChange={setCustomEnd}
                      isDark={isDark}
                    />
                  </div>
                )}
              </div>
              <Switch checked={compare} onChange={setCompare} label="Compare with previous period" isDark={isDark} />
            </div>

            {/* KPIs */}
            <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Kpi
                isDark={isDark}
                icon={<Users className="h-4 w-4" />}
                label="Followers"
                value={nf(summary.followers)}
                chip={<Chip value={delta} isDark={isDark}>{signed(delta)}</Chip>}
              />
              <Kpi isDark={isDark} icon={<FileText className="h-4 w-4" />} label="Posts" value={nf(summary.posts)} />
              <Kpi isDark={isDark} icon={<Eye className="h-4 w-4" />} label="Reach" value={nf(summary.reach)} />
              <Kpi isDark={isDark} icon={<Heart className="h-4 w-4" />} label="Reactions" value={nf(summary.reactions)} />
              <Kpi
                isDark={isDark}
                icon={<MessageCircle className="h-4 w-4" />}
                label="Comments"
                value={nf(summary.comments)}
              />
              <Kpi isDark={isDark} icon={<Share2 className="h-4 w-4" />} label="Shares" value={nf(summary.shares)} />
            </section>

            {/* Chart + impact */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
              <section className={`rounded-3xl p-5 sm:p-6 ${cardClass(isDark)}`} aria-labelledby="trend-title">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="trend-title" className="text-[16px] font-semibold">
                    Trend
                  </h2>
                  <Segmented label="Metric" value={metric} options={METRICS} onChange={setMetric} isDark={isDark} />
                </div>

                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className={`text-[12px] ${mutedClass(isDark)}`}>
                      {metric === "followers" ? "Followers on " + fmt(end) : "Posts in this period"}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-[40px] font-semibold leading-none tracking-tight tabular-nums">
                        {metric === "followers" ? nf(last.followers) : nf(totalPosts)}
                      </span>
                      {metric === "followers" && <Chip value={delta} isDark={isDark}>{signed(delta)}</Chip>}
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 text-[12px] ${softClass(isDark)}`} aria-hidden="true">
                    <span className="flex items-center gap-2">
                      <span className={`h-0.5 w-5 rounded-full ${isDark ? "bg-white" : "bg-neutral-900"}`} />
                      This period
                    </span>
                    {compare && (
                      <span className="flex items-center gap-2">
                        <span
                          className="h-0 w-5 border-t-2 border-dashed"
                          style={{ borderColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}
                        />
                        Previous
                      </span>
                    )}
                  </div>
                </div>

                <p className={`mt-3 text-[13px] ${softClass(isDark)}`}>
                  {metric === "followers"
                    ? delta === 0
                      ? "Your audience was flat in this period."
                      : delta > 0
                      ? `You gained ${nf(delta)} followers in this period.`
                      : `You lost ${nf(Math.abs(delta))} followers in this period.`
                    : totalPosts === 0
                    ? "You didn't publish any posts in this period."
                    : `You published ${nf(totalPosts)} posts in this period.`}
                  {compare && metric === "followers" && (
                    <span className={mutedClass(isDark)}> Previous period: {signed(prevDelta)}.</span>
                  )}
                </p>

                <div className="mt-5">
                  <Chart
                    dates={dates}
                    current={series.cur}
                    previous={series.prev}
                    compare={compare}
                    isDark={isDark}
                    unit={series.unit}
                  />
                </div>
                {compare && <p className={`mt-3 text-[11px] ${mutedClass(isDark)}`}>Dashed line: {compared}</p>}
              </section>

              <section className={`flex flex-col rounded-3xl p-5 sm:p-6 ${cardClass(isDark)}`} aria-labelledby="impact-title">
                <h2 id="impact-title" className="text-[16px] font-semibold">
                  Content impact
                </h2>
                <div className="mt-4">
                  <Segmented label="Category" value={tab} options={TABS} onChange={setTab} isDark={isDark} />
                </div>

                <div className={`mt-5 rounded-2xl p-4 ${innerClass(isDark)}`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBoxClass(isDark)}`}>
                      {group.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[12px] ${mutedClass(isDark)}`}>{group.title}</p>
                      <p className="text-[22px] font-semibold leading-tight tabular-nums">{group.headline}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Bar value={group.value} isDark={isDark} />
                  </div>
                </div>

                <dl className="mt-2 flex-1">
                  {group.rows.map((r) => (
                    <div
                      key={r.label}
                      className={`flex items-center justify-between border-b py-3.5 last:border-b-0 ${hairClass(isDark)}`}
                    >
                      <dt className={`text-[13px] ${softClass(isDark)}`}>{r.label}</dt>
                      <dd className="text-[14px] font-semibold tabular-nums">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            {/* Performance per post */}
            <section className={`rounded-3xl p-5 sm:p-6 ${cardClass(isDark)}`} aria-labelledby="perf-title">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="perf-title" className="text-[16px] font-semibold">
                  Performance per post
                </h2>
                <p className={`text-[12px] ${mutedClass(isDark)}`}>{period}</p>
              </div>

              <div
                className={`mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center ${
                  isDark ? "border-white/10" : "border-black/10"
                }`}
              >
                <Activity className={`h-6 w-6 ${mutedClass(isDark)}`} aria-hidden="true" />
                <p className="text-[14px] font-medium">No posts in this period</p>
                <p className={`max-w-[360px] text-[13px] ${softClass(isDark)}`}>
                  Choose a longer range to see how your earlier posts performed.
                </p>
                {days < 30 && (
                  <button
                    type="button"
                    onClick={() => setRange("30d")}
                    className={`mt-2 rounded-full border px-4 py-2 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${ringClass(
                      isDark
                    )} ${hairClass(isDark)} ${hoverClass(isDark)}`}
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