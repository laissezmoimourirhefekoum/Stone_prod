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

type SocialNetworkKey =
  | "x" | "facebook" | "instagram" | "linkedin"
  | "tiktok" | "youtube" | "pinterest" | "threads";

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
          "followers", "followersCount", "followers_count",
          "subscribers", "subscribersCount",
        ]),
      likes: acc.likes + readStat(ch, ["likes", "likesCount", "likes_count"]),
      comments:
        acc.comments +
        readStat(ch, ["comments", "commentsCount", "comments_count"]),
    }),
    { followers: 0, likes: 0, comments: 0 }
  );
}

/* -------------------------------------------------------------------------- */
/*  Tokens                                                                    */
/* -------------------------------------------------------------------------- */

function useSurface(isDark: boolean) {
  return {
    border: isDark ? "border-white/[0.08]" : "border-black/[0.06]",
    divide: isDark ? "divide-white/[0.08]" : "divide-black/[0.06]",
    muted: isDark ? "text-neutral-500" : "text-neutral-500",
    mutedStrong: isDark ? "text-neutral-400" : "text-neutral-500",
    fg: isDark ? "text-white" : "text-neutral-900",
    subtleBg: isDark ? "hover:bg-white/[0.03]" : "hover:bg-black/[0.02]",
  };
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

function PlusIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function StatGlyph({
  kind,
  className = "h-3.5 w-3.5",
}: {
  kind: "followers" | "likes" | "comments";
  className?: string;
}) {
  const common = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "followers") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19.5c.7-3 3-4.8 5.5-4.8s4.8 1.8 5.5 4.8" />
        <path d="M16.5 5.5a2.7 2.7 0 0 1 0 5M18.5 15c1.5.7 2.5 2.2 2.8 4.5" />
      </svg>
    );
  }
  if (kind === "likes") {
    return (
      <svg {...common}>
        <path d="M12 19.5S4.5 15.3 4.5 9.8A3.8 3.8 0 0 1 12 7.2a3.8 3.8 0 0 1 7.5 2.6c0 5.5-7.5 9.7-7.5 9.7Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20.5 12a7.8 7.8 0 0 1-11.3 7L4.5 20l1-4.3A7.8 7.8 0 1 1 20.5 12Z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */

function Avatar({
  avatarUrl,
  initials,
  isDark,
}: {
  avatarUrl?: string | null;
  initials: string;
  isDark: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [avatarUrl]);
  const show = Boolean(avatarUrl) && !failed;

  return (
    <div
      className={[
        "relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1",
        isDark ? "ring-white/10" : "ring-black/[0.06]",
      ].join(" ")}
    >
      {show ? (
        <img
          key={avatarUrl}
          src={avatarUrl!}
          alt=""
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={[
            "flex h-full w-full items-center justify-center text-[12px] font-medium",
            isDark ? "bg-white/[0.06] text-white" : "bg-black/[0.04] text-neutral-900",
          ].join(" ")}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

function TimeDisplay({ isDark }: { isDark: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(i);
  }, []);

  const time = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <span
      className={[
        "hidden items-center gap-1.5 text-[12.5px] font-medium tabular-nums sm:flex",
        isDark ? "text-neutral-500" : "text-neutral-500",
      ].join(" ")}
    >
      <span>{time}</span>
      <span className="opacity-40">·</span>
      <span className="capitalize">{date}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stats : bandeau horizontal épuré                                          */
/* -------------------------------------------------------------------------- */

function StatsOverview({
  isDark,
  totals,
  networkCount,
}: {
  isDark: boolean;
  totals: { followers: number; likes: number; comments: number };
  networkCount: number;
}) {
  const s = useSurface(isDark);

  const items = [
    { kind: "followers" as const, label: "Abonnés", value: totals.followers },
    { kind: "likes" as const, label: "Likes", value: totals.likes },
    { kind: "comments" as const, label: "Commentaires", value: totals.comments },
  ];

  return (
    <div
      className={[
        "grid grid-cols-1 divide-y overflow-hidden rounded-2xl border sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        s.border,
        s.divide,
        isDark ? "bg-white/[0.015]" : "bg-white",
      ].join(" ")}
    >
      {items.map((item) => (
        <div key={item.kind} className="flex flex-col gap-3 px-6 py-7">
          <div
            className={[
              "flex items-center gap-2 text-[12.5px] font-medium",
              s.muted,
            ].join(" ")}
          >
            <StatGlyph kind={item.kind} className="h-3.5 w-3.5" />
            {item.label}
          </div>
          <p
            className={[
              "font-display text-[clamp(32px,3.4vw,44px)] font-semibold leading-none tracking-[-0.03em] tabular-nums",
              s.fg,
            ].join(" ")}
          >
            {numberFormatter.format(item.value)}
          </p>
          <p className={["text-[12px] font-medium", s.muted].join(" ")}>
            {item.kind === "followers"
              ? networkCount > 0
                ? `sur ${networkCount} réseau${networkCount > 1 ? "x" : ""}`
                : "aucun réseau connecté"
              : item.kind === "likes"
                ? "toutes publications"
                : "reçus au total"}
          </p>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Réseaux : liste épurée                                                    */
/* -------------------------------------------------------------------------- */

function ChannelAvatar({
  channel,
  isDark,
  Icon,
}: {
  channel: ConnectedChannel;
  isDark: boolean;
  Icon?: (props: { className?: string }) => JSX.Element;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [channel.avatarUrl]);

  const label = (channel.handle || channel.name || "—").replace(/^@/, "");
  const show = Boolean(channel.avatarUrl) && !failed;

  return (
    <div className="relative h-9 w-9 shrink-0">
      <div
        className={[
          "h-full w-full overflow-hidden rounded-full",
          isDark ? "bg-white/[0.06]" : "bg-black/[0.04]",
        ].join(" ")}
      >
        {show ? (
          <img
            src={channel.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={[
              "flex h-full w-full items-center justify-center text-[12px] font-medium",
              isDark ? "text-white" : "text-neutral-900",
            ].join(" ")}
          >
            {label.charAt(0).toUpperCase() || "?"}
          </div>
        )}
      </div>
      {Icon && (
        <span
          className={[
            "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2",
            isDark
              ? "bg-[#0a0a0a] text-white ring-[#0a0a0a]"
              : "bg-white text-neutral-900 ring-white",
          ].join(" ")}
        >
          <Icon className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}

function ChannelsSection({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  const s = useSurface(isDark);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className={["text-[14px] font-semibold", s.fg].join(" ")}>
            Réseaux connectés
          </h2>
          {channels.length > 0 && (
            <span className={["text-[12.5px] font-medium", s.muted].join(" ")}>
              {channels.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate("channels")}
          className={[
            "flex items-center gap-1 text-[12.5px] font-medium transition",
            s.muted,
            isDark ? "hover:text-white" : "hover:text-neutral-900",
          ].join(" ")}
        >
          <PlusIcon className="h-3 w-3" />
          Connecter
        </button>
      </div>

      {channels.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate("channels")}
          className={[
            "flex w-full flex-col items-start gap-1 rounded-2xl border border-dashed px-5 py-6 text-left transition",
            s.border,
            s.subtleBg,
          ].join(" ")}
        >
          <span className={["text-[13.5px] font-medium", s.fg].join(" ")}>
            Aucun réseau connecté
          </span>
          <span className={["text-[12.5px]", s.muted].join(" ")}>
            Reliez un canal pour commencer à publier.
          </span>
        </button>
      ) : (
        <div
          className={[
            "overflow-hidden rounded-2xl border",
            s.border,
            isDark ? "bg-white/[0.015]" : "bg-white",
          ].join(" ")}
        >
          <ul className={["divide-y", s.divide].join(" ")}>
            {channels.map((channel) => {
              const networkId = getNetworkId(channel);
              const Icon = networkId ? NETWORK_ICONS[networkId] : undefined;
              const followers = readStat(channel, [
                "followers", "followersCount", "followers_count",
                "subscribers", "subscribersCount",
              ]);
              const label = (channel.handle || channel.name || "—").replace(
                /^@/,
                ""
              );
              return (
                <li
                  key={channel.key}
                  className={[
                    "flex items-center gap-3 px-4 py-3 transition",
                    s.subtleBg,
                  ].join(" ")}
                >
                  <ChannelAvatar
                    channel={channel}
                    isDark={isDark}
                    Icon={Icon}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        "truncate text-[13.5px] font-medium",
                        s.fg,
                      ].join(" ")}
                    >
                      @{label}
                    </p>
                  </div>
                  <p
                    className={[
                      "shrink-0 text-[12.5px] font-medium tabular-nums",
                      s.muted,
                    ].join(" ")}
                  >
                    {numberFormatter.format(followers)}{" "}
                    <span className="opacity-70">abonnés</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Compose : ligne simple                                                    */
/* -------------------------------------------------------------------------- */

function ComposeRow({
  isDark,
  onPlan,
}: {
  isDark: boolean;
  onPlan: () => void;
}) {
  const s = useSurface(isDark);

  return (
    <div
      className={[
        "flex flex-col items-start justify-between gap-4 rounded-2xl border px-6 py-5 sm:flex-row sm:items-center",
        s.border,
        isDark ? "bg-white/[0.015]" : "bg-white",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className={["text-[14px] font-semibold", s.fg].join(" ")}>
          Nouvelle publication
        </p>
        <p className={["mt-0.5 text-[12.5px]", s.muted].join(" ")}>
          Rédigez ou planifiez sur tous vos canaux en quelques secondes.
        </p>
      </div>

      <button
        type="button"
        onClick={onPlan}
        className={[
          "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium transition",
          isDark
            ? "bg-white text-neutral-900 hover:bg-neutral-200"
            : "bg-neutral-900 text-white hover:bg-neutral-800",
        ].join(" ")}
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Composer
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Blog                                                                      */
/* -------------------------------------------------------------------------- */

type BlogPostDefinition = {
  title: string;
  date: string;
  imageUrl: string;
  href: string;
};

const blogPostDefinitions: BlogPostDefinition[] = [
  {
    title:
      "How to Create a Social Media Marketing Strategy in 2026 — 7-Step Guide",
    date: "Jul 24, 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-strategy/800/560",
    href: "#",
  },
  {
    title:
      "17 Best AI Tools for Social Media Content Creation (Tested for 2026)",
    date: "Aug 3, 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-ai-tools/800/560",
    href: "#",
  },
  {
    title:
      "How to Manage Multiple Social Media Accounts: 7 Tips to Do It Like a Pro",
    date: "Jul 6, 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-multi-account/800/560",
    href: "#",
  },
];

function BlogCard({
  isDark,
  post,
}: {
  isDark: boolean;
  post: BlogPostDefinition;
}) {
  const s = useSurface(isDark);

  return (
    <a
      href={post.href}
      className={[
        "group flex flex-col overflow-hidden rounded-2xl border transition",
        s.border,
        isDark
          ? "bg-white/[0.015] hover:bg-white/[0.03]"
          : "bg-white hover:bg-black/[0.015]",
      ].join(" ")}
    >
      <div className="aspect-[16/10] w-full overflow-hidden">
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className={["text-[12px] font-medium", s.muted].join(" ")}>
          {post.date}
        </p>
        <p
          className={[
            "line-clamp-2 text-[14px] font-medium leading-snug tracking-[-0.005em]",
            s.fg,
          ].join(" ")}
        >
          {post.title}
        </p>
        <span
          className={[
            "mt-auto inline-flex items-center gap-1.5 pt-2 text-[12px] font-medium",
            s.muted,
          ].join(" ")}
        >
          Lire
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  );
}

function BlogSection({ isDark }: { isDark: boolean }) {
  const s = useSurface(isDark);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={["text-[14px] font-semibold", s.fg].join(" ")}>
          From the blog
        </h2>
        <a
          href="#"
          className={[
            "text-[12.5px] font-medium transition",
            s.muted,
            isDark ? "hover:text-white" : "hover:text-neutral-900",
          ].join(" ")}
        >
          Voir tout
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {blogPostDefinitions.map((post) => (
          <BlogCard key={post.title} isDark={isDark} post={post} />
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
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

  const [user, setUser] = useState<UserProfile | null>(userProfileCache.profile);

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

  const firstName = user?.first_name || "";
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const initials =
    `${(user?.first_name || "")[0] || ""}${(user?.last_name || "")[0] || ""}`.toUpperCase() ||
    "U";

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
        "relative h-screen w-full overflow-hidden transition-colors duration-300",
        isDark ? "bg-[#0a0a0a]" : "bg-[#fafafa]",
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} />

      <div className="h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col gap-8 px-[clamp(20px,3vw,40px)] pb-[112px] pt-[clamp(20px,3vw,36px)]">
            {/* Header */}
            <header className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p
                  className={[
                    "text-[13px] font-medium",
                    isDark ? "text-neutral-500" : "text-neutral-500",
                  ].join(" ")}
                >
                  Bonjour
                </p>
                <h1
                  title={fullName}
                  className={[
                    "mt-1 truncate font-display text-[clamp(24px,2.8vw,34px)] font-semibold leading-[1.1] tracking-[-0.025em]",
                    isDark ? "text-white" : "text-neutral-900",
                  ].join(" ")}
                >
                  {firstName || "Bienvenue"}.
                </h1>
              </div>

              <div className="flex items-center gap-4">
                <TimeDisplay isDark={isDark} />
                <Avatar
                  avatarUrl={user?.avatar_url}
                  initials={initials}
                  isDark={isDark}
                />
              </div>
            </header>

            <StatsOverview
              isDark={isDark}
              totals={totals}
              networkCount={connectedChannels.length}
            />

            <ChannelsSection isDark={isDark} channels={connectedChannels} />

            <ComposeRow
              isDark={isDark}
              onPlan={() => setIsNewPostOpen(true)}
            />

            <BlogSection isDark={isDark} />
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