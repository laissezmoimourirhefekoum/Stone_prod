import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
/*  Statistiques (abonnés / likes / commentaires)                             */
/* -------------------------------------------------------------------------- */

const FOLLOWER_KEYS = [
  "followers",
  "followersCount",
  "followers_count",
  "subscribers",
  "subscribersCount",
];

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
      followers: acc.followers + readStat(ch, FOLLOWER_KEYS),
      likes:
        acc.likes + readStat(ch, ["likes", "likesCount", "likes_count"]),
      comments:
        acc.comments +
        readStat(ch, ["comments", "commentsCount", "comments_count"]),
    }),
    { followers: 0, likes: 0, comments: 0 }
  );
}

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
      style={{ width: 40, height: 40 }}
      className="aspect-square shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
      onError={() => setLoadFailed(true)}
    />
  ) : (
    <div
      style={{ width: 40, height: 40 }}
      className={[
        "flex aspect-square shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
        isDark ? "bg-[#2a2a2d] text-white" : "bg-neutral-900 text-white",
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
    year: "numeric",
  });

  return (
    <div className="flex flex-col items-end">
      <span
        className={[
          "font-display text-[clamp(20px,2.2vw,26px)] font-semibold leading-none tracking-[-0.01em] tabular-nums",
          isDark ? "text-white" : "text-neutral-900",
        ].join(" ")}
      >
        {time}
      </span>
      <span
        className={[
          "mt-0.5 text-[12px] font-medium capitalize",
          isDark ? "text-neutral-400" : "text-neutral-500",
        ].join(" ")}
      >
        {date}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Primitives                                                                */
/* -------------------------------------------------------------------------- */

function Card({
  isDark,
  className = "",
  children,
}: {
  isDark: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "flex flex-col overflow-hidden rounded-[22px] border p-5",
        isDark
          ? "border-white/10 bg-[#141416]"
          : "border-black/[0.06] bg-white",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function CardTitle({
  isDark,
  title,
  hint,
  action,
}: {
  isDark: boolean;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex shrink-0 items-start justify-between gap-3 pr-6">
      <div>
        <p
          className={[
            "text-[15px] font-semibold leading-tight",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          {title}
        </p>
        {hint && (
          <p
            className={[
              "mt-0.5 text-[12.5px] font-medium",
              isDark ? "text-neutral-400" : "text-neutral-500",
            ].join(" ")}
          >
            {hint}
          </p>
        )}
      </div>
      {action}
    </div>
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

function pillButton(isDark: boolean) {
  return [
    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
    isDark
      ? "bg-white text-neutral-900 hover:bg-neutral-200"
      : "bg-neutral-900 text-white hover:bg-neutral-800",
  ].join(" ");
}

/* -------------------------------------------------------------------------- */
/*  Widgets                                                                   */
/* -------------------------------------------------------------------------- */

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

function OverviewCard({
  isDark,
  totals,
  networkCount,
}: {
  isDark: boolean;
  totals: { followers: number; likes: number; comments: number };
  networkCount: number;
}) {
  const items: { kind: StatKind; label: string; value: number }[] = [
    { kind: "followers", label: "Abonnés", value: totals.followers },
    { kind: "likes", label: "Likes", value: totals.likes },
    { kind: "comments", label: "Commentaires", value: totals.comments },
  ];

  return (
    <Card isDark={isDark} className="h-full">
      <CardTitle
        isDark={isDark}
        title="Vue d'ensemble"
        hint={
          networkCount > 0
            ? `Cumul de vos ${networkCount} réseau${networkCount > 1 ? "x" : ""}`
            : "Connectez un réseau pour voir vos chiffres"
        }
      />

      <div
        className={[
          "grid min-h-0 flex-1 grid-cols-3 divide-x",
          isDark ? "divide-white/10" : "divide-black/[0.06]",
        ].join(" ")}
      >
        {items.map((item) => (
          <div
            key={item.kind}
            className="flex min-w-0 flex-col justify-center gap-3 px-4 first:pl-0 last:pr-0"
          >
            <div
              className={[
                "flex items-center gap-2 text-[12.5px] font-medium",
                isDark ? "text-neutral-400" : "text-neutral-500",
              ].join(" ")}
            >
              <StatIcon kind={item.kind} className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
            <p
              className={[
                "font-display text-[clamp(26px,3.2vw,48px)] font-semibold leading-none tracking-[-0.03em] tabular-nums",
                isDark ? "text-white" : "text-neutral-900",
              ].join(" ")}
            >
              {numberFormatter.format(item.value)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

const WEEKDAYS_FR_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function FlameIcon({ className = "h-7 w-7", color }: { className?: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M12 2.5c.9 1.9.4 3.2-.7 4.4-2 2.1-4 3.8-4 6.9a4.7 4.7 0 0 0 9.4 0c0-1.6-.5-2.7-1.1-3.7-.2 1.5-.9 2.4-1.9 2.4-1.2 0-1.9-1-1.5-2.2.7-2 2-3.3 2-5.4 0-.9-.3-1.7-.8-2.4-.5.6-.9 1.2-1.4 0Z"
        fill={color}
      />
    </svg>
  );
}

function StreakCard({ isDark }: { isDark: boolean }) {
  const streakCount = 0;
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return WEEKDAYS_FR_SHORT[d.getDay()];
  });

  return (
    <Card isDark={isDark} className="h-full justify-between">
      <div className="flex items-start justify-between gap-3 pr-6">
        <div>
          <p
            className={[
              "font-display text-[28px] font-semibold leading-none tracking-[-0.02em]",
              isDark ? "text-white" : "text-neutral-900",
            ].join(" ")}
          >
            {streakCount} {streakCount > 1 ? "jours" : "jour"}
          </p>
          <p
            className={[
              "mt-1.5 text-[12.5px] font-medium",
              isDark ? "text-neutral-400" : "text-neutral-500",
            ].join(" ")}
          >
            de publication d'affilée
          </p>
        </div>
        <FlameIcon color={streakCount > 0 ? "#f97316" : isDark ? "#3a3a3d" : "#d9d9d9"} />
      </div>

      <div className="mt-5 flex items-start justify-between gap-1">
        {days.map((label, index) => {
          const done = index < streakCount;
          return (
            <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className={[
                  "text-[10.5px] font-semibold leading-none",
                  isDark ? "text-neutral-500" : "text-neutral-400",
                ].join(" ")}
              >
                {label}
              </span>
              <div
                className={[
                  "h-7 w-7 rounded-full",
                  done
                    ? isDark
                      ? "bg-white"
                      : "bg-neutral-900"
                    : isDark
                      ? "bg-white/10"
                      : "bg-neutral-100",
                  index === 0 && !done
                    ? isDark
                      ? "ring-1 ring-white/40"
                      : "ring-1 ring-neutral-900/30"
                    : "",
                ].join(" ")}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

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
  const ring = isDark ? "ring-[#141416]" : "ring-white";

  return (
    <div className="relative h-10 w-10 shrink-0">
      {showImage ? (
        <img
          src={channel.avatarUrl}
          alt={label}
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={["h-full w-full rounded-full object-cover ring-2", ring].join(" ")}
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

function ChannelsCard({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  const count = channels.length;

  return (
    <Card isDark={isDark} className="h-full">
      <CardTitle
        isDark={isDark}
        title="Réseaux connectés"
        hint={
          count > 0
            ? `${count} réseau${count > 1 ? "x" : ""} connecté${count > 1 ? "s" : ""}`
            : "Aucun réseau pour le moment"
        }
        action={
          <button
            type="button"
            onClick={() => navigate("channels")}
            className={pillButton(isDark)}
          >
            <PlusIcon />
            Connecter
          </button>
        }
      />

      {count === 0 ? (
        <button
          type="button"
          onClick={() => navigate("channels")}
          className={[
            "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed py-8 text-center transition",
            isDark
              ? "border-white/15 hover:bg-white/[0.03]"
              : "border-black/15 hover:bg-neutral-50",
          ].join(" ")}
        >
          <span
            className={[
              "text-[14px] font-semibold",
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
            Reliez un canal pour commencer à publier
          </span>
        </button>
      ) : (
        <div
          data-nodrag
          className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2"
        >
          {channels.map((channel) => {
            const networkId = getNetworkId(channel);
            const NetworkIcon = networkId ? NETWORK_ICONS[networkId] : undefined;
            const followers = readStat(channel, FOLLOWER_KEYS);
            return (
              <div
                key={channel.key}
                className={[
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5",
                  isDark ? "bg-white/[0.04]" : "bg-neutral-50",
                ].join(" ")}
              >
                <ChannelAvatar channel={channel} isDark={isDark} NetworkIcon={NetworkIcon} />
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
        </div>
      )}
    </Card>
  );
}

function ComposeCard({ isDark, onPlan }: { isDark: boolean; onPlan: () => void }) {
  return (
    <div
      className={[
        "flex h-full flex-col justify-between gap-4 overflow-hidden rounded-[22px] p-5",
        isDark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white",
      ].join(" ")}
    >
      <div>
        <p className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em]">
          Une idée de publication ?
        </p>
        <p
          className={[
            "mt-1.5 text-[13px] font-medium",
            isDark ? "text-neutral-600" : "text-neutral-400",
          ].join(" ")}
        >
          Rédigez-la maintenant ou planifiez-la sur vos réseaux.
        </p>
      </div>

      <button
        type="button"
        onClick={onPlan}
        className={[
          "flex w-full shrink-0 items-center justify-center gap-2 rounded-full py-2.5 text-[13.5px] font-semibold transition",
          isDark
            ? "bg-neutral-900 text-white hover:bg-neutral-700"
            : "bg-white text-neutral-900 hover:bg-neutral-200",
        ].join(" ")}
      >
        <PlusIcon className="h-4 w-4" />
        Nouvelle publication
      </button>
    </div>
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

type BlogPostDefinition = {
  title: string;
  date: string;
  imageUrl: string;
  href: string;
};

const blogPostDefinitions: BlogPostDefinition[] = [
  {
    title: "How to Create a Social Media Marketing Strategy in 2026 — 7-Step Guide",
    date: "Jul 24, 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-strategy/800/560",
    href: "#",
  },
  {
    title: "17 Best AI Tools for Social Media Content Creation (Tested for 2026)",
    date: "Aug 3, 2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-ai-tools/800/560",
    href: "#",
  },
  {
    title: "How to Manage Multiple Social Media Accounts: 7 Tips to Do It Like a Pro",
    date: "Jul 6, 2026",
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
      draggable={false}
      className={[
        "group flex h-full flex-col overflow-hidden rounded-[22px] border transition",
        isDark
          ? "border-white/10 bg-[#141416] hover:bg-[#19191c]"
          : "border-black/[0.06] bg-white hover:bg-neutral-50",
      ].join(" ")}
    >
      <div className="min-h-[40px] w-full flex-1 overflow-hidden">
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-pink-100 px-3 py-1 text-[11px] font-semibold text-pink-600">
            Blog post
          </span>
          <span
            className={[
              "text-[11.5px] font-medium",
              isDark ? "text-neutral-500" : "text-neutral-400",
            ].join(" ")}
          >
            {post.date}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <p
            className={[
              "line-clamp-2 text-[13.5px] font-bold leading-snug",
              isDark ? "text-white" : "text-neutral-900",
            ].join(" ")}
          >
            {post.title}
          </p>

          <span
            className={[
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
              isDark
                ? "text-neutral-400 group-hover:bg-white/10 group-hover:text-white"
                : "text-neutral-400 group-hover:bg-black/5 group-hover:text-neutral-900",
            ].join(" ")}
          >
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*  Moteur de grille : déplacement, redimensionnement, collisions             */
/* -------------------------------------------------------------------------- */

const COLS = 12;
const ROW_H = 56;
const GAP = 16;
const MOBILE_BREAKPOINT = 760;
const STORAGE_KEY = "dashboard-widgets-v1";
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

type WidgetId =
  | "overview"
  | "streak"
  | "channels"
  | "compose"
  | "blog0"
  | "blog1"
  | "blog2";

type LayoutItem = { id: WidgetId; x: number; y: number; w: number; h: number };

type RenderCtx = {
  isDark: boolean;
  totals: { followers: number; likes: number; comments: number };
  channels: ConnectedChannel[];
  onPlan: () => void;
};

type WidgetDef = {
  label: string;
  min: [number, number];
  def: { x: number; y: number; w: number; h: number };
  render: (ctx: RenderCtx) => React.ReactNode;
};

const WIDGETS: Record<WidgetId, WidgetDef> = {
  overview: {
    label: "Vue d'ensemble",
    min: [4, 3],
    def: { x: 0, y: 0, w: 8, h: 4 },
    render: (c) => (
      <OverviewCard isDark={c.isDark} totals={c.totals} networkCount={c.channels.length} />
    ),
  },
  streak: {
    label: "Série de publications",
    min: [3, 3],
    def: { x: 8, y: 0, w: 4, h: 4 },
    render: (c) => <StreakCard isDark={c.isDark} />,
  },
  channels: {
    label: "Réseaux connectés",
    min: [4, 3],
    def: { x: 0, y: 4, w: 8, h: 5 },
    render: (c) => <ChannelsCard isDark={c.isDark} channels={c.channels} />,
  },
  compose: {
    label: "Nouvelle publication",
    min: [3, 2],
    def: { x: 8, y: 4, w: 4, h: 5 },
    render: (c) => <ComposeCard isDark={c.isDark} onPlan={c.onPlan} />,
  },
  blog0: {
    label: "Blog : stratégie",
    min: [3, 3],
    def: { x: 0, y: 9, w: 4, h: 5 },
    render: (c) => <BlogPostCard isDark={c.isDark} post={blogPostDefinitions[0]} />,
  },
  blog1: {
    label: "Blog : outils IA",
    min: [3, 3],
    def: { x: 4, y: 9, w: 4, h: 5 },
    render: (c) => <BlogPostCard isDark={c.isDark} post={blogPostDefinitions[1]} />,
  },
  blog2: {
    label: "Blog : multi-comptes",
    min: [3, 3],
    def: { x: 8, y: 9, w: 4, h: 5 },
    render: (c) => <BlogPostCard isDark={c.isDark} post={blogPostDefinitions[2]} />,
  },
};

const ALL_IDS = Object.keys(WIDGETS) as WidgetId[];

const defaultLayout = (): LayoutItem[] =>
  ALL_IDS.map((id) => ({ id, ...WIDGETS[id].def }));

const collides = (a: LayoutItem, b: LayoutItem) =>
  a.id !== b.id &&
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

const byPosition = (a: LayoutItem, b: LayoutItem) => a.y - b.y || a.x - b.x;

/** Compacte vers le haut ; `fixedId` reste exactement où l'utilisateur l'a posé. */
function resolveLayout(layout: LayoutItem[], fixedId?: WidgetId): LayoutItem[] {
  const placed: LayoutItem[] = [];
  const fixed = fixedId ? layout.find((l) => l.id === fixedId) : undefined;
  if (fixed) placed.push({ ...fixed });

  const rest = layout.filter((l) => l.id !== fixedId).sort(byPosition);
  for (const item of rest) {
    const next = { ...item, y: 0 };
    while (placed.some((p) => collides(next, p))) next.y += 1;
    placed.push(next);
  }
  return placed;
}

function loadLayout(): LayoutItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return resolveLayout(defaultLayout());
    const parsed = JSON.parse(raw) as LayoutItem[];
    const valid = parsed.filter(
      (l) =>
        ALL_IDS.includes(l.id) &&
        [l.x, l.y, l.w, l.h].every((n) => Number.isFinite(n))
    );
    return resolveLayout(valid);
  } catch {
    return resolveLayout(defaultLayout());
  }
}

type Interaction = {
  id: WidgetId;
  mode: "drag" | "resize";
  left: number;
  top: number;
  width: number;
  height: number;
  tilt: number;
  gridW: number;
  gridH: number;
};

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === "auto" || oy === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

function WidgetGrid({
  isDark,
  ctx,
  layout,
  setLayout,
}: {
  isDark: boolean;
  ctx: RenderCtx;
  layout: LayoutItem[];
  setLayout: React.Dispatch<React.SetStateAction<LayoutItem[]>>;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<Interaction | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const suppressClick = useRef(false);
  const tiltTimer = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = width > 0 && width < MOBILE_BREAKPOINT;
  const cellW = width > 0 ? (width - GAP * (COLS - 1)) / COLS : 0;
  const colPx = cellW + GAP;
  const rowPx = ROW_H + GAP;

  const rect = (it: LayoutItem) => ({
    left: it.x * colPx,
    top: it.y * rowPx,
    width: it.w * cellW + (it.w - 1) * GAP,
    height: it.h * ROW_H + (it.h - 1) * GAP,
  });

  const startInteraction = (
    e: React.PointerEvent,
    item: LayoutItem,
    mode: "drag" | "resize"
  ) => {
    if (isMobile || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (mode === "drag" && target.closest("button, input, textarea, select, [data-nodrag]"))
      return;

    const startLayout = layoutRef.current;
    const start = rect(item);
    const scroller = findScrollParent(gridRef.current);
    const startScroll = scroller?.scrollTop ?? 0;
    const sx = e.clientX;
    const sy = e.clientY;
    const [minW, minH] = WIDGETS[item.id].min;
    let started = false;
    let lastKey = `${item.x}:${item.y}:${item.w}:${item.h}`;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy + ((scroller?.scrollTop ?? 0) - startScroll);

      if (!started) {
        if (Math.hypot(dx, dy) < 5) return;
        started = true;
        suppressClick.current = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = mode === "drag" ? "grabbing" : "nwse-resize";
        navigator.vibrate?.(8);
      }

      // Autoscroll aux bords de l'écran
      if (scroller) {
        const r = scroller.getBoundingClientRect();
        if (ev.clientY > r.bottom - 70) scroller.scrollTop += 16;
        else if (ev.clientY < r.top + 70) scroller.scrollTop -= 16;
      }

      let nextItem: LayoutItem;
      let px: Interaction;

      if (mode === "drag") {
        const left = Math.max(0, Math.min(start.left + dx, width - start.width));
        const top = Math.max(0, start.top + dy);
        const gx = Math.max(0, Math.min(COLS - item.w, Math.round(left / colPx)));
        const gy = Math.max(0, Math.round(top / rowPx));
        nextItem = { ...item, x: gx, y: gy };

        window.clearTimeout(tiltTimer.current);
        tiltTimer.current = window.setTimeout(
          () => setActive((a) => (a ? { ...a, tilt: 0 } : a)),
          90
        );
        const tilt = Math.max(-7, Math.min(7, ev.movementX * 0.55));
        px = {
          id: item.id,
          mode,
          left,
          top,
          width: start.width,
          height: start.height,
          tilt,
          gridW: item.w,
          gridH: item.h,
        };
      } else {
        const pw = Math.max(
          minW * cellW + (minW - 1) * GAP,
          Math.min(start.width + dx, width - start.left)
        );
        const ph = Math.max(minH * ROW_H + (minH - 1) * GAP, start.height + dy);
        const gw = Math.max(
          minW,
          Math.min(COLS - item.x, Math.round((pw + GAP) / colPx))
        );
        const gh = Math.max(minH, Math.round((ph + GAP) / rowPx));
        nextItem = { ...item, w: gw, h: gh };
        px = {
          id: item.id,
          mode,
          left: start.left,
          top: start.top,
          width: pw,
          height: ph,
          tilt: 0,
          gridW: gw,
          gridH: gh,
        };
      }

      setActive(px);

      const key = `${nextItem.x}:${nextItem.y}:${nextItem.w}:${nextItem.h}`;
      if (key !== lastKey) {
        lastKey = key;
        navigator.vibrate?.(4);
        setLayout(
          resolveLayout(
            startLayout.map((l) => (l.id === item.id ? nextItem : l)),
            item.id
          )
        );
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.clearTimeout(tiltTimer.current);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (started) {
        setLayout((l) => resolveLayout(l));
        setActive(null);
        window.setTimeout(() => (suppressClick.current = false), 0);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const remove = (id: WidgetId) =>
    setLayout((l) => resolveLayout(l.filter((i) => i.id !== id)));

  const bottom = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
  const gridHeight = bottom > 0 ? bottom * ROW_H + (bottom - 1) * GAP : 0;
  const activeItem = active ? layout.find((l) => l.id === active.id) : null;

  /* Mobile : pile verticale, sans drag */
  if (isMobile) {
    return (
      <div ref={gridRef} className="flex flex-col gap-4">
        {[...layout].sort(byPosition).map((it) => (
          <div key={it.id} style={{ height: it.h * ROW_H + (it.h - 1) * GAP }}>
            <div className="h-full [&>*]:h-full">{WIDGETS[it.id].render(ctx)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className="relative w-full"
      style={{ height: gridHeight, transition: `height 300ms ${SPRING}` }}
    >
      {/* Emplacement fantôme : montre où le widget va atterrir */}
      {active && activeItem && width > 0 && (
        <div
          aria-hidden
          className={[
            "pointer-events-none absolute rounded-[22px] border-2 border-dashed",
            isDark
              ? "border-white/50 bg-white/[0.07]"
              : "border-neutral-900/40 bg-neutral-900/[0.06]",
          ].join(" ")}
          style={{
            width: rect(activeItem).width,
            height: rect(activeItem).height,
            transform: `translate3d(${rect(activeItem).left}px, ${rect(activeItem).top}px, 0)`,
            transition: `transform 220ms ${SPRING}, width 220ms ${SPRING}, height 220ms ${SPRING}`,
          }}
        />
      )}

      {width > 0 &&
        layout.map((it, index) => {
          const isActive = active?.id === it.id;
          const r = isActive && active ? active : rect(it);
          const dragging = isActive && active?.mode === "drag";
          const resizing = isActive && active?.mode === "resize";
          const shadow = isDark
            ? "0 16px 44px rgba(0,0,0,0.4)"
            : "0 16px 44px rgba(0,0,0,0.08)";
          const liftShadow = isDark
            ? "0 40px 90px rgba(0,0,0,0.75), 0 0 0 2px rgba(255,255,255,0.55)"
            : "0 40px 90px rgba(0,0,0,0.28), 0 0 0 2px rgba(23,23,23,0.7)";

          return (
            <div
              key={it.id}
              onPointerDown={(e) => startInteraction(e, it, "drag")}
              onClickCapture={(e) => {
                if (suppressClick.current) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              onDragStart={(e) => e.preventDefault()}
              className="widget-pop group absolute left-0 top-0 cursor-grab rounded-[22px]"
              style={{
                width: r.width,
                height: r.height,
                transform: `translate3d(${r.left}px, ${r.top}px, 0) scale(${
                  dragging ? 1.035 : 1
                }) rotate(${dragging && active ? active.tilt : 0}deg)`,
                transition: isActive
                  ? dragging
                    ? "box-shadow 150ms, transform 120ms ease-out"
                    : "box-shadow 150ms"
                  : `transform 380ms ${SPRING}, width 380ms ${SPRING}, height 380ms ${SPRING}, box-shadow 250ms`,
                zIndex: isActive ? 50 : 1,
                boxShadow: isActive ? liftShadow : shadow,
                animationDelay: `${index * 55}ms`,
                touchAction: "none",
                willChange: isActive ? "transform" : undefined,
              }}
            >
              <div
                className={[
                  "h-full w-full overflow-hidden rounded-[22px] transition-opacity",
                  dragging ? "opacity-95" : "",
                ].join(" ")}
              >
                <div className="h-full w-full [&>*]:h-full">
                  {WIDGETS[it.id].render(ctx)}
                </div>
              </div>

              {/* Poignée visuelle */}
              <div
                aria-hidden
                className={[
                  "pointer-events-none absolute left-1/2 top-1.5 flex -translate-x-1/2 gap-[3px] rounded-full px-2 py-1 opacity-0 transition group-hover:opacity-100",
                  dragging ? "!opacity-100" : "",
                  isDark ? "bg-white/15" : "bg-black/10",
                ].join(" ")}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={[
                      "h-1 w-1 rounded-full",
                      isDark ? "bg-white" : "bg-neutral-900",
                    ].join(" ")}
                  />
                ))}
              </div>

              {/* Supprimer */}
              <button
                type="button"
                aria-label={`Retirer ${WIDGETS[it.id].label}`}
                onClick={() => remove(it.id)}
                className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 scale-75 items-center justify-center rounded-full bg-neutral-900/80 text-white opacity-0 backdrop-blur transition hover:!bg-red-500 group-hover:scale-100 group-hover:opacity-100 dark:bg-white/20"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>

              {/* Redimensionner */}
              <div
                role="separator"
                aria-label="Redimensionner"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  startInteraction(e, it, "resize");
                }}
                className="absolute bottom-0 right-0 z-10 flex h-8 w-8 cursor-nwse-resize items-end justify-end p-2 opacity-0 transition group-hover:opacity-100"
                style={{ touchAction: "none", opacity: resizing ? 1 : undefined }}
              >
                <svg
                  viewBox="0 0 16 16"
                  className={["h-4 w-4", isDark ? "text-white/70" : "text-neutral-900/60"].join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M14 5 5 14M14 10l-4 4" />
                </svg>
              </div>

              {/* Badge de taille */}
              {resizing && active && (
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-900 px-3 py-1.5 text-[13px] font-semibold tabular-nums text-white shadow-xl ring-1 ring-white/20">
                  {active.gridW} × {active.gridH}
                </div>
              )}
            </div>
          );
        })}

      {layout.length === 0 && width > 0 && (
        <div
          className={[
            "absolute inset-x-0 top-0 flex h-[220px] items-center justify-center rounded-[22px] border border-dashed text-[14px] font-medium",
            isDark ? "border-white/15 text-neutral-400" : "border-black/15 text-neutral-500",
          ].join(" ")}
        >
          Tableau vide. Ajoutez un widget avec le bouton « Widgets ».
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Barre d'outils : ajouter / réinitialiser                                  */
/* -------------------------------------------------------------------------- */

function WidgetToolbar({
  isDark,
  layout,
  setLayout,
}: {
  isDark: boolean;
  layout: LayoutItem[];
  setLayout: React.Dispatch<React.SetStateAction<LayoutItem[]>>;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hidden = ALL_IDS.filter((id) => !layout.some((l) => l.id === id));

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const add = (id: WidgetId) =>
    setLayout((l) =>
      resolveLayout([...l, { id, ...WIDGETS[id].def, y: 9999 }])
    );

  const reset = () => {
    setLayout(resolveLayout(defaultLayout()));
    setOpen(false);
  };

  const ghost = [
    "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition",
    isDark
      ? "border-white/15 text-white hover:bg-white/10"
      : "border-black/10 text-neutral-900 hover:bg-black/5",
  ].join(" ");

  return (
    <div ref={wrapRef} className="relative flex items-center gap-2">
      <p
        className={[
          "mr-1 hidden text-[12.5px] font-medium md:block",
          isDark ? "text-neutral-500" : "text-neutral-400",
        ].join(" ")}
      >
        Glissez pour déplacer, tirez le coin pour redimensionner
      </p>
      <button type="button" onClick={() => setOpen((o) => !o)} className={pillButton(isDark)}>
        <PlusIcon />
        Widgets
        {hidden.length > 0 && (
          <span className="rounded-full bg-pink-500 px-1.5 text-[10.5px] text-white">
            {hidden.length}
          </span>
        )}
      </button>
      <button type="button" onClick={reset} className={ghost}>
        Réinitialiser
      </button>

      {open && (
        <div
          className={[
            "widget-pop absolute right-0 top-full z-[60] mt-2 w-64 rounded-2xl border p-1.5 shadow-2xl",
            isDark ? "border-white/10 bg-[#1a1a1d]" : "border-black/[0.06] bg-white",
          ].join(" ")}
        >
          {hidden.length === 0 ? (
            <p
              className={[
                "px-3 py-3 text-[13px] font-medium",
                isDark ? "text-neutral-400" : "text-neutral-500",
              ].join(" ")}
            >
              Tous les widgets sont affichés.
            </p>
          ) : (
            hidden.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => add(id)}
                className={[
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold transition",
                  isDark
                    ? "text-white hover:bg-white/10"
                    : "text-neutral-900 hover:bg-neutral-100",
                ].join(" ")}
              >
                {WIDGETS[id].label}
                <PlusIcon className="h-3.5 w-3.5 opacity-60" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
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
  const [layout, setLayout] = useState<LayoutItem[]>(loadLayout);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      /* stockage indisponible : on ignore */
    }
  }, [layout]);

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
  const initials =
    `${(user?.first_name || "")[0] || ""}${(user?.last_name || "")[0] || ""}`.toUpperCase() || "U";

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

  const openNewPost = useCallback(() => setIsNewPostOpen(true), []);

  const ctx: RenderCtx = {
    isDark,
    totals,
    channels: connectedChannels,
    onPlan: openNewPost,
  };

  return (
    <main
      className={[
        "relative h-screen w-full overflow-hidden transition-colors duration-500",
        isDark ? "bg-[#09090a]" : "bg-[#f3f1ed]",
      ].join(" ")}
    >
      <style>{`
        @keyframes widget-pop {
          0% { opacity: 0; scale: 0.88; }
          100% { opacity: 1; scale: 1; }
        }
        .widget-pop { animation: widget-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .widget-pop { animation: none; }
        }
      `}</style>

      <DashboardSidebar theme={theme} />

      <div className="h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1320px] flex-col gap-5 px-[clamp(16px,3vw,40px)] pb-[112px] pt-[clamp(14px,2vw,24px)]">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1
                  className={[
                    "font-display text-[clamp(24px,2.8vw,36px)] font-semibold tracking-[-0.02em]",
                    isDark ? "text-white" : "text-neutral-900",
                  ].join(" ")}
                >
                  Bonjour{fullName ? `, ${fullName}` : ""}
                </h1>
                <GreetingAvatar
                  avatarUrl={user?.avatar_url}
                  initials={initials}
                  isDark={isDark}
                />
              </div>
              <ClockDisplay isDark={isDark} />
            </header>

            <div className="flex justify-end">
              <WidgetToolbar isDark={isDark} layout={layout} setLayout={setLayout} />
            </div>

            <WidgetGrid isDark={isDark} ctx={ctx} layout={layout} setLayout={setLayout} />
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