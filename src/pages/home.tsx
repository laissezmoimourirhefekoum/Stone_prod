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
  ThreadsIcon,
} from "../components/IntegrationIcons";

/* -------------------------------------------------------------------------- */
/*  Thème « atelier d'impression » : papier bleuté, encre indigo,             */
/*  ombres décalées. Un seul bloc coloré fort : le bouton de création.        */
/* -------------------------------------------------------------------------- */

const SIDEBAR_OFFSET = 104;

const PALETTE = {
  light: {
    "--paper": "#eceeff",
    "--surface": "#ffffff",
    "--ink": "#15133d",
    "--muted": "#5b5a82",
    "--blue": "#3a47f5",
    "--on-blue": "#ffffff",
    "--pink": "#ff8dc0",
    "--sun": "#ffd84a",
  },
  dark: {
    "--paper": "#12112b",
    "--surface": "#1c1a42",
    "--ink": "#f2f1ff",
    "--muted": "#a5a3d1",
    "--blue": "#7c87ff",
    "--on-blue": "#12112b",
    "--pink": "#ff8dc0",
    "--sun": "#ffd84a",
  },
} as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]";

const panel =
  "rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)]";

const userProfileCache = { profile: null as UserProfile | null };

type SocialNetworkKey =
  | "x"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "threads";

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
  threads: ThreadsIcon as (props: { className?: string }) => JSX.Element,
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
  if (raw.includes("threads")) return "threads";
  if (raw === "x" || raw.includes("twitter")) return "x";
  return null;
}

/* ------------------------------- Statistiques ------------------------------ */

const FOLLOWER_KEYS = [
  "followers",
  "followersCount",
  "followers_count",
  "subscribers",
  "subscribersCount",
];

