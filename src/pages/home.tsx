import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import { navigate } from "../hooks/useHashRoute";
import { useTheme } from "../hooks/useTheme";

import {
  useConnectedChannels,
  type ConnectedChannel,
} from "../hooks/useConnectedChannels";

import DashboardSidebar, {
  useSidebarOffset,
} from "../components/DashboardSidebar";

import NewPostModal, {
  type NewPostPayload,
} from "../components/Newpostmodal";

import HelpChatButton from "../components/Helpchatbutton";
import BottomBar, {
  type BottomBarTab,
} from "../components/Bottombar";

import Folder from "../components/Folder";

import {
  getCurrentUser,
  type UserProfile,
} from "../services/supabase";

import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Flame,
  Heart,
  Loader2,
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
   UTILS
============================================================ */

/** Concatène des classes conditionnelles sans dépendance externe. */
function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ============================================================
   LAYOUT TOKENS (design system local)
============================================================ */

const surface = {
  card: (isDark: boolean) =>
    isDark
      ? "border-white/[0.07] bg-[#141416]"
      : "border-black/[0.06] bg-white",
  panel: (isDark: boolean) =>
    isDark
      ? "border-white/[0.07] bg-white/[0.03]"
      : "border-black/[0.06] bg-neutral-50",
  ring: (isDark: boolean) =>
    isDark ? "ring-[#101011]" : "ring-neutral-50",
};

const text = {
  muted: (isDark: boolean) =>
    isDark ? "text-neutral-600" : "text-neutral-400",
  soft: (isDark: boolean) =>
    isDark ? "text-neutral-500" : "text-neutral-400",
  strong: (isDark: boolean) =>
    isDark ? "text-white" : "text-neutral-900",
  sectionTitle: (isDark: boolean) =>
    isDark ? "text-neutral-300" : "text-neutral-700",
};

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

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
  (props: { className?: string }) => ReactElement
> = {
  x: XIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
};

const NETWORK_LABEL: Record<SocialNetworkKey, string> = {
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
};

function getNetworkId(
  channel: ConnectedChannel
): SocialNetworkKey | null {
  const c = channel as unknown as Record<string, unknown>;

  const raw = String(
    c.platform ?? c.network ?? c.provider ?? channel.key
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
   BLOG
============================================================ */

type BlogPost = {
  title: string;
  label: string;
  date: string;
  image?: string;
  url: string;
};

const BLOG_URL = "#";

const BLOG_POSTS: BlogPost[] = [
  {
    title: "The Best Time to Post on TikTok in 2026",
    label: "Blog post",
    date: "Jul 20, 2026",
    image: "/images/blog/best-time-tiktok.jpg",
    url: BLOG_URL,
  },
  {
    title: "The 11 Best AI Video Editors: I Tested Them All",
    label: "Blog post",
    date: "Jul 22, 2026",
    image: "/images/blog/ai-video-editors.jpg",
    url: BLOG_URL,
  },
  {
    title: "How to Create a Social Media Content Calendar",
    label: "Blog post",
    date: "Jul 24, 2026",
    image: "/images/blog/content-calendar.jpg",
    url: BLOG_URL,
  },
  {
    title: "17 Best AI Tools for Social Media Content",
    label: "Blog post",
    date: "Aug 3, 2026",
    image: "/images/blog/ai-tools.jpg",
    url: BLOG_URL,
  },
];

/* Ouvre un nouvel onglet uniquement pour une vraie URL externe */
const linkProps = (url: string) =>
  /^https?:\/\//.test(url)
    ? { target: "_blank", rel: "noreferrer" }
    : {};

/* ============================================================
   GREETING
============================================================ */

function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  if (hour >= 18 && hour < 22) return "Good evening";

  return "Good night";
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
        className="h-10 w-10 rounded-full object-cover ring-2 transition-transform duration-300 hover:scale-105"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full",
        "text-[12px] font-semibold transition-transform duration-300 hover:scale-105",
        isDark
          ? "bg-white text-black"
          : "bg-neutral-900 text-white"
      )}
    >
      {initials}
    </div>
  );
}

