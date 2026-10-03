import { useEffect, useMemo, useState } from "react";
import { navigate } from "../hooks/useHashRoute";
import { useTheme } from "../hooks/useTheme";
import {
  useConnectedChannels,
  type ConnectedChannel,
} from "../hooks/useConnectedChannels";
import DashboardSidebar from "../components/DashboardSidebar";
import NewPostModal, { type NewPostPayload } from "../components/Newpostmodal";
import HelpChatButton from "../components/Helpchatbutton";
import BottomBar, { type BottomBarTab } from "../components/Bottombar";
import Folder from "../components/Folder";
import { getCurrentUser, type UserProfile } from "../services/supabase";
import {
  XIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
  PinterestIcon,
} from "../components/IntegrationIcons";

/**
 * Largeur réservée à la sidebar (68px + 16px d'inset + gap).
 */
const SIDEBAR_OFFSET = 104;

/**
 * Cache du profil utilisateur
 */
const userProfileCache = {
  profile: null as UserProfile | null,
};

/* ──────────────────────────────────────────────────────────────
   Helpers Réseaux Sociaux
   ────────────────────────────────────────────────────────────── */

type SocialNetworkKey =
  | "x"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "pinterest";

const NETWORK_ICONS: Record<
  SocialNetworkKey,
  (props: { className?: string }) => JSX.Element
> = {
  x: XIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
};

function getNetworkId(channel: ConnectedChannel): SocialNetworkKey | null {
  const c = channel as unknown as Record<string, unknown>;
  const raw = String(c.platform ?? c.network ?? c.provider ?? channel.key)
    .toLowerCase()
    .trim();

  if (raw.includes("tiktok")) return "tiktok";
  if (raw.includes("insta")) return "instagram";
  if (raw.includes("youtube") || raw === "yt") return "youtube";
  if (raw.includes("facebook") || raw === "fb") return "facebook";
  if (raw.includes("linkedin")) return "linkedin";
  if (raw.includes("pinterest")) return "pinterest";
  if (raw === "x" || raw.includes("twitter")) return "x";
  return null;
}

/* ──────────────────────────────────────────────────────────────
   Composants d'interface (UI)
   ────────────────────────────────────────────────────────────── */

function GreetingAvatar({
  avatarUrl,
  initials,
  isDark,
}: {
  avatarUrl?: string | null;
  initials: string;
  isDark: boolean;
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [avatarUrl]);

  const showImage = Boolean(avatarUrl) && !loadFailed;

  return showImage ? (
    <img
      key={avatarUrl}
      src={avatarUrl!}
      alt="Profile"
      style={{ width: 40, height: 40 }}
      className="aspect-square shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
      onError={() => setLoadFailed(true)}
    />
  ) : (
    <div
      style={{ width: 40, height: 40 }}
      className={[
        "flex aspect-square shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
        isDark ? "bg-[#2a2a2d] text-white" : "bg-neutral-900 text-white",
      ].join(" ")}
    >
      {initials}
    </div>
  );
}

function ClockDisplay({ isDark }: { isDark: boolean }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(interval);
  }, []);

  const time = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const date = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col items-end">
      <span
        className={[
          "font-display text-[clamp(20px,2.2vw,26px)] font-semibold leading-none tracking-[-0.01em] tabular-nums",
          isDark ? "text-white" : "text-neutral-900",
        ].join(" ")}
      >
        {time}
      </span>
      <span
        className={[
          "mt-0.5 text-[12px] font-medium capitalize",
          isDark ? "text-neutral-400" : "text-neutral-500",
        ].join(" ")}
      >
        {date}
      </span>
    </div>
  );
}

// NOUVEAU : Carte de projet (inspirée de l'image)
function ProjectCard({
  date,
  title,
  progress,
  daysLeft,
  gradient,
  isDark,
}: {
  date: string;
  title: string;
  progress: number;
  daysLeft: string;
  gradient: string;
  isDark: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col justify-between rounded-[24px] p-5 text-white shadow-sm transition-transform hover:-translate-y-1 ${gradient}`}
    >
      <div className="flex items-center justify-between text-xs font-medium text-white/80">
        <span>{date}</span>
        <button className="rounded-full p-1 hover:bg-white/20">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </div>

      <div className="mt-6 mb-8 text-center">
        <h3 className="text-[22px] font-bold leading-tight">{title}</h3>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[13px] font-medium">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <img
                key={i}
                src={`https://i.pravatar.cc/150?img=${i + 10}`}
                alt="Avatar"
                className="h-7 w-7 rounded-full border-2 border-white object-cover"
              />
            ))}
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-gray-800">
            {daysLeft}
          </span>
        </div>
      </div>
    </div>
  );
}

