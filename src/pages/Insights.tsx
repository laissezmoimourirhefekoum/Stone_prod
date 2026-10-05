// src/pages/Insights.tsx
// Page Insights, style dashboard doux (cartes blanches arrondies, courbes lissées,
// pastilles de stats avec icône sombre). Route "analytics".
// Les données sont fournies par `useInsights` : branche-le sur ton backend.
import { useId, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "../hooks/useTheme";
import { useHashRoute } from "../hooks/useHashRoute";
import DashboardSidebar, {
  useSidebarOffset,
} from "../components/DashboardSidebar";
import { useConnectedChannels } from "../hooks/useConnectedChannels";

/* ───────── Types ───────── */

type Range = "7d" | "30d" | "mtd" | "custom";
type View = "this" | "comparison" | "both";
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

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "mtd", label: "Month to date", days: new Date().getDate() },
  { key: "custom", label: "Custom", days: 30 },
];

const TABS: { key: Tab; label: string }[] = [
  { key: "engagement", label: "Engagement" },
  { key: "video", label: "Video" },
  { key: "reach", label: "Reach" },
];

const VIEWS: { key: View; label: string }[] = [
  { key: "this", label: "This period" },
  { key: "comparison", label: "Comparison" },
  { key: "both", label: "Both" },
];

/* ───────── Données (à remplacer par ton API) ───────── */

function useInsights(days: number): { current: Point[]; previous: Point[]; summary: Summary } {
  return useMemo(() => {
    const build = (offset: number, base: number): Point[] =>
      Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i) - offset);
        return {
          date: d,
          posts: 0,
          followers: Math.round(base + Math.sin(i / 3) * 2 + (i % 5 === 0 ? 1 : 0)),
        };
      });
    const current = build(0, 108);
    return {
      current,
      previous: build(days, 105),
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
  }, [days]);
}

/* ───────── Helpers ───────── */

/** Canal demandé via /#/insights?channel=<key> (re-rendu à chaque navigation). */
function useHashChannel(): string | null {
  useHashRoute();
  const hash = window.location.hash;
  const i = hash.indexOf("?");
  return i === -1 ? null : new URLSearchParams(hash.slice(i + 1)).get("channel");
}

const fmt = (d: Date) => d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
const fmtFull = (d: Date) =>
  d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

/** Courbe lissée (spline cubique monotone) à partir de points [x, y]. */
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
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
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

/* ───────── Icônes ───────── */

type IconProps = { className?: string };
const Svg = ({ className, children }: IconProps & { children: ReactNode }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);
const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.4c1.8.8 3 2.6 3 5.6" />
  </Svg>
);
const IconPost = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 9h8M8 13h8M8 17h4" />
  </Svg>
);
const IconHeart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </Svg>
);
const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4A8 8 0 1 1 20 12Z" />
    <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
  </Svg>
);
const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m10.5 8.8 4.2 3.2-4.2 3.2Z" />
  </Svg>
);
const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
);
const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />
  </Svg>
);
const IconChevron = (p: IconProps) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/* ───────── Chart (SVG, sans dépendance) ───────── */

