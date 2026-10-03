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

const SIDEBAR_OFFSET = 104;
const userProfileCache = { profile: null as UserProfile | null };

type IconFC = (props: { className?: string }) => JSX.Element;
type NetworkKey =
  | "x" | "facebook" | "instagram" | "linkedin"
  | "tiktok" | "youtube" | "pinterest" | "threads";

const NETWORK_ICONS: Record<NetworkKey, IconFC> = {
  x: XIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
  threads: ThreadsIcon as IconFC,
};

function getNetworkId(channel: ConnectedChannel): NetworkKey | null {
  const c = channel as unknown as Record<string, unknown>;
  const raw = String(c.platform ?? c.network ?? c.provider ?? channel.key).toLowerCase().trim();
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

/* ------------------------------ Données ------------------------------ */

const FOLLOWER_KEYS = ["followers", "followersCount", "followers_count", "subscribers", "subscribersCount"];
const LIKE_KEYS = ["likes", "likesCount", "likes_count"];
const COMMENT_KEYS = ["comments", "commentsCount", "comments_count"];

function readStat(channel: ConnectedChannel, keys: string[]): number {
  const c = channel as unknown as Record<string, unknown>;
  for (const key of keys) {
    const v = c[key];
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

const fmt = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });

function computeTotals(channels: ConnectedChannel[]) {
  return channels.reduce(
    (a, ch) => ({
      followers: a.followers + readStat(ch, FOLLOWER_KEYS),
      likes: a.likes + readStat(ch, LIKE_KEYS),
      comments: a.comments + readStat(ch, COMMENT_KEYS),
    }),
    { followers: 0, likes: 0, comments: 0 }
  );
}

/* Publications planifiées : à brancher sur vos données.
   date = "YYYY-MM-DD" */
type Scheduled = { date: string; network: NetworkKey; title: string; time?: string };
const SCHEDULED: Scheduled[] = [];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* ------------------------------ Thème ------------------------------ */

function tone(isDark: boolean) {
  return {
    text: isDark ? "text-white" : "text-neutral-900",
    muted: isDark ? "text-neutral-400" : "text-neutral-500",
    faint: isDark ? "text-neutral-600" : "text-neutral-400",
    surface: isDark ? "border-white/10 bg-[#141416]" : "border-black/[0.06] bg-white",
    soft: isDark ? "bg-white/[0.06]" : "bg-black/[0.045]",
    dashed: isDark ? "border-white/15" : "border-black/15",
    focus:
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
      (isDark
        ? "focus-visible:ring-white focus-visible:ring-offset-[#09090a]"
        : "focus-visible:ring-neutral-900 focus-visible:ring-offset-[#f3f1ed]"),
  };
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/* ------------------------------ En-tête ------------------------------ */

function Avatar({ src, label, isDark, size = 40 }: { src?: string | null; label: string; isDark: boolean; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const style = { width: size, height: size };
  return src && !failed ? (
    <img
      src={src}
      alt=""
      style={style}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full object-cover"
    />
  ) : (
    <div
      style={{ ...style, fontSize: size * 0.34 }}
      className={[
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        isDark ? "bg-[#2a2a2d] text-white" : "bg-neutral-900 text-white",
      ].join(" ")}
    >
      {label.replace(/^@/, "").slice(0, 2).toUpperCase() || "?"}
    </div>
  );
}

function Hero({
  isDark,
  hello,
  firstName,
  user,
  totals,
  plannedThisWeek,
  onCompose,
}: {
  isDark: boolean;
  hello: string;
  firstName: string;
  user: UserProfile | null;
  totals: { followers: number; likes: number; comments: number };
  plannedThisWeek: number;
  onCompose: () => void;
}) {
  const t = tone(isDark);
  const stats = [
    { label: "abonnés", value: totals.followers },
    { label: "likes", value: totals.likes },
    { label: "commentaires", value: totals.comments },
  ];
  const initials = `${(user?.first_name || "")[0] || ""}${(user?.last_name || "")[0] || ""}` || "U";

  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar_url} label={initials} isDark={isDark} size={44} />
          <p className={["text-[14px] font-medium", t.muted].join(" ")}>
            {plannedThisWeek > 0
              ? `${plannedThisWeek} publication${plannedThisWeek > 1 ? "s" : ""} prévue${plannedThisWeek > 1 ? "s" : ""} cette semaine`
              : "Rien de prévu cette semaine"}
          </p>
        </div>
        <h1
          className={[
            "mt-4 font-display text-[clamp(38px,5.6vw,72px)] font-semibold leading-[0.98] tracking-[-0.045em]",
            t.text,
          ].join(" ")}
        >
          {hello}
          {firstName ? `, ${firstName}` : ""}.
        </h1>

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <dd className={["font-display text-[26px] font-semibold tabular-nums tracking-[-0.02em]", s.value > 0 ? t.text : t.faint].join(" ")}>
                {s.value > 0 ? fmt.format(s.value) : "0"}
              </dd>
              <dt className={["text-[13px] font-medium", t.muted].join(" ")}>{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <button
        type="button"
        onClick={onCompose}
        className={[
          "inline-flex shrink-0 items-center justify-center gap-2.5 self-start rounded-full px-7 py-4 text-[15px] font-semibold transition active:scale-[0.98] lg:self-auto",
          isDark ? "bg-white text-neutral-900 hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-800",
          t.focus,
        ].join(" ")}
      >
        <PlusIcon className="h-[18px] w-[18px]" />
        Nouvelle publication
      </button>
    </header>
  );
}

/* ------------------------------ Planning de la semaine ------------------------------ */

function WeekPlanner({
  isDark,
  now,
  onCompose,
}: {
  isDark: boolean;
  now: Date;
  onCompose: () => void;
}) {
  const t = tone(isDark);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(todayStart);
  monday.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <section aria-labelledby="planner-title">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="planner-title" className={["text-[18px] font-semibold tracking-[-0.01em]", t.text].join(" ")}>
          Votre semaine
        </h2>
        <p className={["text-[13px] font-medium capitalize", t.muted].join(" ")}>{monthLabel}</p>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-7 lg:overflow-visible">
        {days.map((d) => {
          const key = dayKey(d);
          const isToday = d.getTime() === todayStart.getTime();
          const isPast = d.getTime() < todayStart.getTime();
          const items = SCHEDULED.filter((s) => s.date === key);

          return (
            <div
              key={key}
              className={[
                "flex min-h-[220px] w-[132px] shrink-0 snap-start flex-col rounded-[22px] p-3 lg:w-auto",
                isToday
                  ? isDark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white"
                  : ["border", t.surface, isPast ? "opacity-60" : ""].join(" "),
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between">
                <span className={["text-[12.5px] font-semibold capitalize", isToday ? "" : t.muted].join(" ")}>
                  {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                </span>
                {isToday && <span className="text-[11px] font-semibold opacity-60">Aujourd'hui</span>}
              </div>
              <p
                className={[
                  "mt-0.5 font-display text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums",
                  isToday ? "" : t.text,
                ].join(" ")}
              >
                {d.getDate()}
              </p>

              <div className="mt-3 flex flex-1 flex-col gap-1.5">
                {items.map((s, i) => {
                  const Icon = NETWORK_ICONS[s.network];
                  return (
                    <div
                      key={i}
                      className={["flex items-center gap-2 rounded-xl px-2 py-1.5", isToday ? (isDark ? "bg-neutral-900/10" : "bg-white/15") : t.soft].join(" ")}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-black ring-1 ring-black/10">
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="truncate text-[12px] font-medium">{s.title}</span>
                    </div>
                  );
                })}

                {!isPast && (
                  <button
                    type="button"
                    onClick={onCompose}
                    aria-label={`Planifier le ${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`}
                    className={[
                      "mt-auto flex flex-1 items-center justify-center rounded-2xl border border-dashed text-[12px] font-semibold transition",
                      items.length > 0 ? "min-h-[36px] flex-none" : "min-h-[72px]",
                      isToday
                        ? isDark
                          ? "border-neutral-900/25 hover:bg-neutral-900/[0.06]"
                          : "border-white/30 hover:bg-white/10"
                        : [t.dashed, t.muted, isDark ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.03]"].join(" "),
                    ].join(" ")}
                  >
                    <PlusIcon className="mr-1 h-3.5 w-3.5" />
                    Planifier
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------ Réseaux ------------------------------ */

function Channels({ isDark, channels }: { isDark: boolean; channels: ConnectedChannel[] }) {
  const t = tone(isDark);
  return (
    <section aria-labelledby="channels-title">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="channels-title" className={["text-[18px] font-semibold tracking-[-0.01em]", t.text].join(" ")}>
          Vos réseaux
        </h2>
        {channels.length > 0 && (
          <button type="button" onClick={() => navigate("channels")} className={["rounded text-[13px] font-semibold underline underline-offset-4", t.muted, t.focus].join(" ")}>
            Gérer
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {channels.map((channel) => {
          const id = getNetworkId(channel);
          const Icon = id ? NETWORK_ICONS[id] : undefined;
          const followers = readStat(channel, FOLLOWER_KEYS);
          return (
            <div key={channel.key} className={["flex items-center gap-3 rounded-full border py-1.5 pl-1.5 pr-5", t.surface].join(" ")}>
              <div className="relative">
                <Avatar src={channel.avatarUrl} label={channel.handle || channel.name} isDark={isDark} size={38} />
                {Icon && (
                  <span className={["absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-black ring-2", isDark ? "ring-[#141416]" : "ring-white"].join(" ")}>
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
              <div className="min-w-0 leading-tight">
                <p className={["max-w-[140px] truncate text-[13.5px] font-semibold", t.text].join(" ")}>
                  {channel.handle || channel.name}
                </p>
                <p className={["text-[12px] font-medium tabular-nums", t.muted].join(" ")}>
                  {fmt.format(followers)} abonnés
                </p>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => navigate("channels")}
          className={[
            "flex items-center gap-2 rounded-full border border-dashed px-5 py-3 text-[13.5px] font-semibold transition",
            t.dashed,
            t.text,
            isDark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.03]",
            t.focus,
          ].join(" ")}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          {channels.length > 0 ? "Ajouter un réseau" : "Connecter votre premier réseau"}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------ Blog ------------------------------ */

type BlogPost = { title: string; date: string; imageUrl: string; href: string };

const BLOG_POSTS: BlogPost[] = [
  {
    title: "How to Create a Social Media Marketing Strategy in 2026 — 7-Step Guide",
    date: "24 juil. 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-strategy/640/400",
    href: "#",
  },
  {
    title: "17 Best AI Tools for Social Media Content Creation (Tested for 2026)",
    date: "3 août 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-ai-tools/640/400",
    href: "#",
  },
  {
    title: "How to Manage Multiple Social Media Accounts: 7 Tips to Do It Like a Pro",
    date: "6 juil. 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-multi-account/640/400",
    href: "#",
  },
];

function Blog({ isDark }: { isDark: boolean }) {
  const t = tone(isDark);
  return (
    <section aria-labelledby="blog-title">
      <h2 id="blog-title" className={["mb-3 text-[18px] font-semibold tracking-[-0.01em]", t.text].join(" ")}>
        À lire
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <a key={post.title} href={post.href} className={["group block rounded-2xl", t.focus].join(" ")}>
            <div className="aspect-[8/5] overflow-hidden rounded-2xl">
              <img
                src={post.imageUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
            </div>
            <p className={["mt-3 line-clamp-2 text-[14px] font-semibold leading-snug", t.text].join(" ")}>
              {post.title}
            </p>
            <p className={["mt-1 text-[12px] font-medium", t.muted].join(" ")}>{post.date}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const now = useNow();
  const [query, setQuery] = useState("");
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  const connectedChannels = useConnectedChannels();
  const totals = useMemo(() => computeTotals(connectedChannels), [connectedChannels]);
  const [user, setUser] = useState<UserProfile | null>(userProfileCache.profile);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getCurrentUser();
        if (mounted && data) {
          userProfileCache.profile = data;
          setUser(data);
        }
      } catch (error) {
        console.error("Error loading user on Home:", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const hour = now.getHours();
  const hello = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";

  const plannedThisWeek = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const keys = new Set(
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return dayKey(d);
      })
    );
    return SCHEDULED.filter((s) => keys.has(s.date)).length;
  }, [now]);

  const openCompose = () => {
    setIsFolderOpen(false);
    setIsNewPostOpen(true);
  };

  const handleCreatePost = async (payload: NewPostPayload) => {
    console.log("Nouveau post à envoyer :", payload);
  };

  const handleBottomBarChange = (id: BottomBarTab) => {
    if (id === "add") openCompose();
    if (id === "files") setIsFolderOpen((open) => !open);
  };

  return (
    <main
      className={[
        "relative h-screen w-full overflow-hidden transition-colors duration-500",
        isDark ? "bg-[#09090a]" : "bg-[#f3f1ed]",
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} />

      <div className="h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-[clamp(16px,3vw,40px)] pb-[130px] pt-[clamp(22px,3vw,44px)]">
            <Hero
              isDark={isDark}
              hello={hello}
              firstName={user?.first_name || ""}
              user={user}
              totals={totals}
              plannedThisWeek={plannedThisWeek}
              onCompose={openCompose}
            />
            <WeekPlanner isDark={isDark} now={now} onCompose={openCompose} />
            <Channels isDark={isDark} channels={connectedChannels} />
            <Blog isDark={isDark} />
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