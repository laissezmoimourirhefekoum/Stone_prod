import { useState } from "react";
import { navigate } from "../hooks/useHashRoute";
import { useTheme } from "../hooks/useTheme";
import DashboardSidebar, {
  useSidebarOffset,
} from "../components/DashboardSidebar";
import PageTransition from "../components/PageTransition";
import BottomBar, { type BottomBarTab } from "../components/Bottombar";
import Folder from "../components/Folder";
import NewPostModal, { type NewPostPayload } from "../components/Newpostmodal";
import {
  ZapierIcon,
  ClaudeIcon,
  ChatGPTIcon,
  NotionIcon,
  GoogleIcon,
  N8nIcon,
  RaycastIcon,
  PerplexityIcon,
  GoogleDriveIcon,
  GmailIcon,
  GoogleCalendarIcon,
  CanvaIcon,
} from "../components/IntegrationIcons";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[17px] w-[17px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4.5h12v15l-6-3.6-6 3.6v-15Z" />
    </svg>
  );
}

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

function ArrowRightIcon() {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

type IntegrationCardData = {
  title: string;
  meta?: string;
  body: string;
  progress: number;
  variant: "soft" | "card" | "dark";
  big?: string;
  logos?: string[];
};

const INTEGRATIONS: IntegrationCardData[] = [
  {
    title: "Zapier",
    meta: "Automatisation",
    body: "Automate workflows with Zapier",
    progress: 70,
    variant: "card",
  },
  {
    title: "Claude",
    meta: "IA",
    body: "Manage your content from Claude and Claude Code",
    progress: 85,
    variant: "card",
  },
  {
    title: "ChatGPT",
    meta: "IA",
    body: "Manage your content from ChatGPT and Codex",
    progress: 75,
    variant: "card",
  },
  {
    title: "Notion",
    meta: "Documentation",
    body: "Manage your content from Notion custom agents",
    progress: 60,
    variant: "card",
  },
  {
    title: "Google",
    meta: "Productivité",
    body: "Connect Google services and tools",
    progress: 65,
    variant: "card",
  },
  {
    title: "n8n",
    meta: "Automatisation",
    body: "Workflow automation with n8n",
    progress: 60,
    variant: "card",
  },
  {
    title: "Raycast",
    meta: "Productivité",
    body: "Quick actions from your menu bar",
    progress: 70,
    variant: "card",
  },
  {
    title: "Perplexity",
    meta: "IA",
    body: "Manage your content from Perplexity Web and Desktop",
    progress: 50,
    variant: "card",
  },
  {
    title: "Canva",
    meta: "Design",
    body: "Create and manage your designs from Canva",
    progress: 55,
    variant: "card",
  },
  {
    title: "Google Drive",
    meta: "Stockage",
    body: "Sync and manage your files from Google Drive",
    progress: 75,
    variant: "card",
  },
  {
    title: "Gmail",
    meta: "Email",
    body: "Manage your emails and automate responses",
    progress: 80,
    variant: "card",
  },
  {
    title: "Google Calendar",
    meta: "Planning",
    body: "Sync your calendar and automate scheduling",
    progress: 65,
    variant: "card",
  },
];

function ProgressBar({
  value,
  tone,
}: {
  value: number;
  tone: "onLight" | "onDark";
}) {
  return (
    <div
      className={[
        "h-[3px] w-full overflow-hidden rounded-full",
        tone === "onDark" ? "bg-white/15" : "bg-black/10",
      ].join(" ")}
    >
      <div
        className={[
          "h-full rounded-full",
          tone === "onDark" ? "bg-white" : "bg-neutral-900",
        ].join(" ")}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function IntegrationCard({
  data,
  isDark,
}: {
  data: IntegrationCardData;
  isDark: boolean;
}) {
  const isDarkCard = data.variant === "dark";
  const isSoft = data.variant === "soft";

  const cardBg = isDarkCard
    ? "bg-[#111113]"
    : isSoft
      ? isDark
        ? "bg-[#1c1c1e]"
        : "bg-[#f3f1ed]"
      : isDark
        ? "bg-[#151517]"
        : "bg-white";

  const cardBorder = isDarkCard
    ? "border-white/10"
    : isDark
      ? "border-white/10"
      : "border-black/[0.06]";
  const titleColor = isDarkCard
    ? "text-white"
    : isDark
      ? "text-white"
      : "text-neutral-900";
  const metaColor = isDarkCard
    ? "text-neutral-500"
    : isDark
      ? "text-neutral-500"
      : "text-neutral-400";
  const bodyColor = isDarkCard
    ? "text-neutral-400"
    : isDark
      ? "text-neutral-400"
      : "text-neutral-600";

  const getIcon = () => {
    switch (data.title) {
      case "Zapier":
        return <ZapierIcon className="h-5 w-5" />;
      case "Claude":
        return <ClaudeIcon className="h-5 w-5" />;
      case "ChatGPT":
        return <ChatGPTIcon className="h-5 w-5" />;
      case "Notion":
        return <NotionIcon className="h-5 w-5" />;
      case "Google":
        return <GoogleIcon className="h-5 w-5" />;
      case "n8n":
        return <N8nIcon className="h-5 w-5" />;
      case "Raycast":
        return <RaycastIcon className="h-5 w-5" />;
      case "Perplexity":
        return <PerplexityIcon className="h-5 w-5" />;
      case "Canva":
        return <CanvaIcon className="h-5 w-5" />;
      case "Google Drive":
        return <GoogleDriveIcon className="h-5 w-5" />;
      case "Gmail":
        return <GmailIcon className="h-5 w-5" />;
      case "Google Calendar":
        return <GoogleCalendarIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={[
        "group flex h-full flex-col rounded-[clamp(16px,1.6vw,22px)] border p-[clamp(16px,1.6vw,22px)] transition-colors",
        cardBg,
        cardBorder,
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getIcon()}
          <h3
            className={[
              "font-display text-[clamp(14px,1.1vw,17px)] font-semibold",
              titleColor,
            ].join(" ")}
          >
            {data.title}
          </h3>
        </div>
        <button
          type="button"
          aria-label={`Configurer ${data.title}`}
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full transition",
            isDarkCard
              ? "text-neutral-400 hover:bg-white/10 hover:text-white"
              : isDark
                ? "text-neutral-400 hover:bg-white/10 hover:text-white"
                : "text-neutral-400 hover:bg-black/5 hover:text-neutral-900",
          ].join(" ")}
        >
          <ArrowRightIcon />
        </button>
      </div>

      <div className="mt-3">
        <ProgressBar
          value={data.progress}
          tone={isDarkCard ? "onDark" : isDark ? "onDark" : "onLight"}
        />
      </div>

      <div className="mt-3 flex items-start gap-2">
        {data.meta && (
          <span
            className={[
              "shrink-0 text-[10.5px] font-medium tracking-wide",
              metaColor,
            ].join(" ")}
          >
            {data.meta}
          </span>
        )}
        <p
          className={[
            "text-[clamp(11.5px,0.95vw,13px)] leading-[1.45]",
            bodyColor,
          ].join(" ")}
        >
          {data.body}
        </p>
      </div>

      {data.logos && (
        <div className="mt-4 flex gap-2">
          {data.logos.map((label) => (
            <span
              key={label}
              className={[
                "flex h-7 items-center justify-center rounded-full px-2.5 text-[10px] font-semibold tracking-wide",
                isDark
                  ? "bg-[#2a2a2d] text-white"
                  : "bg-white text-neutral-900 shadow-sm",
              ].join(" ")}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Integrations() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  // Largeur dynamique de la sidebar (identique à la Home et Channels).
  const sidebarOffset = useSidebarOffset();

  // Recherche & filtre de la grille d'intégrations.
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const [filterOpen, setFilterOpen] = useState(false);

  // Recherche de la BottomBar (state indépendant de `query`).
  const [bottomQuery, setBottomQuery] = useState("");

  // BottomBar / Folder / NewPostModal.
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);

  const filters = ["Toutes", "Connectées", "Disponibles"];

  const visible = INTEGRATIONS.filter((item) => {
    const matchesQuery =
      query.trim().length === 0 ||
      (item.title + " " + (item.meta ?? ""))
        .toLowerCase()
        .includes(query.trim().toLowerCase());

    const matchesFilter =
      filter === "Toutes" ||
      (filter === "Connectées" ? item.progress >= 60 : item.progress < 60);

    return matchesQuery && matchesFilter;
  });

  const handleBottomBarChange = (id: BottomBarTab) => {
    switch (id) {
      case "add":
        setIsFolderOpen(false);
        setIsNewPostOpen(true);
        break;
      case "files":
        setIsFolderOpen((open) => !open);
        break;
    }
  };

  const handleCreatePost = async (payload: NewPostPayload) => {
    // TODO : brancher ici le vrai envoi (Supabase, file d'attente, etc.).
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

      {/* Le padding-left suit l'ouverture/fermeture de la sidebar, avec
          la même animation que la Home et Channels. */}
      <div
        className={[
          "transition-[padding-left] duration-[380ms]",
          "ease-[cubic-bezier(0.4,0,0.2,1)]",
          "motion-reduce:transition-none",
        ].join(" ")}
        style={{ paddingLeft: sidebarOffset }}
      >
        <PageTransition>
          {/* pb-[96px] réserve la place de la BottomBar. */}
          <div className="mx-auto w-full max-w-[1320px] px-[clamp(16px,3vw,40px)] pt-[clamp(20px,2.6vw,34px)] pb-[96px]">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigate("home")}
                className={[
                  "flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-left transition",
                  isDark
                    ? "border-white/10 bg-[#1c1c1e] text-neutral-500 hover:text-neutral-300"
                    : "border-black/[0.06] bg-white text-neutral-400 hover:text-neutral-600",
                ].join(" ")}
              >
                <SearchIcon />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher une intégration"
                  className={[
                    "w-[160px] bg-transparent text-[13px] outline-none placeholder:text-inherit sm:w-[220px]",
                    isDark ? "text-white" : "text-neutral-800",
                  ].join(" ")}
                />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  aria-label="Toggle theme"
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border transition",
                    isDark
                      ? "border-white/10 text-neutral-300 hover:bg-white/10"
                      : "border-black/[0.06] text-neutral-500 hover:bg-black/5",
                  ].join(" ")}
                >
                  <BellIcon />
                </button>
                <button
                  type="button"
                  className={[
                    "hidden h-9 w-9 items-center justify-center rounded-full border transition sm:flex",
                    isDark
                      ? "border-white/10 text-neutral-300 hover:bg-white/10"
                      : "border-black/[0.06] text-neutral-500 hover:bg-black/5",
                  ].join(" ")}
                  aria-label="Bookmarks"
                >
                  <BookmarkIcon />
                </button>
                <button
                  type="button"
                  className={[
                    "rounded-full px-4 py-2 text-[13px] font-semibold transition",
                    isDark
                      ? "bg-white text-neutral-900 hover:bg-neutral-200"
                      : "bg-neutral-900 text-white hover:bg-neutral-800",
                  ].join(" ")}
                >
                  Nouvelle intégration
                </button>
              </div>
            </div>

            {/* Heading row */}
            <div className="mt-[clamp(20px,3vw,36px)] flex flex-wrap items-center justify-between gap-4">
              <h1
                className={[
                  "font-display text-[clamp(26px,3vw,40px)] font-semibold tracking-[-0.02em]",
                  isDark ? "text-white" : "text-neutral-900",
                ].join(" ")}
              >
                Intégrations
              </h1>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((value) => !value)}
                  className={[
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-[12.5px] font-medium transition",
                    isDark
                      ? "border-white/10 bg-[#1c1c1e] text-neutral-200 hover:bg-[#242427]"
                      : "border-black/[0.06] bg-white text-neutral-700 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {filter}
                  <ChevronDownIcon />
                </button>
                {filterOpen && (
                  <div
                    className={[
                      "absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-[12px] border shadow-lg",
                      isDark
                        ? "border-white/10 bg-[#1c1c1e]"
                        : "border-black/[0.06] bg-white",
                    ].join(" ")}
                  >
                    {filters.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setFilter(option);
                          setFilterOpen(false);
                        }}
                        className={[
                          "block w-full px-4 py-2.5 text-left text-[12.5px] transition",
                          option === filter
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

            {/* Cards grid */}
            <div className="mt-[clamp(20px,3vw,32px)] grid grid-cols-1 gap-[clamp(14px,1.6vw,20px)] sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((card) => (
                <IntegrationCard
                  key={card.title + card.meta}
                  data={card}
                  isDark={isDark}
                />
              ))}
            </div>

            {visible.length === 0 && (
              <p
                className={[
                  "mt-10 text-center text-[13px]",
                  isDark ? "text-neutral-500" : "text-neutral-400",
                ].join(" ")}
              >
                Aucune intégration ne correspond à votre recherche.
              </p>
            )}
          </div>
        </PageTransition>
      </div>

      {/* Barre d'actions rapides, centrée sur la zone de contenu. */}
      <Folder
        isOpen={isFolderOpen}
        onClose={() => setIsFolderOpen(false)}
        isDark={isDark}
        offsetLeft={sidebarOffset}
      />

      <BottomBar
        isDark={isDark}
        offsetLeft={sidebarOffset}
        active={isFolderOpen ? "files" : null}
        onChange={handleBottomBarChange}
        query={bottomQuery}
        onQueryChange={setBottomQuery}
      />

      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        isDark={isDark}
        onSubmit={handleCreatePost}
      />
    </main>
  );
}