function Chart({
  dates,
  current,
  previous,
  view,
  isDark,
  label,
  unit,
}: {
  dates: Date[];
  current: number[];
  previous?: number[];
  view: View;
  isDark: boolean;
  label: string;
  unit: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId();
  const W = 560;
  const H = 210;
  const pad = { l: 26, r: 8, t: 14, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const showPrev = !!previous && view !== "this";
  const showCur = view !== "comparison" || !previous;

  const all = [...current, ...(showPrev ? previous! : [])];
  let min = Math.floor(Math.min(...all));
  let max = Math.ceil(Math.max(...all));
  if (max - min < 4) {
    max = min + 4;
  } else {
    min -= 1;
    max += 1;
  }
  const n = current.length;

  const x = (i: number) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  const toPts = (vals: number[]): [number, number][] => vals.map((v, i) => [x(i), y(v)]);
  const line = smoothPath(toPts(current));
  const area = `${line} L${x(n - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;

  const ink = isDark ? "#ffffff" : "#14141f";
  const grid = isDark ? "rgba(255,255,255,0.07)" : "rgba(20,20,31,0.06)";
  const axis = isDark ? "#8b8b95" : "#9a9aa6";

  const ticks = Array.from(new Set(Array.from({ length: 7 }, (_, i) => Math.round(min + ((max - min) * i) / 6))));
  const labelIdx = Array.from(new Set([0, 0.17, 0.33, 0.5, 0.67, 0.83, 1].map((r) => Math.round(r * (n - 1)))));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={isDark ? "#ffffff" : "#8a8f9c"} stopOpacity={isDark ? 0.16 : 0.32} />
            <stop offset="100%" stopColor={isDark ? "#ffffff" : "#8a8f9c"} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={grid} />
            <text x={pad.l - 8} y={y(t) + 3} fontSize="8" fill={axis} textAnchor="end" className="tabular-nums">
              {t}
            </text>
          </g>
        ))}
        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            fontSize="8"
            fill={axis}
            fontWeight="500"
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
          >
            {fmt(dates[i])}
          </text>
        ))}

        {showPrev && (
          <path
            d={smoothPath(toPts(previous!))}
            fill="none"
            stroke={ink}
            strokeOpacity="0.35"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
        )}
        {showCur && (
          <>
            <path d={area} fill={`url(#${gradId})`} />
            <path d={line} fill="none" stroke={ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke={axis} strokeOpacity="0.5" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(current[hover])} r="5" fill={isDark ? "#111" : "#fff"} stroke={ink} strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className={`pointer-events-none absolute top-0 min-w-[130px] rounded-2xl px-3.5 py-2.5 text-[12px] shadow-[0_8px_30px_rgba(20,20,31,0.12)] ${
            isDark ? "bg-[#26262b] text-white" : "bg-white text-[#14141f]"
          }`}
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > n / 2 ? "-110%" : "10%"})`,
          }}
        >
          <div className="mb-1 text-[11px] opacity-50">{fmtFull(dates[hover])}</div>
          <div className="flex justify-between gap-5">
            <span>{unit}</span>
            <b className="tabular-nums">{current[hover]}</b>
          </div>
          {showPrev && (
            <div className="flex justify-between gap-5 opacity-50">
              <span>Previous</span>
              <b className="tabular-nums">{previous![hover]}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── Petits composants ───────── */

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
  const track = isDark ? "bg-white/[0.06]" : "bg-[#eef1f7]";
  const on = isDark ? "bg-white text-black" : "bg-[#14141f] text-white";
  const off = isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-[#14141f]";
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1 ${track}`}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${
            isDark ? "focus-visible:ring-white/40" : "focus-visible:ring-[#14141f]/30"
          } ${value === o.key ? on : off}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Menu déroulant en pastille (« Last 7 days ⌄ »). */
function RangeSelect({
  value,
  onChange,
  isDark,
}: {
  value: Range;
  onChange: (r: Range) => void;
  isDark: boolean;
}) {
  return (
    <label
      className={`relative inline-flex items-center rounded-full border text-[12px] ${
        isDark ? "border-white/10 text-neutral-300" : "border-[#e6e9f1] text-neutral-500"
      }`}
    >
      <span className="sr-only">Date range</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Range)}
        className="cursor-pointer appearance-none rounded-full bg-transparent py-2 pl-4 pr-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
      >
        {RANGES.map((r) => (
          <option key={r.key} value={r.key} className="text-black">
            {r.label}
          </option>
        ))}
      </select>
      <IconChevron className="pointer-events-none absolute right-3.5 text-current" />
    </label>
  );
}

