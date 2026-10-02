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
} from "../components/IntegrationIcons";

/**
 * Largeur réservée à la sidebar (68px + 16px d'inset + gap).
 * Utilisée à la fois pour le padding du contenu et pour centrer la
 * BottomBar sur la zone de contenu (et non sur tout l'écran).
 */
const SIDEBAR_OFFSET = 104;

/**
 * Cache du profil utilisateur, partagé entre tous les montages de cette
 * page. Sans ça, chaque changement de page qui démonte/remonte Home
 * repart de `user = null`, ce qui fait clignoter l'avatar et le
 * "Bonjour, ..." et relance systématiquement getCurrentUser(). Avec ce
 * cache, l'état initial est déjà rempli avec la dernière valeur connue,
 * et on ne fait qu'une mise à jour silencieuse en arrière-plan.
 */
const userProfileCache = {
  profile: null as UserProfile | null,
};

/* ──────────────────────────────────────────────────────────────
   Réseaux sociaux : helpers pour retrouver l'icône à afficher
   en badge sur les photos de profil des canaux connectés.
   ────────────────────────────────────────────────────────────── */

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

/**
 * Déduit le réseau (SocialNetworkKey) d'un canal connecté.
 * On regarde d'abord un champ `platform` / `network` / `provider`
 * s'il existe, puis la clé du canal.
 */
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

/* ──────────────────────────────────────────────────────────────
   Avatar de la barre "Bonjour, ..."
   ────────────────────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────────────────────
   Horloge : heure (HH:MM) en gros, date juste en dessous.
   ────────────────────────────────────────────────────────────── */

