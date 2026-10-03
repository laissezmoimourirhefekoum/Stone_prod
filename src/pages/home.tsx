import { useEffect, useMemo, useState, type ReactNode } from "react";
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
/*  Design tokens                                                             */
/* -------------------------------------------------------------------------- */

const SIDEBAR_OFFSET = 104;
const ACCENT = "#d7ff3e";
const ACCENT_INK = "#0a0a0a";

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
/*  Stats                                                                     */
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
      likes: acc.likes + readStat(ch, ["likes", "likesCount", "likes_count"]),
      comments:
        acc.comments +
        readStat(ch, ["comments", "commentsCount", "comments_count"]),
    }),
    { followers: 0, likes: 0, comments: 0 }
  );
}

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

function panel(isDark: boolean, extra = "") {
  return [
    "rounded-[28px] border transition-colors",
    isDark
      ? "border-white/[0.08] bg-[#111113] shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9)]"
      : "border-black/[0.06] bg-white shadow-[0_24px_70px_-36px_rgba(0,0,0,0.25)]",
    extra,
  ].join(" ");
}

function MicroLabel({
  children,
  isDark,
  className = "",
}: {
  children: ReactNode;
  isDark: boolean;
  className?: string;
}) {
  return (
    <span
      className={[
        "text-[10.5px] font-bold uppercase tracking-[0.16em]",
        isDark ? "text-neutral-500" : "text-neutral-500",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function PlusIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function pillButton(isDark: boolean) {
  return [
    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
    isDark
      ? "bg-white text-neutral-900 hover:bg-neutral-200"
      : "bg-neutral-900 text-white hover:bg-neutral-800",
  ].join(" ");
}

/* -------------------------------------------------------------------------- */
/*  Header : greeting + clock pill + avatar                                   */
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
      style={{ width: 44, height: 44 }}
      className="aspect-square shrink-0 rounded-full object-cover ring-2 ring-white/60 dark:ring-white/10"
      onError={() => setLoadFailed(true)}
    />
  ) : (
    <div
      style={{ width: 44, height: 44 }}
      className={[
        "flex aspect-square shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ring-2",
        isDark
          ? "bg-[#2a2a2d] text-white ring-white/10"
          : "bg-neutral-900 text-white ring-white",
      ].join(" ")}
    >
      {initials}
    </div>
  );
}

function ClockPill({ isDark }: { isDark: boolean }) {
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
    <div
      className={[
        "flex items-center gap-3 rounded-full border px-4 py-2",
        isDark
          ? "border-white/[0.08] bg-white/[0.02] text-white"
          : "border-black/[0.06] bg-white text-neutral-900",
      ].join(" ")}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: ACCENT }}
        />
        <span
          className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ background: ACCENT }}
        />
      </span>
      <span className="text-[13px] font-semibold tabular-nums">{time}</span>
      <span
        className={["h-3 w-px", isDark ? "bg-white/15" : "bg-black/10"].join(" ")}
      />
      <span
        className={[
          "text-[12px] font-medium capitalize",
          isDark ? "text-neutral-400" : "text-neutral-500",
        ].join(" ")}
      >
        {date}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bento tiles                                                               */
/* -------------------------------------------------------------------------- */

function HeroFollowersTile({
  followers,
  networkCount,
}: {
  followers: number;
  networkCount: number;
}) {
  return (
    <div
      className="relative flex h-full min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] p-6"
      style={{ background: ACCENT, color: ACCENT_INK }}
    >
      {/* decorative rings */}
      <svg
        viewBox="0 0 200 200"
        className="pointer-events-none absolute -right-24 -top-24 h-[340px] w-[340px] opacity-[0.14]"
        aria-hidden
      >
        <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="100" cy="100" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="100" cy="100" r="26" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>

      <div className="relative flex items-start justify-between gap-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-black/55">
          Abonnés cumulés
        </span>
        <span className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-bold tabular-nums">
          {networkCount} réseau{networkCount > 1 ? "x" : ""}
        </span>
      </div>

      <div className="relative">
        <p className="font-display text-[clamp(56px,9vw,112px)] font-semibold leading-[0.82] tracking-[-0.055em] tabular-nums">
          {numberFormatter.format(followers)}
        </p>
        <p className="mt-4 max-w-[300px] text-[13px] font-medium leading-snug text-black/65">
          Répartis sur l'ensemble de vos canaux connectés. Publiez pour faire
          grimper la courbe.
        </p>
      </div>
    </div>
  );
}

