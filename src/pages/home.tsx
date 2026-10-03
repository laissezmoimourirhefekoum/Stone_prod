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
/*  Design tokens — neumorphisme                                              */
/* -------------------------------------------------------------------------- */

/** Palette unifiée : fond = surface pour un vrai effet neumorphique. */
function useNeu(isDark: boolean) {
  // Fond et surface partagent la même teinte en neumorphisme.
  const base = isDark ? "#1c1c1e" : "#ececec";
  const baseRaised = isDark ? "#1e1e20" : "#f1f1f1";
  const text = isDark ? "#f5f5f7" : "#1a1a1a";
  const muted = isDark ? "#8a8a8e" : "#8a8a8e";
  const faint = isDark ? "#6a6a6e" : "#a0a0a4";

  // Ombres douces opposées (haut-gauche clair / bas-droite sombre)
  const raised = isDark
    ? "8px 8px 20px rgba(0,0,0,0.55), -8px -8px 20px rgba(255,255,255,0.03)"
    : "10px 10px 24px rgba(0,0,0,0.08), -10px -10px 24px rgba(255,255,255,0.95)";

  const raisedSm = isDark
    ? "5px 5px 12px rgba(0,0,0,0.5), -5px -5px 12px rgba(255,255,255,0.03)"
    : "5px 5px 14px rgba(0,0,0,0.07), -5px -5px 14px rgba(255,255,255,0.9)";

  const inset = isDark
    ? "inset 4px 4px 10px rgba(0,0,0,0.55), inset -4px -4px 10px rgba(255,255,255,0.03)"
    : "inset 4px 4px 10px rgba(0,0,0,0.07), inset -4px -4px 10px rgba(255,255,255,0.9)";

  const insetSm = isDark
    ? "inset 2px 2px 6px rgba(0,0,0,0.5), inset -2px -2px 6px rgba(255,255,255,0.03)"
    : "inset 2px 2px 6px rgba(0,0,0,0.06), inset -2px -2px 6px rgba(255,255,255,0.9)";

  return { base, baseRaised, text, muted, faint, raised, raisedSm, inset, insetSm };
}