/* ============================================================
   CLOCK
============================================================ */

function ClockDisplay({ isDark, now }: { isDark: boolean; now: Date }) {
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
    <div className="text-right" aria-label={`${time} — ${date}`}>
      <p
        className={cn(
          "text-[16px] font-semibold tabular-nums",
          text.strong(isDark)
        )}
      >
        {time}
      </p>

      <p
        className={cn(
          "text-[11px] font-medium capitalize",
          text.muted(isDark)
        )}
      >
        {date}
      </p>
    </div>
  );
}

/* ============================================================
   SECTION HEADER — titre de section réutilisable
============================================================ */

function SectionHeader({
  isDark,
  title,
  subtitle,
  action,
}: {
  isDark: boolean;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <p
          className={cn(
            "text-[11px] font-semibold",
            text.soft(isDark)
          )}
        >
          {title}
        </p>

        {subtitle && (
          <p
            className={cn(
              "mt-0.5 text-[10px]",
              isDark ? "text-neutral-700" : "text-neutral-400"
            )}
          >
            {subtitle}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

/* ============================================================
   STAT — cartes cliquables, tendance accessible, skeleton
============================================================ */

type StatData = {
  label: string;
  value: string;
  change: string;
  icon: ReactNode;
  href: string;
};

function Stat({
  isDark,
  stat,
}: {
  isDark: boolean;
  stat: StatData;
}) {
  const positive = stat.change.startsWith("+");

  return (
    <button
      type="button"
      onClick={() => navigate(stat.href)}
      aria-label={`${stat.label} : ${stat.value}, ${stat.change} — ouvrir les détails`}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-xl p-2 -m-2 text-left",
        "transition-colors duration-200",
        focusRing,
        isDark ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.03]"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          "transition-transform duration-300 group-hover:scale-105",
          isDark
            ? "bg-white/[0.06] text-white"
            : "bg-white text-neutral-700 shadow-sm ring-1 ring-black/[0.05]"
        )}
      >
        {stat.icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[10px] font-medium",
            text.soft(isDark)
          )}
        >
          {stat.label}
        </p>

        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-[17px] font-bold tracking-tight",
              text.strong(isDark)
            )}
          >
            {stat.value}
          </span>

          <span
            className={cn(
              "flex items-center gap-0.5 text-[9px] font-semibold",
              positive ? "text-emerald-500" : "text-rose-500"
            )}
          >
            {positive ? (
              <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5" aria-hidden="true" />
            )}
            {stat.change}
          </span>
        </div>
      </div>

      <ChevronRight
        className={cn(
          "h-3.5 w-3.5 shrink-0 opacity-0 transition-all duration-200",
          "group-hover:translate-x-0.5 group-hover:opacity-60",
          text.strong(isDark)
        )}
        aria-hidden="true"
      />
    </button>
  );
}

/* ============================================================
   STREAK — progression animée, aria sur la barre
============================================================ */

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

