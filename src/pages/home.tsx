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

const userProfileCache = {
  profile: null as UserProfile | null,
};

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

/* -------------------------------------------------------------------------- */
/*  Stats helpers                                                             */
/* -------------------------------------------------------------------------- */

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

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function computeTotals(channels: ConnectedChannel[]) {
  return channels.reduce(
    (acc, ch) => ({
      followers:
        acc.followers +
        readStat(ch, [
          "followers",
          "followersCount",
          "followers_count",
          "subscribers",
          "subscribersCount",
        ]),
      likes:
        acc.likes + readStat(ch, ["likes", "likesCount", "likes_count"]),
      comments:
        acc.comments +
        readStat(ch, ["comments", "commentsCount", "comments_count"]),
    }),
    { followers: 0, likes: 0, comments: 0 }
  );
}

/* -------------------------------------------------------------------------- */
/*  Small UI primitives                                                       */
/* -------------------------------------------------------------------------- */

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
      className="h-11 w-11 rounded-2xl object-cover ring-2 ring-black/5 dark:ring-white/10"
      onError={() => setLoadFailed(true)}
    />
  ) : (
    <div
      className={[
        "flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold ring-2 ring-black/5 dark:ring-white/10",
        isDark ? "bg-zinc-800 text-white" : "bg-zinc-900 text-white",
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
  });

  return (
    <div className="text-right">
      <div
        className={[
          "font-display text-2xl font-semibold tracking-tight tabular-nums",
          isDark ? "text-white" : "text-zinc-900",
        ].join(" ")}
      >
        {time}
      </div>
      <div
        className={[
          "mt-0.5 text-sm font-medium capitalize",
          isDark ? "text-zinc-400" : "text-zinc-500",
        ].join(" ")}
      >
        {date}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streak – redesigned                                                       */
/* -------------------------------------------------------------------------- */

function FlameIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.5c.9 1.9.4 3.2-.7 4.4-2 2.1-4 3.8-4 6.9a4.7 4.7 0 0 0 9.4 0c0-1.6-.5-2.7-1.1-3.7-.2 1.5-.9 2.4-1.9 2.4-1.2 0-1.9-1-1.5-2.2.7-2 2-3.3 2-5.4 0-.9-.3-1.7-.8-2.4-.5.6-.9 1.2-1.4 0Z" />
    </svg>
  );
}

