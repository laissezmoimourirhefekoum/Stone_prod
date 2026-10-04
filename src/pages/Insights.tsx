// src/pages/Insights.tsx
// Page Insights en noir et blanc (route "analytics").
// Les données sont fournies par `useInsights` : branche-le sur ton backend.
import { useId, useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { useHashRoute } from "../hooks/useHashRoute";
import DashboardSidebar, {
  useSidebarOffset,
} from "../components/DashboardSidebar";
import { useConnectedChannels } from "../hooks/useConnectedChannels";

/* ───────── Types ───────── */

type Range = "7d" | "30d" | "mtd" | "custom";
type View = "this" | "comparison" | "both";
type Tab = "posts" | "impact" | "growth" | "visibility";

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
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "mtd", label: "Month to date", days: new Date().getDate() },
  { key: "custom", label: "Custom", days: 30 },
];

const TABS: { key: Tab; label: string }[] = [
  { key: "posts", label: "Posts" },
  { key: "impact", label: "Content impact" },
  { key: "growth", label: "Audience growth" },
  { key: "visibility", label: "Visibility" },
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

const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtFull = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* ───────── Chart (SVG, sans dépendance) ───────── */

function Chart({
  current,
  previous,
  view,
  isDark,
}: {
  current: Point[];
  previous: Point[];
  view: View;
  isDark: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId();
  const W = 900;
  const H = 300;
  const pad = { l: 12, r: 44, t: 16, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  const all = [...current, ...(view === "this" ? [] : previous)].map((p) => p.followers);
  const min = Math.floor(Math.min(...all) - 2);
  const max = Math.ceil(Math.max(...all) + 2);
  const n = current.length;

  const x = (i: number) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  const path = (pts: Point[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.followers).toFixed(1)}`).join(" ");
  const area = `${path(current)} L${x(n - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;

  const ink = isDark ? "#ffffff" : "#000000";
  const grid = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const axis = isDark ? "#8a8a8a" : "#737373";

  const ticks = Array.from({ length: 5 }, (_, i) => Math.round(min + ((max - min) * i) / 4));
  const labelIdx = Array.from(new Set([0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => Math.round(r * (n - 1)))));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hp = hover !== null ? current[hover] : null;
  const hq = hover !== null ? previous[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Followers over time"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={ink} stopOpacity={isDark ? 0.18 : 0.12} />
            <stop offset="100%" stopColor={ink} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={grid} />
            <text x={W - pad.r + 8} y={y(t) + 4} fontSize="11" fill={axis} className="tabular-nums">
              {t}
            </text>
          </g>
        ))}
        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 6}
            fontSize="11"
            fill={axis}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
          >
            {fmt(current[i].date)}
          </text>
        ))}

        {view !== "this" && (
          <path d={path(previous)} fill="none" stroke={ink} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 4" />
        )}
        {view !== "comparison" && (
          <>
            <path d={area} fill={`url(#${gradId})`} />
            <path d={path(current)} fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {hp && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke={axis} strokeOpacity="0.5" />
            <circle cx={x(hover)} cy={y(hp.followers)} r="4.5" fill={isDark ? "#000" : "#fff"} stroke={ink} strokeWidth="2" />
          </g>
        )}
      </svg>

      {hp && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 min-w-[150px] rounded-xl border border-neutral-500/30 bg-white px-3.5 py-2.5 text-[12px] text-black shadow-lg dark:bg-black dark:text-white"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > n / 2 ? "-110%" : "10%"})`,
          }}
        >
          <div className="mb-1.5 text-neutral-500">{fmtFull(hp.date)}</div>
          <div className="flex justify-between gap-6">
            <span>Followers</span>
            <b className="tabular-nums">{hp.followers}</b>
          </div>
          {view !== "this" && hq && (
            <div className="flex justify-between gap-6 text-neutral-500">
              <span>Previous</span>
              <b className="tabular-nums">{hq.followers}</b>
            </div>
          )}
          <div className="flex justify-between gap-6">
            <span>Posts</span>
            <b className="tabular-nums">{hp.posts}</b>
          </div>
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
  const on = isDark ? "bg-white text-black" : "bg-black text-white";
  const off = isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-black";
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-full border p-1 ${isDark ? "border-white/10" : "border-black/10"}`}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${
            isDark ? "focus-visible:ring-white/40" : "focus-visible:ring-black/30"
          } ${value === o.key ? on : off}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Delta({ value, isDark }: { value: number; isDark: boolean }) {
  const text = value === 0 ? "No change" : `${value > 0 ? "+" : "−"}${Math.abs(value)}`;
  const arrow = value === 0 ? "" : value > 0 ? "↑" : "↓";
  const tone =
    value > 0
      ? isDark
        ? "border-green-400/30 bg-green-400/10 text-green-400"
        : "border-green-700/25 bg-green-700/10 text-green-700"
      : value < 0
      ? isDark
        ? "border-red-400/30 bg-red-400/10 text-red-400"
        : "border-red-700/25 bg-red-700/10 text-red-700"
      : isDark
      ? "border-white/15 text-neutral-400"
      : "border-black/15 text-neutral-500";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium tabular-nums ${tone}`}
    >
      {arrow && <span aria-hidden="true">{arrow}</span>}
      {text}
    </span>
  );
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
  const [tab, setTab] = useState<Tab>("impact");
  const [view, setView] = useState<View>("this");

  const days = RANGES.find((r) => r.key === range)!.days;
  const { current, previous, summary } = useInsights(days);

  const page = isDark ? "bg-black text-white" : "bg-white text-black";
  const card = isDark ? "border-white/10 bg-[#0c0c0c]" : "border-black/10 bg-[#fafafa]";
  const line = isDark ? "border-white/10" : "border-black/10";
  const cell = isDark ? "bg-[#0c0c0c]" : "bg-[#fafafa]";
  const gridBg = isDark ? "bg-white/10" : "bg-black/10";
  const muted = isDark ? "text-neutral-400" : "text-neutral-500";
  const ghost = isDark ? "border-white/15 hover:bg-white/10" : "border-black/15 hover:bg-black/5";
  const ring = isDark ? "focus-visible:ring-white/40" : "focus-visible:ring-black/30";

  const name = channel ? (channel.handle || channel.name).replace(/^@/, "") : "No channel";
  const start = current[0].date;
  const end = current[current.length - 1].date;
  const pStart = previous[0].date;
  const pEnd = previous[previous.length - 1].date;
  const period = `${fmt(start)} - ${fmtFull(end)}`;
  const compared = `${fmt(pStart)} - ${fmtFull(pEnd)}`;

  const stats: { label: string; value: string }[] = [
    { label: "Posts", value: String(summary.posts) },
    { label: "Reactions", value: String(summary.reactions) },
    { label: "Comments", value: String(summary.comments) },
    { label: "Eng. rate", value: `${summary.engRate}%` },
    { label: "Video views", value: String(summary.videoViews) },
    { label: "Shares", value: String(summary.shares) },
    { label: "Reach", value: String(summary.reach) },
    { label: "Watch time (min)", value: String(summary.watchMin) },
    { label: "Avg. watch time (sec)", value: String(summary.avgWatchSec) },
  ];

  const last = current[current.length - 1];
  const first = current[0];
  const delta = last.followers - first.followers;

  return (
    <main
      className={`min-h-screen py-8 pr-4 transition-[padding-left] duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none sm:pr-8 ${page}`}
      style={{ paddingLeft: sidebarOffset }}
    >
      <DashboardSidebar />
      <div className="mx-auto flex max-w-[1100px] flex-col gap-10">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {channel?.avatarUrl ? (
              <img
                src={channel.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold ${
                  isDark ? "bg-white text-black" : "bg-black text-white"
                }`}
              >
                {name.charAt(0).toUpperCase() || "?"}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-[28px] font-semibold leading-tight tracking-tight">{name}</h1>
              <p className={`text-[14px] ${muted}`}>Insights · {period}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 print:hidden ${ghost} ${ring}`}
          >
            Export
          </button>
        </header>

        {/* Range + Summary */}
        <section className="flex flex-col gap-5" aria-labelledby="summary-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="summary-title" className="text-[22px] font-semibold tracking-tight">
              Summary
            </h2>
            <Segmented label="Date range" value={range} options={RANGES} onChange={setRange} isDark={isDark} />
          </div>

          <div className={`overflow-hidden rounded-3xl border ${line}`}>
            {/* Chiffre principal */}
            <div className={`flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8 ${cell}`}>
              <div>
                <div className={`text-[14px] ${muted}`}>Total followers</div>
                <div className="mt-2 text-[56px] font-semibold leading-none tabular-nums tracking-tight">
                  {summary.followers}
                </div>
              </div>
              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <Delta value={delta} isDark={isDark} />
                <span className={`text-[12px] ${muted}`}>vs. {compared}</span>
              </div>
            </div>

            {/* Autres indicateurs */}
            <div className={`grid grid-cols-2 gap-px border-t md:grid-cols-3 ${line} ${gridBg}`}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  className={`p-5 last:col-span-2 md:last:col-span-1 ${isDark ? "bg-black" : "bg-white"}`}
                >
                  <div className={`text-[13px] ${muted}`}>{s.label}</div>
                  <div className="mt-2 text-[26px] font-semibold tabular-nums tracking-tight">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Performance per post */}
        <section className="flex flex-col gap-4" aria-labelledby="perf-title">
          <div>
            <h2 id="perf-title" className="text-[22px] font-semibold tracking-tight">
              Performance per post
            </h2>
            <p className={`mt-1 text-[13px] ${muted}`}>{period}</p>
          </div>
          <div
            className={`flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-14 text-center ${
              isDark ? "border-white/20" : "border-black/20"
            }`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={muted}
              aria-hidden="true"
            >
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
            <p className="text-[15px] font-medium">No posts in the last {days} days</p>
            <p className={`max-w-[360px] text-[14px] ${muted}`}>
              Pick another date range to see how your earlier posts performed.
            </p>
          </div>
        </section>

        {/* Metrics */}
        <section className={`rounded-3xl border p-6 sm:p-8 ${card}`} aria-labelledby="metrics-title">
          <h2 id="metrics-title" className="text-[22px] font-semibold tracking-tight">
            Metrics
          </h2>
          <p className={`mt-1 text-[13px] ${muted}`}>
            {period}, compared to {compared}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Segmented label="Metric category" value={tab} options={TABS} onChange={setTab} isDark={isDark} />
            <Segmented label="Comparison view" value={view} options={VIEWS} onChange={setView} isDark={isDark} />
          </div>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div className="flex gap-10">
              <div>
                <div className={`text-[13px] ${muted}`}>Followers</div>
                <div className="text-[34px] font-semibold leading-tight tabular-nums">{summary.followers}</div>
              </div>
              <div>
                <div className={`text-[13px] ${muted}`}>Posts</div>
                <div className="text-[34px] font-semibold leading-tight tabular-nums">{summary.posts}</div>
              </div>
            </div>

            {/* Légende */}
            <div className={`flex items-center gap-5 text-[12px] ${muted}`} aria-hidden="true">
              {view !== "comparison" && (
                <span className="flex items-center gap-2">
                  <span className={`h-0.5 w-5 rounded-full ${isDark ? "bg-white" : "bg-black"}`} />
                  This period
                </span>
              )}
              {view !== "this" && (
                <span className="flex items-center gap-2">
                  <span
                    className="h-0 w-5 border-t-2 border-dashed"
                    style={{ borderColor: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}
                  />
                  Previous period
                </span>
              )}
            </div>
          </div>

          <p className={`mt-3 text-[14px] ${muted}`}>
            {delta === 0
              ? "Your audience was flat this period."
              : delta > 0
              ? `You gained ${delta} followers this period.`
              : `You lost ${Math.abs(delta)} followers this period.`}
          </p>

          <div className="mt-6">
            <Chart current={current} previous={previous} view={view} isDark={isDark} />
          </div>
        </section>
      </div>
    </main>
  );
}