function ClockDisplay({ isDark }: { isDark: boolean }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Rafraîchit toutes les 15s : suffisant pour rester synchro à la
    // minute (plus de secondes affichées).
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

/* ──────────────────────────────────────────────────────────────
   Widget "Streak"
   ────────────────────────────────────────────────────────────── */

type StreakWidgetTokens = {
  cardBg: string;
  cardBorder: string;
  shadow: string;
  heading: string;
  subtitle: string;
  flame: string;
  checkBg: string;
  checkIcon: string;
  badgeBg: string;
  badgeText: string;
};

function buildStreakTokens(invert: boolean): StreakWidgetTokens {
  return invert
    ? {
        cardBg: "bg-[#141416]",
        cardBorder: "border-white/10",
        shadow: "shadow-[0_16px_44px_rgba(0,0,0,0.4)]",
        heading: "text-white",
        subtitle: "text-neutral-400",
        flame: "#3a3a3d",
        checkBg: "bg-white",
        checkIcon: "text-black",
        badgeBg: "bg-white/10",
        badgeText: "text-white",
      }
    : {
        cardBg: "bg-white",
        cardBorder: "border-black/10",
        shadow: "shadow-[0_16px_44px_rgba(0,0,0,0.08)]",
        heading: "text-neutral-900",
        subtitle: "text-neutral-500",
        flame: "#d9d9d9",
        checkBg: "bg-neutral-900",
        checkIcon: "text-white",
        badgeBg: "bg-neutral-100",
        badgeText: "text-neutral-600",
      };
}

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

/**
 * Initiales des jours de la semaine en français.
 * Index aligné sur Date.getDay() : 0 = dimanche … 6 = samedi.
 */
const WEEKDAYS_FR_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function StreakStepsWidget({ isDark }: { isDark: boolean }) {
  // TODO: brancher ici le vrai nombre de jours consécutifs avec un post.
  const streakCount = 0;
  const challengeName = "0 day of post";

  const tokens = buildStreakTokens(!isDark);

  // 7 jours à partir d'aujourd'hui : le premier est aujourd'hui,
  // puis les 6 jours suivants.
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return WEEKDAYS_FR_SHORT[d.getDay()];
  });

  return (
    <div
      className={[
        "flex h-full w-full flex-col justify-between rounded-[22px] border p-4",
        tokens.cardBg,
        tokens.cardBorder,
        tokens.shadow,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={[
              "text-[17px] font-bold leading-tight",
              tokens.heading,
            ].join(" ")}
          >
            {streakCount} days streak
          </p>
          <p
            className={[
              "mt-0.5 text-[12.5px] font-medium",
              tokens.subtitle,
            ].join(" ")}
          >
            {challengeName}
          </p>
        </div>

        <FlameIcon className="h-8 w-8 shrink-0" color={tokens.flame} />
      </div>

      {/* 7 jours : initiale du jour au-dessus de chaque rond.
          Le premier rond correspond à aujourd'hui. */}
      <div className="mt-3.5 flex items-start justify-between gap-1">
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
                  tokens.subtitle,
                ].join(" ")}
              >
                {dayLabel}
              </span>

              {isChecked ? (
                <div
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    tokens.checkBg,
                  ].join(" ")}
                >
                  <CheckIcon
                    className={["h-3 w-3", tokens.checkIcon].join(" ")}
                  />
                </div>
              ) : (
                <div
                  aria-hidden="true"
                  className={[
                    "h-7 w-7 shrink-0 rounded-full",
                    tokens.badgeBg,
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Widget "Réseaux connectés"
   - aucun réseau connecté : invitation "Connectez votre premier réseau"
   - au moins un réseau   : uniquement les photos de profil à gauche
                            et le bouton "Connecter" tout à droite.
                            Chaque photo affiche le badge de son réseau.
   ────────────────────────────────────────────────────────────── */

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
            "flex h-9 w-9 items-center justify-center rounded-full ring-2",
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
  overlap,
  NetworkIcon,
}: {
  channel: ConnectedChannel;
  isDark: boolean;
  overlap: boolean;
  NetworkIcon?: (props: { className?: string }) => JSX.Element;
}) {
  const [failed, setFailed] = useState(false);

  // Si l'URL change (reconnexion), on retente le chargement.
  useEffect(() => {
    setFailed(false);
  }, [channel.avatarUrl]);

  const label = channel.handle || channel.name;
  const initial = label.replace(/^@/, "").charAt(0).toUpperCase() || "?";
  const showImage = Boolean(channel.avatarUrl) && !failed;

  const ring = isDark ? "ring-[#141416]" : "ring-white";

  return (
    <div
      title={label}
      style={{ marginLeft: overlap ? -10 : 0 }}
      className="relative h-10 w-10 shrink-0"
    >
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

function ConnectFirstChannelWidget({
  isDark,
  channels,
}: {
  isDark: boolean;
  channels: ConnectedChannel[];
}) {
  const cardClasses = [
    "flex w-full items-center justify-between gap-4 rounded-[22px] border px-4 py-3",
    isDark ? "border-white/10 bg-[#141416]" : "border-black/[0.06] bg-white",
    isDark
      ? "shadow-[0_16px_44px_rgba(0,0,0,0.4)]"
      : "shadow-[0_16px_44px_rgba(0,0,0,0.08)]",
  ].join(" ");

  const connectButtonClasses = [
    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
    isDark
      ? "bg-white text-neutral-900 hover:bg-neutral-200"
      : "bg-neutral-900 text-white hover:bg-neutral-800",
  ].join(" ");

  /* Au moins un réseau connecté : uniquement les photos de profil
     à gauche, et le bouton "Connecter" tout à droite. */
  if (channels.length > 0) {
    return (
      <div className={cardClasses}>
        <div className="flex items-center">
          {channels.map((channel, index) => {
            const networkId = getNetworkId(channel);
            const NetworkIcon = networkId ? NETWORK_ICONS[networkId] : null;
            return (
              <ChannelAvatar
                key={channel.key}
                channel={channel}
                isDark={isDark}
                overlap={index > 0}
                NetworkIcon={NetworkIcon}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => navigate("channels")}
          className={connectButtonClasses}
        >
          <PlusIcon />
          Connecter
        </button>
      </div>
    );
  }

  /* Aucun réseau connecté : invitation d'origine. */
  return (
    <button
      type="button"
      onClick={() => navigate("channels")}
      className={[
        cardClasses,
        "text-left transition",
        isDark ? "hover:bg-[#19191c]" : "hover:bg-neutral-50",
      ].join(" ")}
    >
      <div className="flex items-center gap-3.5">
        <LinkStackIcon isDark={isDark} />

        <div>
          <p
            className={[
              "text-[14px] font-semibold leading-tight",
              isDark ? "text-white" : "text-neutral-900",
            ].join(" ")}
          >
            Connectez votre premier réseau
          </p>
          <p
            className={[
              "mt-0.5 text-[12.5px] font-medium",
              isDark ? "text-neutral-400" : "text-neutral-500",
            ].join(" ")}
          >
            Reliez un canal pour commencer à publier
          </p>
        </div>
      </div>

      <span className={connectButtonClasses}>
        <PlusIcon />
        Connecter
      </span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
   Grille de droite : deux cartes (Performance retirée)
   ────────────────────────────────────────────────────────────── */

function DashboardCard({
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
        "flex h-full flex-col rounded-[22px] border p-4",
        isDark
          ? "border-white/10 bg-[#141416] shadow-[0_16px_44px_rgba(0,0,0,0.4)]"
          : "border-black/[0.06] bg-white shadow-[0_16px_44px_rgba(0,0,0,0.08)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function CardHeading({
  isDark,
  title,
  action,
}: {
  isDark: boolean;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <p
        className={[
          "text-[14px] font-semibold",
          isDark ? "text-white" : "text-neutral-900",
        ].join(" ")}
      >
        {title}
      </p>
      {action}
    </div>
  );
}

function IntegrationsCard({ isDark }: { isDark: boolean }) {
  return (
    <DashboardCard isDark={isDark}>
      <CardHeading isDark={isDark} title="Vos intégrations" />

      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-1 text-center">
        <div
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full",
            isDark ? "bg-white/5" : "bg-neutral-100",
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
            <path d="M8 8h8v8H8z" />
            <path d="M4 12h4M16 12h4M12 4v4M12 16v4" />
          </svg>
        </div>
        <p
          className={[
            "text-[12.5px] font-medium",
            isDark ? "text-neutral-400" : "text-neutral-500",
          ].join(" ")}
        >
          Aucune intégration
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate("integrations")}
        className={[
          "mt-3 w-full rounded-full py-1.5 text-[12.5px] font-semibold transition",
          isDark
            ? "bg-white/10 text-white hover:bg-white/15"
            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
        ].join(" ")}
      >
        Gérer
      </button>
    </DashboardCard>
  );
}

/**
 * Empty state : cercle avec "+", titre court, bouton.
 * Textes volontairement très courts.
 */
function UpcomingPostsCard({
  isDark,
  onPlan,
}: {
  isDark: boolean;
  onPlan: () => void;
}) {
  return (
    <DashboardCard isDark={isDark}>
      <CardHeading isDark={isDark} title="Publications à venir" />

      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div
          className={[
            "flex h-14 w-14 items-center justify-center rounded-full",
            isDark ? "bg-white/[0.06]" : "bg-neutral-100",
          ].join(" ")}
        >
          <svg
            viewBox="0 0 24 24"
            className={[
              "h-6 w-6",
              isDark ? "text-neutral-400" : "text-neutral-500",
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>

        <p
          className={[
            "text-[15px] font-bold leading-tight",
            isDark ? "text-white" : "text-neutral-900",
          ].join(" ")}
        >
          Aucune publication
        </p>
      </div>

      <button
        type="button"
        onClick={onPlan}
        className={[
          "mx-auto mt-4 rounded-[10px] px-5 py-2 text-[13px] font-bold transition",
          isDark
            ? "bg-white/[0.08] text-white hover:bg-white/[0.12]"
            : "bg-neutral-900 text-white hover:bg-neutral-800",
        ].join(" ")}
      >
        Planifier
      </button>
    </DashboardCard>
  );
}

/* ──────────────────────────────────────────────────────────────
   Section "From the Blog"
   ────────────────────────────────────────────────────────────── */

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

function FromTheBlogSection({ isDark }: { isDark: boolean }) {
  return (
    <div className="mt-auto flex flex-col">
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

/* ──────────────────────────────────────────────────────────────
   Home
   ────────────────────────────────────────────────────────────── */

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

  /**
   * Point d'entrée unique pour la création d'un post depuis la popup.
   * TODO : brancher ici le vrai envoi (Supabase, file d'attente de
   * publication, upload des médias vers un bucket, etc.).
   */
  const handleCreatePost = async (payload: NewPostPayload) => {
    console.log("Nouveau post à envoyer :", payload);
  };

  /**
   * Actions de la barre du bas.
   * Seul "add" est branché pour l'instant : il ouvre la popup de
   * création de post. Les autres onglets sont à relier à leurs
   * pages / modales respectives.
   */
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

      {/* pl-[104px] clears the sidebar's collapsed width (68px + 16px inset + gap).
          The sidebar is position: fixed and floats over the content (z-20)
          when it expands, so this padding does not need to change with its state. */}
      <div className="h-full" style={{ paddingLeft: SIDEBAR_OFFSET }}>
        {/* pb-[96px] : réserve la place de la BottomBar (48px de bouton +
            16px de padding interne + 16px de marge basse) pour que le
            contenu ne passe pas dessous. */}
        <div className="mx-auto flex h-full w-full max-w-[1320px] flex-col px-[clamp(16px,3vw,40px)] pb-[96px] pt-[clamp(14px,2vw,24px)]">
          {/* Heading row + widgets */}
          <div className="flex min-h-0 flex-1 flex-col gap-3.5">
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

            {/* Ligne du haut : 3 colonnes de largeur égale.
                Streak, Intégrations et Publications à venir se partagent
                la largeur totale à parts égales. */}
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StreakStepsWidget isDark={isDark} />
              <IntegrationsCard isDark={isDark} />
              <UpcomingPostsCard
                isDark={isDark}
                onPlan={() => setIsNewPostOpen(true)}
              />
            </div>

            <ConnectFirstChannelWidget
              isDark={isDark}
              channels={connectedChannels}
            />

            <FromTheBlogSection isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Barre d'actions rapides, centrée sur la zone de contenu
          (décalée de la largeur de la sidebar). */}
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