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
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Flame,
  Heart,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react";

import {
  XIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
  PinterestIcon,
} from "../components/IntegrationIcons";

/* ============================================================
   LAYOUT
============================================================ */

const SIDEBAR_OFFSET = 104;

const cardClass = (isDark: boolean) =>
  isDark
    ? "border-white/[0.07] bg-[#141416]"
    : "border-black/[0.06] bg-white";

const mutedClass = (isDark: boolean) =>
  isDark ? "text-neutral-600" : "text-neutral-400";

const strongClass = (isDark: boolean) =>
  isDark ? "text-white" : "text-neutral-900";

/* ============================================================
   USER CACHE
============================================================ */

const userProfileCache = {
  profile: null as UserProfile | null,
};

/* ============================================================
   NETWORKS
============================================================ */

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

/* ============================================================
   BLOG (à brancher sur ton CMS / ton blog)
============================================================ */

type BlogPost = {
  title: string;
  category: string;
  readTime: string;
  url: string;
};

const BLOG_URL = "#";

const BLOG_POSTS: BlogPost[] = [
  {
    title: "How often should you post on TikTok in 2026?",
    category: "Strategy",
    readTime: "5 min read",
    url: BLOG_URL,
  },
  {
    title: "Write captions that people actually finish reading",
    category: "Writing",
    readTime: "4 min read",
    url: BLOG_URL,
  },
  {
    title: "Reading your insights: the 3 numbers that matter",
    category: "Analytics",
    readTime: "6 min read",
    url: BLOG_URL,
  },
];

/* ============================================================
   AVATAR
============================================================ */

function GreetingAvatar({
  avatarUrl,
  initials,
  isDark,
}: {
  avatarUrl?: string | null;
  initials: string;
  isDark: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt="Profile"
        onError={() => setFailed(true)}
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className={[
        "flex h-9 w-9 items-center justify-center rounded-full",
        "text-[12px] font-semibold",
        isDark ? "bg-white text-black" : "bg-neutral-900 text-white",
      ].join(" ")}
    >
      {initials}
    </div>
  );
}

/* ============================================================
   CLOCK
============================================================ */

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
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="text-right">
      <p
        className={[
          "text-[16px] font-semibold tabular-nums",
          strongClass(isDark),
        ].join(" ")}
      >
        {time}
      </p>

      <p
        className={[
          "text-[11px] font-medium capitalize",
          mutedClass(isDark),
        ].join(" ")}
      >
        {date}
      </p>
    </div>
  );
}

/* ============================================================
   STAT
============================================================ */