/** Surface neumorphique « relief ». */
function Neu({
  isDark,
  variant = "raised",
  radius = "rounded-[32px]",
  className = "",
  style,
  children,
  as: Tag = "div",
  ...rest
}: {
  isDark: boolean;
  variant?: "raised" | "inset";
  radius?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  as?: any;
} & Record<string, any>) {
  const n = useNeu(isDark);
  const shadow = variant === "inset" ? n.inset : n.raised;

  return (
    <Tag
      className={[radius, className].join(" ")}
      style={{ background: n.base, boxShadow: shadow, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

function PlusIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function GlyphFollowers({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5c.7-3 3-4.8 5.5-4.8s4.8 1.8 5.5 4.8" />
      <path d="M16.5 5.5a2.7 2.7 0 0 1 0 5M18.5 15c1.5.7 2.5 2.2 2.8 4.5" />
    </svg>
  );
}

function GlyphLikes({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19.5S4.5 15.3 4.5 9.8A3.8 3.8 0 0 1 12 7.2a3.8 3.8 0 0 1 7.5 2.6c0 5.5-7.5 9.7-7.5 9.7Z" />
    </svg>
  );
}

function GlyphComments({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 12a7.8 7.8 0 0 1-11.3 7L4.5 20l1-4.3A7.8 7.8 0 1 1 20.5 12Z" />
    </svg>
  );
}

function GlyphStreak({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c.9 1.9.4 3.2-.7 4.4-2 2.1-4 3.8-4 6.9a4.7 4.7 0 0 0 9.4 0c0-1.6-.5-2.7-1.1-3.7" />
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
  const n = useNeu(isDark);

  return (
    <div
      className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full"
      style={{ boxShadow: n.raisedSm }}
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
          className="flex h-full w-full items-center justify-center text-[12.5px] font-semibold"
          style={{ background: n.base, color: n.text }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

function TimePill({ isDark }: { isDark: boolean }) {
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
  const n = useNeu(isDark);

  return (
    <div
      className="hidden items-center gap-2 rounded-full px-4 py-2 sm:flex"
      style={{ background: n.base, boxShadow: n.insetSm }}
    >
      <span
        className="text-[12.5px] font-semibold tabular-nums"
        style={{ color: n.text }}
      >
        {time}
      </span>
      <span className="opacity-30" style={{ color: n.muted }}>·</span>
      <span
        className="text-[11.5px] font-medium capitalize"
        style={{ color: n.muted }}
      >
        {date}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tuile stat individuelle (isolée)                                          */
/* -------------------------------------------------------------------------- */

function StatTile({
  isDark,
  icon,
  label,
  value,
  hint,
}: {
  isDark: boolean;
  icon: ReactNode;
  label: string;
  value: number;
  hint?: string;
}) {
  const n = useNeu(isDark);

  return (
    <div
      className="flex flex-col gap-4 rounded-[36px] p-6"
      style={{ background: n.base, boxShadow: n.raised }}
    >
      {/* Pastille icône en creux */}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: n.base, boxShadow: n.insetSm, color: n.text }}
      >
        {icon}
      </div>

      <div>
        <p
          className="text-[12px] font-medium"
          style={{ color: n.muted }}
        >
          {label}
        </p>
        <p
          className="mt-1 font-display text-[clamp(28px,3vw,40px)] font-semibold leading-none tracking-[-0.03em] tabular-nums"
          style={{ color: n.text }}
        >
          {numberFormatter.format(value)}
        </p>
        {hint && (
          <p
            className="mt-2 text-[11.5px] font-medium"
            style={{ color: n.faint }}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bloc série                                                                */
/* -------------------------------------------------------------------------- */

const WEEKDAYS_FR_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function StreakTile({ isDark }: { isDark: boolean }) {
  const streakCount = 0;
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return WEEKDAYS_FR_SHORT[d.getDay()];
  });
  const n = useNeu(isDark);

  return (
    <div
      className="flex flex-col gap-5 rounded-[36px] p-6"
      style={{ background: n.base, boxShadow: n.raised }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: n.base, boxShadow: n.insetSm, color: n.text }}
        >
          <GlyphStreak />
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{ background: n.base, boxShadow: n.insetSm, color: n.muted }}
        >
          {streakCount > 0 ? "Actif" : "Inactif"}
        </span>
      </div>

      <div>
        <p className="text-[12px] font-medium" style={{ color: n.muted }}>
          Série
        </p>
        <p
          className="mt-1 font-display text-[clamp(28px,3vw,40px)] font-semibold leading-none tracking-[-0.03em] tabular-nums"
          style={{ color: n.text }}
        >
          {streakCount}
          <span
            className="ml-1.5 text-[13px] font-medium tracking-normal"
            style={{ color: n.faint }}
          >
            {streakCount > 1 ? "jours" : "jour"}
          </span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-1.5">
        {days.map((label, i) => {
          const done = i < streakCount;
          const isToday = i === 0;
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <span
                className="text-[9.5px] font-semibold"
                style={{ color: n.faint }}
              >
                {label}
              </span>
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full transition"
                style={{
                  background: n.base,
                  boxShadow: done
                    ? n.raisedSm
                    : isToday
                      ? n.insetSm
                      : n.insetSm,
                }}
              >
                {done && (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: n.text }}
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Réseaux : liste en creux                                                  */
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
  const n = useNeu(isDark);

  return (
    <div className="relative h-11 w-11 shrink-0">
      <div
        className="h-full w-full overflow-hidden rounded-full"
        style={{ boxShadow: n.insetSm, background: n.base }}
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
            className="flex h-full w-full items-center justify-center text-[13px] font-semibold"
            style={{ color: n.text }}
          >
            {label.charAt(0).toUpperCase() || "?"}
          </div>
        )}
      </div>
      {Icon && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
          style={{
            background: n.base,
            boxShadow: n.raisedSm,
            color: n.text,
          }}
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
  const n = useNeu(isDark);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 px-2">
        <div className="flex items-baseline gap-2">
          <h2
            className="text-[14px] font-semibold"
            style={{ color: n.text }}
          >
            Réseaux connectés
          </h2>
          {channels.length > 0 && (
            <span
              className="text-[12px] font-medium tabular-nums"
              style={{ color: n.muted }}
            >
              {channels.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate("channels")}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition active:scale-[0.97]"
          style={{
            background: n.base,
            boxShadow: n.raisedSm,
            color: n.text,
          }}
        >
          <PlusIcon className="h-3 w-3" />
          Connecter
        </button>
      </div>

      {channels.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate("channels")}
          className="flex flex-col items-start gap-1 rounded-[36px] px-6 py-7 text-left transition"
          style={{
            background: n.base,
            boxShadow: n.inset,
          }}
        >
          <span
            className="text-[13.5px] font-semibold"
            style={{ color: n.text }}
          >
            Aucun réseau connecté
          </span>
          <span className="text-[12.5px]" style={{ color: n.muted }}>
            Reliez un canal pour commencer à publier.
          </span>
        </button>
      ) : (
        <div
          className="flex flex-col gap-3 rounded-[36px] p-3"
          style={{ background: n.base, boxShadow: n.inset }}
        >
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
              <div
                key={channel.key}
                className="flex items-center gap-3 rounded-[26px] px-3 py-3 transition"
                style={{
                  background: n.base,
                  boxShadow: n.raisedSm,
                }}
              >
                <ChannelAvatar
                  channel={channel}
                  isDark={isDark}
                  Icon={Icon}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[13.5px] font-semibold"
                    style={{ color: n.text }}
                  >
                    @{label}
                  </p>
                  <p
                    className="mt-0.5 text-[11.5px] font-medium tabular-nums"
                    style={{ color: n.muted }}
                  >
                    {numberFormatter.format(followers)} abonnés
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  CTA composer                                                              */
/* -------------------------------------------------------------------------- */

function ComposeTile({
  isDark,
  onPlan,
}: {
  isDark: boolean;
  onPlan: () => void;
}) {
  const n = useNeu(isDark);

  return (
    <div
      className="flex flex-col items-start justify-between gap-5 rounded-[36px] p-6 sm:flex-row sm:items-center"
      style={{ background: n.base, boxShadow: n.raised }}
    >
      <div className="min-w-0">
        <p className="text-[14px] font-semibold" style={{ color: n.text }}>
          Nouvelle publication
        </p>
        <p className="mt-0.5 text-[12.5px]" style={{ color: n.muted }}>
          Rédigez ou planifiez sur tous vos canaux en quelques secondes.
        </p>
      </div>

      <button
        type="button"
        onClick={onPlan}
        className="flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-[12.5px] font-semibold transition active:scale-[0.97]"
        style={{
          background: n.base,
          boxShadow: n.raisedSm,
          color: n.text,
        }}
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
  const n = useNeu(isDark);

  return (
    <a
      href={post.href}
      className="group flex flex-col gap-4 rounded-[36px] p-3 transition"
      style={{ background: n.base, boxShadow: n.raised }}
    >
      <div
        className="aspect-[16/10] w-full overflow-hidden rounded-[28px]"
        style={{ boxShadow: n.insetSm }}
      >
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
        <p
          className="text-[11.5px] font-medium"
          style={{ color: n.muted }}
        >
          {post.date}
        </p>
        <p
          className="line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-[-0.005em]"
          style={{ color: n.text }}
        >
          {post.title}
        </p>
        <span
          className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[12px] font-medium"
          style={{ color: n.muted }}
        >
          Lire
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  );
}

function BlogSection({ isDark }: { isDark: boolean }) {
  const n = useNeu(isDark);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 px-2">
        <h2 className="text-[14px] font-semibold" style={{ color: n.text }}>
          From the blog
        </h2>
        <a
          href="#"
          className="text-[12.5px] font-medium transition"
          style={{ color: n.muted }}
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

  const n = useNeu(isDark);
  const networkCount = connectedChannels.length;

  return (
    <main
      className="relative h-screen w-full overflow-hidden transition-colors duration-300"
      style={{ background: n.base }}
    >
      <DashboardSidebar theme={theme} />

      <div className="h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1180px] flex-col gap-8 px-[clamp(20px,3vw,40px)] pb-[112px] pt-[clamp(20px,3vw,36px)]">
            {/* Header */}
            <header className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p
                  className="text-[12.5px] font-medium"
                  style={{ color: n.muted }}
                >
                  Bonjour
                </p>
                <h1
                  title={fullName}
                  className="mt-1 truncate font-display text-[clamp(24px,2.8vw,34px)] font-semibold leading-[1.1] tracking-[-0.025em]"
                  style={{ color: n.text }}
                >
                  {firstName || "Bienvenue"}.
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <TimePill isDark={isDark} />
                <Avatar
                  avatarUrl={user?.avatar_url}
                  initials={initials}
                  isDark={isDark}
                />
              </div>
            </header>

            {/* 4 tuiles stats séparées : Abonnés / Likes / Commentaires / Série */}
            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                isDark={isDark}
                icon={<GlyphFollowers />}
                label="Abonnés"
                value={totals.followers}
                hint={
                  networkCount > 0
                    ? `sur ${networkCount} réseau${networkCount > 1 ? "x" : ""}`
                    : "aucun réseau"
                }
              />
              <StatTile
                isDark={isDark}
                icon={<GlyphLikes />}
                label="Likes"
                value={totals.likes}
                hint="toutes publications"
              />
              <StatTile
                isDark={isDark}
                icon={<GlyphComments />}
                label="Commentaires"
                value={totals.comments}
                hint="reçus au total"
              />
              <StreakTile isDark={isDark} />
            </section>

            <ChannelsSection isDark={isDark} channels={connectedChannels} />

            <ComposeTile
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