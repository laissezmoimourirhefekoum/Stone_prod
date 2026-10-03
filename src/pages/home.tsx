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
        isDark ? "bg-[#2a3050] text-white" : "bg-[#5b7fc4] text-white",
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
          ink(isDark),
        ].join(" ")}
      >
        {time}
      </span>
      <span
        className={[
          "mt-0.5 text-[12px] font-medium capitalize",
          muted(isDark),
        ].join(" ")}
      >
        {date}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Design tokens (bleu pastel, cartes blanches, ombres douces)               */
/* -------------------------------------------------------------------------- */

const ink = (d: boolean) => (d ? "text-white" : "text-[#2b3552]");
const muted = (d: boolean) => (d ? "text-[#8a93ad]" : "text-[#8c96b0]");

const cardSurface = (d: boolean) =>
  d
    ? "bg-[#171b2d] border border-white/5 shadow-[0_18px_0_-8px_rgba(255,255,255,0.04),0_24px_40px_-12px_rgba(0,0,0,0.65)]"
    : "bg-white shadow-[0_18px_0_-8px_rgba(255,255,255,0.65),0_24px_40px_-12px_rgba(110,130,185,0.38)]";

const tileSurface = (d: boolean) =>
  d
    ? "bg-[#171b2d] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)]"
    : "bg-white shadow-[0_10px_24px_-10px_rgba(110,130,185,0.4)]";

const PRIMARY_BTN =
  "flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-[#6288cc] to-[#3f63ab] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_24px_-8px_rgba(63,99,171,0.75)] transition hover:brightness-110 active:scale-[0.98]";

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
        "relative flex flex-col overflow-hidden rounded-[22px] p-6",
        cardSurface(isDark),
        className,
      ].join(" ")}
    >
      {children}
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

function BellIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Widgets                                                                   */
/* -------------------------------------------------------------------------- */

type StatKind = "followers" | "likes" | "comments" | "streak";

const STAT_COLORS: Record<StatKind, string> = {
  followers: "#5b7fc4",
  likes: "#e5405e",
  comments: "#4cb86b",
  streak: "#f5a623",
};

