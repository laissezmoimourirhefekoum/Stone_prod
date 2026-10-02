import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import DashboardSidebar from "../components/DashboardSidebar";
import BottomBar, { type BottomBarTab } from "../components/Bottombar";
import Folder from "../components/Folder";
import NewPostModal, { type NewPostPayload } from "../components/Newpostmodal";

/** Largeur réservée à la sidebar (68px + 16px d'inset + gap). */
const SIDEBAR_OFFSET = 104;

/* ---------- Icônes ---------- */

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[14px] w-[14px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[14px] w-[14px]"
      fill="currentColor"
    >
      <path d="M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Zm0 2.2 5.9 2.9L12 10 6.1 7.1 12 4.2Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/* ---------- Données ---------- */

type Tab = "all" | "completed" | "delivery" | "pending";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "completed", label: "Publiés" },
  { id: "delivery", label: "En attente" },
  { id: "pending", label: "Brouillons" },
];

const RANGES = ["Today", "This week", "This month"];

/* ---------- Composants ---------- */

function Sparkline() {
  return (
    <svg viewBox="0 0 96 40" className="h-10 w-24" fill="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M2 32 L12 22 L20 28 L30 14 L40 24 L50 16 L60 26 L72 8 L82 16 L94 6 V40 H2 Z"
        fill="url(#spark-fill)"
      />
      <path
        d="M2 32 L12 22 L20 28 L30 14 L40 24 L50 16 L60 26 L72 8 L82 16 L94 6"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StatProps = {
  label: string;
  value: string;
  delta: string;
  isDark: boolean;
  badge?: string;
  dark?: boolean;
};

function StatCard({ label, value, delta, isDark, badge, dark }: StatProps) {
  const surface = dark
    ? "border-white/10 bg-[#111113]"
    : isDark
      ? "border-white/10 bg-[#151517]"
      : "border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

  const labelColor = dark || isDark ? "text-neutral-400" : "text-neutral-500";
  const valueColor = dark || isDark ? "text-white" : "text-neutral-900";

  return (
    <div
      className={[
        "flex min-h-[clamp(112px,11vw,140px)] flex-col justify-between rounded-[clamp(16px,1.6vw,22px)] border p-[clamp(14px,1.4vw,20px)]",
        surface,
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <span className={["text-[12px]", labelColor].join(" ")}>{label}</span>
        {badge && (
          <span
            className={[
              "flex h-6 w-6 items-center justify-center rounded-full",
              badge,
            ].join(" ")}
          >
            <CubeIcon />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <span
          className={[
            "font-display text-[clamp(28px,3vw,40px)] font-semibold leading-none tracking-[-0.02em]",
            valueColor,
          ].join(" ")}
        >
          {value}
        </span>
        {dark && <Sparkline />}
      </div>

      <p className={["mt-2 text-[11px]", labelColor].join(" ")}>
        <span className="font-medium text-emerald-500">{delta}</span> par
        rapport au mois dernier
      </p>
    </div>
  );
}

function EmptyState({
  isDark,
  onPostVideo,
}: {
  isDark: boolean;
  onPostVideo: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className={[
          "flex h-24 w-24 items-center justify-center rounded-full",
          isDark ? "bg-white/5 text-neutral-400" : "bg-neutral-200/70 text-neutral-500",
        ].join(" ")}
      >
        <PlusIcon />
      </div>
      <h2
        className={[
          "mt-6 text-[22px] font-semibold tracking-[-0.01em]",
          isDark ? "text-white" : "text-neutral-900",
        ].join(" ")}
      >
        Post your first video
      </h2>
      <p
        className={[
          "mt-2 max-w-[320px] text-[14px]",
          isDark ? "text-neutral-400" : "text-neutral-500",
        ].join(" ")}
      >
        Once posted, you'll see your videos listed here.
      </p>
      <button
        type="button"
        onClick={onPostVideo}
        className={[
          "mt-6 rounded-xl border px-6 py-3 text-[13px] font-semibold transition",
          isDark
            ? "border-white/10 bg-[#1c1c1e] text-white hover:bg-[#242427]"
            : "border-black/10 bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-neutral-50",
        ].join(" ")}
      >
        Post Video
      </button>
    </div>
  );
}

/* ---------- Page ---------- */

export default function Queue() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [range, setRange] = useState("This month");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");

  // ── État du modal de création de post ──
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── BottomBar / Folder ──
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [bottomQuery, setBottomQuery] = useState("");

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleBottomBarChange = (id: BottomBarTab) => {
    switch (id) {
      case "add":
        setIsFolderOpen(false);
        setIsModalOpen(true);
        break;
      case "files":
        setIsFolderOpen((open) => !open);
        break;
    }
  };

  const handleCreatePost = async (payload: NewPostPayload) => {
    // TODO: remplacer par l'appel API
    console.log("Nouveau post :", payload);
  };

  return (
    <main
      className={[
        "relative min-h-screen w-full transition-colors duration-500",
        isDark ? "bg-[#09090a]" : "bg-[#f3f1ed]",
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} />

      <div className="pl-[104px]">
        {/* pb-[96px] : réserve la place de la BottomBar. */}
        <div className="mx-auto w-full max-w-[1320px] px-[clamp(16px,3vw,40px)] pt-[clamp(20px,2.6vw,34px)] pb-[96px]">
          {/* Heading row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1
              className={[
                "font-display text-[clamp(30px,3.6vw,48px)] font-semibold tracking-[-0.02em]",
                isDark ? "text-white" : "text-neutral-900",
              ].join(" ")}
            >
              Queue
            </h1>

            <div className="flex items-center gap-3">
              {/* ── Bouton "+" ── */}
              <button
                type="button"
                onClick={openModal}
                aria-label="New Post"
                title="New Post"
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full transition",
                  isDark
                    ? "bg-white text-[#141416] hover:bg-neutral-200"
                    : "bg-neutral-900 text-white hover:bg-neutral-800",
                ].join(" ")}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRangeOpen((value) => !value)}
                  className={[
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-[12.5px] font-medium transition",
                    isDark
                      ? "border-white/10 bg-[#1c1c1e] text-neutral-200 hover:bg-[#242427]"
                      : "border-black/[0.06] bg-white text-neutral-700 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {range}
                  <ChevronDownIcon />
                </button>
                {rangeOpen && (
                  <div
                    className={[
                      "absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-[12px] border shadow-lg",
                      isDark
                        ? "border-white/10 bg-[#1c1c1e]"
                        : "border-black/[0.06] bg-white",
                    ].join(" ")}
                  >
                    {RANGES.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setRange(option);
                          setRangeOpen(false);
                        }}
                        className={[
                          "block w-full px-4 py-2.5 text-left text-[12.5px] transition",
                          option === range
                            ? isDark
                              ? "text-white"
                              : "text-neutral-900"
                            : isDark
                              ? "text-neutral-400 hover:bg-white/5"
                              : "text-neutral-500 hover:bg-black/[0.03]",
                        ].join(" ")}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-[clamp(18px,2.4vw,28px)] grid grid-cols-1 gap-[clamp(12px,1.4vw,18px)] sm:grid-cols-2 lg:grid-cols-4">
            <StatCard dark isDark={isDark} label="Total" value="0" delta="0%" />
            <StatCard
              isDark={isDark}
              label="Publiés"
              value="0"
              delta="0%"
              badge="bg-emerald-100 text-emerald-600"
            />
            <StatCard
              isDark={isDark}
              label="En attente"
              value="0"
              delta="0%"
              badge="bg-amber-100 text-amber-500"
            />
            <StatCard
              isDark={isDark}
              label="Brouillons"
              value="0"
              delta="0%"
              badge="bg-violet-100 text-violet-600"
            />
          </div>

          {/* Onglets */}
          <div className="mt-[clamp(20px,2.6vw,30px)] flex flex-wrap items-center gap-2">
            {TABS.map((item) => {
              const active = item.id === tab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-pressed={active}
                  className={[
                    "rounded-full border px-4 py-2 text-[12px] font-medium transition",
                    active
                      ? isDark
                        ? "border-white bg-white text-neutral-900"
                        : "border-neutral-900 bg-neutral-900 text-white"
                      : isDark
                        ? "border-white/10 bg-[#1c1c1e] text-neutral-300 hover:bg-[#242427]"
                        : "border-black/[0.06] bg-white text-neutral-600 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* État vide */}
          <EmptyState isDark={isDark} onPostVideo={openModal} />
        </div>
      </div>

      {/* Barre d'actions rapides. */}
      <Folder
        isOpen={isFolderOpen}
        onClose={() => setIsFolderOpen(false)}
        isDark={isDark}
        offsetLeft={SIDEBAR_OFFSET}
      />

      <BottomBar
        isDark={isDark}
        offsetLeft={SIDEBAR_OFFSET}
        active={isFolderOpen ? "files" : null}
        onChange={handleBottomBarChange}
        query={bottomQuery}
        onQueryChange={setBottomQuery}
      />

      {/* ── Modal de création de post ── */}
      <NewPostModal
        isOpen={isModalOpen}
        onClose={closeModal}
        isDark={isDark}
        onSubmit={handleCreatePost}
      />
    </main>
  );
}