function Stat({
  isDark,
  icon,
  label,
  value,
  change,
}: {
  isDark: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
}) {
  const positive = change.startsWith("+");

  return (
    <div
      className={[
        "flex min-w-0 items-center gap-3",
        "border-r last:border-r-0",
        "pr-5 last:pr-0",
        isDark ? "border-white/[0.07]" : "border-black/[0.07]",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          isDark
            ? "bg-white/[0.06] text-white"
            : "bg-neutral-100 text-neutral-700",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p
          className={[
            "truncate text-[10px] font-medium",
            isDark ? "text-neutral-500" : "text-neutral-400",
          ].join(" ")}
        >
          {label}
        </p>

        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span
            className={[
              "text-[17px] font-bold tracking-tight",
              strongClass(isDark),
            ].join(" ")}
          >
            {value}
          </span>

          <span
            className={[
              "text-[9px] font-semibold",
              positive ? "text-emerald-500" : "text-rose-500",
            ].join(" ")}
          >
            {change}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STREAK
============================================================ */

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

function Streak({ isDark }: { isDark: boolean }) {
  const streak = 0;
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return { day: WEEKDAYS[date.getDay()] };
  });

  return (
    <div
      className={[
        "flex min-h-[154px] flex-col justify-between rounded-2xl border p-4",
        cardClass(isDark),
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={[
              "text-[10px] font-medium uppercase tracking-[0.08em]",
              mutedClass(isDark),
            ].join(" ")}
          >
            Streak
          </p>

          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={[
                "text-[28px] font-bold tracking-[-0.04em]",
                strongClass(isDark),
              ].join(" ")}
            >
              {streak}
            </span>

            <span
              className={["text-[11px] font-medium", mutedClass(isDark)].join(
                " "
              )}
            >
              days
            </span>
          </div>
        </div>

        <Flame className={["h-4 w-4", mutedClass(isDark)].join(" ")} />
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div
            key={`${day.day}-${index}`}
            className="flex flex-col items-center gap-1.5"
          >
            <span
              className={["text-[8px] font-semibold", mutedClass(isDark)].join(
                " "
              )}
            >
              {day.day}
            </span>

            <div
              className={[
                "h-6 w-6 rounded-full border",
                isDark ? "border-white/20" : "border-black/20",
              ].join(" ")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   CHANNELS
============================================================ */

function ChannelAvatar({
  channel,
  isDark,
  overlap,
}: {
  channel: ConnectedChannel;
  isDark: boolean;
  overlap: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [channel.avatarUrl]);

  const label = channel.handle || channel.name || "Channel";
  const initial = label.replace(/^@/, "").charAt(0).toUpperCase() || "?";

  const networkId = getNetworkId(channel);
  const NetworkIcon = networkId ? NETWORK_ICONS[networkId] : null;

  return (
    <div
      className="relative h-9 w-9 shrink-0"
      style={{ marginLeft: overlap ? -8 : 0 }}
      title={label}
    >
      {channel.avatarUrl && !failed ? (
        <img
          src={channel.avatarUrl}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={[
            "h-full w-full rounded-full object-cover ring-2",
            isDark ? "ring-[#141416]" : "ring-white",
          ].join(" ")}
        />
      ) : (
        <div
          className={[
            "flex h-full w-full items-center justify-center rounded-full",
            "text-[11px] font-semibold ring-2",
            isDark
              ? "bg-[#29292c] text-white ring-[#141416]"
              : "bg-neutral-900 text-white ring-white",
          ].join(" ")}
        >
          {initial}
        </div>
      )}

      {NetworkIcon && (
        <span
          className={[
            "absolute -bottom-1 -right-1 flex h-4 w-4 items-center",
            "justify-center rounded-full bg-white text-black ring-1",
            isDark ? "ring-[#141416]" : "ring-white",
          ].join(" ")}
        >
          <NetworkIcon className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}

function Channels({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  return (
    <div
      className={[
        "flex min-h-[74px] items-center justify-between gap-4 rounded-2xl border px-4",
        cardClass(isDark),
      ].join(" ")}
    >
      {channels.length === 0 ? (
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-9 w-9 items-center justify-center rounded-xl",
              isDark ? "bg-white/[0.06]" : "bg-neutral-100",
            ].join(" ")}
          >
            <Plus
              className={[
                "h-4 w-4",
                isDark ? "text-white" : "text-neutral-700",
              ].join(" ")}
            />
          </div>

          <div>
            <p
              className={[
                "text-[11px] font-semibold",
                strongClass(isDark),
              ].join(" ")}
            >
              Connect your first channel
            </p>

            <p className={["mt-0.5 text-[10px]", mutedClass(isDark)].join(" ")}>
              Start publishing to social networks.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex items-center pl-1">
            {channels.slice(0, 6).map((channel, index) => (
              <ChannelAvatar
                key={channel.key}
                channel={channel}
                isDark={isDark}
                overlap={index > 0}
              />
            ))}
          </div>

          <div>
            <p
              className={[
                "text-[11px] font-semibold",
                strongClass(isDark),
              ].join(" ")}
            >
              {channels.length}{" "}
              {channels.length === 1 ? "channel" : "channels"} connected
            </p>

            <p className={["text-[10px]", mutedClass(isDark)].join(" ")}>
              Ready to publish
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate("channels")}
        className={[
          "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2",
          "text-[10px] font-semibold transition",
          isDark
            ? "text-white hover:bg-white/[0.06]"
            : "text-neutral-900 hover:bg-neutral-100",
        ].join(" ")}
      >
        {channels.length === 0 ? "Connect" : "Manage"}
        <ArrowUpRight className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ============================================================
   PANEL (Comments / Up Next)
============================================================ */

function Panel({
  isDark,
  title,
  meta,
  onViewAll,
  icon,
  line1,
  line2,
  action,
}: {
  isDark: boolean;
  title: string;
  meta: string;
  /** Sans handler, le lien « View All » est désactivé. */
  onViewAll?: () => void;
  icon: React.ReactNode;
  line1: string;
  line2: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between">
        <p
          className={[
            "text-[12px] font-semibold",
            isDark ? "text-neutral-300" : "text-neutral-700",
          ].join(" ")}
        >
          {title}
          <span
            className={["ml-1.5 font-normal", mutedClass(isDark)].join(" ")}
          >
            · {meta}
          </span>
        </p>

        <button
          type="button"
          disabled={!onViewAll}
          onClick={onViewAll}
          className={[
            "flex items-center gap-0.5 text-[11px] font-semibold transition",
            "disabled:cursor-default disabled:opacity-40",
            isDark
              ? "text-neutral-400 enabled:hover:text-white"
              : "text-neutral-500 enabled:hover:text-neutral-900",
          ].join(" ")}
        >
          View All
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        className={[
          "flex min-h-[190px] flex-col items-center justify-center gap-1 rounded-2xl border px-4 py-6 text-center",
          isDark
            ? "border-white/[0.07] bg-white/[0.03]"
            : "border-black/[0.06] bg-neutral-50",
        ].join(" ")}
      >
        <div
          className={[
            "mb-2 flex h-11 w-11 items-center justify-center rounded-full",
            isDark
              ? "bg-white/[0.07] text-neutral-300"
              : "bg-neutral-200/70 text-neutral-600",
          ].join(" ")}
        >
          {icon}
        </div>

        <p className={["text-[12px]", strongClass(isDark)].join(" ")}>
          {line1}
        </p>
        <p className={["text-[12px]", strongClass(isDark)].join(" ")}>
          {line2}
        </p>

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={[
              "mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5",
              "text-[11px] font-semibold transition",
              isDark
                ? "border-white/10 text-white hover:bg-white/[0.07]"
                : "border-black/10 text-neutral-900 hover:bg-neutral-100",
            ].join(" ")}
          >
            <Plus className="h-3.5 w-3.5" />
            {action.label}
          </button>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   BLOG
============================================================ */

function BlogSection({ isDark }: { isDark: boolean }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p
            className={[
              "text-[11px] font-semibold",
              isDark ? "text-neutral-500" : "text-neutral-400",
            ].join(" ")}
          >
            From the blog
          </p>

          <p
            className={[
              "mt-0.5 text-[10px]",
              isDark ? "text-neutral-700" : "text-neutral-400",
            ].join(" ")}
          >
            Tips to grow your audience
          </p>
        </div>

        <a
          href={BLOG_URL}
          target="_blank"
          rel="noreferrer"
          className={[
            "flex items-center gap-0.5 text-[11px] font-semibold transition",
            isDark
              ? "text-neutral-400 hover:text-white"
              : "text-neutral-500 hover:text-neutral-900",
          ].join(" ")}
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <a
            key={post.title}
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className={[
              "group flex min-h-[132px] flex-col justify-between rounded-2xl border p-4 transition",
              cardClass(isDark),
              isDark ? "hover:bg-[#1a1a1d]" : "hover:bg-neutral-50",
            ].join(" ")}
          >
            <span
              className={[
                "w-fit rounded-md px-2 py-0.5 text-[10px] font-medium",
                isDark
                  ? "bg-white/[0.06] text-neutral-300"
                  : "bg-neutral-100 text-neutral-600",
              ].join(" ")}
            >
              {post.category}
            </span>

            <h3
              className={[
                "mt-4 text-[14px] font-semibold leading-snug tracking-[-0.01em]",
                strongClass(isDark),
              ].join(" ")}
            >
              {post.title}
            </h3>

            <div className="mt-4 flex items-center justify-between">
              <span className={["text-[10px]", mutedClass(isDark)].join(" ")}>
                {post.readTime}
              </span>

              <ArrowUpRight
                className={[
                  "h-3.5 w-3.5 transition-transform",
                  "group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
                  mutedClass(isDark),
                ].join(" ")}
              />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   HOME
============================================================ */

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [query, setQuery] = useState("");
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(
    userProfileCache.profile
  );

  const connectedChannels = useConnectedChannels();

  // Tous les réseaux connectés sont affichés, YouTube inclus.
  const homeConnectedChannels = useMemo(
    () => connectedChannels,
    [connectedChannels]
  );

  /* ----------------------------------------------------------
     USER
  ---------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const userData = await getCurrentUser();

        if (mounted && userData) {
          userProfileCache.profile = userData;
          setUser(userData);
        }
      } catch (error) {
        console.error("Error loading user on Home:", error);
      }
    }

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

  /* ----------------------------------------------------------
     CREATE POST
  ---------------------------------------------------------- */

  const handleCreatePost = async (payload: NewPostPayload) => {
    console.log("Nouveau post à envoyer :", payload);
  };

  /* ----------------------------------------------------------
     BOTTOM BAR
  ---------------------------------------------------------- */

  const handleBottomBarChange = (id: BottomBarTab) => {
    switch (id) {
      case "add":
        setIsFolderOpen(false);
        setIsNewPostOpen(true);
        break;

      case "files":
        setIsFolderOpen((open) => !open);
        break;

      default:
        break;
    }
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main
      className={[
        "relative h-screen w-full overflow-hidden",
        "transition-colors duration-300",
        isDark ? "bg-[#09090a]" : "bg-[#f5f3ef]",
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} />

      {/* ======================================================
          CONTENT (scrollable : la barre du bas reste fixe)
      ====================================================== */}

      <div
        className="h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingLeft: SIDEBAR_OFFSET }}
      >
        <div className="mx-auto flex w-full max-w-[1280px] flex-col px-[clamp(18px,3vw,40px)] pb-[120px] pt-[clamp(18px,3vw,30px)]">
          {/* ==================================================
              HEADER
          ================================================== */}

          <header className="flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-3">
              <GreetingAvatar
                avatarUrl={user?.avatar_url}
                initials={initials}
                isDark={isDark}
              />

              <div>
                <p
                  className={[
                    "text-[10px] font-medium",
                    mutedClass(isDark),
                  ].join(" ")}
                >
                  Good to see you
                </p>

                <h1
                  className={[
                    "mt-0.5 text-[22px] font-semibold tracking-[-0.035em]",
                    strongClass(isDark),
                  ].join(" ")}
                >
                  {fullName || "Welcome"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ClockDisplay isDark={isDark} />
            </div>
          </header>

          {/* ==================================================
              OVERVIEW
          ================================================== */}

          <section className="mt-7 shrink-0">
            <div className="mb-3">
              <p
                className={[
                  "text-[11px] font-semibold",
                  isDark ? "text-neutral-500" : "text-neutral-400",
                ].join(" ")}
              >
                Overview
              </p>

              <p
                className={[
                  "mt-0.5 text-[10px]",
                  isDark ? "text-neutral-700" : "text-neutral-400",
                ].join(" ")}
              >
                Your activity at a glance
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
              <div
                className={[
                  "grid grid-cols-1 gap-3 rounded-2xl border p-4",
                  "sm:grid-cols-3",
                  cardClass(isDark),
                ].join(" ")}
              >
                <Stat
                  isDark={isDark}
                  label="Followers"
                  value="27K"
                  change="-2%"
                  icon={<Users className="h-4 w-4" />}
                />

                <Stat
                  isDark={isDark}
                  label="Likes"
                  value="12.4K"
                  change="+16%"
                  icon={<Heart className="h-4 w-4" />}
                />

                <Stat
                  isDark={isDark}
                  label="Comments"
                  value="342"
                  change="+5%"
                  icon={<MessageCircle className="h-4 w-4" />}
                />
              </div>

              <Streak isDark={isDark} />
            </div>
          </section>

          {/* ==================================================
              CHANNELS
          ================================================== */}

          <section className="mt-5 shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p
                  className={[
                    "text-[11px] font-semibold",
                    isDark ? "text-neutral-500" : "text-neutral-400",
                  ].join(" ")}
                >
                  Channels
                </p>

                <p
                  className={[
                    "mt-0.5 text-[10px]",
                    isDark ? "text-neutral-700" : "text-neutral-400",
                  ].join(" ")}
                >
                  Your connected accounts
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("channels")}
                className={[
                  "text-[10px] font-semibold",
                  isDark
                    ? "text-neutral-500 hover:text-white"
                    : "text-neutral-400 hover:text-neutral-900",
                ].join(" ")}
              >
                Manage
              </button>
            </div>

            <Channels isDark={isDark} channels={homeConnectedChannels} />
          </section>

          {/* ==================================================
              COMMENTS + UP NEXT
          ================================================== */}

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel
              isDark={isDark}
              title="Comments"
              meta="0 unanswered"
              icon={<MessageCircle className="h-5 w-5" />}
              line1="No comments yet."
              line2="You'll see the latest comments here."
            />

            <Panel
              isDark={isDark}
              title="Up Next"
              meta="0 posts scheduled"
              onViewAll={() => navigate("calendar")}
              icon={<CalendarDays className="h-5 w-5" />}
              line1="No posts scheduled yet."
              line2="You'll see upcoming posts here."
              action={{
                label: "Create Post",
                onClick: () => setIsNewPostOpen(true),
              }}
            />
          </div>

          {/* ==================================================
              FROM THE BLOG
          ================================================== */}

          <div className="mt-8">
            <BlogSection isDark={isDark} />
          </div>
        </div>
      </div>

      {/* ======================================================
          FOLDER
      ====================================================== */}

      <Folder
        isOpen={isFolderOpen}
        onClose={() => setIsFolderOpen(false)}
        isDark={isDark}
        offsetLeft={SIDEBAR_OFFSET}
      />

      {/* ======================================================
          BOTTOM BAR
      ====================================================== */}

      <BottomBar
        isDark={isDark}
        offsetLeft={SIDEBAR_OFFSET}
        active={isFolderOpen ? "files" : null}
        onChange={handleBottomBarChange}
        query={query}
        onQueryChange={setQuery}
      />

      {/* ======================================================
          NEW POST
      ====================================================== */}

      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        isDark={isDark}
        onSubmit={handleCreatePost}
      />

      {/* ======================================================
          HELP
      ====================================================== */}

      <HelpChatButton isDark={isDark} />
    </main>
  );
}