type StatKind = "followers" | "likes" | "comments";

function StatIcon({ kind, className }: { kind: StatKind; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (kind === "followers") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c.8-3.2 3.1-5 6-5s5.2 1.8 6 5" />
        <path d="M16 5.2a3 3 0 0 1 0 5.6M18 15.3c1.7.7 2.7 2.2 3 4.7" />
      </svg>
    );
  }
  if (kind === "likes") {
    return (
      <svg {...common}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

function StatTile({
  isDark,
  kind,
  label,
  value,
}: {
  isDark: boolean;
  kind: StatKind;
  label: string;
  value: number;
}) {
  return (
    <div className={panel(isDark, "flex flex-col justify-between gap-4 p-5")}>
      <div className="flex items-center justify-between">
        <MicroLabel isDark={isDark}>{label}</MicroLabel>
        <span
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full",
            isDark
              ? "bg-white/[0.06] text-white"
              : "bg-black/[0.04] text-neutral-900",
          ].join(" ")}
        >
          <StatIcon kind={kind} className="h-3.5 w-3.5" />
        </span>
      </div>
      <p
        className={[
          "font-display text-[clamp(28px,3vw,40px)] font-semibold leading-none tracking-[-0.03em] tabular-nums",
          isDark ? "text-white" : "text-neutral-900",
        ].join(" ")}
      >
        {numberFormatter.format(value)}
      </p>
    </div>
  );
}

const WEEKDAYS_FR_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function FlameIcon({
  className = "h-5 w-5",
  color,
}: {
  className?: string;
  color: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 2.5c.9 1.9.4 3.2-.7 4.4-2 2.1-4 3.8-4 6.9a4.7 4.7 0 0 0 9.4 0c0-1.6-.5-2.7-1.1-3.7-.2 1.5-.9 2.4-1.9 2.4-1.2 0-1.9-1-1.5-2.2.7-2 2-3.3 2-5.4 0-.9-.3-1.7-.8-2.4-.5.6-.9 1.2-1.4 0Z"
        fill={color}
      />
    </svg>
  );
}

