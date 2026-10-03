
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
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Heart,
  MessageCircle,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
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
   CONSTANTS
============================================================ */

const SIDEBAR_OFFSET = 104;

const userProfileCache = {
  profile: null as UserProfile | null,
};

/* ============================================================
   TYPES
============================================================ */

type SocialNetworkKey =
  | "x"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "pinterest";

type StatCardProps = {
  isDark: boolean;
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
};

/* ============================================================
   SOCIAL NETWORK HELPERS
============================================================ */

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

function getNetworkId(
  channel: ConnectedChannel
): SocialNetworkKey | null {
  const c = channel as unknown as Record<string, unknown>;

  const raw = String(
    c.platform ??
      c.network ??
      c.provider ??
      channel.key
  )
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
        className="h-10 w-10 rounded-full object-cover ring-4 ring-black/[0.03] dark:ring-white/[0.04]"
      />
    );
  }

  return (
    <div
      className={[
        "flex h-10 w-10 items-center justify-center rounded-full",
        "text-[13px] font-bold",
        isDark
          ? "bg-white text-black"
          : "bg-neutral-900 text-white",
      ].join(" ")}
    >
      {initials}
    </div>
  );
}

/* ============================================================
   CLOCK
============================================================ */

function ClockDisplay({
  isDark,
}: {
  isDark: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 15000);

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
    <div
      className={[
        "hidden items-center gap-3 rounded-2xl border px-4 py-2.5 sm:flex",
        isDark
          ? "border-white/[0.07] bg-white/[0.035]"
          : "border-black/[0.06] bg-white/70",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl",
          isDark
            ? "bg-white/10 text-white"
            : "bg-neutral-100 text-neutral-700",
        ].join(" ")}
      >
        <Clock3 className="h-4 w-4" />
      </div>

      <div>
        <p
          className={[
            "text-[14px] font-bold leading-none tabular-nums",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          {time}
        </p>

        <p
          className={[
            "mt-1 text-[10px] font-medium capitalize",
            isDark ? "text-neutral-500" : "text-neutral-400",
          ].join(" ")}
        >
          {date}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  isDark,
  title,
  subtitle,
  action,
  onAction,
}: {
  isDark: boolean;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2
          className={[
            "text-[14px] font-bold tracking-[-0.01em]",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          {title}
        </h2>

        {subtitle && (
          <p
            className={[
              "mt-0.5 text-[11.5px] font-medium",
              isDark ? "text-neutral-500" : "text-neutral-400",
            ].join(" ")}
          >
            {subtitle}
          </p>
        )}
      </div>

      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={[
            "flex items-center gap-1 text-[11.5px] font-semibold transition",
            isDark
              ? "text-neutral-400 hover:text-white"
              : "text-neutral-500 hover:text-neutral-900",
          ].join(" ")}
        >
          {action}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ============================================================
   STREAK
============================================================ */

const WEEKDAYS_FR = ["D", "L", "M", "M", "J", "V", "S"];

function StreakWidget({
  isDark,
}: {
  isDark: boolean;
}) {
  const streakCount = 0;

  const today = new Date();

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    return {
      label: WEEKDAYS_FR[date.getDay()],
      date: date.getDate(),
    };
  });

  return (
    <div
      className={[
        "relative overflow-hidden rounded-[24px] border p-5",
        isDark
          ? "border-white/[0.07] bg-[#141416]"
          : "border-black/[0.06] bg-white",
      ].join(" ")}
    >
      {/* Decorative glow */}
      <div
        className={[
          "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl",
          isDark ? "bg-white/[0.035]" : "bg-black/[0.025]",
        ].join(" ")}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p
              className={[
                "text-[12px] font-semibold",
                isDark ? "text-neutral-500" : "text-neutral-400",
              ].join(" ")}
            >
              Publishing streak
            </p>

            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={[
                  "text-[30px] font-bold tracking-[-0.04em]",
                  isDark ? "text-white" : "text-neutral-900",
                ].join(" ")}
              >
                {streakCount}
              </span>

              <span
                className={[
                  "text-[12px] font-semibold",
                  isDark ? "text-neutral-500" : "text-neutral-400",
                ].join(" ")}
              >
                days
              </span>
            </div>
          </div>

          <div
            className={[
              "flex h-10 w-10 items-center justify-center rounded-2xl",
              isDark
                ? "bg-white text-black"
                : "bg-neutral-900 text-white",
            ].join(" ")}
          >
            <Activity className="h-[18px] w-[18px]" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5">
          {days.map((day, index) => {
            const checked = index < streakCount;

            return (
              <div
                key={`${day.label}-${index}`}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={[
                    "text-[9px] font-bold uppercase",
                    isDark
                      ? "text-neutral-600"
                      : "text-neutral-400",
                  ].join(" ")}
                >
                  {day.label}
                </span>

                <div
                  className={[
                    "flex h-8 w-full max-w-8 items-center justify-center rounded-xl",
                    checked
                      ? isDark
                        ? "bg-white text-black"
                        : "bg-neutral-900 text-white"
                      : isDark
                        ? "bg-white/[0.045] text-neutral-600"
                        : "bg-neutral-100 text-neutral-400",
                  ].join(" ")}
                >
                  {checked ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[10px] font-semibold">
                      {day.date}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={[
            "mt-4 flex items-center justify-between rounded-xl px-3 py-2",
            isDark
              ? "bg-white/[0.035]"
              : "bg-neutral-50",
          ].join(" ")}
        >
          <span
            className={[
              "text-[10.5px] font-medium",
              isDark ? "text-neutral-500" : "text-neutral-500",
            ].join(" ")}
          >
            Keep posting consistently
          </span>

          <span
            className={[
              "text-[10px] font-bold",
              isDark ? "text-white" : "text-neutral-900",
            ].join(" ")}
          >
            0 / 7
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  isDark,
  title,
  value,
  change,
  icon,
}: StatCardProps) {
  const positive = change.startsWith("+");

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-[24px] border p-5",
        "transition duration-200 hover:-translate-y-[1px]",
        isDark
          ? "border-white/[0.07] bg-[#141416] hover:bg-[#171719]"
          : "border-black/[0.06] bg-white hover:shadow-[0_14px_40px_rgba(0,0,0,0.06)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-2xl",
            isDark
              ? "bg-white/10 text-white"
              : "bg-neutral-100 text-neutral-800",
          ].join(" ")}
        >
          {icon}
        </div>

        <span
          className={[
            "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold",
            positive
              ? isDark
                ? "bg-emerald-400/10 text-emerald-400"
                : "bg-emerald-50 text-emerald-600"
              : isDark
                ? "bg-rose-400/10 text-rose-400"
                : "bg-rose-50 text-rose-600",
          ].join(" ")}
        >
          {positive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {change.replace(" ", "")}
        </span>
      </div>

      <div className="mt-5">
        <p
          className={[
            "text-[11.5px] font-medium",
            isDark ? "text-neutral-500" : "text-neutral-400",
          ].join(" ")}
        >
          {title}
        </p>

        <p
          className={[
            "mt-1 text-[27px] font-bold leading-none tracking-[-0.04em]",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   CONNECTED CHANNELS
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

  const networkId = getNetworkId(channel);
  const NetworkIcon = networkId
    ? NETWORK_ICONS[networkId]
    : null;

  const label = channel.handle || channel.name;

  const initial =
    label.replace(/^@/, "").charAt(0).toUpperCase() || "?";

  return (
    <div
      title={label}
      className="relative h-10 w-10 shrink-0"
      style={{
        marginLeft: overlap ? -10 : 0,
      }}
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
            "text-[13px] font-bold ring-2",
            isDark
              ? "bg-[#28282b] text-white ring-[#141416]"
              : "bg-neutral-900 text-white ring-white",
          ].join(" ")}
        >
          {initial}
        </div>
      )}

      {NetworkIcon && (
        <span
          className={[
            "absolute -bottom-1 -right-1 flex h-[18px] w-[18px]",
            "items-center justify-center rounded-full bg-white text-black",
            "ring-2",
            isDark ? "ring-[#141416]" : "ring-white",
          ].join(" ")}
        >
          <NetworkIcon className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}

function ConnectedChannelsWidget({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  const card = [
    "rounded-[24px] border p-4",
    isDark
      ? "border-white/[0.07] bg-[#141416]"
      : "border-black/[0.06] bg-white",
  ].join(" ");

  if (channels.length === 0) {
    return (
      <div className={card}>
        <div className="flex items-center gap-4">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              isDark
                ? "bg-white/10 text-white"
                : "bg-neutral-100 text-neutral-700",
            ].join(" ")}
          >
            <Plus className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className={[
                "text-[13px] font-bold",
                isDark ? "text-white" : "text-neutral-900",
              ].join(" ")}
            >
              Connect your first channel
            </p>

            <p
              className={[
                "mt-0.5 text-[11px] font-medium",
                isDark ? "text-neutral-500" : "text-neutral-400",
              ].join(" ")}
            >
              Connect a social account to start publishing.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("channels")}
            className={[
              "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2",
              "text-[11px] font-bold transition",
              isDark
                ? "bg-white text-black hover:bg-neutral-200"
                : "bg-neutral-900 text-white hover:bg-neutral-800",
            ].join(" ")}
          >
            Connect
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center pl-1">
            {channels.slice(0, 5).map((channel, index) => (
              <ChannelAvatar
                key={channel.key}
                channel={channel}
                isDark={isDark}
                overlap={index > 0}
              />
            ))}

            {channels.length > 5 && (
              <div
                className={[
                  "-ml-2 flex h-10 w-10 items-center justify-center rounded-full",
                  "text-[10px] font-bold ring-2",
                  isDark
                    ? "bg-[#29292c] text-neutral-300 ring-[#141416]"
                    : "bg-neutral-100 text-neutral-600 ring-white",
                ].join(" ")}
              >
                +{channels.length - 5}
              </div>
            )}
          </div>

          <div className="hidden min-w-0 sm:block">
            <p
              className={[
                "text-[12px] font-bold",
                isDark ? "text-white" : "text-neutral-900",
              ].join(" ")}
            >
              Connected channels
            </p>

            <p
              className={[
                "mt-0.5 text-[10.5px] font-medium",
                isDark ? "text-neutral-500" : "text-neutral-400",
              ].join(" ")}
            >
              {channels.length}{" "}
              {channels.length === 1 ? "channel" : "channels"} active
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("channels")}
          className={[
            "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2",
            "text-[11px] font-bold transition",
            isDark
              ? "border-white/10 text-white hover:bg-white/5"
              : "border-black/10 text-neutral-900 hover:bg-neutral-50",
          ].join(" ")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add channel
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   QUICK ACTION
============================================================ */

function QuickAction({
  isDark,
  icon,
  title,
  description,
  onClick,
}: {
  isDark: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex items-center gap-3 rounded-2xl border p-3 text-left",
        "transition duration-200",
        isDark
          ? "border-white/[0.07] bg-[#141416] hover:bg-[#19191c]"
          : "border-black/[0.06] bg-white hover:bg-neutral-50",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          isDark
            ? "bg-white/10 text-white"
            : "bg-neutral-100 text-neutral-700",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={[
            "text-[11.5px] font-bold",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          {title}
        </p>

        <p
          className={[
            "mt-0.5 truncate text-[10px] font-medium",
            isDark ? "text-neutral-500" : "text-neutral-400",
          ].join(" ")}
        >
          {description}
        </p>
      </div>

      <ChevronRight
        className={[
          "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
          isDark ? "text-neutral-600" : "text-neutral-300",
        ].join(" ")}
      />
    </button>
  );
}

/* ============================================================
   BLOG
============================================================ */

type BlogPost = {
  title: string;
  date: string;
  imageUrl: string;
};

const blogPosts: BlogPost[] = [
  {
    title:
      "How to Create a Social Media Marketing Strategy in 2026",
    date: "Jul 24, 2026",
    imageUrl:
      "https://picsum.photos/seed/stone-strategy/900/600",
  },
  {
    title:
      "17 Tools for Creating Better Social Media Content",
    date: "Aug 3, 2026",
    imageUrl:
      "https://picsum.photos/seed/stone-tools/900/600",
  },
  {
    title:
      "How to Manage Multiple Social Media Accounts",
    date: "Jul 6, 2026",
    imageUrl:
      "https://picsum.photos/seed/stone-accounts/900/600",
  },
];

function BlogCard({
  isDark,
  post,
}: {
  isDark: boolean;
  post: BlogPost;
}) {
  return (
    <a
      href="#"
      className={[
        "group overflow-hidden rounded-[22px] border transition duration-200",
        "hover:-translate-y-0.5",
        isDark
          ? "border-white/[0.07] bg-[#141416]"
          : "border-black/[0.06] bg-white",
      ].join(" ")}
    >
      <div className="relative h-[145px] overflow-hidden">
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold text-neutral-900 backdrop-blur">
          ARTICLE
        </span>
      </div>

      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              "text-[10px] font-medium",
              isDark ? "text-neutral-500" : "text-neutral-400",
            ].join(" ")}
          >
            {post.date}
          </span>

          <ArrowUpRight
            className={[
              "h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
              isDark ? "text-neutral-500" : "text-neutral-400",
            ].join(" ")}
          />
        </div>

        <p
          className={[
            "mt-2 line-clamp-2 text-[12.5px] font-bold leading-snug",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          {post.title}
        </p>
      </div>
    </a>
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

  const homeConnectedChannels = useMemo(
    () =>
      connectedChannels.filter(
        (channel) => getNetworkId(channel) !== "youtube"
      ),
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
        console.error(
          "Error loading user on Home:",
          error
        );
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim();

  const initials =
    `${(user?.first_name || "")[0] || ""}${
      (user?.last_name || "")[0] || ""
    }`.toUpperCase() || "U";

  /* ----------------------------------------------------------
     CREATE POST
  ---------------------------------------------------------- */

  const handleCreatePost = async (
    payload: NewPostPayload
  ) => {
    console.log("Nouveau post à envoyer :", payload);
  };

  /* ----------------------------------------------------------
     BOTTOM BAR
  ---------------------------------------------------------- */

  const handleBottomBarChange = (
    id: BottomBarTab
  ) => {
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
        "transition-colors duration-500",
        isDark ? "bg-[#09090a]" : "bg-[#f5f3ef]",
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} />

      <div
        className="h-full"
        style={{
          paddingLeft: SIDEBAR_OFFSET,
        }}
      >
        <div
          className={[
            "mx-auto flex h-full w-full max-w-[1400px]",
            "flex-col overflow-y-auto",
            "px-[clamp(16px,3vw,40px)]",
            "pb-[110px]",
            "pt-[clamp(18px,2.5vw,32px)]",
            "scrollbar-thin",
          ].join(" ")}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <header className="flex items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <GreetingAvatar
                avatarUrl={user?.avatar_url}
                initials={initials}
                isDark={isDark}
              />

              <div className="min-w-0">
                <p
                  className={[
                    "text-[11px] font-semibold",
                    isDark
                      ? "text-neutral-500"
                      : "text-neutral-400",
                  ].join(" ")}
                >
                  Welcome back
                </p>

                <h1
                  className={[
                    "truncate text-[22px] font-bold tracking-[-0.035em]",
                    "sm:text-[26px]",
                    isDark
                      ? "text-white"
                      : "text-neutral-900",
                  ].join(" ")}
                >
                  {fullName || "there"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ClockDisplay isDark={isDark} />

              <button
                type="button"
                onClick={() => setIsNewPostOpen(true)}
                className={[
                  "hidden items-center gap-1.5 rounded-xl px-4 py-2.5",
                  "text-[11px] font-bold transition sm:flex",
                  isDark
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "bg-neutral-900 text-white hover:bg-neutral-800",
                ].join(" ")}
              >
                <Plus className="h-3.5 w-3.5" />
                New post
              </button>
            </div>
          </header>

          {/* =================================================
              HERO / OVERVIEW
          ================================================= */}

          <section className="mt-7">
            <SectionHeader
              isDark={isDark}
              title="Overview"
              subtitle="Your social media performance at a glance"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="lg:col-span-1">
                <StreakWidget isDark={isDark} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3">
                <StatCard
                  isDark={isDark}
                  title="Total followers"
                  value="27K"
                  change="- 2%"
                  icon={
                    <Users className="h-[18px] w-[18px]" />
                  }
                />

                <StatCard
                  isDark={isDark}
                  title="Total likes"
                  value="12,445"
                  change="+ 16%"
                  icon={
                    <Heart className="h-[18px] w-[18px]" />
                  }
                />

                <StatCard
                  isDark={isDark}
                  title="Total comments"
                  value="342"
                  change="+ 5%"
                  icon={
                    <MessageCircle className="h-[18px] w-[18px]" />
                  }
                />
              </div>
            </div>
          </section>

          {/* =================================================
              CHANNELS
          ================================================= */}

          <section className="mt-6">
            <SectionHeader
              isDark={isDark}
              title="Channels"
              subtitle="Accounts connected to Stone"
              action="Manage"
              onAction={() => navigate("channels")}
            />

            <ConnectedChannelsWidget
              isDark={isDark}
              channels={homeConnectedChannels}
            />
          </section>

          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <section className="mt-6">
            <SectionHeader
              isDark={isDark}
              title="Quick actions"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <QuickAction
                isDark={isDark}
                icon={
                  <Sparkles className="h-4 w-4" />
                }
                title="Create a post"
                description="Publish content across your channels"
                onClick={() => setIsNewPostOpen(true)}
              />

              <QuickAction
                isDark={isDark}
                icon={
                  <CalendarDays className="h-4 w-4" />
                }
                title="Schedule content"
                description="Plan your upcoming publications"
                onClick={() => navigate("calendar")}
              />

              <QuickAction
                isDark={isDark}
                icon={
                  <FileText className="h-4 w-4" />
                }
                title="Content library"
                description="Browse your saved media and drafts"
                onClick={() => setIsFolderOpen(true)}
              />
            </div>
          </section>

          {/* =================================================
              BLOG
          ================================================= */}

          <section className="mt-7">
            <SectionHeader
              isDark={isDark}
              title="From the Blog"
              subtitle="Tips and ideas for growing your presence"
              action="View all"
              onAction={() => {}}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {blogPosts.map((post) => (
                <BlogCard
                  key={post.title}
                  isDark={isDark}
                  post={post}
                />
              ))}
            </div>
          </section>

          {/* =================================================
              FOOTER SPACE
          ================================================= */}

          <div className="h-8 shrink-0" />
        </div>
      </div>

      {/* =====================================================
          FOLDER
      ===================================================== */}

      <Folder
        isOpen={isFolderOpen}
        onClose={() => setIsFolderOpen(false)}
        isDark={isDark}
        offsetLeft={SIDEBAR_OFFSET}
      />

      {/* =====================================================
          BOTTOM BAR
      ===================================================== */}

      <BottomBar
        isDark={isDark}
        offsetLeft={SIDEBAR_OFFSET}
        active={isFolderOpen ? "files" : null}
        onChange={handleBottomBarChange}
        query={query}
        onQueryChange={setQuery}
      />

      {/* =====================================================
          NEW POST
      ===================================================== */}

      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        isDark={isDark}
        onSubmit={handleCreatePost}
      />

      {/* =====================================================
          HELP
      ===================================================== */}

      <HelpChatButton isDark={isDark} />
    </main>
  );
}
