import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

/* ──────────────────────────────────────────────────────────────
   Composants UI pour le Dashboard
   ────────────────────────────────────────────────────────────── */

// Carte de projet (en haut)
function ProjectCard({
  date,
  title,
  progress,
  daysLeft,
  gradient,
}: {
  date: string;
  title: string;
  progress: number;
  daysLeft: string;
  gradient: string;
}) {
  return (
    <div
      className={`relative flex flex-col justify-between rounded-[24px] p-5 text-white shadow-sm ${gradient}`}
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

// Carte d'activité (graphique)
function ActivityCard() {
  return (
    <div className="col-span-2 rounded-[24px] bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-800">Activity</h3>
      
      <div className="relative h-40 w-full">
        {/* Lignes pointillées verticales */}
        <div className="absolute inset-0 flex justify-between">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="flex h-full flex-col items-center justify-end">
              <div className="h-full w-px border-l border-dashed border-gray-200" />
            </div>
          ))}
        </div>

        {/* Graphique SVG (Vague) */}
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
          <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-800 shadow-md">
            4 <span className="text-[10px] font-normal text-gray-500">Tasks</span>
          </div>
          <div className="mt-1 h-16 w-px border-l border-dashed border-gray-400" />
          <div className="h-2 w-2 rounded-full bg-violet-500" />
        </div>

        {/* Étiquettes de l'axe X */}
        <div className="absolute bottom-0 left-0 flex w-full justify-between px-2 text-[10px] font-medium text-gray-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Petites cartes de statistiques
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-end gap-1">
        <div className="h-6 w-1.5 rounded-full bg-emerald-400" />
        <div className="h-4 w-1.5 rounded-full bg-emerald-300" />
        <div className="h-8 w-1.5 rounded-full bg-emerald-500" />
      </div>
      <span className="text-xl font-bold text-gray-800">{value}</span>
      <span className="text-[11px] font-medium text-gray-400">{label}</span>
    </div>
  );
}

// Liste des membres
function MemberList() {
  const members = [
    { name: "Emma Shin", img: "https://i.pravatar.cc/150?img=1" },
    { name: "Jimbabe", img: "https://i.pravatar.cc/150?img=2" },
    { name: "Natalia syan", img: "https://i.pravatar.cc/150?img=5" },
    { name: "Sunjin", img: "https://i.pravatar.cc/150?img=8" },
  ];

  return (
    <div className="flex flex-col rounded-[24px] bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-800">List Member</h3>
      <div className="flex flex-col gap-3">
        {members.map((member) => (
          <div key={member.name} className="flex items-center gap-3">
            <img
              src={member.img}
              alt={member.name}
              className="h-9 w-9 rounded-full object-cover"
            />
            <span className="text-[13px] font-medium text-gray-600">
              {member.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Page Principale (Dashboard)
   ────────────────────────────────────────────────────────────── */

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [searchQuery, setSearchQuery] = useState("");

  // Données statiques pour correspondre à l'image
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
      className={`min-h-screen w-full transition-colors duration-500 ${
        isDark ? "bg-[#09090a] text-white" : "bg-[#f3f4f6] text-gray-900"
      }`}
    >
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Monday, 13 Jun 2020</p>
          </div>

          <div className="relative w-full max-w-xs">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-full py-2 pl-10 pr-4 text-sm outline-none transition ${
                isDark
                  ? "bg-[#1a1a1c] text-white placeholder-gray-500 focus:bg-[#222225]"
                  : "bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-violet-500"
              }`}
            />
          </div>
        </div>

        {/* Grille principale */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Cartes de projet (en haut) */}
          <div className="col-span-1 lg:col-span-3">
            <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Bouton flottant "+" */}
              <button className="absolute -left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-800 shadow-md transition hover:scale-105">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {projects.map((project) => (
                <ProjectCard key={project.title} {...project} />
              ))}
            </div>
          </div>

          {/* Ligne du bas : Activité + Stats + Membres */}
          <div className="col-span-1 lg:col-span-3">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {/* Activité (prend 2 colonnes) */}
              <div className="lg:col-span-2">
                <ActivityCard />
              </div>

              {/* Stats + Membres (prend 2 colonnes) */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  <StatCard value="10+" label="Project" />
                  <StatCard value="40+" label="Client" />
                </div>
                <MemberList />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}