function StreakTile({ isDark }: { isDark: boolean }) {
  const streakCount = 0;
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return WEEKDAYS_FR_SHORT[d.getDay()];
  });

  return (
    <div className={panel(isDark, "flex flex-col justify-between gap-4 p-5")}>
      <div className="flex items-start justify-between gap-3">
        <MicroLabel isDark={isDark}>Série</MicroLabel>
        <FlameIcon
          color={streakCount > 0 ? "#f97316" : isDark ? "#3a3a3d" : "#d9d9d9"}
        />
      </div>

      <div>
        <p
          className={[
            "font-display text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          {streakCount}
          <span
            className={[
              "ml-1.5 text-[13px] font-medium tracking-normal",
              isDark ? "text-neutral-500" : "text-neutral-400",
            ].join(" ")}
          >
            {streakCount > 1 ? "jours" : "jour"}
          </span>
        </p>

        <div className="mt-4 flex items-center justify-between gap-1">
          {days.map((label, index) => {
            const done = index < streakCount;
            return (
              <div key={index} className="flex flex-col items-center gap-1.5">
                <span
                  className={[
                    "text-[9.5px] font-bold uppercase leading-none",
                    isDark ? "text-neutral-600" : "text-neutral-400",
                  ].join(" ")}
                >
                  {label}
                </span>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    done
                      ? ""
                      : isDark
                        ? "bg-white/12"
                        : "bg-black/10",
                    index === 0 && !done
                      ? isDark
                        ? "ring-1 ring-white/30"
                        : "ring-1 ring-black/20"
                      : "",
                  ].join(" ")}
                  style={done ? { background: ACCENT } : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Réseaux : rail horizontal                                                 */
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
  const ring = isDark ? "ring-[#111113]" : "ring-white";

  return (
    <div className="relative h-10 w-10 shrink-0">
      {showImage ? (
        <img
          src={channel.avatarUrl}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={["h-full w-full rounded-full object-cover ring-2", ring].join(
            " "
          )}
        />
      ) : (
        <div
          className={[
            "flex h-full w-full items-center justify-center rounded-full text-[14px] font-semibold ring-2",
            ring,
            isDark ? "bg-[#2a2a2d] text-white" : "bg-neutral-900 text-white",
          ].join(" ")}
        >
          {initial}
        </div>
      )}
      {NetworkIcon && (
        <span
          className={[
            "absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black ring-2",
            ring,
          ].join(" ")}
        >
          <NetworkIcon className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

function ChannelsRail({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <MicroLabel isDark={isDark}>Réseaux connectés</MicroLabel>
        <button
          type="button"
          onClick={() => navigate("channels")}
          className={pillButton(isDark)}
        >
          <PlusIcon />
          Connecter
        </button>
      </div>

      {channels.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate("channels")}
          className={[
            "flex flex-col items-start gap-1 rounded-[28px] border border-dashed p-6 text-left transition",
            isDark
              ? "border-white/12 hover:bg-white/[0.03]"
              : "border-black/12 hover:bg-black/[0.02]",
          ].join(" ")}
        >
          <span
            className={[
              "text-[15px] font-semibold",
              isDark ? "text-white" : "text-neutral-900",
            ].join(" ")}
          >
            Connectez votre premier réseau
          </span>
          <span
            className={[
              "text-[12.5px] font-medium",
              isDark ? "text-neutral-400" : "text-neutral-500",
            ].join(" ")}
          >
            Reliez un canal pour commencer à publier.
          </span>
        </button>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {channels.map((channel) => {
            const networkId = getNetworkId(channel);
            const NetworkIcon = networkId ? NETWORK_ICONS[networkId] : undefined;
            const followers = readStat(channel, [
              "followers",
              "followersCount",
              "followers_count",
              "subscribers",
              "subscribersCount",
            ]);
            return (
              <div
                key={channel.key}
                className={panel(
                  isDark,
                  "flex w-[240px] shrink-0 items-center gap-3 p-4"
                )}
              >
                <ChannelAvatar
                  channel={channel}
                  isDark={isDark}
                  NetworkIcon={NetworkIcon}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      "truncate text-[13.5px] font-semibold leading-tight",
                      isDark ? "text-white" : "text-neutral-900",
                    ].join(" ")}
                  >
                    {channel.handle || channel.name}
                  </p>
                  <p
                    className={[
                      "mt-0.5 text-[12px] font-medium tabular-nums",
                      isDark ? "text-neutral-400" : "text-neutral-500",
                    ].join(" ")}
                  >
                    {numberFormatter.format(followers)} abonnés
                  </p>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => navigate("channels")}
            className={[
              "flex w-[120px] shrink-0 flex-col items-center justify-center gap-2 rounded-[28px] border border-dashed transition",
              isDark
                ? "border-white/12 text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                : "border-black/12 text-neutral-500 hover:bg-black/[0.02] hover:text-neutral-900",
            ].join(" ")}
          >
            <PlusIcon className="h-4 w-4" />
            <span className="text-[11.5px] font-semibold">Ajouter</span>
          </button>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bandeau de composition                                                    */
/* -------------------------------------------------------------------------- */

function ComposeBand({
  isDark,
  onPlan,
}: {
  isDark: boolean;
  onPlan: () => void;
}) {
  const bg = isDark ? "#ffffff" : "#0a0a0a";
  const fg = isDark ? "#0a0a0a" : "#ffffff";

  return (
    <div
      className="flex flex-col items-start justify-between gap-5 rounded-[28px] px-6 py-6 sm:flex-row sm:items-center sm:gap-6"
      style={{ background: bg, color: fg }}
    >
      <div className="min-w-0">
        <span
          className="text-[10.5px] font-bold uppercase tracking-[0.16em]"
          style={{ color: fg, opacity: 0.55 }}
        >
          Action rapide
        </span>
        <h3 className="mt-2 font-display text-[clamp(22px,2.6vw,34px)] font-semibold leading-tight tracking-[-0.025em]">
          Prêt à publier quelque chose&nbsp;?
        </h3>
        <p
          className="mt-1 text-[13px] font-medium"
          style={{ color: fg, opacity: 0.6 }}
        >
          Rédigez ou planifiez en quelques secondes sur tous vos canaux.
        </p>
      </div>

      <button
        type="button"
        onClick={onPlan}
        className="flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-[13.5px] font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: ACCENT, color: ACCENT_INK }}
      >
        <PlusIcon className="h-4 w-4" />
        Nouvelle publication
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Blog rail                                                                 */
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
  return (
    <a
      href={post.href}
      className={panel(
        isDark,
        "group flex w-[280px] shrink-0 flex-col overflow-hidden"
      )}
    >
      <div className="h-[140px] w-full shrink-0 overflow-hidden">
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: ACCENT, color: ACCENT_INK }}
          >
            Blog
          </span>
          <span
            className={[
              "text-[11px] font-medium",
              isDark ? "text-neutral-500" : "text-neutral-400",
            ].join(" ")}
          >
            {post.date}
          </span>
        </div>

        <p
          className={[
            "line-clamp-2 text-[14px] font-semibold leading-snug",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          {post.title}
        </p>

        <span
          className={[
            "mt-auto inline-flex items-center gap-1.5 text-[12px] font-semibold",
            isDark ? "text-neutral-400" : "text-neutral-500",
          ].join(" ")}
        >
          Lire l'article
          <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  );
}

function BlogRail({ isDark }: { isDark: boolean }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <MicroLabel isDark={isDark}>From the blog</MicroLabel>
        <a
          href="#"
          className={[
            "text-[12px] font-semibold transition",
            isDark
              ? "text-neutral-400 hover:text-white"
              : "text-neutral-500 hover:text-neutral-900",
          ].join(" ")}
        >
          Voir tout →
        </a>
      </div>

      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
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

  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const firstName = user?.first_name || "";
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
        "relative h-screen w-full overflow-hidden transition-colors duration-500",
        isDark ? "bg-[#08080a]" : "bg-[#f4f2ee]",
      ].join(" ")}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[280px] right-[-160px] h-[720px] w-[720px] rounded-full blur-[160px]"
          style={{
            background: isDark
              ? "rgba(215,255,62,0.07)"
              : "rgba(215,255,62,0.40)",
          }}
        />
        <div
          className="absolute bottom-[-240px] left-[8%] h-[560px] w-[560px] rounded-full blur-[160px]"
          style={{
            background: isDark
              ? "rgba(120,120,255,0.05)"
              : "rgba(120,120,255,0.12)",
          }}
        />
      </div>

      <DashboardSidebar theme={theme} />

      <div className="relative h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1320px] flex-col gap-6 px-[clamp(16px,3vw,40px)] pb-[112px] pt-[clamp(16px,2.4vw,28px)]">
            {/* Header */}
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <MicroLabel isDark={isDark}>Tableau de bord</MicroLabel>
                <h1
                  className={[
                    "mt-2 font-display text-[clamp(28px,3.6vw,48px)] font-semibold leading-[1.02] tracking-[-0.03em]",
                    isDark ? "text-white" : "text-neutral-900",
                  ].join(" ")}
                  title={fullName}
                >
                  Bonjour{firstName ? `, ${firstName}` : ""}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <ClockPill isDark={isDark} />
                <GreetingAvatar
                  avatarUrl={user?.avatar_url}
                  initials={initials}
                  isDark={isDark}
                />
              </div>
            </header>

            {/* Bento : hero + stats */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <HeroFollowersTile
                  followers={totals.followers}
                  networkCount={connectedChannels.length}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-6">
                <StatTile
                  isDark={isDark}
                  kind="likes"
                  label="Likes"
                  value={totals.likes}
                />
                <StreakTile isDark={isDark} />
                <div className="sm:col-span-2">
                  <StatTile
                    isDark={isDark}
                    kind="comments"
                    label="Commentaires"
                    value={totals.comments}
                  />
                </div>
              </div>
            </section>

            {/* Rails */}
            <ChannelsRail isDark={isDark} channels={connectedChannels} />

            {/* CTA */}
            <ComposeBand
              isDark={isDark}
              onPlan={() => setIsNewPostOpen(true)}
            />

            {/* Blog */}
            <BlogRail isDark={isDark} />
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