function Streak({ isDark }: { isDark: boolean }) {
  const streak = 0;
  const goal = 7;

  const today = new Date();

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() + index);

        return {
          day: WEEKDAYS[date.getDay()],
          date: date.getDate(),
          isToday: index === 0,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const progress = Math.min((streak / goal) * 100, 100);

  return (
    <div
      className={cn(
        "relative min-h-[154px] overflow-hidden rounded-2xl border p-4",
        "transition-all duration-300",
        surface.card(isDark)
      )}
    >
      {/* Background gradient */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0",
          isDark
            ? "bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.09),transparent_45%),linear-gradient(135deg,#0b0b0c_0%,#171719_48%,#303033_100%)]"
            : "bg-[radial-gradient(circle_at_100%_0%,rgba(0,0,0,0.08),transparent_45%),linear-gradient(135deg,#ffffff_0%,#f1f1f1_48%,#d4d4d4_100%)]"
        )}
      />

      {/* Subtle glow */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl",
          isDark ? "bg-white/[0.06]" : "bg-black/[0.05]"
        )}
      />

      <div className="relative z-10 flex h-full min-h-[122px] flex-col justify-between">
        {/* TOP */}
        <div className="flex items-start justify-between">
          <div>
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.14em]",
                isDark ? "text-neutral-400" : "text-neutral-500"
              )}
            >
              Streak
            </p>

            <div className="mt-1 flex items-end gap-1.5">
              <span
                className={cn(
                  "text-[30px] font-bold leading-none tracking-[-0.06em]",
                  isDark ? "text-white" : "text-neutral-950"
                )}
              >
                {streak}
              </span>

              <span className="mb-0.5 text-[10px] font-medium text-neutral-500">
                days
              </span>
            </div>
          </div>

          {/* FLAME */}
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border",
              "backdrop-blur-sm",
              isDark
                ? "border-white/10 bg-white/[0.06] text-white"
                : "border-black/10 bg-white/50 text-neutral-900"
            )}
            aria-hidden="true"
          >
            <Flame className="h-[17px] w-[17px]" />
          </div>
        </div>

        {/* PROGRESS */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-medium text-neutral-500">
              Weekly progress
            </span>

            <span
              className={cn(
                "text-[9px] font-semibold",
                isDark ? "text-neutral-300" : "text-neutral-700"
              )}
            >
              {streak}/{goal}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Progression hebdomadaire"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={streak}
            className={cn(
              "h-1.5 w-full overflow-hidden rounded-full",
              isDark ? "bg-white/10" : "bg-black/10"
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                isDark
                  ? "bg-gradient-to-r from-white/30 via-white/70 to-white"
                  : "bg-gradient-to-r from-neutral-700 via-neutral-900 to-black"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* DAYS */}
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {days.map((day, index) => {
            const completed = index < streak;

            return (
              <div
                key={`${day.day}-${index}`}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    "text-[8px] font-semibold",
                    day.isToday
                      ? isDark
                        ? "text-white"
                        : "text-black"
                      : "text-neutral-500"
                  )}
                >
                  {day.day}
                </span>

                <div
                  className={cn(
                    "relative flex h-6 w-6 items-center justify-center rounded-full border",
                    "transition-all duration-300",
                    completed
                      ? isDark
                        ? "border-white bg-white text-black"
                        : "border-black bg-black text-white"
                      : day.isToday
                        ? isDark
                          ? "border-white/50 bg-white/[0.08]"
                          : "border-black/40 bg-black/[0.05]"
                        : isDark
                          ? "border-white/10 bg-white/[0.025]"
                          : "border-black/10 bg-black/[0.025]"
                  )}
                >
                  {completed ? (
                    <span className="text-[8px] font-bold">✓</span>
                  ) : (
                    <span className="text-[8px] font-medium text-neutral-500">
                      {day.date}
                    </span>
                  )}

                  {day.isToday && !completed && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -bottom-0.5 h-1 w-1 rounded-full",
                        isDark ? "bg-white" : "bg-black"
                      )}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CHANNEL AVATAR
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

  const initial =
    label.replace(/^@/, "").charAt(0).toUpperCase() || "?";

  const networkId = getNetworkId(channel);

  const NetworkIcon = networkId
    ? NETWORK_ICONS[networkId]
    : null;

  const networkLabel = networkId
    ? NETWORK_LABEL[networkId]
    : null;

  return (
    <div
      className="relative h-9 w-9 shrink-0 transition-transform duration-200 hover:z-10 hover:scale-110"
      style={{ marginLeft: overlap ? -8 : 0 }}
      title={`${label}${networkLabel ? ` — ${networkLabel}` : ""}`}
    >
      {channel.avatarUrl && !failed ? (
        <img
          src={channel.avatarUrl}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={cn(
            "h-full w-full rounded-full object-cover ring-2",
            surface.ring(isDark)
          )}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full",
            "text-[11px] font-semibold ring-2",
            isDark
              ? "bg-[#29292c] text-white"
              : "bg-neutral-900 text-white",
            surface.ring(isDark)
          )}
        >
          {initial}
        </div>
      )}

      {NetworkIcon && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-1 -right-1 flex h-4 w-4 items-center",
            "justify-center rounded-full bg-white text-black ring-1",
            surface.ring(isDark)
          )}
        >
          <NetworkIcon className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
}