// null = donnée absente (affichée « — » plutôt qu'un faux 0)
function readStat(channel: ConnectedChannel, keys: string[]): number | null {
  const c = channel as unknown as Record<string, unknown>;
  for (const key of keys) {
    const v = c[key];
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatStat = (n: number | null) =>
  n === null ? "—" : numberFormatter.format(n);

function computeTotals(channels: ConnectedChannel[]) {
  return channels.reduce(
    (acc, ch) => ({
      followers: acc.followers + (readStat(ch, FOLLOWER_KEYS) ?? 0),
      likes: acc.likes + (readStat(ch, ["likes", "likesCount", "likes_count"]) ?? 0),
      comments:
        acc.comments +
        (readStat(ch, ["comments", "commentsCount", "comments_count"]) ?? 0),
    }),
    { followers: 0, likes: 0, comments: 0 }
  );
}

function useIsDesktop() {
  const query = "(min-width: 768px)";
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return matches;
}

const getGreeting = (d = new Date()) =>
  d.getHours() >= 18 || d.getHours() < 5 ? "Bonsoir" : "Bonjour";

/* --------------------------------- En-tête --------------------------------- */

function GreetingAvatar({
  avatarUrl,
  initials,
}: {
  avatarUrl?: string | null;
  initials: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [avatarUrl]);

  return avatarUrl && !failed ? (
    <img
      key={avatarUrl}
      src={avatarUrl}
      alt="Votre profil"
      onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded-xl border-2 border-[var(--ink)] object-cover"
    />
  ) : (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--pink)] text-[14px] font-bold text-[#15133d]">
      {initials}
    </div>
  );
}

function ClockDisplay() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <time
      dateTime={now.toISOString()}
      className="flex flex-col items-end text-[var(--ink)]"
    >
      <span className="font-display text-[26px] font-bold leading-none tabular-nums">
        {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="mt-1 text-[12px] font-medium capitalize text-[var(--muted)]">
        {now.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </span>
    </time>
  );
}

/* ------------------------------ Chiffres clés ------------------------------ */

function StatsStrip({
  totals,
  networkCount,
}: {
  totals: { followers: number; likes: number; comments: number };
  networkCount: number;
}) {
  const items = [
    { label: "Abonnés", value: totals.followers, dot: "bg-[var(--blue)]" },
    { label: "Likes", value: totals.likes, dot: "bg-[var(--pink)]" },
    { label: "Commentaires", value: totals.comments, dot: "bg-[var(--sun)]" },
  ];

  return (
    <section aria-label="Vue d'ensemble" className={`${panel} p-5`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold">Vue d'ensemble</h2>
        <p className="text-[12.5px] font-medium text-[var(--muted)]">
          {networkCount > 0
            ? `Total de ${networkCount} réseau${networkCount > 1 ? "x" : ""}`
            : "Connectez un réseau pour voir vos chiffres"}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--muted)]">
              <span className={`h-2.5 w-2.5 rounded-sm border border-[var(--ink)] ${item.dot}`} />
              {item.label}
            </dt>
            <dd className="mt-1 font-display text-[clamp(34px,4vw,52px)] font-bold leading-none tracking-[-0.03em] tabular-nums">
              {networkCount === 0 ? "—" : numberFormatter.format(item.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------------------------- Série de publications ------------------------ */

const WEEKDAYS_FR_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function StreakCard({ streakCount = 0 }: { streakCount?: number }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { label: WEEKDAYS_FR_SHORT[d.getDay()], isToday: i === 6 };
  });

  return (
    <section aria-label="Série de publications" className={`${panel} p-5`}>
      <p className="font-display text-[30px] font-bold leading-none">
        {streakCount} {streakCount > 1 ? "jours" : "jour"}
      </p>
      <p className="mt-1.5 text-[12.5px] font-medium text-[var(--muted)]">
        {streakCount > 0
          ? "de publication d'affilée"
          : "Publiez aujourd'hui pour lancer votre série"}
      </p>

      <ul className="mt-5 flex justify-between gap-1.5" aria-label="7 derniers jours">
        {days.map(({ label, isToday }, index) => {
          const done = index >= 7 - streakCount;
          return (
            <li key={index} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className={[
                  "text-[11px] font-bold leading-none",
                  isToday ? "text-[var(--ink)]" : "text-[var(--muted)]",
                ].join(" ")}
              >
                {label}
              </span>
              <span
                role="img"
                aria-label={
                  done ? "Publié" : isToday ? "Aujourd'hui, pas encore publié" : "Aucune publication"
                }
                className={[
                  "aspect-square w-full max-w-[34px] rounded-lg border-2",
                  done
                    ? "border-[var(--ink)] bg-[var(--sun)]"
                    : isToday
                      ? "border-dashed border-[var(--ink)]"
                      : "border-[var(--ink)]/20",
                ].join(" ")}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* -------------------------------- Réseaux ---------------------------------- */

function ChannelAvatar({
  channel,
  NetworkIcon,
}: {
  channel: ConnectedChannel;
  NetworkIcon?: (props: { className?: string }) => JSX.Element;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [channel.avatarUrl]);

  const label = channel.handle || channel.name;
  const initial = label.replace(/^@/, "").charAt(0).toUpperCase() || "?";

  return (
    <div className="relative h-10 w-10 shrink-0">
      {channel.avatarUrl && !failed ? (
        <img
          src={channel.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-xl border-2 border-[var(--ink)] object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--pink)] text-[14px] font-bold text-[#15133d]">
          {initial}
        </div>
      )}
      {NetworkIcon && (
        <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-md border-2 border-[var(--ink)] bg-white text-black">
          <NetworkIcon className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

function ChannelsCard({ channels }: { channels: ConnectedChannel[] }) {
  const count = channels.length;

  return (
    <section aria-label="Réseaux connectés" className={`${panel} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold">Réseaux connectés</h2>
          <p className="mt-0.5 text-[12.5px] font-medium text-[var(--muted)]">
            {count > 0
              ? `${count} réseau${count > 1 ? "x" : ""} connecté${count > 1 ? "s" : ""}`
              : "Aucun réseau pour le moment"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("channels")}
          className={`rounded-lg border-2 border-[var(--ink)] px-3 py-1.5 text-[12.5px] font-bold transition hover:bg-[var(--ink)] hover:text-[var(--surface)] ${focusRing}`}
        >
          Connecter un réseau
        </button>
      </div>

      {count === 0 ? (
        <button
          type="button"
          onClick={() => navigate("channels")}
          className={`mt-4 flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-[var(--ink)]/40 py-8 text-center transition hover:border-[var(--ink)] ${focusRing}`}
        >
          <span className="text-[14px] font-bold">Connectez votre premier réseau</span>
          <span className="text-[12.5px] font-medium text-[var(--muted)]">
            Reliez un canal pour commencer à publier
          </span>
        </button>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--ink)]/15">
          {channels.map((channel) => {
            const networkId = getNetworkId(channel);
            const NetworkIcon = networkId ? NETWORK_ICONS[networkId] : undefined;
            const followers = readStat(channel, FOLLOWER_KEYS);
            return (
              <li key={channel.key} className="flex items-center gap-3 py-3">
                <ChannelAvatar channel={channel} NetworkIcon={NetworkIcon} />
                <p className="min-w-0 flex-1 truncate text-[14px] font-bold">
                  {channel.handle || channel.name}
                </p>
                <p className="text-[13px] font-medium tabular-nums text-[var(--muted)]">
                  {formatStat(followers)} abonnés
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------- Action principale (le bloc fort) ---------------- */

function ComposeCard({ onPlan }: { onPlan: () => void }) {
  return (
    <section
      aria-label="Nouvelle publication"
      className="flex flex-col justify-between gap-8 rounded-2xl border-2 border-[var(--ink)] bg-[var(--blue)] p-5 text-[var(--on-blue)] shadow-[6px_6px_0_0_var(--ink)]"
    >
      <div>
        <p className="font-display text-[26px] font-bold leading-[1.1] tracking-[-0.02em]">
          Une idée de publication ?
        </p>
        <p className="mt-2 text-[13px] font-medium opacity-80">
          Rédigez-la maintenant ou planifiez-la sur vos réseaux.
        </p>
      </div>

      <button
        type="button"
        onClick={onPlan}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--sun)] py-3 text-[14px] font-bold text-[#15133d] transition hover:-translate-y-0.5 motion-reduce:transition-none ${focusRing}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nouvelle publication
        <kbd className="ml-1 rounded border border-[#15133d]/40 px-1.5 text-[11px]">N</kbd>
      </button>
    </section>
  );
}

/* ---------------------------------- Blog ----------------------------------- */

type BlogPost = { title: string; date: string; imageUrl: string; href: string };

const blogPosts: BlogPost[] = [
  {
    title: "Créer une stratégie de réseaux sociaux en 2026 : le guide en 7 étapes",
    date: "2026-07-24",
    imageUrl: "https://picsum.photos/seed/stone-blog-strategy/240/240",
    href: "#",
  },
  {
    title: "17 meilleurs outils d'IA pour créer du contenu (testés en 2026)",
    date: "2026-08-03",
    imageUrl: "https://picsum.photos/seed/stone-blog-ai-tools/240/240",
    href: "#",
  },
  {
    title: "Gérer plusieurs comptes sociaux : 7 conseils de pro",
    date: "2026-07-06",
    imageUrl: "https://picsum.photos/seed/stone-blog-multi-account/240/240",
    href: "#",
  },
];

function BlogSection() {
  return (
    <section aria-label="Dernières lectures" className="mt-auto pt-8">
      <h2 className="text-[15px] font-bold text-[var(--ink)]">Dernières lectures</h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {blogPosts.map((post) => (
          <li key={post.title}>
            <a
              href={post.href}
              target={post.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className={`group flex items-center gap-3 rounded-2xl border-2 border-transparent p-2 transition hover:border-[var(--ink)] hover:bg-[var(--surface)] ${focusRing}`}
            >
              <img
                src={post.imageUrl}
                alt=""
                loading="lazy"
                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                className="h-16 w-16 shrink-0 rounded-xl border-2 border-[var(--ink)] bg-[var(--pink)] object-cover"
              />
              <div className="min-w-0">
                <p className="line-clamp-2 text-[13.5px] font-bold leading-snug text-[var(--ink)]">
                  {post.title}
                </p>
                <p className="mt-1 text-[12px] font-medium text-[var(--muted)]">
                  {new Date(post.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------- Page ----------------------------------- */

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isDesktop = useIsDesktop();
  const offset = isDesktop ? SIDEBAR_OFFSET : 0;

  const [query, setQuery] = useState("");
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  const connectedChannels = useConnectedChannels();
  const totals = useMemo(() => computeTotals(connectedChannels), [connectedChannels]);

  const [user, setUser] = useState<UserProfile | null>(userProfileCache.profile);
  const [loadingUser, setLoadingUser] = useState(!userProfileCache.profile);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userData = await getCurrentUser();
        if (mounted && userData) {
          userProfileCache.profile = userData;
          setUser(userData);
        }
      } catch (error) {
        console.error("Error loading user on Home:", error);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Raccourcis : N = nouvelle publication, Échap = fermer le dossier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setIsFolderOpen(false);
        setIsNewPostOpen(true);
      }
      if (e.key === "Escape") setIsFolderOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const initials =
    `${(user?.first_name || "")[0] || ""}${(user?.last_name || "")[0] || ""}`.toUpperCase() || "U";

  const handleCreatePost = async (payload: NewPostPayload) => {
    console.log("Nouveau post à envoyer :", payload);
  };

  const handleBottomBarChange = (id: BottomBarTab) => {
    if (id === "add") {
      setIsFolderOpen(false);
      setIsNewPostOpen(true);
    } else if (id === "files") {
      setIsFolderOpen((open) => !open);
    }
  };

  return (
    <main
      style={PALETTE[isDark ? "dark" : "light"] as React.CSSProperties}
      className="relative h-screen w-full overflow-hidden bg-[var(--paper)] text-[var(--ink)] transition-colors duration-300 motion-reduce:transition-none"
    >
      <DashboardSidebar theme={theme} />

      <div className="h-full" style={{ paddingLeft: offset }}>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1240px] flex-col gap-5 px-[clamp(16px,3vw,40px)] pb-[112px] pt-[clamp(16px,2.4vw,32px)]">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <GreetingAvatar avatarUrl={user?.avatar_url} initials={initials} />
                <h1 className="font-display text-[clamp(24px,2.8vw,34px)] font-bold tracking-[-0.02em]">
                  {getGreeting()}
                  {loadingUser ? (
                    <span className="ml-2 inline-block h-6 w-28 animate-pulse rounded-md bg-[var(--ink)]/10 align-middle" />
                  ) : (
                    fullName && `, ${fullName}`
                  )}
                </h1>
              </div>
              <ClockDisplay />
            </header>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Action principale en premier sur mobile */}
              <div className="order-first flex flex-col gap-5 lg:order-last lg:col-span-4">
                <ComposeCard onPlan={() => setIsNewPostOpen(true)} />
                <StreakCard />
              </div>

              <div className="flex flex-col gap-5 lg:col-span-8">
                <StatsStrip totals={totals} networkCount={connectedChannels.length} />
                <ChannelsCard channels={connectedChannels} />
              </div>
            </div>

            <BlogSection />
          </div>
        </div>
      </div>

      <Folder
        isOpen={isFolderOpen}
        onClose={() => setIsFolderOpen(false)}
        isDark={isDark}
        offsetLeft={offset}
      />

      <BottomBar
        isDark={isDark}
        offsetLeft={offset}
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