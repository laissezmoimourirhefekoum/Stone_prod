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
/*  Brutalist primitives                                                      */
/* -------------------------------------------------------------------------- */

/** Conteneur dur : bordure nette + ombre offset. */
function Block({
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
        "relative border-2",
        isDark
          ? "border-white bg-black text-white shadow-[6px_6px_0_0_#ffffff]"
          : "border-black bg-white text-black shadow-[6px_6px_0_0_#000000]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** Bloc inversé (fond = couleur du texte, texte = fond). */
function InvertedBlock({
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
        "relative border-2",
        isDark
          ? "border-white bg-white text-black shadow-[6px_6px_0_0_#ffffff]"
          : "border-black bg-black text-white shadow-[6px_6px_0_0_#000000]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        "font-mono text-[10.5px] font-bold uppercase tracking-[0.22em]",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function PlusIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="2.6" strokeLinecap="square">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="square">
      <path d="M5 12h14M13 6l6 6-6 6" />
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
        "relative h-11 w-11 shrink-0 border-2",
        isDark ? "border-white" : "border-black",
      ].join(" ")}
    >
      {show ? (
        <img
          key={avatarUrl}
          src={avatarUrl!}
          alt=""
          onError={() => setFailed(true)}
          className="h-full w-full object-cover grayscale"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-mono text-[13px] font-bold">
          {initials}
        </div>
      )}
    </div>
  );
}

function ClockBlock({ isDark }: { isDark: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(i);
  }, []);

  const time = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now
    .toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div
      className={[
        "flex items-stretch border-2",
        isDark ? "border-white" : "border-black",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center px-3",
          isDark ? "bg-white text-black" : "bg-black text-white",
        ].join(" ")}
      >
        <span className="font-mono text-[10.5px] font-bold tracking-[0.22em]">
          LIVE
        </span>
      </div>
      <div
        className={[
          "flex items-baseline gap-3 px-3 py-2 font-mono text-[12px]",
          isDark ? "text-white" : "text-black",
        ].join(" ")}
      >
        <span className="text-[15px] font-bold tabular-nums tracking-[0.04em]">
          {time}
        </span>
        <span
          className={[
            "font-mono text-[10.5px] font-bold tracking-[0.14em]",
            isDark ? "text-neutral-400" : "text-neutral-500",
          ].join(" ")}
        >
          {date}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                      */
/* -------------------------------------------------------------------------- */