/* ============================================================
   CHANNELS
============================================================ */

function Channels({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  const visible = channels.slice(0, 6);
  const remaining = channels.length - visible.length;

  return (
    <div
      className={cn(
        "flex min-h-[74px] items-center justify-between gap-4 rounded-2xl border px-4",
        surface.panel(isDark)
      )}
    >
      {channels.length === 0 ? (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              isDark
                ? "bg-white/[0.06]"
                : "bg-white shadow-sm ring-1 ring-black/[0.05]"
            )}
            aria-hidden="true"
          >
            <Plus
              className={cn(
                "h-4 w-4",
                isDark ? "text-white" : "text-neutral-700"
              )}
            />
          </div>

          <div>
            <p
              className={cn(
                "text-[11px] font-semibold",
                text.strong(isDark)
              )}
            >
              Connect your first channel
            </p>

            <p
              className={cn("mt-0.5 text-[10px]", text.muted(isDark))}
            >
              Start publishing to social networks.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex items-center pl-1">
            {visible.map((channel, index) => (
              <ChannelAvatar
                key={channel.key}
                channel={channel}
                isDark={isDark}
                overlap={index > 0}
              />
            ))}

            {remaining > 0 && (
              <div
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-full",
                  "text-[10px] font-semibold ring-2",
                  isDark
                    ? "border border-white/10 bg-[#29292c] text-neutral-300"
                    : "border border-black/10 bg-neutral-200 text-neutral-600",
                  surface.ring(isDark)
                )}
                style={{ marginLeft: remaining > 0 || visible.length > 1 ? -8 : 0 }}
                title={`+${remaining} autres`}
              >
                +{remaining}
              </div>
            )}
          </div>

          <div>
            <p
              className={cn(
                "text-[11px] font-semibold",
                text.strong(isDark)
              )}
            >
              {channels.length}{" "}
              {channels.length === 1 ? "channel" : "channels"}{" "}
              connected
            </p>

            <p className={cn("text-[10px]", text.muted(isDark))}>
              Ready to publish
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate("channels")}
        aria-label={
          channels.length === 0
            ? "Connecter une chaîne"
            : "Gérer les chaînes"
        }
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2",
          "text-[10px] font-semibold transition",
          focusRing,
          isDark
            ? "text-white hover:bg-white/[0.06]"
            : "text-neutral-900 hover:bg-neutral-100"
        )}
      >
        {channels.length === 0 ? "Connect" : "Manage"}

        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ============================================================
   EMPTY PANEL — empty states orientés action
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
  onViewAll?: () => void;
  icon: ReactNode;
  line1: string;
  line2: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <section className="min-w-0" aria-label={title}>
      <div className="mb-3 flex items-center justify-between">
        <p
          className={cn(
            "text-[12px] font-semibold",
            text.sectionTitle(isDark)
          )}
        >
          {title}

          <span
            className={cn(
              "ml-1.5 font-normal",
              text.muted(isDark)
            )}
          >
            · {meta}
          </span>
        </p>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            aria-label={`Tout voir — ${title}`}
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-semibold transition",
              focusRing,
              isDark
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            View All
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        className={cn(
          "flex min-h-[190px] flex-col items-center justify-center",
          "gap-1 rounded-2xl border px-4 py-6 text-center",
          "transition-colors duration-300",
          surface.panel(isDark)
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "mb-2 flex h-11 w-11 items-center justify-center rounded-full",
            isDark
              ? "bg-white/[0.07] text-neutral-300"
              : "bg-neutral-200/70 text-neutral-600"
          )}
        >
          {icon}
        </div>

        <p
          className={cn(
            "text-[12px] font-medium",
            text.strong(isDark)
          )}
        >
          {line1}
        </p>

        <p className="text-[12px] text-neutral-500">{line2}</p>

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={cn(
              "mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5",
              "text-[11px] font-semibold transition",
              focusRing,
              isDark
                ? "border-white/10 text-white hover:bg-white/[0.07]"
                : "border-black/10 text-neutral-900 hover:bg-neutral-100"
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
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

function BlogImage({ src, isDark }: { src?: string; isDark: boolean }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "flex h-[140px] w-full items-center justify-center rounded-xl",
          isDark ? "bg-white/[0.06]" : "bg-neutral-200/70"
        )}
      >
        <Sparkles
          className={cn(
            "h-5 w-5",
            isDark ? "text-white/20" : "text-black/15"
          )}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className="h-[140px] w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  );
}

