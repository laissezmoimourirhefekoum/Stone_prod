// src/pages/Insights.tsx
// Page Insights en noir et blanc (route "analytics").
// Les données sont fournies par `useInsights` : branche-le sur ton backend.
import { useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { navigate, useHashRoute } from "../hooks/useHashRoute";
import DashboardSidebar from "../components/DashboardSidebar";
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
  const W = 900;
  const H = 280;
  const pad = { l: 36, r: 44, t: 16, b: 28 };
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

  const ink = isDark ? "#ffffff" : "#000000";
  const grid = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const axis = isDark ? "#8a8a8a" : "#737373";

  const ticks = Array.from({ length: 5 }, (_, i) => Math.round(min + ((max - min) * i) / 4));
  const labelIdx = [0, 0.2, 0.4, 0.6, 0.8, 1].map((r) => Math.round(r * (n - 1)));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hp = hover !== null ? current[hover] : null;

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
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={grid} />
            <text x={W - pad.r + 8} y={y(t) + 4} fontSize="11" fill={axis}>
              {t}
            </text>
          </g>
        ))}
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 6} fontSize="11" fill={axis} textAnchor="middle">
            {fmt(current[i].date)}
          </text>
        ))}

        {view !== "this" && (
          <path d={path(previous)} fill="none" stroke={ink} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 4" />
        )}
        {view !== "comparison" && (
          <path d={path(current)} fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
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
          className="pointer-events-none absolute top-2 rounded-lg border border-neutral-500/30 bg-white px-3 py-2 text-[12px] text-black shadow-lg dark:bg-black dark:text-white"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > n / 2 ? "-110%" : "10%"})`,
          }}
        >
          <div className="mb-1 text-neutral-500">{fmtFull(hp.date)}</div>
          <div className="flex justify-between gap-6">
            <span>Posts</span>
            <b>{hp.posts}</b>
          </div>
          <div className="flex justify-between gap-6">
            <span>Followers</span>
            <b>{hp.followers}</b>
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
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (k: T) => void;
  isDark: boolean;
}) {
  const on = isDark ? "bg-white text-black" : "bg-black text-white";
  const off = isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-black";
  return (
    <div
      role="tablist"
      className={`inline-flex gap-1 rounded-xl border p-1 ${isDark ? "border-white/10" : "border-black/10"}`}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${
            isDark ? "focus-visible:ring-white/40" : "focus-visible:ring-black/30"
          } ${value === o.key ? on : off}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ───────── Page ───────── */

export default function Insights() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
  const tile = isDark ? "border-white/10 bg-black" : "border-black/10 bg-white";
  const muted = isDark ? "text-neutral-400" : "text-neutral-500";
  const solid = isDark ? "bg-white text-black hover:bg-neutral-200" : "bg-black text-white hover:bg-neutral-800";
  const ghost = isDark ? "border-white/15 hover:bg-white/10" : "border-black/15 hover:bg-black/5";

  const label = channel ? channel.handle || channel.name : "No channel";
  const start = current[0].date;
  const end = current[current.length - 1].date;
  const pStart = previous[0].date;
  const pEnd = previous[previous.length - 1].date;
  const period = `${fmt(start)} - ${fmtFull(end)}`;
  const compared = `${fmt(pStart)} - ${fmtFull(pEnd)}`;

  const stats: { label: string; value: string }[] = [
    { label: "Total followers", value: String(summary.followers) },
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
    <main className={`min-h-screen py-8 pl-[104px] pr-8 ${page}`}>
      <DashboardSidebar />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {channel?.avatarUrl ? (
              <img
                src={channel.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <span className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>
                {label.replace(/^@/, "").charAt(0).toUpperCase() || "?"}
              </span>
            )}
            <h1 className="text-[26px] font-semibold tracking-tight">{label.replace(/^@/, "")}</h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className={`rounded-xl border px-4 py-2 text-[13px] font-medium transition-colors ${ghost}`}
          >
            Export
          </button>
        </header>

        {/* Banner */}
        <section className={`flex items-center justify-between gap-6 rounded-3xl border p-8 ${card}`}>
          <div className="max-w-[460px]">
            <h2 className="text-[22px] font-semibold tracking-tight">Grow with weekly takeaways</h2>
            <p className={`mt-2 text-[15px] leading-relaxed ${muted}`}>
              The more you post, the better your takeaways. Share a few posts and weekly insights will appear here.
            </p>
            <button
              type="button"
              onClick={() => navigate("create")}
              className={`mt-5 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors ${solid}`}
            >
              Create post
            </button>
          </div>
          <div className="hidden gap-3 lg:flex" aria-hidden="true">
            {["Use your drafts", "Repost a popular post", "Reuse evergreen ideas"].map((t, i) => (
              <div
                key={t}
                className={`w-40 rounded-2xl border p-4 text-[12px] font-medium ${tile}`}
                style={{ transform: `rotate(${(i - 1) * 4}deg) translateY(${i === 1 ? -6 : 6}px)` }}
              >
                {t}
                <div className={`mt-3 h-1.5 w-full rounded-full ${isDark ? "bg-white/15" : "bg-black/10"}`} />
                <div className={`mt-1.5 h-1.5 w-2/3 rounded-full ${isDark ? "bg-white/15" : "bg-black/10"}`} />
              </div>
            ))}
          </div>
        </section>

        {/* Range */}
        <section className="flex flex-col gap-4">
          <h2 className="text-[22px] font-semibold tracking-tight">All insights</h2>
          <Segmented value={range} options={RANGES} onChange={setRange} isDark={isDark} />
        </section>

        {/* Summary */}
        <section className={`rounded-3xl border p-6 ${card}`}>
          <h3 className="text-[17px] font-semibold">Summary</h3>
          <p className={`mt-1 text-[13px] ${muted}`}>
            {period}, compared to {compared}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-2xl border p-4 ${tile}`}>
                <div className={`text-[13px] ${muted}`}>{s.label}</div>
                <div className="mt-3 text-[28px] font-semibold tabular-nums tracking-tight">{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Performance per post */}
        <section className={`rounded-3xl border p-6 ${card}`}>
          <h3 className="text-[17px] font-semibold">Performance per post</h3>
          <p className={`mt-1 text-[13px] ${muted}`}>{period}</p>
          <div className={`mt-5 flex flex-col items-center gap-3 rounded-2xl border px-6 py-14 text-center ${tile}`}>
            <p className={`text-[15px] ${muted}`}>
              No posts in the last {days} days. Pick another date range or publish a post.
            </p>
            <button
              type="button"
              onClick={() => navigate("create")}
              className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${solid}`}
            >
              Create post
            </button>
          </div>
        </section>

        {/* Metrics */}
        <section className={`rounded-3xl border p-6 ${card}`}>
          <h3 className="text-[17px] font-semibold">Metrics</h3>
          <p className={`mt-1 text-[13px] ${muted}`}>
            {period}, compared to {compared}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Segmented value={tab} options={TABS} onChange={setTab} isDark={isDark} />
            <Segmented
              value={view}
              options={[
                { key: "this", label: "This period" },
                { key: "comparison", label: "Comparison" },
                { key: "both", label: "Both" },
              ]}
              onChange={setView}
              isDark={isDark}
            />
          </div>

          <div className={`mt-4 rounded-xl border px-4 py-3 text-[14px] ${tile}`}>
            {delta === 0
              ? "Your audience was flat this period."
              : delta > 0
              ? `You gained ${delta} followers this period.`
              : `You lost ${Math.abs(delta)} followers this period.`}
          </div>

          <div className="mt-6 flex gap-10">
            <div>
              <div className={`text-[13px] ${muted}`}>Posts</div>
              <div className="text-[30px] font-semibold tabular-nums">{summary.posts}</div>
            </div>
            <div>
              <div className={`text-[13px] ${muted}`}>Followers</div>
              <div className="text-[30px] font-semibold tabular-nums">{summary.followers}</div>
            </div>
          </div>

          <div className="mt-4">
            <Chart current={current} previous={previous} view={view} isDark={isDark} />
          </div>
        </section>
      </div>
    </main>
  );
}