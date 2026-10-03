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

/* ------------------------------ Thème ------------------------------ */

function tone(isDark: boolean) {
  return {
    text: isDark ? "text-white" : "text-neutral-900",
    muted: isDark ? "text-neutral-400" : "text-neutral-500",
    faint: isDark ? "text-neutral-500" : "text-neutral-400",
    surface: isDark ? "border-white/10 bg-[#141416]" : "border-black/[0.06] bg-white",
    soft: isDark ? "bg-white/[0.05]" : "bg-black/[0.04]",
    line: isDark ? "divide-white/10 border-white/10" : "divide-black/[0.07] border-black/[0.07]",
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

function CheckIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

/* ------------------------------ En-tête ------------------------------ */

function GreetingAvatar({ avatarUrl, initials, isDark }: { avatarUrl?: string | null; initials: string; isDark: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [avatarUrl]);
  return avatarUrl && !failed ? (
    <img
      src={avatarUrl}
      alt=""
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
    />
  ) : (
    <div
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
        isDark ? "bg-[#2a2a2d] text-white" : "bg-neutral-900 text-white",
      ].join(" ")}
    >
      {initials}
    </div>
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

/* ------------------------------ Composer (hero) ------------------------------ */

function Composer({
  isDark,
  channels,
  onCompose,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
  onCompose: () => void;
}) {
  const connected = channels
    .map((c) => getNetworkId(c))
    .filter((k, i, arr): k is NetworkKey => k !== null && arr.indexOf(k) === i);

  return (
    <section
      className={[
        "rounded-[28px] p-2",
        isDark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onCompose}
        className={[
          "group flex w-full items-center gap-4 rounded-[22px] px-5 py-5 text-left transition sm:px-7 sm:py-6",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
          isDark
            ? "hover:bg-neutral-100 focus-visible:ring-neutral-900"
            : "hover:bg-white/[0.06] focus-visible:ring-white",
        ].join(" ")}
      >
        <span
          className={[
            "min-w-0 flex-1 font-display text-[clamp(20px,2.4vw,30px)] font-semibold leading-tight tracking-[-0.02em]",
            isDark ? "text-neutral-500" : "text-neutral-400",
          ].join(" ")}
        >
          Qu'avez-vous envie de publier aujourd'hui ?
        </span>
        <span
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition group-hover:scale-105",
            isDark ? "bg-neutral-900 text-white" : "bg-white text-neutral-900",
          ].join(" ")}
        >
          <PlusIcon className="h-5 w-5" />
        </span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-1 sm:px-7">
        <p className={["text-[12.5px] font-medium", isDark ? "text-neutral-500" : "text-neutral-400"].join(" ")}>
          {connected.length > 0 ? "Publier sur" : "Aucun réseau connecté"}
        </p>
        {connected.length > 0 ? (
          <div className="flex items-center gap-1.5">
            {connected.map((key) => {
              const Icon = NETWORK_ICONS[key];
              return (
                <span key={key} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black ring-1 ring-black/10">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              );
            })}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate("channels")}
            className="text-[12.5px] font-semibold underline underline-offset-4"
          >
            Connecter un réseau
          </button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ Chiffres clés ------------------------------ */

function Stats({
  isDark,
  totals,
  networkCount,
}: {
  isDark: boolean;
  totals: { followers: number; likes: number; comments: number };
  networkCount: number;
}) {
  const t = tone(isDark);
  const items = [
    { label: "Abonnés", value: totals.followers },
    { label: "Likes", value: totals.likes },
    { label: "Commentaires", value: totals.comments },
  ];
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className={["text-[15px] font-semibold", t.text].join(" ")}>Votre audience</h2>
        <p className={["text-[12.5px] font-medium", t.muted].join(" ")}>
          {networkCount > 0
            ? `Cumul de ${networkCount} réseau${networkCount > 1 ? "x" : ""}`
            : "Les chiffres apparaîtront ici"}
        </p>
      </div>
      <dl className={["grid grid-cols-3 divide-x border-y", t.line].join(" ")}>
        {items.map((item, i) => (
          <div key={item.label} className={["py-5", i === 0 ? "pr-4" : "px-4 sm:px-6"].join(" ")}>
            <dt className={["text-[12.5px] font-medium", t.muted].join(" ")}>{item.label}</dt>
            <dd
              className={[
                "mt-1.5 font-display text-[clamp(30px,4vw,52px)] font-semibold leading-none tracking-[-0.03em] tabular-nums",
                item.value > 0 ? t.text : t.faint,
              ].join(" ")}
            >
              {item.value > 0 ? fmt.format(item.value) : "–"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------ Réseaux ------------------------------ */

function ChannelAvatar({ channel, isDark, Icon }: { channel: ConnectedChannel; isDark: boolean; Icon?: IconFC }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [channel.avatarUrl]);
  const label = channel.handle || channel.name;
  const ring = isDark ? "ring-[#141416]" : "ring-white";
  return (
    <div className="relative h-11 w-11 shrink-0">
      {channel.avatarUrl && !failed ? (
        <img
          src={channel.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div
          className={[
            "flex h-full w-full items-center justify-center rounded-full text-[14px] font-semibold",
            isDark ? "bg-[#2a2a2d] text-white" : "bg-neutral-900 text-white",
          ].join(" ")}
        >
          {label.replace(/^@/, "").charAt(0).toUpperCase() || "?"}
        </div>
      )}
      {Icon && (
        <span className={["absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black ring-2", ring].join(" ")}>
          <Icon className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

function Channels({ isDark, channels }: { isDark: boolean; channels: ConnectedChannel[] }) {
  const t = tone(isDark);
  const total = channels.reduce((s, c) => s + readStat(c, FOLLOWER_KEYS), 0);
  const sorted = [...channels].sort((a, b) => readStat(b, FOLLOWER_KEYS) - readStat(a, FOLLOWER_KEYS));

  return (
    <section className={["rounded-[24px] border", t.surface].join(" ")}>
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <h2 className={["text-[15px] font-semibold", t.text].join(" ")}>Vos réseaux</h2>
        <button
          type="button"
          onClick={() => navigate("channels")}
          className={["rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition", t.soft, t.text, t.focus].join(" ")}
        >
          {channels.length > 0 ? "Gérer" : "Connecter"}
        </button>
      </div>

      {channels.length === 0 ? (
        <div className="px-5 pb-6 pt-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(NETWORK_ICONS) as NetworkKey[]).map((key) => {
              const Icon = NETWORK_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`Connecter ${key}`}
                  onClick={() => navigate("channels")}
                  className={["flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black ring-1 ring-black/10 transition hover:-translate-y-0.5", t.focus].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          <p className={["mt-4 max-w-[46ch] text-[13px] font-medium", t.muted].join(" ")}>
            Choisissez un réseau pour le relier. Vous pourrez ensuite publier et planifier depuis cette page.
          </p>
        </div>
      ) : (
        <ul className={["divide-y border-t", t.line].join(" ")}>
          {sorted.map((channel) => {
            const id = getNetworkId(channel);
            const followers = readStat(channel, FOLLOWER_KEYS);
            const share = total > 0 ? Math.round((followers / total) * 100) : 0;
            return (
              <li key={channel.key} className="flex items-center gap-3.5 px-5 py-3">
                <ChannelAvatar channel={channel} isDark={isDark} Icon={id ? NETWORK_ICONS[id] : undefined} />
                <div className="min-w-0 flex-1">
                  <p className={["truncate text-[13.5px] font-semibold leading-tight", t.text].join(" ")}>
                    {channel.handle || channel.name}
                  </p>
                  <div className={["mt-1.5 h-1 w-full overflow-hidden rounded-full", t.soft].join(" ")}>
                    <div
                      className={["h-full rounded-full", isDark ? "bg-white" : "bg-neutral-900"].join(" ")}
                      style={{ width: `${Math.max(share, followers > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
                <p className={["w-20 shrink-0 text-right text-[13px] font-semibold tabular-nums", t.text].join(" ")}>
                  {fmt.format(followers)}
                  <span className={["block text-[11px] font-medium", t.muted].join(" ")}>abonnés</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------ Colonne latérale ------------------------------ */

const DAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];

function Week({ isDark }: { isDark: boolean }) {
  const t = tone(isDark);
  const streak = 0; // à brancher sur vos données
  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7; // lundi = 0

  return (
    <section className={["rounded-[24px] border p-5", t.surface].join(" ")}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={["text-[15px] font-semibold", t.text].join(" ")}>Cette semaine</h2>
        <p className={["text-[12.5px] font-medium tabular-nums", t.muted].join(" ")}>
          {streak} jour{streak > 1 ? "s" : ""} d'affilée
        </p>
      </div>
      <div className="mt-4 flex justify-between gap-1">
        {DAYS_FR.map((label, i) => {
          const isToday = i === todayIndex;
          const done = i < todayIndex && todayIndex - i <= streak;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <span className={["text-[11px] font-semibold", isToday ? t.text : t.faint].join(" ")}>{label}</span>
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  done ? (isDark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white") : t.soft,
                  isToday ? (isDark ? "ring-2 ring-white" : "ring-2 ring-neutral-900") : "",
                ].join(" ")}
              >
                {done && <CheckIcon />}
              </span>
            </div>
          );
        })}
      </div>
      <p className={["mt-4 text-[12.5px] font-medium", t.muted].join(" ")}>
        {streak > 0 ? "Continuez, vous publiez régulièrement." : "Publiez aujourd'hui pour lancer votre série."}
      </p>
    </section>
  );
}

function Checklist({
  isDark,
  hasChannel,
  onCompose,
}: {
  isDark: boolean;
  hasChannel: boolean;
  onCompose: () => void;
}) {
  const t = tone(isDark);
  const steps = [
    { label: "Connecter un réseau", done: hasChannel, action: () => navigate("channels") },
    { label: "Créer votre première publication", done: false, action: onCompose },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <section className={["rounded-[24px] border p-5", t.surface].join(" ")}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={["text-[15px] font-semibold", t.text].join(" ")}>Pour démarrer</h2>
        <p className={["text-[12.5px] font-medium tabular-nums", t.muted].join(" ")}>
          {doneCount}/{steps.length}
        </p>
      </div>
      <ul className="mt-3 space-y-1">
        {steps.map((s) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={s.action}
              disabled={s.done}
              className={["flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition", s.done ? "" : isDark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.04]", t.focus].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  s.done
                    ? isDark ? "border-white bg-white text-neutral-900" : "border-neutral-900 bg-neutral-900 text-white"
                    : isDark ? "border-white/30" : "border-black/25",
                ].join(" ")}
              >
                {s.done && <CheckIcon className="h-2.5 w-2.5" />}
              </span>
              <span className={["text-[13.5px] font-medium", s.done ? [t.faint, "line-through"].join(" ") : t.text].join(" ")}>
                {s.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

type BlogPost = { title: string; date: string; imageUrl: string; href: string };

const BLOG_POSTS: BlogPost[] = [
  {
    title: "How to Create a Social Media Marketing Strategy in 2026 — 7-Step Guide",
    date: "24 juil. 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-strategy/160/160",
    href: "#",
  },
  {
    title: "17 Best AI Tools for Social Media Content Creation (Tested for 2026)",
    date: "3 août 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-ai-tools/160/160",
    href: "#",
  },
  {
    title: "How to Manage Multiple Social Media Accounts: 7 Tips to Do It Like a Pro",
    date: "6 juil. 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-multi-account/160/160",
    href: "#",
  },
];

function Blog({ isDark }: { isDark: boolean }) {
  const t = tone(isDark);
  return (
    <section>
      <h2 className={["mb-2 text-[15px] font-semibold", t.text].join(" ")}>À lire</h2>
      <ul className={["divide-y border-y", t.line].join(" ")}>
        {BLOG_POSTS.map((post) => (
          <li key={post.title}>
            <a href={post.href} className={["group flex items-center gap-3.5 py-3", t.focus, "rounded-lg"].join(" ")}>
              <img
                src={post.imageUrl}
                alt=""
                loading="lazy"
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className={["line-clamp-2 text-[13px] font-semibold leading-snug group-hover:underline", t.text].join(" ")}>
                  {post.title}
                </p>
                <p className={["mt-1 text-[11.5px] font-medium", t.muted].join(" ")}>{post.date}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const t = tone(isDark);
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

  const firstName = user?.first_name || "";
  const initials =
    `${(user?.first_name || "")[0] || ""}${(user?.last_name || "")[0] || ""}`.toUpperCase() || "U";
  const hello = now.getHours() >= 18 || now.getHours() < 5 ? "Bonsoir" : "Bonjour";
  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

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
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-[clamp(16px,3vw,40px)] pb-[120px] pt-[clamp(18px,2.4vw,32px)]">
            <header className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <GreetingAvatar avatarUrl={user?.avatar_url} initials={initials} isDark={isDark} />
                <div>
                  <h1 className={["font-display text-[clamp(22px,2.6vw,32px)] font-semibold leading-none tracking-[-0.02em]", t.text].join(" ")}>
                    {hello}
                    {firstName ? `, ${firstName}` : ""}
                  </h1>
                  <p className={["mt-1 text-[12.5px] font-medium capitalize", t.muted].join(" ")}>{dateLabel}</p>
                </div>
              </div>
              <time
                className={["font-display text-[clamp(20px,2.2vw,26px)] font-semibold tabular-nums tracking-[-0.01em]", t.text].join(" ")}
              >
                {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </time>
            </header>

            <Composer isDark={isDark} channels={connectedChannels} onCompose={openCompose} />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="flex flex-col gap-8 lg:col-span-8">
                <Stats isDark={isDark} totals={totals} networkCount={connectedChannels.length} />
                <Channels isDark={isDark} channels={connectedChannels} />
              </div>
              <aside className="flex flex-col gap-5 lg:col-span-4">
                <Week isDark={isDark} />
                <Checklist isDark={isDark} hasChannel={connectedChannels.length > 0} onCompose={openCompose} />
                <Blog isDark={isDark} />
              </aside>
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