function BlogSection({ isDark }: { isDark: boolean }) {
  return (
    <section aria-label="From the Blog">
      <SectionHeader
        isDark={isDark}
        title="From the Blog"
        action={
          <a
            href={BLOG_URL}
            {...linkProps(BLOG_URL)}
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-semibold transition",
              focusRing,
              isDark
                ? "text-neutral-400 hover:text-white"
                : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            View All Articles
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {BLOG_POSTS.map((post) => (
          <a
            key={post.title}
            href={post.url}
            {...linkProps(post.url)}
            aria-label={`${post.label} — ${post.title}, ${post.date}`}
            className={cn(
              "group flex flex-col rounded-2xl border p-3.5 transition",
              "duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.04]",
              surface.card(isDark),
              isDark ? "hover:bg-[#1a1a1d]" : "hover:bg-neutral-50"
            )}
          >
            <BlogImage src={post.image} isDark={isDark} />

            <div className="mt-3.5 flex items-center justify-between gap-2 px-0.5">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                  isDark
                    ? "bg-[#16304f] text-[#a9cdf5]"
                    : "bg-blue-50 text-blue-700"
                )}
              >
                {post.label}
              </span>

              <span
                className={cn("text-[10px]", text.muted(isDark))}
              >
                {post.date}
              </span>
            </div>

            <h3
              className={cn(
                "mt-2.5 px-0.5 text-[14px] font-semibold leading-snug",
                "tracking-[-0.01em]",
                text.strong(isDark)
              )}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {post.title}
            </h3>

            <div className="mt-3 flex justify-end px-0.5">
              <ArrowRight
                className={cn(
                  "h-4 w-4 transition-transform duration-300 group-hover:translate-x-1",
                  text.strong(isDark)
                )}
                aria-hidden="true"
              />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   QUICK ACTIONS — raccourcis de création en un clic
============================================================ */

const QUICK_ACTIONS = [
  {
    id: "post",
    label: "New post",
    hint: "Composer un post",
    icon: <Plus className="h-4 w-4" />,
  },
  {
    id: "calendar",
    label: "Schedule",
    hint: "Planifier un post",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    id: "channels",
    label: "Add channel",
    hint: "Connecter un réseau",
    icon: <Users className="h-4 w-4" />,
  },
] as const;

function QuickActions({
  isDark,
  onAction,
}: {
  isDark: boolean;
  onAction: (id: (typeof QUICK_ACTIONS)[number]["id"]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onAction(action.id)}
          title={action.hint}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5",
            "text-[11px] font-semibold transition duration-200",
            "active:scale-[0.97]",
            focusRing,
            surface.card(isDark),
            text.strong(isDark),
            isDark
              ? "hover:border-white/20 hover:bg-white/[0.06]"
              : "hover:border-black/15 hover:bg-neutral-100"
          )}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   SKELETON — état de chargement du header
============================================================ */

function HeaderSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div
        className={cn(
          "h-10 w-10 animate-pulse rounded-full",
          isDark ? "bg-white/10" : "bg-black/10"
        )}
      />

      <div className="space-y-1.5">
        <div
          className={cn(
            "h-2 w-16 animate-pulse rounded-full",
            isDark ? "bg-white/10" : "bg-black/10"
          )}
        />
        <div
          className={cn(
            "h-5 w-36 animate-pulse rounded-full",
            isDark ? "bg-white/10" : "bg-black/10"
          )}
        />
      </div>
    </div>
  );
}

/* ============================================================
   HOME
============================================================ */

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const sidebarOffset = useSidebarOffset();

  const [query, setQuery] = useState("");
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(
    userProfileCache.profile
  );
  const [isUserLoading, setIsUserLoading] = useState(
    !userProfileCache.profile
  );

  const [now, setNow] = useState(() => new Date());

  const connectedChannels = useConnectedChannels();

  /* ----------------------------------------------------------
     CLOCK — tick toutes les 15 s, resynchronisé au focus
  ---------------------------------------------------------- */

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15000);

    const resync = () => setNow(new Date());
    window.addEventListener("focus", resync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", resync);
    };
  }, []);

  /* ----------------------------------------------------------
     USER
  ---------------------------------------------------------- */

  useEffect(() => {
    if (userProfileCache.profile) return;

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
      } finally {
        if (mounted) setIsUserLoading(false);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  /* ----------------------------------------------------------
     KEYBOARD — « N » ouvre le modal de création
  ---------------------------------------------------------- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "n" || event.metaKey || event.ctrlKey) return;

      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      setIsFolderOpen(false);
      setIsNewPostOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const fullName =
    user?.first_name || user?.last_name
      ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
      : "";

  const initials =
    `${(user?.first_name || "")[0] || ""}${
      (user?.last_name || "")[0] || ""
    }`.toUpperCase() || "U";

  const greeting = getGreeting(now);

  /* ----------------------------------------------------------
     HANDLERS
  ---------------------------------------------------------- */

  const handleCreatePost = useCallback(
    async (payload: NewPostPayload) => {
      console.log("Nouveau post à envoyer :", payload);
    },
    []
  );

  const handleViewAllComments = useCallback(() => {
    const first = connectedChannels[0];

    navigate(
      first
        ? `community?channel=${encodeURIComponent(first.key)}`
        : "community"
    );
  }, [connectedChannels]);

  const handleBottomBarChange = useCallback((id: BottomBarTab) => {
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
  }, []);

  const handleQuickAction = useCallback(
    (id: (typeof QUICK_ACTIONS)[number]["id"]) => {
      switch (id) {
        case "post":
          setIsNewPostOpen(true);
          break;

        case "calendar":
          navigate("calendar");
          break;

        case "channels":
          navigate("channels");
          break;
      }
    },
    []
  );

  const closeNewPost = useCallback(() => setIsNewPostOpen(false), []);
  const closeFolder = useCallback(() => setIsFolderOpen(false), []);

  /* ----------------------------------------------------------
     STATS — centralisées, prêtes à brancher sur une API
  ---------------------------------------------------------- */

  const stats: StatData[] = [
    {
      label: "Followers",
      value: "27K",
      change: "-2%",
      icon: <Users className="h-4 w-4" />,
      href: "analytics",
    },
    {
      label: "Likes",
      value: "12.4K",
      change: "+16%",
      icon: <Heart className="h-4 w-4" />,
      href: "analytics",
    },
    {
      label: "Comments",
      value: "342",
      change: "+5%",
      icon: <MessageCircle className="h-4 w-4" />,
      href: "community",
    },
  ];

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main
      className={cn(
        "relative h-screen w-full overflow-hidden",
        "transition-colors duration-300",
        isDark ? "bg-[#09090a]" : "bg-[#f5f3ef]"
      )}
    >
      <DashboardSidebar theme={theme} />

      <div
        className={cn(
          "h-full overflow-y-auto overflow-x-hidden",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "transition-[padding-left] duration-[380ms]",
          "ease-[cubic-bezier(0.4,0,0.2,1)]",
          "motion-reduce:transition-none"
        )}
        style={{ paddingLeft: sidebarOffset }}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-[1280px]",
            "flex-col px-[clamp(18px,3vw,40px)]",
            "pb-[120px] pt-[clamp(18px,3vw,30px)]"
          )}
        >
          {/* HEADER */}

          <header className="flex shrink-0 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {isUserLoading && !user ? (
                <HeaderSkeleton isDark={isDark} />
              ) : (
                <>
                  <GreetingAvatar
                    avatarUrl={user?.avatar_url}
                    initials={initials}
                    isDark={isDark}
                  />

                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[10px] font-medium",
                        text.muted(isDark)
                      )}
                    >
                      {greeting}
                    </p>

                    <h1
                      className={cn(
                        "truncate text-[22px] font-semibold",
                        "tracking-[-0.035em]",
                        text.strong(isDark)
                      )}
                    >
                      {fullName || "Welcome"}
                    </h1>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <QuickActions isDark={isDark} onAction={handleQuickAction} />

              <ClockDisplay isDark={isDark} now={now} />
            </div>
          </header>

          {/* OVERVIEW */}

          <section className="mt-7 shrink-0" aria-label="Overview">
            <SectionHeader
              isDark={isDark}
              title="Overview"
              subtitle="Your activity at a glance"
            />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
              <div
                className={cn(
                  "grid grid-cols-1 gap-3 rounded-2xl border p-4",
                  "sm:grid-cols-3",
                  surface.panel(isDark)
                )}
              >
                {stats.map((stat) => (
                  <Stat key={stat.label} isDark={isDark} stat={stat} />
                ))}
              </div>

              <Streak isDark={isDark} />
            </div>
          </section>

          {/* CHANNELS */}

          <section className="mt-5 shrink-0" aria-label="Channels">
            <SectionHeader
              isDark={isDark}
              title="Channels"
              subtitle="Your connected accounts"
              action={
                <button
                  type="button"
                  onClick={() => navigate("channels")}
                  className={cn(
                    "text-[10px] font-semibold transition",
                    focusRing,
                    isDark
                      ? "text-neutral-500 hover:text-white"
                      : "text-neutral-400 hover:text-neutral-900"
                  )}
                >
                  Manage
                </button>
              }
            />

            <Channels isDark={isDark} channels={connectedChannels} />
          </section>

          {/* COMMENTS + UP NEXT */}

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel
              isDark={isDark}
              title="Comments"
              meta="0 unanswered"
              onViewAll={handleViewAllComments}
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

          {/* BLOG */}

          <div className="mt-8">
            <BlogSection isDark={isDark} />
          </div>

          {/* FOOTER — indice raccourci clavier */}

          <footer
            className={cn(
              "mt-10 flex items-center justify-center gap-2",
              "text-[10px]",
              text.muted(isDark)
            )}
          >
            <kbd
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[9px]",
                isDark
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-black/10 bg-white"
              )}
            >
              N
            </kbd>
            <span>pour créer un nouveau post</span>
          </footer>
        </div>
      </div>

      {/* FOLDER */}

      <Folder
        isOpen={isFolderOpen}
        onClose={closeFolder}
        isDark={isDark}
        offsetLeft={sidebarOffset}
      />

      {/* BOTTOM BAR */}

      <BottomBar
        isDark={isDark}
        offsetLeft={sidebarOffset}
        active={isFolderOpen ? "files" : null}
        onChange={handleBottomBarChange}
        query={query}
        onQueryChange={setQuery}
      />

      {/* NEW POST */}

      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={closeNewPost}
        isDark={isDark}
        onSubmit={handleCreatePost}
      />

      {/* HELP */}

      <HelpChatButton isDark={isDark} />
    </main>
  );
}