// NOUVEAU : Carte d'activité (Graphique)
function ActivityCard({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={`rounded-[24px] p-6 shadow-sm ${
        isDark ? "bg-[#141416]" : "bg-white"
      }`}
    >
      <h3 className={`mb-6 text-lg font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>
        Activity
      </h3>

      <div className="relative h-40 w-full">
        {/* Lignes pointillées verticales */}
        <div className="absolute inset-0 flex justify-between">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="flex h-full flex-col items-center justify-end">
              <div className={`h-full w-px border-l border-dashed ${isDark ? "border-neutral-700" : "border-gray-200"}`} />
            </div>
          ))}
        </div>

        {/* Graphique SVG */}
        <svg
          className="absolute bottom-6 left-0 h-32 w-full overflow-visible"
          preserveAspectRatio="none"
          viewBox="0 0 700 120"
        >
          <defs>
            <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d="M0,80 C50,80 100,40 150,50 C200,60 250,90 300,80 C350,70 400,30 450,50 C500,70 550,110 600,90 C650,70 700,60 700,60 L700,120 L0,120 Z"
            fill="url(#activityGradient)"
          />
          <path
            d="M0,80 C50,80 100,40 150,50 C200,60 250,90 300,80 C350,70 400,30 450,50 C500,70 550,110 600,90 C650,70 700,60 700,60"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="3"
          />
        </svg>

        {/* Infobulle "4 Tasks" */}
        <div className="absolute left-[60%] top-0 flex -translate-x-1/2 flex-col items-center">
          <div className={`rounded-full px-3 py-1 text-xs font-bold shadow-md ${isDark ? "bg-[#2a2a2d] text-white" : "bg-white text-gray-800"}`}>
            4 <span className="text-[10px] font-normal opacity-70">Tasks</span>
          </div>
          <div className={`mt-1 h-16 w-px border-l border-dashed ${isDark ? "border-neutral-600" : "border-gray-400"}`} />
          <div className="h-2 w-2 rounded-full bg-violet-500" />
        </div>

        {/* Étiquettes de l'axe X */}
        <div className={`absolute bottom-0 left-0 flex w-full justify-between px-2 text-[10px] font-medium ${isDark ? "text-neutral-500" : "text-gray-400"}`}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// NOUVEAU : Petite carte de statistique
function StatCard({ value, label, isDark }: { value: string; label: string; isDark: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-[24px] p-4 shadow-sm ${isDark ? "bg-[#141416]" : "bg-white"}`}>
      <div className="mb-2 flex items-end gap-1">
        <div className="h-6 w-1.5 rounded-full bg-emerald-400" />
        <div className="h-4 w-1.5 rounded-full bg-emerald-300" />
        <div className="h-8 w-1.5 rounded-full bg-emerald-500" />
      </div>
      <span className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>{value}</span>
      <span className={`text-[11px] font-medium ${isDark ? "text-neutral-400" : "text-gray-400"}`}>{label}</span>
    </div>
  );
}