function StatIcon({ kind, className }: { kind: StatKind; className?: string }) {
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
  if (kind === "streak") {
    return (
      <svg {...common}>
        <path d="M12 2.8c.9 1.9.4 3.2-.7 4.4-2 2.1-4 3.8-4 6.9a4.7 4.7 0 0 0 9.4 0c0-1.6-.5-2.7-1.1-3.7-.2 1.5-.9 2.4-1.9 2.4-1.2 0-1.9-1-1.5-2.2.7-2 2-3.3 2-5.4 0-.9-.3-1.7-.8-2.4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

function StatCard({
  isDark,
  kind,
  line1,
  line2,
  value,
}: {
  isDark: boolean;
  kind: StatKind;
  line1: string;
  line2: string;
  value: string;
}) {
  return (
    <Card isDark={isDark} className="h-full justify-between">
      <StatIcon kind={kind} className="h-9 w-9 shrink-0" />
      <div className="min-h-0">
        <p
          className={[
            "text-[14px] font-medium leading-snug",
            muted(isDark),
          ].join(" ")}
         
        >
          {line1}
          <br />
          {line2}
        </p>
        <p
          className={[
            "mt-3 truncate font-display text-[clamp(22px,2.3vw,32px)] font-medium leading-none tracking-[-0.02em] tabular-nums",
            ink(isDark),
          ].join(" ")}
        >
          {value}
        </p>
      </div>
    </Card>
  );
}

/** Petite mascotte originale (remplace-la par ta propre illustration). */
function Mascot({ className = "" }: { className?: string }) {
  const stroke = "#3a4660";
  return (
    <svg viewBox="0 0 220 240" className={className} fill="none" aria-hidden>
      <g stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="62" cy="54" r="26" fill="#fff" />
        <circle cx="62" cy="54" r="12" fill="#f6c445" />
        <circle cx="158" cy="54" r="26" fill="#fff" />
        <circle cx="158" cy="54" r="12" fill="#f6c445" />
        <ellipse cx="110" cy="190" rx="64" ry="44" fill="#fff" />
        <ellipse cx="110" cy="112" rx="72" ry="62" fill="#fff" />
        <path d="M82 108q10 8 20 0M118 108q10 8 20 0" />
        <ellipse cx="110" cy="124" rx="8" ry="6" fill="#f4cfa8" />
        <path d="M104 134q6 5 12 0" />
        <path d="M168 150q-6-8 0-14M178 152q-6-8 0-14" opacity="0.5" />
        <rect x="150" y="160" width="36" height="38" rx="7" fill="#4c70b8" />
        <path d="M186 168q18 4 0 22" />
        <circle cx="146" cy="186" r="11" fill="#fff" />
      </g>
      <ellipse cx="76" cy="126" rx="10" ry="6.5" fill="#f58aa0" opacity="0.85" />
      <ellipse cx="144" cy="126" rx="10" ry="6.5" fill="#f58aa0" opacity="0.85" />
    </svg>
  );
}

function QuickLink({
  isDark,
  color,
  label,
  onClick,
}: {
  isDark: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/ql flex items-center gap-2.5 text-left"
    >
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition group-hover/ql:scale-110"
        style={{ borderColor: color, color }}
      >
        <ArrowRightIcon className="h-2.5 w-2.5" />
      </span>
      <span
        className={[
          "text-[13px] font-medium transition group-hover/ql:underline",
          isDark ? "text-neutral-200" : "text-[#46516e]",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}

function GreetingCard({
  isDark,
  firstName,
  onPlan,
  showMascot,
}: {
  isDark: boolean;
  firstName: string;
  onPlan: () => void;
  showMascot: boolean;
}) {
  return (
    <Card isDark={isDark} className="h-full justify-center !px-9">
      <div className="relative z-10 max-w-[60%]">
        <h2
          className={[
            "font-display text-[clamp(28px,3.4vw,48px)] font-medium leading-[1.05] tracking-[-0.02em]",
            ink(isDark),
          ].join(" ")}
        >
          Bonjour{firstName ? `, ${firstName}` : ""} !
        </h2>
        <p className={["mt-3 text-[15px] font-medium", muted(isDark)].join(" ")}>
          Que publie-t-on aujourd'hui ?
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <QuickLink
            isDark={isDark}
            color="#5b7fc4"
            label="Nouvelle publication"
            onClick={onPlan}
          />
          <QuickLink
            isDark={isDark}
            color="#f5c332"
            label="Connecter un réseau"
            onClick={() => navigate("channels")}
          />
        </div>
      </div>

      {showMascot && (
        <Mascot className="pointer-events-none absolute -bottom-2 right-6 h-[104%] max-h-[330px] w-auto" />
      )}
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
  const ring = isDark ? "ring-[#171b2d]" : "ring-white";

  return (
    <div className="relative h-10 w-10 shrink-0">
      {showImage ? (
        <img
          src={channel.avatarUrl}
          alt={label}
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={["h-full w-full rounded-xl object-cover ring-2", ring].join(" ")}
        />
      ) : (
        <div
          className={[
            "flex h-full w-full items-center justify-center rounded-xl text-[14px] font-semibold ring-2",
            ring,
            isDark ? "bg-[#2a3050] text-white" : "bg-[#5b7fc4] text-white",
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

/** Widget "sans carte" : titre + tuiles empilées, comme les notifications. */
function ChannelsList({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  const count = channels.length;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between px-1">
        <div className={["flex items-center gap-2", muted(isDark)].join(" ")}>
          <BellIcon className="h-[18px] w-[18px]" />
          <span className={["text-[15px] font-medium", ink(isDark)].join(" ")}>
            Réseaux connectés
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate("channels")}
          className="text-[12px] font-semibold text-[#4f74ba] hover:underline"
        >
          Connecter
        </button>
      </div>

      <div
        data-nodrag
        className="-mx-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-6 pt-1"
      >
        {count === 0 ? (
          <button
            type="button"
            onClick={() => navigate("channels")}
            className={[
              "flex items-center gap-3 rounded-2xl px-4 py-4 text-left transition hover:-translate-y-0.5",
              tileSurface(isDark),
            ].join(" ")}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5c332] text-white">
              <PlusIcon className="h-4 w-4" />
            </span>
            <span>
              <span className={["block text-[13.5px] font-semibold", ink(isDark)].join(" ")}>
                Connectez votre premier réseau
              </span>
              <span className={["block text-[12px] font-medium", muted(isDark)].join(" ")}>
                Reliez un canal pour commencer à publier
              </span>
            </span>
          </button>
        ) : (
          channels.map((channel) => {
            const networkId = getNetworkId(channel);
            const NetworkIcon = networkId ? NETWORK_ICONS[networkId] : undefined;
            const followers = readStat(channel, FOLLOWER_KEYS);
            return (
              <div
                key={channel.key}
                className={[
                  "flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-3",
                  tileSurface(isDark),
                ].join(" ")}
              >
                <ChannelAvatar channel={channel} isDark={isDark} NetworkIcon={NetworkIcon} />
                <div className="min-w-0 flex-1">
                  <p className={["truncate text-[13.5px] font-semibold leading-tight", ink(isDark)].join(" ")}>
                    {channel.handle || channel.name}
                  </p>
                  <p className={["mt-0.5 text-[12px] font-medium tabular-nums", muted(isDark)].join(" ")}>
                    {numberFormatter.format(followers)} abonnés
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Gérer ce réseau"
                  onClick={() => navigate("channels")}
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition hover:scale-110",
                    isDark ? "border-white/20 text-neutral-300" : "border-[#d5dbea] text-[#8c96b0]",
                  ].join(" ")}
                >
                  <ArrowRightIcon className="h-3 w-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
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
        "group/blog flex h-full flex-col overflow-hidden rounded-[22px] transition",
        cardSurface(isDark),
      ].join(" ")}
    >
      <div className="min-h-[40px] w-full flex-1 overflow-hidden">
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover transition duration-300 group-hover/blog:scale-[1.04]"
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-[#e3ebfa] px-3 py-1 text-[11px] font-semibold text-[#4f74ba]">
            Blog post
          </span>
          <span className={["text-[11.5px] font-medium", muted(isDark)].join(" ")}>
            {post.date}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3">
          <p className={["line-clamp-2 text-[13.5px] font-semibold leading-snug", ink(isDark)].join(" ")}>
            {post.title}
          </p>
          <span
            className={[
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition group-hover/blog:translate-x-0.5",
              isDark ? "border-white/20 text-neutral-300" : "border-[#d5dbea] text-[#8c96b0]",
            ].join(" ")}
          >
            <ArrowRightIcon className="h-3 w-3" />
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
const GAP = 20;
const MOBILE_BREAKPOINT = 760;
const STORAGE_KEY = "dashboard-widgets-v2";
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

type WidgetId =
  | "greeting"
  | "channels"
  | "followers"
  | "likes"
  | "comments"
  | "streak"
  | "blog0"
  | "blog1"
  | "blog2";

type LayoutItem = { id: WidgetId; x: number; y: number; w: number; h: number };

type RenderCtx = {
  isDark: boolean;
  firstName: string;
  totals: { followers: number; likes: number; comments: number };
  channels: ConnectedChannel[];
  onPlan: () => void;
};

type WidgetDef = {
  label: string;
  min: [number, number];
  def: { x: number; y: number; w: number; h: number };
  /** Widget sans carte : pas d'ombre ni de fond sur le conteneur. */
  bare?: boolean;
  render: (ctx: RenderCtx, size: { w: number; h: number }) => React.ReactNode;
};

const statWidget = (
  kind: StatKind,
  label: string,
  line1: string,
  line2: string,
  x: number,
  pick: (c: RenderCtx) => string
): WidgetDef => ({
  label,
  min: [2, 2],
  def: { x, y: 4, w: 3, h: 3 },
  render: (c) => (
    <StatCard isDark={c.isDark} kind={kind} line1={line1} line2={line2} value={pick(c)} />
  ),
});

const WIDGETS: Record<WidgetId, WidgetDef> = {
  greeting: {
    label: "Bienvenue",
    min: [5, 3],
    def: { x: 0, y: 0, w: 8, h: 4 },
    render: (c, size) => (
      <GreetingCard
        isDark={c.isDark}
        firstName={c.firstName}
        onPlan={c.onPlan}
        showMascot={size.w >= 7}
      />
    ),
  },
  channels: {
    label: "Réseaux connectés",
    min: [3, 3],
    def: { x: 8, y: 0, w: 4, h: 4 },
    bare: true,
    render: (c) => <ChannelsList isDark={c.isDark} channels={c.channels} />,
  },
  followers: statWidget("followers", "Abonnés", "Total des", "abonnés", 0, (c) =>
    numberFormatter.format(c.totals.followers)
  ),
  likes: statWidget("likes", "Likes", "Total des", "likes", 3, (c) =>
    numberFormatter.format(c.totals.likes)
  ),
  comments: statWidget("comments", "Commentaires", "Total des", "commentaires", 6, (c) =>
    numberFormatter.format(c.totals.comments)
  ),
  streak: statWidget("streak", "Série de publications", "Série de", "publication", 9, () =>
    "0 jour"
  ),
  blog0: {
    label: "Blog : stratégie",
    min: [3, 3],
    def: { x: 0, y: 7, w: 4, h: 5 },
    render: (c) => <BlogPostCard isDark={c.isDark} post={blogPostDefinitions[0]} />,
  },
  blog1: {
    label: "Blog : outils IA",
    min: [3, 3],
    def: { x: 4, y: 7, w: 4, h: 5 },
    render: (c) => <BlogPostCard isDark={c.isDark} post={blogPostDefinitions[1]} />,
  },
  blog2: {
    label: "Blog : multi-comptes",
    min: [3, 3],
    def: { x: 8, y: 7, w: 4, h: 5 },
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
            <div className="h-full [&>*]:h-full">{WIDGETS[it.id].render(ctx, { w: 1, h: it.h })}</div>
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
              ? "border-[#7f9be0]/60 bg-[#7f9be0]/10"
              : "border-[#5b7fc4]/60 bg-[#5b7fc4]/10",
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
          const bare = WIDGETS[it.id].bare;
          const liftShadow = isDark
            ? "0 40px 90px rgba(0,0,0,0.75), 0 0 0 2px rgba(120,150,220,0.7)"
            : "0 40px 90px rgba(70,95,160,0.38), 0 0 0 2px rgba(91,127,196,0.85)";

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
                boxShadow: isActive ? liftShadow : undefined,
                background:
                  isActive && bare
                    ? isDark
                      ? "rgba(23,27,45,0.9)"
                      : "rgba(255,255,255,0.7)"
                    : undefined,
                padding: isActive && bare ? 12 : undefined,
                animationDelay: `${index * 55}ms`,
                touchAction: "none",
                willChange: isActive ? "transform" : undefined,
              }}
            >
              <div
                className={[
                  "h-full w-full rounded-[22px] transition-opacity",
                  dragging ? "opacity-95" : "",
                ].join(" ")}
              >
                <div className="h-full w-full [&>*]:h-full">
                  {WIDGETS[it.id].render(ctx, { w: it.w, h: it.h })}
                </div>
              </div>

              {/* Poignée visuelle */}
              <div
                aria-hidden
                className={[
                  "pointer-events-none absolute left-1/2 top-1.5 flex -translate-x-1/2 gap-[3px] rounded-full px-2 py-1 opacity-0 transition group-hover:opacity-100",
                  dragging ? "!opacity-100" : "",
                  isDark ? "bg-white/15" : "bg-[#5b7fc4]/15",
                ].join(" ")}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={[
                      "h-1 w-1 rounded-full",
                      isDark ? "bg-white" : "bg-[#5b7fc4]",
                    ].join(" ")}
                  />
                ))}
              </div>

              {/* Supprimer */}
              <button
                type="button"
                aria-label={`Retirer ${WIDGETS[it.id].label}`}
                onClick={() => remove(it.id)}
                className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 scale-75 items-center justify-center rounded-full bg-[#2b3552]/85 text-white opacity-0 backdrop-blur transition hover:!bg-red-500 group-hover:scale-100 group-hover:opacity-100"
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
                  className={["h-4 w-4", isDark ? "text-white/70" : "text-[#5b7fc4]"].join(" ")}
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
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3f63ab] px-3 py-1.5 text-[13px] font-semibold tabular-nums text-white shadow-xl">
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
            isDark ? "border-white/15 text-neutral-400" : "border-[#5b7fc4]/30 text-[#8c96b0]",
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
    "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition",
    isDark
      ? "bg-white/10 text-white hover:bg-white/15"
      : "bg-white text-[#46516e] shadow-[0_6px_16px_-8px_rgba(110,130,185,0.5)] hover:bg-[#f6f8fe]",
  ].join(" ");

  return (
    <div ref={wrapRef} className="relative flex items-center gap-2">
      <p
        className={[
          "mr-1 hidden text-[12.5px] font-medium md:block",
          muted(isDark),
        ].join(" ")}
      >
        Glissez pour déplacer, tirez le coin pour redimensionner
      </p>
      <button type="button" onClick={() => setOpen((o) => !o)} className={ghost}>
        <PlusIcon />
        Widgets
        {hidden.length > 0 && (
          <span className="rounded-full bg-[#5b7fc4] px-1.5 text-[10.5px] text-white">
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
            isDark ? "border-white/10 bg-[#171b2d]" : "border-black/[0.04] bg-white",
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
                    : "text-[#2b3552] hover:bg-[#eef2fb]",
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
    firstName: user?.first_name || "",
    totals,
    channels: connectedChannels,
    onPlan: openNewPost,
  };

  return (
    <main
      className={[
        "relative h-screen w-full overflow-hidden transition-colors duration-500",
        isDark ? "bg-[#0d1020]" : "bg-[#e9eef9]",
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
          <div className="mx-auto flex min-h-full w-full max-w-[1320px] flex-col gap-6 px-[clamp(16px,3vw,40px)] pb-[112px] pt-[clamp(14px,2vw,24px)]">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <ClockDisplay isDark={isDark} />
              <div className="flex items-center gap-3">
                {fullName && (
                  <div className="hidden text-right sm:block">
                    <p className={["text-[13px] font-semibold leading-tight", ink(isDark)].join(" ")}>
                      {fullName}
                    </p>
                  </div>
                )}
                <GreetingAvatar
                  avatarUrl={user?.avatar_url}
                  initials={initials}
                  isDark={isDark}
                />
              </div>
            </header>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1
                className={[
                  "font-display text-[clamp(22px,2.2vw,28px)] font-medium tracking-[-0.01em]",
                  ink(isDark),
                ].join(" ")}
              >
                Tableau de bord
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <WidgetToolbar isDark={isDark} layout={layout} setLayout={setLayout} />
                <button type="button" onClick={openNewPost} className={PRIMARY_BTN}>
                  <PlusIcon className="h-4 w-4" />
                  Nouvelle publication
                </button>
              </div>
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