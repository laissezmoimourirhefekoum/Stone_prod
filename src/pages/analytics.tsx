import { useMemo, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import DashboardSidebar from "../components/DashboardSidebar";

/* ---------------------------------------------------------------- */
/* Icons — same hand-drawn, single-stroke language as the rest of   */
/* the app (currentColor, ~1.6-1.8 stroke, round caps).             */
/* ---------------------------------------------------------------- */

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="currentColor" stroke="none">
      <circle cx="12" cy="6" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="18" r="1.6" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* Data                                                              */
/* ---------------------------------------------------------------- */

const DAILY_CALLS = [6, 6.4, 5.6, 6.8, 7.8, 6.9, 5.9, 5.2, 4.6, 3.6, 4.2, 5, 5.8,
  6.6, 7.5, 8, 7.2, 6.2, 5.4, 4.6, 3.1, 4.2, 5.6, 6.5, 7.1, 7.8, 8.6, 9.3, 8.1, 7.6];

const X_LABELS = ["Jan 6", "Jan 8", "Jan 10", "Jan 12", "Jan 14", "Jan 16", "Jan 18", "Jan 20", "Jan 22", "Jan 24", "Jan 26", "Jan 28", "Jan 30"];

const HIGHLIGHT_INDEX = 12; // "Jan 18"

const CALL_OUTCOMES = [
  { label: "Answer business questions", value: 60 },
  { label: "Greeting hangup", value: 30 },
  { label: "End call", value: 10 },
];

const CALL_TOPICS = [
  { label: "No response from caller", value: 35 },
  { label: "Business inquiry", value: 25 },
  { label: "Business inquiry attempt", value: 17 },
  { label: "Inbound call with no user input", value: 20 },
  { label: "No audio from caller", value: 12 },
];

const END_CALL_REASONS = [
  { label: "Silence-timeout", value: 80 },
  { label: "Customer-ended-call", value: 20 },
];

const TABS = ["Overview", "Weekly Trends", "Daily Performance"];
const RANGES = ["Today", "This week", "This month", "Last 30 Days"];

/* ---------------------------------------------------------------- */
/* Small shared pieces                                              */
/* ---------------------------------------------------------------- */

function Dropdown({
  value,
  options,
  onChange,
  isDark,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
          isDark
            ? "border-white/10 bg-[#1c1c1e] text-neutral-200 hover:bg-[#242427]"
            : "border-black/[0.06] bg-white text-neutral-700 hover:bg-neutral-50",
        ].join(" ")}
      >
        {value}
        <ChevronDownIcon />
      </button>
      {open && (
        <div
          className={[
            "absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-[12px] border shadow-lg",
            isDark ? "border-white/10 bg-[#1c1c1e]" : "border-black/[0.06] bg-white",
          ].join(" ")}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={[
                "block w-full px-4 py-2.5 text-left text-[12.5px] transition",
                opt === value
                  ? isDark
                    ? "text-white"
                    : "text-neutral-900"
                  : isDark
                    ? "text-neutral-400 hover:bg-white/5"
                    : "text-neutral-500 hover:bg-black/[0.03]",
              ].join(" ")}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
  isDark,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-0.5 rounded-full border p-0.5",
        isDark ? "border-white/10 bg-[#151517]" : "border-black/[0.06] bg-white",
      ].join(" ")}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition",
            opt === value
              ? isDark
                ? "bg-white text-neutral-900"
                : "bg-neutral-900 text-white"
              : isDark
                ? "text-neutral-400 hover:text-neutral-200"
                : "text-neutral-500 hover:text-neutral-800",
          ].join(" ")}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function CardShell({
  isDark,
  className = "",
  children,
}: {
  isDark: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-[clamp(16px,1.6vw,22px)] border p-[clamp(16px,1.6vw,22px)]",
        isDark
          ? "border-white/10 bg-[#151517]"
          : "border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Performance chart — hand-built SVG area chart                    */
/* ---------------------------------------------------------------- */

function PerformanceChart({ isDark }: { isDark: boolean }) {
  const [hover, setHover] = useState<number | null>(HIGHLIGHT_INDEX);

  const W = 900;
  const H = 220;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 8;

  const max = Math.max(...DAILY_CALLS);
  const min = 0;

  const points = useMemo(
    () =>
      DAILY_CALLS.map((v, i) => {
        const x = (i / (DAILY_CALLS.length - 1)) * W;
        const y = PAD_TOP + (1 - (v - min) / (max - min)) * (H - PAD_TOP - PAD_BOTTOM);
        return [x, y] as const;
      }),
    [max]
  );

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

  const activeIndex = hover ?? HIGHLIGHT_INDEX;
  const [ax, ay] = points[activeIndex];
  const activeDay = 6 + activeIndex; // Jan 6 is index 0
  const activeCalls = Math.round(DAILY_CALLS[activeIndex]);

  const strokeColor = isDark ? "#ffffff" : "#171717";
  const fillFrom = isDark ? "rgba(255,255,255,0.16)" : "rgba(23,23,23,0.10)";
  const fillTo = isDark ? "rgba(255,255,255,0)" : "rgba(23,23,23,0)";

  return (
    <div className="relative mt-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "clamp(180px, 22vw, 260px)" }}
        onMouseLeave={() => setHover(HIGHLIGHT_INDEX)}
      >
        <defs>
          <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillFrom} />
            <stop offset="100%" stopColor={fillTo} />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#perfFill)" />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />

        {/* dashed guide + marker for the active point */}
        <line
          x1={ax}
          y1={ay}
          x2={ax}
          y2={H}
          stroke={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)"}
          strokeDasharray="3 4"
          strokeWidth={1}
        />
        <circle cx={ax} cy={ay} r={4.5} fill={strokeColor} stroke={isDark ? "#09090a" : "#f3f1ed"} strokeWidth={2.5} />

        {/* invisible hit targets so hovering anywhere near a point updates the tooltip */}
        {points.map(([x], i) => (
          <rect
            key={i}
            x={Math.max(0, x - W / DAILY_CALLS.length / 2)}
            y={0}
            width={W / DAILY_CALLS.length}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {/* tooltip */}
      <div
        className={[
          "pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-[10px] border px-3 py-2 text-[11.5px] shadow-lg transition-all",
          isDark ? "border-white/10 bg-[#1c1c1e] text-white" : "border-black/[0.06] bg-white text-neutral-900",
        ].join(" ")}
        style={{
          left: `${(ax / W) * 100}%`,
          top: `${(ay / H) * 100}%`,
          marginTop: "-10px",
        }}
      >
        <div className="font-semibold">Tue, Jan {activeDay}</div>
        <div className={isDark ? "text-neutral-400" : "text-neutral-500"}>
          Total this day&nbsp;&nbsp;<span className={isDark ? "text-white" : "text-neutral-900"}>{activeCalls} Calls</span>
        </div>
      </div>

      {/* x axis labels */}
      <div className={["mt-2 flex justify-between text-[11px]", isDark ? "text-neutral-500" : "text-neutral-400"].join(" ")}>
        {X_LABELS.map((label) => (
          <span key={label} className={label === "Jan 18" ? (isDark ? "font-semibold text-neutral-200" : "font-semibold text-neutral-800") : ""}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Donut chart                                                      */
/* ---------------------------------------------------------------- */

function Donut({
  data,
  isDark,
  total,
  totalLabel,
  callout,
}: {
  data: { label: string; value: number }[];
  isDark: boolean;
  total: number;
  totalLabel: string;
  callout?: { label: string; value: string };
}) {
  const size = 168;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const shades = isDark
    ? ["#f5f5f5", "#8a8a8f", "#3a3a3e"]
    : ["#171717", "#a3a3a3", "#e5e5e5"];

  let offset = 0;

  return (
    <div className="relative mx-auto flex h-[168px] w-[168px] items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={isDark ? "#2a2a2d" : "#eeece7"} strokeWidth={stroke} />
        {data.map((d, i) => {
          const dash = (d.value / 100) * c;
          const seg = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={shades[i % shades.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className={["text-[13px]", isDark ? "text-neutral-400" : "text-neutral-500"].join(" ")}>{totalLabel}</span>
        <span className={["text-[22px] font-semibold", isDark ? "text-white" : "text-neutral-900"].join(" ")}>{total}</span>
      </div>

      {callout && (
        <div
          className={[
            "absolute -top-3 right-0 translate-x-1/3 whitespace-nowrap rounded-[10px] border px-2.5 py-1.5 text-[11px] shadow-lg",
            isDark ? "border-white/10 bg-[#1c1c1e] text-white" : "border-black/[0.06] bg-white text-neutral-900",
          ].join(" ")}
        >
          <span className={isDark ? "text-neutral-400" : "text-neutral-500"}>{callout.label}</span>{" "}
          <span className="font-semibold">{callout.value}</span>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color }: { color: string }) {
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

/* ---------------------------------------------------------------- */
/* Cards: Call Outcomes / Call Topics / End Call Reasons             */
/* ---------------------------------------------------------------- */

function DonutCard({
  title,
  meta,
  data,
  isDark,
  callout,
}: {
  title: string;
  meta: string;
  data: { label: string; value: number }[];
  isDark: boolean;
  callout?: { label: string; value: string };
}) {
  const shades = isDark
    ? ["#f5f5f5", "#8a8a8f", "#3a3a3e", "#5f5f63"]
    : ["#171717", "#a3a3a3", "#e5e5e5", "#d4d4d4"];

  return (
    <CardShell isDark={isDark}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className={["font-display text-[15px] font-semibold", isDark ? "text-white" : "text-neutral-900"].join(" ")}>{title}</h3>
          <p className={["mt-0.5 text-[11.5px]", isDark ? "text-neutral-500" : "text-neutral-400"].join(" ")}>{meta}</p>
        </div>
        <button
          type="button"
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full transition",
            isDark ? "text-neutral-500 hover:bg-white/10 hover:text-white" : "text-neutral-400 hover:bg-black/5 hover:text-neutral-900",
          ].join(" ")}
        >
          <DotsIcon />
        </button>
      </div>

      <div className="mt-5">
        <Donut data={data} isDark={isDark} total={10} totalLabel="Total" callout={callout} />
      </div>

      <div className="mt-6 space-y-2.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className={["flex items-center gap-2", isDark ? "text-neutral-300" : "text-neutral-600"].join(" ")}>
              <LegendDot color={shades[i % shades.length]} />
              {d.label}
            </span>
            <span className={isDark ? "text-neutral-500" : "text-neutral-400"}>{d.value}%</span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function BarListCard({
  title,
  meta,
  data,
  isDark,
}: {
  title: string;
  meta: string;
  data: { label: string; value: number }[];
  isDark: boolean;
}) {
  return (
    <CardShell isDark={isDark}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className={["font-display text-[15px] font-semibold", isDark ? "text-white" : "text-neutral-900"].join(" ")}>{title}</h3>
          <p className={["mt-0.5 text-[11.5px]", isDark ? "text-neutral-500" : "text-neutral-400"].join(" ")}>{meta}</p>
        </div>
        <button
          type="button"
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full transition",
            isDark ? "text-neutral-500 hover:bg-white/10 hover:text-white" : "text-neutral-400 hover:bg-black/5 hover:text-neutral-900",
          ].join(" ")}
        >
          <DotsIcon />
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {data.map((d) => (
          <div key={d.label}>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className={isDark ? "text-neutral-300" : "text-neutral-700"}>{d.label}</span>
              <span className={isDark ? "text-neutral-500" : "text-neutral-400"}>{d.value}%</span>
            </div>
            <div className={["mt-2 h-[6px] w-full overflow-hidden rounded-full", isDark ? "bg-white/10" : "bg-black/[0.06]"].join(" ")}>
              <div
                className={["h-full rounded-full", isDark ? "bg-white" : "bg-neutral-900"].join(" ")}
                style={{ width: `${d.value * 2.6}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function Analytics() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [range, setRange] = useState("Last 30 Days");
  const [view, setView] = useState("Performance");
  const [tab, setTab] = useState("Overview");

  return (
    <main className={["relative min-h-screen w-full transition-colors duration-500", isDark ? "bg-[#09090a]" : "bg-[#f3f1ed]"].join(" ")}>
      <DashboardSidebar theme={theme} />

      <div className="pl-[104px]">
        <div className="mx-auto w-full max-w-[1320px] px-[clamp(16px,3vw,40px)] py-[clamp(20px,2.6vw,34px)]">
          {/* Top row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Dropdown value={range} options={RANGES} onChange={setRange} isDark={isDark} />
            <Segmented options={["Performance", "Data Tables"]} value={view} onChange={setView} isDark={isDark} />
          </div>

          {/* Tabs + actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.06] pb-3 dark:border-white/10">
            <div className="flex items-center gap-6">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={[
                    "relative pb-3 text-[13.5px] font-medium transition",
                    t === tab
                      ? isDark
                        ? "text-white"
                        : "text-neutral-900"
                      : isDark
                        ? "text-neutral-500 hover:text-neutral-300"
                        : "text-neutral-400 hover:text-neutral-600",
                  ].join(" ")}
                >
                  {t}
                  {t === tab && (
                    <span className={["absolute -bottom-[13px] left-0 right-0 h-[2px] rounded-full", isDark ? "bg-white" : "bg-neutral-900"].join(" ")} />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={[
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition",
                  isDark ? "border-white/10 text-neutral-300 hover:bg-white/10" : "border-black/[0.06] text-neutral-600 hover:bg-black/5",
                ].join(" ")}
              >
                <FilterIcon />
                Filter
              </button>
              <button
                type="button"
                className={[
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
                  isDark ? "bg-white text-neutral-900 hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-800",
                ].join(" ")}
              >
                <PlusIcon />
                Add View
              </button>
            </div>
          </div>

          {/* Performance chart card */}
          <div className="mt-6">
            <CardShell isDark={isDark}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className={["font-display text-[16px] font-semibold", isDark ? "text-white" : "text-neutral-900"].join(" ")}>Performance</h2>
                  <p className={["mt-0.5 text-[11.5px]", isDark ? "text-neutral-500" : "text-neutral-400"].join(" ")}>
                    600 calls &nbsp;·&nbsp; Agent TZ: USA/California
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Dropdown value="Daily" options={["Daily", "Weekly", "Monthly"]} onChange={() => {}} isDark={isDark} />
                  <Dropdown value="Call" options={["Call", "Duration"]} onChange={() => {}} isDark={isDark} />
                  <Dropdown value="Absolute" options={["Absolute", "Relative"]} onChange={() => {}} isDark={isDark} />
                </div>
              </div>

              <PerformanceChart isDark={isDark} />
            </CardShell>
          </div>

          {/* Three metric cards */}
          <div className="mt-[clamp(14px,1.6vw,20px)] grid grid-cols-1 gap-[clamp(14px,1.6vw,20px)] lg:grid-cols-3">
            <DonutCard title="Call Outcomes" meta="10 calls · 3 topic matches" data={CALL_OUTCOMES} isDark={isDark} callout={{ label: "Business questions", value: "7 Calls" }} />
            <BarListCard title="Call Topics" meta="10 calls, 5 topic matches" data={CALL_TOPICS} isDark={isDark} />
            <DonutCard title="End Call Reasons" meta="10 calls · 2 topic matches" data={END_CALL_REASONS} isDark={isDark} callout={{ label: "Silence-timeout", value: "7 Calls" }} />
          </div>
        </div>
      </div>
    </main>
  );
}