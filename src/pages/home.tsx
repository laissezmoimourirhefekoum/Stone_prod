import { useEffect, useState } from "react";
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

type NetworkIconComponent = (props: { className?: string }) => JSX.Element;

const NETWORK_ICONS: Record<SocialNetworkKey, NetworkIconComponent> = {
  x: XIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
  threads: ThreadsIcon as unknown as NetworkIconComponent,
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

/* ============================================================================
   En-tête : salutation + horloge
============================================================================ */

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

/* ============================================================================
   Icônes
============================================================================ */

function FlameIcon({
  className = "h-8 w-8",
  color,
}: {
  className?: string;
  color: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M12 2.5c.9 1.9.4 3.2-.7 4.4-2 2.1-4 3.8-4 6.9a4.7 4.7 0 0 0 9.4 0c0-1.6-.5-2.7-1.1-3.7-.2 1.5-.9 2.4-1.9 2.4-1.2 0-1.9-1-1.5-2.2.7-2 2-3.3 2-5.4 0-.9-.3-1.7-.8-2.4-.5.6-.9 1.2-1.4 0Z"
        fill={color}
      />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
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

function PuzzleIcon({ className = "h-5 w-5" }: { className?: string }) {
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
      <path d="M8 8h8v8H8z" />
      <path d="M4 12h4M16 12h4M12 4v4M12 16v4" />
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

/* ============================================================================
   Briques communes des cartes
============================================================================ */

function DashboardCard({
  isDark,
  children,
}: {
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "flex h-full min-h-[190px] flex-col rounded-[22px] border p-5",
        isDark
          ? "border-white/10 bg-[#141416] shadow-[0_16px_44px_rgba(0,0,0,0.4)]"
          : "border-black/[0.06] bg-white shadow-[0_16px_44px_rgba(0,0,0,0.08)]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function CardTitle({
  isDark,
  title,
  subtitle,
  trailing,
  large = false,
}: {
  isDark: boolean;
  title: string;
  subtitle: string;
  trailing?: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p
          className={[
            "truncate font-bold leading-tight tracking-[-0.01em]",
            large
              ? "font-display text-[clamp(22px,2.2vw,28px)] font-semibold"
              : "text-[19px]",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          {title}
        </p>
        <p
          className={[
            "mt-1 text-[12.5px] font-medium",
            isDark ? "text-neutral-400" : "text-neutral-500",
          ].join(" ")}
        >
          {subtitle}
        </p>
      </div>
      {trailing}
    </div>
  );
}

function IconTile({
  isDark,
  children,
}: {
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        isDark ? "bg-white/10 text-neutral-200" : "bg-neutral-100 text-neutral-700",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function PillButton({
  isDark,
  onClick,
  withPlus = false,
  children,
}: {
  isDark: boolean;
  onClick: () => void;
  withPlus?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
        isDark
          ? "bg-white text-neutral-900 hover:bg-neutral-200"
          : "bg-neutral-900 text-white hover:bg-neutral-800",
      ].join(" ")}
    >
      {withPlus && <PlusIcon />}
      {children}
    </button>
  );
}

/* ============================================================================
   Grande carte : réseaux connectés
============================================================================ */

function LinkStackIcon({ isDark }: { isDark: boolean }) {
  const ring = isDark ? "ring-[#141416]" : "ring-white";
  const fill = isDark ? "bg-[#2a2a2d]" : "bg-neutral-200";

  return (
    <div className="flex items-center">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{ marginLeft: index === 0 ? 0 : -10 }}
          className={[
            "flex h-10 w-10 items-center justify-center rounded-full ring-2",
            ring,
            fill,
          ].join(" ")}
        >
          <svg
            viewBox="0 0 24 24"
            className={[
              "h-4 w-4",
              isDark ? "text-neutral-500" : "text-neutral-400",
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />
            <path d="M4 20c1.2-3 3.8-5 8-5s6.8 2 8 5" />
          </svg>
        </div>
      ))}
    </div>
  );
}

function ChannelAvatar({
  channel,
  isDark,
  NetworkIcon,
}: {
  channel: ConnectedChannel;
  isDark: boolean;
  NetworkIcon?: NetworkIconComponent;
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
    <div title={label} className="relative h-11 w-11 shrink-0">
      {showImage ? (
        <img
          src={channel.avatarUrl}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={[
            "h-full w-full rounded-full object-cover ring-2",
            ring,
          ].join(" ")}
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

function ConnectedChannelsCard({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  const count = channels.length;
  const plural = count > 1 ? "s" : "";

  return (
    <DashboardCard isDark={isDark}>
      <CardTitle
        isDark={isDark}
        large
        title={
          count > 0
            ? `${count} réseau${plural} connecté${plural}`
            : "Aucun réseau connecté"
        }
        subtitle={
          count > 0
            ? "Vos canaux de publication"
            : "Reliez un canal pour commencer à publier"
        }
      />

      <div className="mt-auto flex items-end justify-between gap-4 pt-5">
        {count > 0 ? (
          <div className="flex flex-wrap items-center gap-4">
            {channels.map((channel) => {
              const networkId = getNetworkId(channel);
              const NetworkIcon = networkId
                ? NETWORK_ICONS[networkId]
                : undefined;
              return (
                <ChannelAvatar
                  key={channel.key}
                  channel={channel}
                  isDark={isDark}
                  NetworkIcon={NetworkIcon}
                />
              );
            })}
          </div>
        ) : (
          <LinkStackIcon isDark={isDark} />
        )}

        <PillButton isDark={isDark} withPlus onClick={() => navigate("channels")}>
          Connecter
        </PillButton>
      </div>
    </DashboardCard>
  );
}

/* ============================================================================
   Petites cartes : série, intégrations
============================================================================ */

const WEEKDAYS_FR_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function StreakCard({ isDark }: { isDark: boolean }) {
  const streakCount = 0;
  const challengeName = "0 day of post";

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return WEEKDAYS_FR_SHORT[d.getDay()];
  });

  return (
    <DashboardCard isDark={isDark}>
      <CardTitle
        isDark={isDark}
        title={`${streakCount} days streak`}
        subtitle={challengeName}
        trailing={
          <FlameIcon
            className="h-7 w-7 shrink-0"
            color={isDark ? "#3a3a3d" : "#d9d9d9"}
          />
        }
      />

      <div className="mt-auto flex items-start justify-between gap-1 pt-5">
        {days.map((dayLabel, index) => {
          const isChecked = index < streakCount;
          return (
            <div
              key={`${dayLabel}-${index}`}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={[
                  "text-[10px] font-semibold uppercase leading-none",
                  isDark ? "text-neutral-400" : "text-neutral-500",
                ].join(" ")}
              >
                {dayLabel}
              </span>

              {isChecked ? (
                <div
                  className={[
                    "flex aspect-square w-full max-w-[24px] items-center justify-center rounded-full",
                    isDark ? "bg-white text-black" : "bg-neutral-900 text-white",
                  ].join(" ")}
                >
                  <CheckIcon className="h-3 w-3" />
                </div>
              ) : (
                <div
                  aria-hidden="true"
                  className={[
                    "aspect-square w-full max-w-[24px] rounded-full",
                    isDark ? "bg-white/10" : "bg-neutral-100",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

function IntegrationsCard({ isDark }: { isDark: boolean }) {
  return (
    <DashboardCard isDark={isDark}>
      <CardTitle
        isDark={isDark}
        title="Intégrations"
        subtitle="Aucune intégration"
      />

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <IconTile isDark={isDark}>
          <PuzzleIcon />
        </IconTile>

        <PillButton isDark={isDark} onClick={() => navigate("integrations")}>
          Gérer
        </PillButton>
      </div>
    </DashboardCard>
  );
}

/* ============================================================================
   Blog
============================================================================ */

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
      className={[
        "group flex flex-col overflow-hidden rounded-[22px] border transition",
        isDark
          ? "border-white/10 bg-[#141416] hover:bg-[#19191c]"
          : "border-black/[0.06] bg-white hover:bg-neutral-50",
        isDark
          ? "shadow-[0_16px_44px_rgba(0,0,0,0.4)]"
          : "shadow-[0_16px_44px_rgba(0,0,0,0.08)]",
      ].join(" ")}
    >
      <div className="h-[150px] w-full shrink-0 overflow-hidden">
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <span
            className={[
              "rounded-full px-3 py-1 text-[11px] font-semibold",
              isDark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white",
            ].join(" ")}
          >
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

function FromTheBlogSection({ isDark }: { isDark: boolean }) {
  return (
    <div className="mt-auto flex flex-col pt-2">
      <p
        className={[
          "shrink-0 text-[13px] font-medium",
          isDark ? "text-neutral-400" : "text-neutral-500",
        ].join(" ")}
      >
        From the Blog
      </p>

      <div className="mt-3 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {blogPostDefinitions.map((post) => (
          <BlogPostCard key={post.title} isDark={isDark} post={post} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   Page
============================================================================ */

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  // Réseaux connectés (lus depuis le cache partagé avec la page Channels).
  const connectedChannels = useConnectedChannels();

  const [user, setUser] = useState<UserProfile | null>(
    userProfileCache.profile
  );

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

  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim();

  const initials =
    `${(user?.first_name || "")[0] || ""}${
      (user?.last_name || "")[0] || ""
    }`.toUpperCase() || "U";

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
        isDark ? "bg-[#09090a]" : "bg-[#f3f1ed]",
      ].join(" ")}
    >
      <DashboardSidebar theme={theme} />

      <div className="h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        <div className="mx-auto flex h-full w-full max-w-[1320px] flex-col overflow-y-auto px-[clamp(16px,3vw,40px)] pb-[96px] pt-[clamp(14px,2vw,24px)]">
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
            </div>

            {/* Grille : une grande carte + deux petites sur la même ligne */}
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
              <div className="sm:col-span-2 lg:col-span-1">
                <ConnectedChannelsCard
                  isDark={isDark}
                  channels={connectedChannels}
                />
              </div>

              <StreakCard isDark={isDark} />
              <IntegrationsCard isDark={isDark} />
            </div>

            <FromTheBlogSection isDark={isDark} />
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