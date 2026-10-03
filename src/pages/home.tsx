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

const SIDEBAR_OFFSET = 104;

const userProfileCache = {
  profile: null as UserProfile | null,
};

// --- ICONS POUR LA NOUVELLE MAQUETTE ---
const StarIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const UsersIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const HeartIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const UserTaskIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ChatIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const PlusIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const ChevronDownIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// --- COMPOSANTS DE LA MAQUETTE ---

function StatCard({ icon, title, value, change, isDark }: { icon: React.ReactNode; title: string; value: string; change: string; isDark: boolean }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm ${isDark ? "border-white/10 bg-[#141416]" : "border-black/[0.06] bg-white"}`}>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isDark ? "bg-white/10 text-white" : "bg-neutral-900 text-white"}`}>
        {icon}
      </div>
      <div>
        <p className={`text-xs font-medium ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>{title}</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-xl font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>{value}</p>
          <span className={`text-xs font-medium ${change.startsWith("+") ? "text-emerald-500" : "text-rose-500"}`}>{change}</span>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, value, isDark }: { title: string; value: string; isDark: boolean }) {
  // Un faux graphique en SVG pour illustrer la maquette
  const path = "M0 80 Q 20 40, 40 60 T 80 30 T 120 50 T 160 20 T 200 60 T 240 40 T 280 70 T 320 30 T 360 50 T 400 20";
  return (
    <div className={`flex flex-col rounded-2xl border p-5 shadow-sm ${isDark ? "border-white/10 bg-[#141416]" : "border-black/[0.06] bg-white"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>{title}</h3>
          <svg viewBox="0 0 24 24" className={`h-4 w-4 ${isDark ? "text-neutral-500" : "text-neutral-400"}`} fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <button className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${isDark ? "bg-white/5 text-neutral-400 hover:bg-white/10" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
          Last 7 days <ChevronDownIcon className="h-3 w-3" />
        </button>
      </div>
      <p className={`mt-4 text-2xl font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>{value}</p>
      <p className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>11 May 2021 - 18 May 2021</p>
      
      {/* Graphique SVG simplifié */}
      <div className="mt-6 h-32 w-full">
        <svg viewBox="0 0 400 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path d={`${path} L 400 100 L 0 100 Z`} fill={`url(#grad-${title})`} />
          <path d={path} fill="none" stroke={isDark ? "#ffffff" : "#171717"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {/* Axe X */}
      <div className={`mt-2 flex justify-between text-[10px] font-medium ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
        <span>11 May</span><span>12 May</span><span>13 May</span><span>14 May</span><span>15 May</span><span>16 May</span><span>17 May</span>
      </div>
    </div>
  );
}

function TaskCard({ 
  title, 
  icon, 
  completion, 
  isCompleted, 
  data, 
  isDark 
}: { 
  title: string; 
  icon: React.ReactNode; 
  completion: number; 
  isCompleted?: boolean; 
  data: any[]; 
  isDark: boolean 
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${isDark ? "border-white/10 bg-[#141416]" : "border-black/[0.06] bg-white"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${isDark ? "border-white/10 text-neutral-300" : "border-neutral-200 text-neutral-600"}`}>
            {icon}
          </div>
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>{title}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={isDark ? "text-neutral-400" : "text-neutral-500"}>
            {isCompleted ? "Completed" : "Completing:"}
          </span>
          {!isCompleted && <span className={`font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>{completion}%</span>}
          <button className={`ml-2 rounded-full p-1 ${isDark ? "hover:bg-white/10" : "hover:bg-neutral-100"}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Barre de progression */}
      {!isCompleted && (
        <div className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-neutral-100"}`}>
          <div className={`h-full rounded-full ${isDark ? "bg-white" : "bg-neutral-900"}`} style={{ width: `${completion}%` }} />
        </div>
      )}

      {/* Tableau */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className={`border-b ${isDark ? "border-white/10" : "border-neutral-100"}`}>
              <th className={`pb-2 font-medium ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>Company name</th>
              <th className={`pb-2 font-medium ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>Follows</th>
              <th className={`pb-2 font-medium ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>Number sales</th>
              <th className={`pb-2 font-medium ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>Earned</th>
              <th className={`pb-2 font-medium ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>Start date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={`border-b last:border-0 ${isDark ? "border-white/5" : "border-neutral-50"}`}>
                <td className={`py-3 font-medium ${isDark ? "text-white" : "text-neutral-900"}`}>{row.company}</td>
                <td className={`py-3 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>{row.follows}</td>
                <td className={`py-3 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>{row.sales}</td>
                <td className={`py-3 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>{row.earned}</td>
                <td className={`py-3 ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>{row.startDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- FIN DES NOUVEAUX COMPOSANTS ---

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  const connectedChannels = useConnectedChannels();
  
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
    return () => { mounted = false; };
  }, []);

  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const initials = `${(user?.first_name || "")[0] || ""}${(user?.last_name || "")[0] || ""}`.toUpperCase() || "U";

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

  // Données mockées pour les tâches (issues de l'image)
  const tasksData = [
    {
      id: 1,
      title: "Auto Following",
      icon: <UserTaskIcon />,
      completion: 76,
      isCompleted: false,
      data: [
        { company: "My campaign 01", follows: "123", sales: "12", earned: "$ 2367", startDate: "13/04" }
      ]
    },
    {
      id: 2,
      title: "Boost comments",
      icon: <ChatIcon />,
      completion: 28,
      isCompleted: false,
      data: [
        { company: "My campaign 03", follows: "245", sales: "64", earned: "$ 1885", startDate: "18/03" }
      ]
    },
    {
      id: 3,
      title: "Auto Following",
      icon: <UserTaskIcon />,
      completion: 100,
      isCompleted: true,
      data: [
        { company: "My campaign 02", follows: "481", sales: "13", earned: "$ 9815", startDate: "09/02" }
      ]
    }
  ];

  return (
    <main
      className={[
        "relative h-screen w-full overflow-hidden transition-colors duration-500",
        isDark ? "bg-[#09090a]" : "bg-[#f3f1ed]",
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} />

      <div className="h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="mx-auto flex h-full w-full max-w-[1320px] flex-col px-[clamp(16px,3vw,40px)] pb-[96px] pt-[clamp(14px,2vw,24px)] overflow-y-auto">
          
          {/* En-tête : Profil + Statistiques + Bouton */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className={`flex items-center gap-3 rounded-full border p-2 pr-4 ${isDark ? "border-white/10 bg-[#141416]" : "border-black/[0.06] bg-white"}`}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${isDark ? "bg-white/10 text-white" : "bg-neutral-900 text-white"}`}>
                  {initials}
                </div>
              )}
              <div className="flex flex-col">
                <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-neutral-900"}`}>{fullName || "Danny Poser"}</span>
                <span className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>@ui.fucker</span>
              </div>
              <ChevronDownIcon className={`h-4 w-4 ml-2 ${isDark ? "text-neutral-400" : "text-neutral-500"}`} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatCard icon={<StarIcon className="h-5 w-5" />} title="Reviews" value="485" change="+ 2%" isDark={isDark} />
              <StatCard icon={<UsersIcon className="h-5 w-5" />} title="Total Followers" value="27K" change="- 2%" isDark={isDark} />
              <StatCard icon={<HeartIcon className="h-5 w-5" />} title="Total Likes" value="12445" change="+ 16%" isDark={isDark} />
              
              <button className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${isDark ? "bg-white text-neutral-900 hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}>
                <PlusIcon className="h-4 w-4" />
                Create New Task
              </button>
            </div>
          </div>

          {/* Grille principale */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            
            {/* Colonne Gauche : Graphiques */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              <ChartCard title="Sales" value="6 items" isDark={isDark} />
              <ChartCard title="Revenue" value="£100.5" isDark={isDark} />
            </div>

            {/* Colonne Droite : Tâches */}
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-neutral-900"}`}>Running Tasks</h2>
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 ${isDark ? "text-neutral-500" : "text-neutral-400"}`} fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                </div>
                <button className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${isDark ? "bg-white/5 text-neutral-400 hover:bg-white/10" : "bg-white text-neutral-600 border border-black/[0.06] hover:bg-neutral-50"}`}>
                  Last 7 days <ChevronDownIcon className="h-3 w-3" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {tasksData.map((task) => (
                  <TaskCard 
                    key={task.id}
                    title={task.title}
                    icon={task.icon}
                    completion={task.completion}
                    isCompleted={task.isCompleted}
                    data={task.data}
                    isDark={isDark}
                  />
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

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