function HeroBlock({
  isDark,
  followers,
  networkCount,
}: {
  isDark: boolean;
  followers: number;
  networkCount: number;
}) {
  return (
    <InvertedBlock isDark={isDark} className="flex h-full flex-col">
      {/* Bandeau supérieur : label + count */}
      <div className="flex items-center justify-between border-b-2 border-current px-5 py-3">
        <Eyebrow>01 / Abonnés cumulés</Eyebrow>
        <span className="font-mono text-[11px] font-bold tabular-nums tracking-[0.14em]">
          {networkCount.toString().padStart(2, "0")} RÉSEAUX
        </span>
      </div>

      {/* Chiffre géant */}
      <div className="flex flex-1 flex-col justify-center px-5 py-8">
        <p className="font-display text-[clamp(72px,13vw,180px)] font-black leading-[0.78] tracking-[-0.06em] tabular-nums">
          {numberFormatter.format(followers)}
        </p>
      </div>

      {/* Bandeau inférieur */}
      <div className="border-t-2 border-current px-5 py-3">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">
          → Publiez pour faire monter la barre
        </p>
      </div>
    </InvertedBlock>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tuile chiffre simple                                                      */
/* -------------------------------------------------------------------------- */

function NumberBlock({
  isDark,
  index,
  label,
  value,
}: {
  isDark: boolean;
  index: string;
  label: string;
  value: number;
}) {
  return (
    <Block isDark={isDark} className="flex flex-col">
      <div
        className={[
          "flex items-center justify-between border-b-2 px-4 py-2.5",
          isDark ? "border-white" : "border-black",
        ].join(" ")}
      >
        <Eyebrow>{index} / {label}</Eyebrow>
      </div>
      <div className="flex items-baseline px-4 py-5">
        <p className="font-display text-[clamp(34px,4vw,56px)] font-black leading-none tracking-[-0.045em] tabular-nums">
          {numberFormatter.format(value)}
        </p>
      </div>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/*  Streak                                                                    */
/* -------------------------------------------------------------------------- */

const WEEKDAYS_FR_SHORT = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

function StreakBlock({ isDark }: { isDark: boolean }) {
  const streakCount = 0;
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return WEEKDAYS_FR_SHORT[d.getDay()];
  });

  return (
    <Block isDark={isDark} className="flex flex-col">
      <div
        className={[
          "flex items-center justify-between border-b-2 px-4 py-2.5",
          isDark ? "border-white" : "border-black",
        ].join(" ")}
      >
        <Eyebrow>04 / Série</Eyebrow>
        <span
          className={[
            "font-mono text-[10.5px] font-bold tracking-[0.2em]",
            isDark ? "text-neutral-400" : "text-neutral-500",
          ].join(" ")}
        >
          {streakCount > 0 ? "ACTIF" : "INACTIF"}
        </span>
      </div>

      <div className="flex items-baseline gap-2 px-4 pt-5">
        <p className="font-display text-[clamp(34px,4vw,56px)] font-black leading-none tracking-[-0.045em] tabular-nums">
          {streakCount}
        </p>
        <span
          className={[
            "font-mono text-[11px] font-bold uppercase tracking-[0.14em]",
            isDark ? "text-neutral-400" : "text-neutral-500",
          ].join(" ")}
        >
          {streakCount > 1 ? "JOURS" : "JOUR"}
        </span>
      </div>

      <div
        className={[
          "mt-5 grid grid-cols-7 border-t-2",
          isDark ? "border-white" : "border-black",
        ].join(" ")}
      >
        {days.map((label, i) => {
          const done = i < streakCount;
          return (
            <div
              key={i}
              className={[
                "flex flex-col items-center gap-2 py-3",
                i > 0
                  ? isDark
                    ? "border-l-2 border-white"
                    : "border-l-2 border-black"
                  : "",
              ].join(" ")}
            >
              <span
                className={[
                  "font-mono text-[9px] font-bold tracking-[0.14em]",
                  isDark ? "text-neutral-500" : "text-neutral-400",
                ].join(" ")}
              >
                {label}
              </span>
              <span
                className={[
                  "h-3 w-3 border-2",
                  isDark ? "border-white" : "border-black",
                  done ? (isDark ? "bg-white" : "bg-black") : "bg-transparent",
                ].join(" ")}
              />
            </div>
          );
        })}
      </div>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/*  Réseaux                                                                   */
/* -------------------------------------------------------------------------- */

function ChannelRow({
  isDark,
  channel,
  index,
}: {
  isDark: boolean;
  channel: ConnectedChannel;
  index: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [channel.avatarUrl]);

  const networkId = getNetworkId(channel);
  const Icon = networkId ? NETWORK_ICONS[networkId] : undefined;
  const label = (channel.handle || channel.name || "—").replace(/^@/, "");
  const followers = readStat(channel, [
    "followers", "followersCount", "followers_count",
    "subscribers", "subscribersCount",
  ]);
  const show = Boolean(channel.avatarUrl) && !failed;

  return (
    <div
      className={[
        "flex items-center gap-4 border-t-2 px-4 py-3.5",
        isDark ? "border-white" : "border-black",
      ].join(" ")}
    >
      <span
        className={[
          "w-8 shrink-0 font-mono text-[11px] font-bold tabular-nums",
          isDark ? "text-neutral-500" : "text-neutral-400",
        ].join(" ")}
      >
        {(index + 1).toString().padStart(2, "0")}
      </span>

      <div
        className={[
          "relative h-9 w-9 shrink-0 overflow-hidden border-2",
          isDark ? "border-white" : "border-black",
        ].join(" ")}
      >
        {show ? (
          <img
            src={channel.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover grayscale"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-[12px] font-bold">
            {label.charAt(0).toUpperCase() || "?"}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={[
            "truncate font-mono text-[13px] font-bold",
            isDark ? "text-white" : "text-black",
          ].join(" ")}
        >
          @{label}
        </span>
        {Icon && (
          <span
            className={[
              "flex h-5 w-5 shrink-0 items-center justify-center border-2",
              isDark ? "border-white text-white" : "border-black text-black",
            ].join(" ")}
          >
            <Icon className="h-2.5 w-2.5" />
          </span>
        )}
      </div>

      <span
        className={[
          "shrink-0 font-mono text-[12px] font-bold tabular-nums",
          isDark ? "text-white" : "text-black",
        ].join(" ")}
      >
        {numberFormatter.format(followers)}
      </span>
    </div>
  );
}

function ChannelsBlock({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  return (
    <Block isDark={isDark} className="flex flex-col">
      <div
        className={[
          "flex items-center justify-between border-b-2 px-4 py-3",
          isDark ? "border-white" : "border-black",
        ].join(" ")}
      >
        <Eyebrow>05 / Réseaux connectés</Eyebrow>
        <button
          type="button"
          onClick={() => navigate("channels")}
          className={[
            "flex items-center gap-2 border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition",
            isDark
              ? "border-white bg-white text-black hover:bg-black hover:text-white"
              : "border-black bg-black text-white hover:bg-white hover:text-black",
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
            "flex flex-col items-start gap-1.5 px-5 py-8 text-left transition",
            isDark ? "hover:bg-white/5" : "hover:bg-black/5",
          ].join(" ")}
        >
          <span className="font-display text-[18px] font-bold tracking-[-0.02em]">
            Aucun réseau connecté
          </span>
          <span
            className={[
              "font-mono text-[11.5px] font-bold uppercase tracking-[0.14em]",
              isDark ? "text-neutral-400" : "text-neutral-500",
            ].join(" ")}
          >
            → Cliquez pour relier un canal
          </span>
        </button>
      ) : (
        <div className="flex flex-col">
          {/* En-tête tabulaire */}
          <div
            className={[
              "flex items-center gap-4 border-b-2 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
              isDark
                ? "border-white text-neutral-500"
                : "border-black text-neutral-500",
            ].join(" ")}
          >
            <span className="w-8">#</span>
            <span className="w-9">—</span>
            <span className="flex-1">Canal</span>
            <span>Abonnés</span>
          </div>
          <div className="flex flex-col">
            {channels.map((channel, i) => (
              <ChannelRow
                key={channel.key}
                isDark={isDark}
                channel={channel}
                index={i}
              />
            ))}
          </div>
        </div>
      )}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/*  Compose                                                                   */
/* -------------------------------------------------------------------------- */

function ComposeBlock({
  isDark,
  onPlan,
}: {
  isDark: boolean;
  onPlan: () => void;
}) {
  return (
    <InvertedBlock isDark={isDark} className="flex flex-col">
      <div className="flex items-center justify-between border-b-2 border-current px-5 py-3">
        <Eyebrow>06 / Action</Eyebrow>
        <span className="font-mono text-[11px] font-bold tracking-[0.14em]">
          ⌘ + N
        </span>
      </div>

      <div className="flex flex-col gap-5 px-5 py-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-display text-[clamp(26px,3.4vw,44px)] font-black leading-[0.95] tracking-[-0.04em]">
            Prêt à<br />publier ?
          </h3>
          <p className="mt-3 max-w-[380px] font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] opacity-65">
            Rédigez ou planifiez en quelques secondes.
          </p>
        </div>

        <button
          type="button"
          onClick={onPlan}
          className={[
            "flex shrink-0 items-center gap-3 border-2 px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] transition",
            isDark
              ? "border-black bg-black text-white hover:bg-transparent hover:text-black"
              : "border-white bg-white text-black hover:bg-transparent hover:text-white",
          ].join(" ")}
        >
          <PlusIcon className="h-4 w-4" />
          Nouvelle publication
        </button>
      </div>
    </InvertedBlock>
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
    date: "24.07.2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-strategy/800/560",
    href: "#",
  },
  {
    title:
      "17 Best AI Tools for Social Media Content Creation (Tested for 2026)",
    date: "03.08.2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-ai-tools/800/560",
    href: "#",
  },
  {
    title:
      "How to Manage Multiple Social Media Accounts: 7 Tips to Do It Like a Pro",
    date: "06.07.2026",
    imageUrl: "https://picsum.photos/seed/stone-blog-multi-account/800/560",
    href: "#",
  },
];

function BlogCard({
  isDark,
  post,
  index,
}: {
  isDark: boolean;
  post: BlogPostDefinition;
  index: number;
}) {
  return (
    <a
      href={post.href}
      className={[
        "group flex flex-col border-2 transition",
        isDark
          ? "border-white bg-black hover:bg-white hover:text-black"
          : "border-black bg-white hover:bg-black hover:text-white",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center justify-between border-b-2 px-3 py-2",
          isDark ? "border-white group-hover:border-black" : "border-black group-hover:border-white",
        ].join(" ")}
      >
        <span className="font-mono text-[10px] font-bold tracking-[0.2em]">
          {(index + 1).toString().padStart(2, "0")} / BLOG
        </span>
        <span className="font-mono text-[10px] font-bold tracking-[0.14em] opacity-60">
          {post.date}
        </span>
      </div>

      <div className="h-[140px] w-full shrink-0 overflow-hidden">
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover grayscale contrast-125 transition duration-500 group-hover:scale-[1.02]"
        />
      </div>

      <div
        className={[
          "flex flex-1 flex-col gap-3 border-t-2 p-3.5",
          isDark ? "border-white group-hover:border-black" : "border-black group-hover:border-white",
        ].join(" ")}
      >
        <p className="line-clamp-3 font-display text-[15px] font-bold leading-[1.15] tracking-[-0.02em]">
          {post.title}
        </p>
        <span className="mt-auto inline-flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em]">
          Lire
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  );
}

function BlogBlock({ isDark }: { isDark: boolean }) {
  return (
    <Block isDark={isDark} className="flex flex-col">
      <div
        className={[
          "flex items-center justify-between border-b-2 px-4 py-3",
          isDark ? "border-white" : "border-black",
        ].join(" ")}
      >
        <Eyebrow>07 / From the blog</Eyebrow>
        <a
          href="#"
          className={[
            "font-mono text-[11px] font-bold uppercase tracking-[0.14em] underline-offset-4 hover:underline",
            isDark ? "text-white" : "text-black",
          ].join(" ")}
        >
          Voir tout →
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {blogPostDefinitions.map((post, i) => (
          <BlogCard key={post.title} isDark={isDark} post={post} index={i} />
        ))}
      </div>
    </Block>
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
        isDark ? "bg-black" : "bg-[#eaeaea]",
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} />

      <div className="h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1360px] flex-col gap-5 px-[clamp(16px,3vw,40px)] pb-[112px] pt-[clamp(16px,2.4vw,28px)]">
            {/* Header */}
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar
                  avatarUrl={user?.avatar_url}
                  initials={initials}
                  isDark={isDark}
                />
                <div className="min-w-0">
                  <Eyebrow
                    className={
                      isDark ? "text-neutral-500" : "text-neutral-500"
                    }
                  >
                    Tableau de bord / {new Date().getFullYear()}
                  </Eyebrow>
                  <h1
                    title={fullName}
                    className={[
                      "mt-1 font-display text-[clamp(24px,2.8vw,38px)] font-black leading-[0.95] tracking-[-0.045em]",
                      isDark ? "text-white" : "text-black",
                    ].join(" ")}
                  >
                    {firstName ? `Bonjour, ${firstName}.` : "Bonjour."}
                  </h1>
                </div>
              </div>
              <ClockBlock isDark={isDark} />
            </header>

            {/* Rangée bento : hero + colonne de chiffres */}
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <HeroBlock
                  isDark={isDark}
                  followers={totals.followers}
                  networkCount={connectedChannels.length}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-5">
                <NumberBlock
                  isDark={isDark}
                  index="02"
                  label="Likes"
                  value={totals.likes}
                />
                <NumberBlock
                  isDark={isDark}
                  index="03"
                  label="Commentaires"
                  value={totals.comments}
                />
                <div className="sm:col-span-2">
                  <StreakBlock isDark={isDark} />
                </div>
              </div>
            </section>

            <ChannelsBlock isDark={isDark} channels={connectedChannels} />

            <ComposeBlock
              isDark={isDark}
              onPlan={() => setIsNewPostOpen(true)}
            />

            <BlogBlock isDark={isDark} />
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