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
/*  Claymorphism tokens                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Claymorphism = "argile gonflée".
 * Signature : ombres INTERNES (lumière TG + ombre BD) + ombres EXTERNES
 * (lumière TG + ombre BD). Résultat : l'élément paraît gonflé, doux,
 * presque mou, comme une pastille d'argile.
 */
function useClay(isDark: boolean) {
  // Fond légèrement plus clair en dark / plus clair en light pour le "gonflé".
  const base = isDark ? "#232326" : "#e9e9ec";
  const surface = isDark ? "#28282c" : "#efeff2";

  const text = isDark ? "#f5f5f7" : "#1a1a1a";
  const muted = isDark ? "#9a9aa0" : "#8a8a92";
  const faint = isDark ? "#6f6f76" : "#a4a4ac";

  // Couleurs des ombres (clay = plus prononcées que neumorphisme).
  const lightInner = isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(255,255,255,0.95)";
  const darkInner = isDark
    ? "rgba(0,0,0,0.65)"
    : "rgba(0,0,0,0.16)";
  const lightOuter = isDark
    ? "rgba(255,255,255,0.04)"
    : "rgba(255,255,255,0.9)";
  const darkOuter = isDark
    ? "rgba(0,0,0,0.55)"
    : "rgba(0,0,0,0.12)";

  /** Blob d'argile standard : inner + outer. */
  const clay = [
    `inset 8px 8px 18px ${lightInner}`,
    `inset -10px -10px 22px ${darkInner}`,
    `10px 10px 28px ${darkOuter}`,
    `-8px -8px 24px ${lightOuter}`,
  ].join(", ");

  /** Version plus petite, pour les pilules et pastilles. */
  const claySm = [
    `inset 4px 4px 10px ${lightInner}`,
    `inset -5px -5px 12px ${darkInner}`,
    `5px 5px 16px ${darkOuter}`,
    `-4px -4px 14px ${lightOuter}`,
  ].join(", ");

  /** Version gonflée pour l'avatar / icône dans une pastille. */
  const clayPill = [
    `inset 3px 3px 8px ${lightInner}`,
    `inset -4px -4px 10px ${darkInner}`,
    `3px 3px 10px ${darkOuter}`,
    `-2px -2px 8px ${lightOuter}`,
  ].join(", ");

  /** Élément « creusé » (inset uniquement) : input, piste, fond de liste. */
  const clayPress = [
    `inset 8px 8px 18px ${darkInner}`,
    `inset -8px -8px 18px ${lightInner}`,
  ].join(", ");

  /** Petite pression (champ de recherche, badge actif). */
  const clayPressSm = [
    `inset 4px 4px 10px ${darkInner}`,
    `inset -4px -4px 10px ${lightInner}`,
  ].join(", ");

  return {
    base,
    surface,
    text,
    muted,
    faint,
    clay,
    claySm,
    clayPill,
    clayPress,
    clayPressSm,
  };
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

function PlusIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function GlyphFollowers({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5c.7-3 3-4.8 5.5-4.8s4.8 1.8 5.5 4.8" />
      <path d="M16.5 5.5a2.7 2.7 0 0 1 0 5M18.5 15c1.5.7 2.5 2.2 2.8 4.5" />
    </svg>
  );
}

function GlyphLikes({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19.5S4.5 15.3 4.5 9.8A3.8 3.8 0 0 1 12 7.2a3.8 3.8 0 0 1 7.5 2.6c0 5.5-7.5 9.7-7.5 9.7Z" />
    </svg>
  );
}

function GlyphComments({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 12a7.8 7.8 0 0 1-11.3 7L4.5 20l1-4.3A7.8 7.8 0 1 1 20.5 12Z" />
    </svg>
  );
}

function GlyphStreak({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c.9 1.9.4 3.2-.7 4.4-2 2.1-4 3.8-4 6.9a4.7 4.7 0 0 0 9.4 0c0-1.6-.5-2.7-1.1-3.7" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Header : profil à droite, heure à gauche                                  */
/* -------------------------------------------------------------------------- */

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
  const c = useClay(isDark);

  return (
    <div
      className="flex items-center gap-2.5 rounded-full px-5 py-2.5"
      style={{ background: c.surface, boxShadow: c.claySm }}
    >
      <span
        className="text-[13px] font-semibold tabular-nums"
        style={{ color: c.text }}
      >
        {time}
      </span>
      <span className="opacity-30" style={{ color: c.muted }}>·</span>
      <span
        className="text-[11.5px] font-medium capitalize"
        style={{ color: c.muted }}
      >
        {date}
      </span>
    </div>
  );
}

function ProfileBlock({
  isDark,
  avatarUrl,
  initials,
  firstName,
  fullName,
}: {
  isDark: boolean;
  avatarUrl?: string | null;
  initials: string;
  firstName: string;
  fullName: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [avatarUrl]);
  const show = Boolean(avatarUrl) && !failed;
  const c = useClay(isDark);

  return (
    <div
      className="flex items-center gap-4 rounded-full py-2.5 pl-6 pr-3"
      style={{ background: c.surface, boxShadow: c.clay }}
    >
      <div className="text-right">
        <p
          className="text-[11.5px] font-medium leading-none"
          style={{ color: c.muted }}
        >
          Bonjour
        </p>
        <p
          title={fullName}
          className="mt-1.5 truncate font-display text-[15px] font-semibold leading-none tracking-[-0.015em]"
          style={{ color: c.text }}
        >
          {firstName || "Bienvenue"}.
        </p>
      </div>

      <div
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full"
        style={{ background: c.base, boxShadow: c.clayPill }}
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
            className="flex h-full w-full items-center justify-center text-[13px] font-semibold"
            style={{ color: c.text }}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat tile « clay »                                                        */
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
  const c = useClay(isDark);

  return (
    <div
      className="flex flex-col gap-5 rounded-[40px] p-7"
      style={{ background: c.surface, boxShadow: c.clay }}
    >
      {/* Pastille icône gonflée */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: c.surface, boxShadow: c.clayPill, color: c.text }}
      >
        {icon}
      </div>

      <div>
        <p className="text-[12px] font-medium" style={{ color: c.muted }}>
          {label}
        </p>
        <p
          className="mt-1.5 font-display text-[clamp(30px,3.2vw,42px)] font-semibold leading-none tracking-[-0.03em] tabular-nums"
          style={{ color: c.text }}
        >
          {numberFormatter.format(value)}
        </p>
        {hint && (
          <p
            className="mt-2.5 text-[11.5px] font-medium"
            style={{ color: c.faint }}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streak                                                                    */
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
  const c = useClay(isDark);

  return (
    <div
      className="flex flex-col gap-5 rounded-[40px] p-7"
      style={{ background: c.surface, boxShadow: c.clay }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: c.surface, boxShadow: c.clayPill, color: c.text }}
        >
          <GlyphStreak />
        </div>
        <span
          className="rounded-full px-3.5 py-1.5 text-[11px] font-semibold"
          style={{ background: c.base, boxShadow: c.clayPressSm, color: c.muted }}
        >
          {streakCount > 0 ? "Actif" : "Inactif"}
        </span>
      </div>

      <div>
        <p className="text-[12px] font-medium" style={{ color: c.muted }}>
          Série
        </p>
        <p
          className="mt-1.5 font-display text-[clamp(30px,3.2vw,42px)] font-semibold leading-none tracking-[-0.03em] tabular-nums"
          style={{ color: c.text }}
        >
          {streakCount}
          <span
            className="ml-1.5 text-[13px] font-medium tracking-normal"
            style={{ color: c.faint }}
          >
            {streakCount > 1 ? "jours" : "jour"}
          </span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        {days.map((label, i) => {
          const done = i < streakCount;
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <span
                className="text-[9.5px] font-semibold"
                style={{ color: c.faint }}
              >
                {label}
              </span>
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full transition"
                style={{
                  background: c.surface,
                  boxShadow: done ? c.clayPill : c.clayPressSm,
                }}
              >
                {done && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: c.text }}
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
/*  Réseaux                                                                   */
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
  const c = useClay(isDark);

  return (
    <div className="relative h-12 w-12 shrink-0">
      <div
        className="h-full w-full overflow-hidden rounded-full"
        style={{ background: c.base, boxShadow: c.clayPill }}
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
            className="flex h-full w-full items-center justify-center text-[14px] font-semibold"
            style={{ color: c.text }}
          >
            {label.charAt(0).toUpperCase() || "?"}
          </div>
        )}
      </div>
      {Icon && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
          style={{
            background: c.surface,
            boxShadow: c.clayPill,
            color: c.text,
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
  const c = useClay(isDark);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 px-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[14px] font-semibold" style={{ color: c.text }}>
            Réseaux connectés
          </h2>
          {channels.length > 0 && (
            <span
              className="text-[12px] font-medium tabular-nums"
              style={{ color: c.muted }}
            >
              {channels.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate("channels")}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition active:scale-[0.96]"
          style={{ background: c.surface, boxShadow: c.claySm, color: c.text }}
        >
          <PlusIcon className="h-3 w-3" />
          Connecter
        </button>
      </div>

      {channels.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate("channels")}
          className="flex flex-col items-start gap-1 rounded-[40px] px-7 py-8 text-left transition"
          style={{ background: c.base, boxShadow: c.clayPress }}
        >
          <span className="text-[13.5px] font-semibold" style={{ color: c.text }}>
            Aucun réseau connecté
          </span>
          <span className="text-[12.5px]" style={{ color: c.muted }}>
            Reliez un canal pour commencer à publier.
          </span>
        </button>
      ) : (
        <div
          className="flex flex-col gap-3.5 rounded-[44px] p-3.5"
          style={{ background: c.base, boxShadow: c.clayPress }}
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
                className="flex items-center gap-3.5 rounded-[32px] px-3.5 py-3.5"
                style={{ background: c.surface, boxShadow: c.claySm }}
              >
                <ChannelAvatar channel={channel} isDark={isDark} Icon={Icon} />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[13.5px] font-semibold"
                    style={{ color: c.text }}
                  >
                    @{label}
                  </p>
                  <p
                    className="mt-0.5 text-[11.5px] font-medium tabular-nums"
                    style={{ color: c.muted }}
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
/*  Compose                                                                   */
/* -------------------------------------------------------------------------- */

function ComposeTile({
  isDark,
  onPlan,
}: {
  isDark: boolean;
  onPlan: () => void;
}) {
  const c = useClay(isDark);

  return (
    <div
      className="flex flex-col items-start justify-between gap-5 rounded-[44px] p-8 sm:flex-row sm:items-center"
      style={{ background: c.surface, boxShadow: c.clay }}
    >
      <div className="min-w-0">
        <p className="text-[15px] font-semibold" style={{ color: c.text }}>
          Nouvelle publication
        </p>
        <p className="mt-1 text-[12.5px]" style={{ color: c.muted }}>
          Rédigez ou planifiez sur tous vos canaux en quelques secondes.
        </p>
      </div>

      <button
        type="button"
        onClick={onPlan}
        className="flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-[13px] font-semibold transition active:scale-[0.96]"
        style={{ background: c.surface, boxShadow: c.claySm, color: c.text }}
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
  const c = useClay(isDark);

  return (
    <a
      href={post.href}
      className="group flex flex-col gap-4 rounded-[40px] p-4 transition"
      style={{ background: c.surface, boxShadow: c.clay }}
    >
      <div
        className="aspect-[16/10] w-full overflow-hidden rounded-[32px]"
        style={{ boxShadow: c.clayPressSm }}
      >
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
        <p className="text-[11.5px] font-medium" style={{ color: c.muted }}>
          {post.date}
        </p>
        <p
          className="line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-[-0.005em]"
          style={{ color: c.text }}
        >
          {post.title}
        </p>
        <span
          className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[12px] font-medium"
          style={{ color: c.muted }}
        >
          Lire
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  );
}

function BlogSection({ isDark }: { isDark: boolean }) {
  const c = useClay(isDark);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 px-3">
        <h2 className="text-[14px] font-semibold" style={{ color: c.text }}>
          From the blog
        </h2>
        <a
          href="#"
          className="text-[12.5px] font-medium transition"
          style={{ color: c.muted }}
        >
          Voir tout
        </a>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

  const c = useClay(isDark);
  const networkCount = connectedChannels.length;

  return (
    <main
      className="relative h-screen w-full overflow-hidden transition-colors duration-300"
      style={{ background: c.base }}
    >
      <DashboardSidebar theme={theme} />

      <div className="h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1180px] flex-col gap-9 px-[clamp(20px,3vw,40px)] pb-[112px] pt-[clamp(24px,3vw,40px)]">
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between gap-4">
              <TimePill isDark={isDark} />

              <ProfileBlock
                isDark={isDark}
                avatarUrl={user?.avatar_url}
                initials={initials}
                firstName={firstName}
                fullName={fullName}
              />
            </header>

            {/* 4 tuiles stats */}
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

            <ComposeTile isDark={isDark} onPlan={() => setIsNewPostOpen(true)} />

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