function Delta({ value, isDark }: { value: number; isDark: boolean }) {
  const text = value === 0 ? "0" : `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
  const tone =
    value > 0
      ? isDark
        ? "text-green-400"
        : "text-green-600"
      : value < 0
      ? isDark
        ? "text-red-400"
        : "text-red-600"
      : isDark
      ? "text-neutral-400"
      : "text-neutral-400";
  return <span className={`text-[11px] font-medium tabular-nums ${tone}`}>{text}</span>;
}

/* ───────── Page ───────── */

export default function Insights() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const sidebarOffset = useSidebarOffset();
  const channels = useConnectedChannels();
  const channelKey = useHashChannel();
  const channel = channels.find((c) => c.key === channelKey) ?? channels[0];

  const [range, setRange] = useState<Range>("30d");
  const [tab, setTab] = useState<Tab>("engagement");
  const [view, setView] = useState<View>("this");

  const days = RANGES.find((r) => r.key === range)!.days;
  const { current, previous, summary } = useInsights(days);

  // Palette
  const outer = isDark ? "bg-[#050506] text-white" : "bg-[#dfe3ec] text-[#14141f]";
  const panel = isDark ? "bg-[#101012]" : "bg-[#f1f4fa]";
  const card = isDark ? "bg-[#18181b]" : "bg-white";
  const pill = isDark ? "bg-white/[0.05]" : "bg-[#eef1f8]";
  const muted = isDark ? "text-neutral-400" : "text-neutral-400";
  const soft = isDark ? "text-neutral-300" : "text-neutral-500";
  const hair = isDark ? "border-white/10" : "border-[#eceff5]";
  const iconBox = isDark ? "bg-white text-black" : "bg-[#14141f] text-white";
  const ring = isDark ? "focus-visible:ring-white/40" : "focus-visible:ring-[#14141f]/30";

  const name = channel ? (channel.handle || channel.name).replace(/^@/, "") : "No channel";
  const handle = channel?.handle ? `@${channel.handle.replace(/^@/, "")}` : channel?.name ?? "";
  const start = current[0].date;
  const end = current[current.length - 1].date;
  const pStart = previous[0].date;
  const pEnd = previous[previous.length - 1].date;
  const period = `${fmtFull(start)} - ${fmtFull(end)}`;
  const compared = `${fmtFull(pStart)} - ${fmtFull(pEnd)}`;

  const first = current[0];
  const last = current[current.length - 1];
  const delta = last.followers - first.followers;

  const dates = current.map((p) => p.date);
  const followersSeries = current.map((p) => p.followers);
  const prevFollowersSeries = previous.map((p) => p.followers);
  const postsSeries = current.map((p) => p.posts);
  const totalPosts = postsSeries.reduce((a, b) => a + b, 0);

  // Blocs de la carte de droite (équivalent des « Running Tasks »)
  const groups: {
    key: Tab;
    title: string;
    icon: ReactNode;
    progressLabel: string;
    progress: number;
    cols: { label: string; value: string }[];
  }[] = [
    {
      key: "engagement",
      title: "Engagement",
      icon: <IconHeart />,
      progressLabel: "Eng. rate",
      progress: Math.min(100, Math.round(summary.engRate)),
      cols: [
        { label: "Reactions", value: String(summary.reactions) },
        { label: "Comments", value: String(summary.comments) },
        { label: "Shares", value: String(summary.shares) },
        { label: "Posts", value: String(summary.posts) },
        { label: "Eng. rate", value: `${summary.engRate}%` },
      ],
    },
    {
      key: "video",
      title: "Video",
      icon: <IconPlay />,
      progressLabel: "Views / reach",
      progress: pct(summary.videoViews, summary.reach),
      cols: [
        { label: "Video views", value: String(summary.videoViews) },
        { label: "Watch time (min)", value: String(summary.watchMin) },
        { label: "Avg. watch (sec)", value: String(summary.avgWatchSec) },
        { label: "Shares", value: String(summary.shares) },
        { label: "Comments", value: String(summary.comments) },
      ],
    },
    {
      key: "reach",
      title: "Reach",
      icon: <IconEye />,
      progressLabel: "Reach / followers",
      progress: pct(summary.reach, summary.followers),
      cols: [
        { label: "Reach", value: String(summary.reach) },
        { label: "Followers", value: String(summary.followers) },
        { label: "Reactions", value: String(summary.reactions) },
        { label: "Video views", value: String(summary.videoViews) },
        { label: "Posts", value: String(summary.posts) },
      ],
    },
  ];
  const visibleGroups = groups.filter((g) => g.key === tab);
  const otherGroups = groups.filter((g) => g.key !== tab);

  const stats: { label: string; value: string; icon: ReactNode; extra?: ReactNode }[] = [
    {
      label: "Followers",
      value: String(summary.followers),
      icon: <IconUsers />,
      extra: <Delta value={delta} isDark={isDark} />,
    },
    { label: "Posts", value: String(summary.posts), icon: <IconPost /> },
    { label: "Reactions", value: String(summary.reactions), icon: <IconHeart /> },
  ];

  const renderGroup = (g: (typeof groups)[number], isLast: boolean) => (
    <div key={g.key} className={`py-5 ${isLast ? "" : `border-b ${hair}`}`}>
      <div className="flex items-center gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBox}`}>{g.icon}</span>
        <span className="text-[14px] font-medium">{g.title}</span>
        <span className={`ml-auto text-[11px] ${muted}`}>{g.progressLabel}</span>
        <span className="text-[11px] font-semibold tabular-nums">{g.progress}%</span>
      </div>
      <div className={`mt-3 h-[3px] w-full rounded-full ${isDark ? "bg-white/10" : "bg-[#eceff5]"}`}>
        <div
          className={`h-full rounded-full ${isDark ? "bg-white" : "bg-[#14141f]"}`}
          style={{ width: `${g.progress}%` }}
        />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5">
        {g.cols.map((c) => (
          <div key={c.label}>
            <dt className={`text-[10px] ${muted}`}>{c.label}</dt>
            <dd className="mt-1 text-[14px] font-medium tabular-nums">{c.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <main
      className={`min-h-screen py-6 pr-4 transition-[padding-left] duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none sm:pr-8 ${outer}`}
      style={{ paddingLeft: sidebarOffset }}
    >
      <DashboardSidebar />
      <div className={`mx-auto max-w-[1100px] rounded-[36px] p-4 sm:p-6 ${panel}`}>
        {/* Barre du haut */}
        <header className="flex items-center justify-between gap-4 px-2 pb-5 pt-2">
          <h1 className="truncate text-[22px] font-bold tracking-tight">Insights</h1>
          <p className={`hidden text-[12px] sm:block ${soft}`}>{period}</p>
        </header>

        {/* Profil + stats */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
          <div className={`flex items-center gap-4 rounded-[28px] p-4 ${card}`}>
            {channel?.avatarUrl ? (
              <img
                src={channel.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-14 shrink-0 rounded-full object-cover shadow-md"
              />
            ) : (
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold ${iconBox}`}>
                {name.charAt(0).toUpperCase() || "?"}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{name}</div>
              <div className={`truncate text-[12px] ${muted}`}>{handle}</div>
            </div>
            <IconChevron className={soft} />
          </div>

          <div className={`flex flex-col gap-3 rounded-[28px] p-3 sm:flex-row sm:items-center ${card}`}>
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className={`flex items-center gap-3 rounded-2xl p-3 ${pill}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBox}`}>
                    {s.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[10px] ${muted}`}>{s.label}</div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[20px] font-bold tabular-nums leading-tight">{s.value}</span>
                      {s.extra}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className={`flex shrink-0 items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[12px] font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 print:hidden ${
                isDark ? "bg-white text-black" : "bg-[#14141f] text-white"
              } ${ring}`}
            >
              <IconDownload className="h-4 w-4" />
              Export report
            </button>
          </div>
        </section>

        {/* Graphiques + liste */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.05fr]">
          {/* Colonne gauche */}
          <div className="flex flex-col gap-4">
            <section className={`rounded-[28px] p-5 ${card}`} aria-labelledby="followers-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="followers-title" className="text-[16px] font-semibold">
                    Followers
                  </h2>
                  <p className={`mt-1 text-[18px] tabular-nums ${muted}`}>
                    {delta === 0 ? "No change" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} followers`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <RangeSelect value={range} onChange={setRange} isDark={isDark} />
                  <span className={`text-[10px] ${muted}`}>{period}</span>
                </div>
              </div>

              <div className="mt-3">
                <Segmented label="Comparison view" value={view} options={VIEWS} onChange={setView} isDark={isDark} />
              </div>

              <div className="mt-4">
                <Chart
                  dates={dates}
                  current={followersSeries}
                  previous={prevFollowersSeries}
                  view={view}
                  isDark={isDark}
                  label="Followers over time"
                  unit="Followers"
                />
              </div>
              {view !== "this" && (
                <p className={`mt-2 text-[11px] ${muted}`}>Dashed line: {compared}</p>
              )}
            </section>

            <section className={`rounded-[28px] p-5 ${card}`} aria-labelledby="posts-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="posts-title" className="text-[16px] font-semibold">
                    Posts
                  </h2>
                  <p className={`mt-1 text-[18px] tabular-nums ${muted}`}>
                    {totalPosts} {totalPosts === 1 ? "post" : "posts"}
                  </p>
                </div>
                <span className={`text-[10px] ${muted}`}>{period}</span>
              </div>
              <div className="mt-4">
                <Chart
                  dates={dates}
                  current={postsSeries}
                  view="this"
                  isDark={isDark}
                  label="Posts over time"
                  unit="Posts"
                />
              </div>
            </section>
          </div>

          {/* Colonne droite */}
          <section className={`rounded-[28px] p-5 ${card}`} aria-labelledby="impact-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="impact-title" className="text-[16px] font-semibold">
                Content impact
              </h2>
              <Segmented label="Metric category" value={tab} options={TABS} onChange={setTab} isDark={isDark} />
            </div>
            <p className={`mt-1 text-[11px] ${muted}`}>
              {period}, compared to {compared}
            </p>

            <div className="mt-2">
              {visibleGroups.map((g) => renderGroup(g, false))}
              {otherGroups.map((g, i) => renderGroup(g, i === otherGroups.length - 1))}
            </div>

            <div className={`mt-4 border-t pt-5 ${hair}`}>
              <h3 className="text-[14px] font-semibold">Performance per post</h3>
              <div
                className={`mt-3 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center ${
                  isDark ? "border-white/15" : "border-[#dfe3ec]"
                }`}
              >
                <IconPost className={muted} />
                <p className="text-[13px] font-medium">No posts in the last {days} days</p>
                <p className={`max-w-[320px] text-[12px] ${muted}`}>
                  Pick another date range to see how your earlier posts performed.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}