const WEEKDAYS_FR_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function StreakCard({ isDark }: { isDark: boolean }) {
  const streakCount = 0;

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return WEEKDAYS_FR_SHORT[d.getDay()];
  });

  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl p-6",
        isDark
          ? "bg-gradient-to-br from-zinc-900 to-zinc-950 ring-1 ring-white/10"
          : "bg-gradient-to-br from-zinc-900 to-zinc-800 text-white",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">Série actuelle</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {streakCount} jour{streakCount > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <FlameIcon className="h-6 w-6 text-orange-400" />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-7 gap-2">
        {days.map((label, i) => {
          const active = i < streakCount;
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-500">
                {label}
              </span>
              <div
                className={[
                  "h-8 w-8 rounded-full transition-all",
                  active
                    ? "bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.45)]"
                    : "bg-white/10",
                ].join(" ")}
              />
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-zinc-400">
        Publiez aujourd’hui pour allumer la flamme.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Connected channels – cleaner                                              */
/* -------------------------------------------------------------------------- */

function ChannelAvatar({
  channel,
  isDark,
  NetworkIcon,
}: {
  channel: ConnectedChannel;
  isDark: boolean;
  NetworkIcon?: (props: { className?: string }) => JSX.Element;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [channel.avatarUrl]);

  const label = channel.handle || channel.name;
  const initial = label.replace(/^@/, "").charAt(0).toUpperCase() || "?";
  const showImage = Boolean(channel.avatarUrl) && !failed;

  return (
    <div title={label} className="relative h-10 w-10 shrink-0">
      {showImage ? (
        <img
          src={channel.avatarUrl}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-full object-cover ring-2 ring-white dark:ring-zinc-900"
        />
      ) : (
        <div
          className={[
            "flex h-full w-full items-center justify-center rounded-full text-sm font-semibold ring-2 ring-white dark:ring-zinc-900",
            isDark ? "bg-zinc-700 text-white" : "bg-zinc-200 text-zinc-800",
          ].join(" ")}
        >
          {initial}
        </div>
      )}

      {NetworkIcon && (
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white dark:bg-zinc-900 dark:ring-zinc-900">
          <NetworkIcon className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

function ConnectedChannelsCard({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  if (channels.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate("channels")}
        className={[
          "group flex w-full items-center justify-between rounded-3xl border border-dashed p-5 text-left transition-all",
          isDark
            ? "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900"
            : "border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50",
        ].join(" ")}
      >
        <div className="flex items-center gap-4">
          <div
            className={[
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              isDark ? "bg-zinc-800" : "bg-zinc-100",
            ].join(" ")}
          >
            <svg
              className="h-5 w-5 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
          <div>
            <p
              className={[
                "font-medium",
                isDark ? "text-white" : "text-zinc-900",
              ].join(" ")}
            >
              Connecter un réseau
            </p>
            <p className="text-sm text-zinc-500">
              Reliez votre premier compte pour commencer
            </p>
          </div>
        </div>
        <span
          className={[
            "rounded-full px-4 py-2 text-sm font-medium transition",
            isDark
              ? "bg-white text-zinc-900 group-hover:bg-zinc-200"
              : "bg-zinc-900 text-white group-hover:bg-zinc-800",
          ].join(" ")}
        >
          Connecter
        </span>
      </button>
    );
  }

  return (
    <div
      className={[
        "flex items-center justify-between rounded-3xl border p-5",
        isDark
          ? "border-zinc-800 bg-zinc-900"
          : "border-zinc-200 bg-white",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="flex -space-x-3">
          {channels.slice(0, 5).map((channel) => {
            const networkId = getNetworkId(channel);
            const NetworkIcon = networkId
              ? NETWORK_ICONS[networkId]
              : undefined;
            return (
              <ChannelAvatar
                key={channel.key}
                channel={channel}
                isDark={isDark}
                NetworkIcon={NetworkIcon}
              />
            );
          })}
        </div>
        <div className="ml-2">
          <p
            className={[
              "text-sm font-medium",
              isDark ? "text-white" : "text-zinc-900",
            ].join(" ")}
          >
            {channels.length} réseau{channels.length > 1 ? "x" : ""} connecté
            {channels.length > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-zinc-500">Prêts à publier</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("channels")}
        className={[
          "rounded-full px-4 py-2 text-sm font-medium transition",
          isDark
            ? "bg-white/10 text-white hover:bg-white/15"
            : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
        ].join(" ")}
      >
        Gérer
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stats cards – refined                                                     */
/* -------------------------------------------------------------------------- */

type StatKind = "followers" | "likes" | "comments";

function StatIcon({ kind }: { kind: StatKind }) {
  if (kind === "followers") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  if (kind === "likes") {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function StatCard({
  isDark,
  kind,
  title,
  value,
}: {
  isDark: boolean;
  kind: StatKind;
  title: string;
  value: number;
}) {
  return (
    <div
      className={[
        "rounded-3xl border p-5 transition-all",
        isDark
          ? "border-zinc-800 bg-zinc-900 hover:bg-zinc-900/80"
          : "border-zinc-200 bg-white hover:bg-zinc-50",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500">{title}</p>
        <div
          className={[
            "flex h-9 w-9 items-center justify-center rounded-xl",
            isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600",
          ].join(" ")}
        >
          <StatIcon kind={kind} />
        </div>
      </div>
      <p
        className={[
          "mt-3 font-display text-3xl font-semibold tracking-tight tabular-nums",
          isDark ? "text-white" : "text-zinc-900",
        ].join(" ")}
      >
        {numberFormatter.format(value)}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Blog section – editorial style                                            */
/* -------------------------------------------------------------------------- */

type BlogPostDefinition = {
  title: string;
  date: string;
  imageUrl: string;
  href: string;
};

const blogPostDefinitions: BlogPostDefinition[] = [
  {
    title: "How to Create a Social Media Marketing Strategy in 2026 — 7-Step Guide",
    date: "24 juil. 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-strategy/800/560",
    href: "#",
  },
  {
    title: "17 Best AI Tools for Social Media Content Creation (Tested for 2026)",
    date: "3 août 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-ai-tools/800/560",
    href: "#",
  },
  {
    title: "How to Manage Multiple Social Media Accounts: 7 Tips to Do It Like a Pro",
    date: "6 juil. 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-multi-account/800/560",
    href: "#",
  },
];

function BlogPostCard({
  isDark,
  post,
}: {
  isDark: boolean;
  post: BlogPostDefinition;
}) {
  return (
    <a
      href={post.href}
      className={[
        "group flex gap-4 overflow-hidden rounded-2xl border p-3 transition-all",
        isDark
          ? "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
          : "border-zinc-200 bg-white hover:bg-zinc-50",
      ].join(" ")}
    >
      <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl">
        <img
          src={post.imageUrl}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <p className="text-xs font-medium text-zinc-500">{post.date}</p>
        <p
          className={[
            "mt-1 line-clamp-2 text-sm font-medium leading-snug",
            isDark ? "text-white" : "text-zinc-900",
          ].join(" ")}
        >
          {post.title}
        </p>
      </div>
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  const connectedChannels = useConnectedChannels();

  const totals = useMemo(
    () => computeTotals(connectedChannels),
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

  return (
    <main
      className={[
        "relative h-screen w-full overflow-hidden transition-colors duration-500",
        isDark ? "bg-zinc-950" : "bg-zinc-50",
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} />

      <div
        className="h-full overflow-y-auto"
        style={{ paddingLeft: SIDEBAR_OFFSET }}
      >
        <div className="mx-auto flex min-h-full w-full max-w-[1280px] flex-col px-6 pb-28 pt-8 sm:px-8 lg:px-10">
          {/* Header */}
          <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              <GreetingAvatar
                avatarUrl={user?.avatar_url}
                initials={initials}
                isDark={isDark}
              />
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Bonjour{fullName ? "," : ""}
                </p>
                <h1
                  className={[
                    "font-display text-3xl font-semibold tracking-tight sm:text-4xl",
                    isDark ? "text-white" : "text-zinc-900",
                  ].join(" ")}
                >
                  {fullName || "créateur"}
                </h1>
              </div>
            </div>
            <ClockDisplay isDark={isDark} />
          </header>

          {/* Main grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left column */}
            <div className="flex flex-col gap-6 lg:col-span-8">
              {/* Stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  isDark={isDark}
                  kind="followers"
                  title="Abonnés"
                  value={totals.followers}
                />
                <StatCard
                  isDark={isDark}
                  kind="likes"
                  title="Likes"
                  value={totals.likes}
                />
                <StatCard
                  isDark={isDark}
                  kind="comments"
                  title="Commentaires"
                  value={totals.comments}
                />
              </div>

              {/* Channels */}
              <ConnectedChannelsCard
                isDark={isDark}
                channels={connectedChannels}
              />

              {/* Blog */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    className={[
                      "text-sm font-semibold uppercase tracking-wider",
                      isDark ? "text-zinc-400" : "text-zinc-500",
                    ].join(" ")}
                  >
                    Depuis le blog
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  {blogPostDefinitions.map((post) => (
                    <BlogPostCard
                      key={post.title}
                      isDark={isDark}
                      post={post}
                    />
                  ))}
                </div>
              </section>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-6 lg:col-span-4">
              <StreakCard isDark={isDark} />

              {/* CTA card */}
              <div
                className={[
                  "rounded-3xl p-6",
                  isDark
                    ? "bg-zinc-900 ring-1 ring-white/10"
                    : "bg-zinc-900 text-white",
                ].join(" ")}
              >
                <p className="text-lg font-semibold">Une idée en tête ?</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Créez une publication maintenant ou planifiez-la pour plus
                  tard.
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewPostOpen(true)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Nouvelle publication
                </button>
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