// NOUVEAU : Liste des membres
function MemberList({ isDark }: { isDark: boolean }) {
  const members = [
    { name: "Emma Shin", img: "https://i.pravatar.cc/150?img=1" },
    { name: "Jimbabe", img: "https://i.pravatar.cc/150?img=2" },
    { name: "Natalia syan", img: "https://i.pravatar.cc/150?img=5" },
    { name: "Sunjin", img: "https://i.pravatar.cc/150?img=8" },
  ];

  return (
    <div className={`flex flex-col rounded-[24px] p-5 shadow-sm ${isDark ? "bg-[#141416]" : "bg-white"}`}>
      <h3 className={`mb-4 text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>List Member</h3>
      <div className="flex flex-col gap-3">
        {members.map((member) => (
          <div key={member.name} className="flex items-center gap-3">
            <img
              src={member.img}
              alt={member.name}
              className="h-9 w-9 rounded-full object-cover"
            />
            <span className={`text-[13px] font-medium ${isDark ? "text-neutral-300" : "text-gray-600"}`}>
              {member.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Home (Page Principale)
   ────────────────────────────────────────────────────────────── */

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  const connectedChannels = useConnectedChannels();

  const homeConnectedChannels = useMemo(
    () =>
      connectedChannels.filter(
        (channel) => getNetworkId(channel) !== "youtube"
      ),
    [connectedChannels]
  );

  const [user, setUser] = useState<UserProfile | null>(
    userProfileCache.profile
  );

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();

        if (mounted && userData) {
          userProfileCache.profile = userData;
          setUser(userData);
        }
      } catch (error) {
        console.error("Error loading user on Home:", error);
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();

  const initials =
    `${(user?.first_name || "")[0] || ""}${
      (user?.last_name || "")[0] || ""
    }`.toUpperCase() || "U";

  const handleCreatePost = async (payload: NewPostPayload) => {
    console.log("Nouveau post à envoyer :", payload);
  };

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

  // Données statiques pour les cartes de projet (inspirées de l'image)
  const projects = [
    {
      date: "12 Jun 2020",
      title: "Web Design E-commerce",
      progress: 90,
      daysLeft: "2 Days Left",
      gradient: "bg-gradient-to-br from-[#6b4cfa] to-[#8b5cf6]",
    },
    {
      date: "12 Jun 2020",
      title: "Apps Design E-commerce",
      progress: 90,
      daysLeft: "2 Days Left",
      gradient: "bg-gradient-to-br from-[#d946ef] to-[#f0abfc]",
    },
    {
      date: "12 Jun 2020",
      title: "Branding E-commerce",
      progress: 90,
      daysLeft: "2 Days Left",
      gradient: "bg-gradient-to-br from-[#10b981] to-[#34d399]",
    },
  ];

  return (
    <main
      className={[
        "relative h-screen w-full overflow-hidden transition-colors duration-500",
        isDark ? "bg-[#09090a]" : "bg-[#f3f1ed]",
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} />

      <div className="h-full overflow-y-auto" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="mx-auto flex h-full w-full max-w-[1320px] flex-col px-[clamp(16px,3vw,40px)] pb-[96px] pt-[clamp(14px,2vw,24px)]">
          
          {/* Header : Titre + Salutation + Horloge + Recherche */}
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className={`font-display text-[clamp(24px,2.8vw,36px)] font-semibold tracking-[-0.02em] ${isDark ? "text-white" : "text-neutral-900"}`}>
                  Dashboard
                </h1>
                <p className={`mt-1 text-sm ${isDark ? "text-neutral-400" : "text-gray-500"}`}>
                  Bonjour{fullName ? `, ${fullName}` : ""}
                </p>
              </div>
              <GreetingAvatar
                avatarUrl={user?.avatar_url}
                initials={initials}
                isDark={isDark}
              />
            </div>

            <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full max-w-xs">
                <svg
                  className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? "text-neutral-500" : "text-gray-400"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={`w-full rounded-full py-2 pl-10 pr-4 text-sm outline-none transition ${
                    isDark
                      ? "bg-[#1a1a1c] text-white placeholder-neutral-500 focus:bg-[#222225]"
                      : "bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-violet-500"
                  }`}
                />
              </div>
              <ClockDisplay isDark={isDark} />
            </div>
          </div>

          {/* Grille principale du Dashboard */}
          <div className="flex flex-col gap-6">
            
            {/* Ligne 1 : Cartes de projet */}
            <div className="relative">
              {/* Bouton flottant "+" */}
              <button className={`absolute -left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition hover:scale-105 ${isDark ? "bg-[#2a2a2d] text-white" : "bg-white text-gray-800"}`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={project.title} {...project} isDark={isDark} />
                ))}
              </div>
            </div>

            {/* Ligne 2 : Activité + Stats + Membres */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {/* Activité (prend 2 colonnes) */}
              <div className="lg:col-span-2">
                <ActivityCard isDark={isDark} />
              </div>

              {/* Stats + Membres (prend 2 colonnes) */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  <StatCard value="10+" label="Project" isDark={isDark} />
                  <StatCard value="40+" label="Client" isDark={isDark} />
                </div>
                <MemberList isDark={isDark} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Barre d'actions rapides */}
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
        query={query}
        onQueryChange={setQuery}
      />

      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        isDark={isDark}
        onSubmit={handleCreatePost}
      />

      <HelpChatButton isDark={isDark} />
    </main>
  );
}