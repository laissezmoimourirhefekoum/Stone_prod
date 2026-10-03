
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  FileText,
  Flame,
  Heart,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react";

import { navigate } from "../hooks/useHashRoute";
import { useTheme } from "../hooks/useTheme";
import {
  useConnectedChannels,
  ConnectedChannel,
} from "../hooks/useConnectedChannels";

import DashboardSidebar from "../components/DashboardSidebar";
import NewPostModal, {
  NewPostPayload,
} from "../components/Newpostmodal";
import HelpChatButton from "../components/Helpchatbutton";
import BottomBar, {
  BottomBarTab,
} from "../components/Bottombar";
import Folder from "../components/Folder";

import {
  getCurrentUser,
  UserProfile,
} from "../services/supabase";

import {
  ZapierIcon,
  ClaudeIcon,
  ChatGPTIcon,
  NotionIcon,
  GoogleIcon,
  N8nIcon,
  GoogleCalendarIcon,
  GmailIcon,
} from "../components/IntegrationIcons";

const SIDEBAR_OFFSET = 104;

const userProfileCache = {
  profile: null as UserProfile | null,
};

function getNetworkId(
  channel: ConnectedChannel
): string | null {
  const c =
    channel as unknown as Record<string, unknown>;

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
  if (
    raw.includes("youtube") ||
    raw === "yt"
  )
    return "youtube";
  if (
    raw.includes("facebook") ||
    raw === "fb"
  )
    return "facebook";
  if (raw.includes("linkedin")) return "linkedin";
  if (raw.includes("pinterest")) return "pinterest";
  if (
    raw === "x" ||
    raw.includes("twitter")
  )
    return "x";

  return null;
}

function getFirstName(
  profile: UserProfile | null
) {
  if (!profile) return "there";

  if (profile.first_name?.trim()) {
    return profile.first_name.trim();
  }

  const fullName =
    `${profile.first_name ?? ""} ${
      profile.last_name ?? ""
    }`.trim();

  if (fullName) {
    return fullName.split(" ")[0];
  }

  return "there";
}

export default function Home() {
  const { isDark } = useTheme();

  const [profile, setProfile] =
    useState<UserProfile | null>(
      userProfileCache.profile
    );

  const [isNewPostOpen, setIsNewPostOpen] =
    useState(false);

  const [isFolderOpen, setIsFolderOpen] =
    useState(false);

  const {
    channels = [],
    loading: channelsLoading,
  } = useConnectedChannels();

  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((user) => {
        if (!mounted) return;

        userProfileCache.profile = user;
        setProfile(user);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const firstName = useMemo(
    () => getFirstName(profile),
    [profile]
  );

  const visibleChannels = useMemo(() => {
    return channels.filter(
      (channel) =>
        getNetworkId(channel) !== "youtube"
    );
  }, [channels]);

  const handleNewPost = (
    payload: NewPostPayload
  ) => {
    console.log("New post:", payload);
    setIsNewPostOpen(false);
  };

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

  return (
    <main
      className={[
        "relative h-screen w-full overflow-hidden",
        "transition-colors duration-300",
        isDark
          ? "bg-[#09090a] text-white"
          : "bg-[#f5f3ef] text-[#111111]",
      ].join(" ")}
    >
      <DashboardSidebar />

      <div
        className="h-full overflow-hidden"
        style={{
          paddingLeft: SIDEBAR_OFFSET,
        }}
      >
        <div
          className="
            mx-auto flex h-full w-full max-w-[1280px]
            flex-col
            px-[clamp(18px,3vw,40px)]
            pb-[92px]
            pt-[clamp(18px,3vw,30px)]
          "
        >
          {/* HEADER */}
          <header className="flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={[
                  "flex h-10 w-10 items-center justify-center",
                  "overflow-hidden rounded-full",
                  isDark
                    ? "bg-white/10"
                    : "bg-black/5",
                ].join(" ")}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold">
                    {firstName
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <p
                  className={[
                    "text-[12px] font-medium",
                    isDark
                      ? "text-white/40"
                      : "text-black/40",
                  ].join(" ")}
                >
                  Good to see you
                </p>

                <h1 className="text-[17px] font-semibold tracking-[-0.02em]">
                  {firstName}
                </h1>
              </div>
            </div>

            {/* New Post supprimé du header */}
            <div
              className={[
                "flex items-center gap-2 rounded-full px-3 py-2",
                isDark
                  ? "bg-white/[0.04] text-white/40"
                  : "bg-black/[0.035] text-black/40",
              ].join(" ")}
            >
              <Activity
                size={15}
                strokeWidth={1.8}
              />

              <span className="text-[12px] font-medium">
                Overview
              </span>
            </div>
          </header>

          {/* CONTENT */}
          <div className="mt-7 flex min-h-0 flex-1 flex-col">
            {/* OVERVIEW */}
            <section className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-[0.85fr_1.15fr]">
              {/* STREAK */}
              <div
                className={[
                  "group relative overflow-hidden rounded-[22px]",
                  "border p-5 transition-all duration-200",
                  "hover:-translate-y-[1px]",
                  isDark
                    ? "border-white/[0.07] bg-[#101011] hover:border-white/[0.12]"
                    : "border-black/[0.06] bg-white hover:border-black/[0.1]",
                ].join(" ")}
              >
                <div className="relative z-10 flex min-h-[178px] h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className={[
                          "text-[12px] font-medium",
                          isDark
                            ? "text-white/40"
                            : "text-black/40",
                        ].join(" ")}
                      >
                        Current streak
                      </p>

                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-[42px] font-semibold leading-none tracking-[-0.05em]">
                          7
                        </span>

                        <span
                          className={[
                            "mb-1 text-[13px]",
                            isDark
                              ? "text-white/40"
                              : "text-black/40",
                          ].join(" ")}
                        >
                          days
                        </span>
                      </div>
                    </div>

                    {/* FLAME */}
                    <div
                      className={[
                        "flex h-12 w-12 items-center justify-center",
                        "rounded-2xl",
                        "transition-transform duration-300",
                        "group-hover:scale-105",
                        isDark
                          ? "bg-orange-400/10 text-orange-400"
                          : "bg-orange-500/10 text-orange-500",
                      ].join(" ")}
                    >
                      <Flame
                        size={26}
                        strokeWidth={1.8}
                        fill="currentColor"
                        fillOpacity={0.12}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={[
                          "text-[11px]",
                          isDark
                            ? "text-white/35"
                            : "text-black/35",
                        ].join(" ")}
                      >
                        Keep it going
                      </span>

                      <span
                        className={[
                          "text-[11px] font-medium",
                          isDark
                            ? "text-white/50"
                            : "text-black/50",
                        ].join(" ")}
                      >
                        7 / 14
                      </span>
                    </div>

                    <div
                      className={[
                        "h-1.5 overflow-hidden rounded-full",
                        isDark
                          ? "bg-white/[0.07]"
                          : "bg-black/[0.06]",
                      ].join(" ")}
                    >
                      <div className="h-full w-1/2 rounded-full bg-current opacity-80" />
                    </div>
                  </div>
                </div>

                <Flame
                  className={[
                    "pointer-events-none absolute -bottom-8 -right-5",
                    "h-32 w-32 rotate-12 opacity-[0.025]",
                    isDark
                      ? "text-white"
                      : "text-black",
                  ].join(" ")}
                  fill="currentColor"
                />
              </div>

              {/* STATS */}
              <div
                className={[
                  "rounded-[22px] border p-5",
                  isDark
                    ? "border-white/[0.07] bg-[#101011]"
                    : "border-black/[0.06] bg-white",
                ].join(" ")}
              >
                <div className="grid h-full min-h-[178px] grid-cols-3">
                  <Stat
                    icon={<Users size={16} />}
                    label="Followers"
                    value="12.4K"
                    isDark={isDark}
                    border
                  />

                  <Stat
                    icon={<Heart size={16} />}
                    label="Likes"
                    value="8.7K"
                    isDark={isDark}
                    border
                  />

                  <Stat
                    icon={
                      <MessageCircle size={16} />
                    }
                    label="Comments"
                    value="342"
                    isDark={isDark}
                  />
                </div>
              </div>
            </section>

            {/* QUICK ACTIONS */}
            <section className="mt-4 grid shrink-0 grid-cols-3 gap-3">
              <QuickAction
                icon={<Plus size={17} />}
                title="New post"
                description="Create content"
                isDark={isDark}
                onClick={() =>
                  setIsNewPostOpen(true)
                }
              />

              <QuickAction
                icon={<CalendarDays size={17} />}
                title="Schedule"
                description="Plan ahead"
                isDark={isDark}
                onClick={() =>
                  navigate("calendar")
                }
              />

              <QuickAction
                icon={<FileText size={17} />}
                title="Files"
                description="Your library"
                isDark={isDark}
                onClick={() =>
                  setIsFolderOpen(true)
                }
              />
            </section>

            {/* CHANNELS */}
            <section
              className={[
                "mt-4 shrink-0 rounded-[22px] border px-5 py-4",
                isDark
                  ? "border-white/[0.07] bg-[#101011]"
                  : "border-black/[0.06] bg-white",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-[13px] font-semibold">
                      Connected channels
                    </h2>

                    <p
                      className={[
                        "mt-0.5 text-[11px]",
                        isDark
                          ? "text-white/35"
                          : "text-black/35",
                      ].join(" ")}
                    >
                      {visibleChannels.length}{" "}
                      connected
                    </p>
                  </div>

                  <div className="flex -space-x-2">
                    {channelsLoading ? (
                      <>
                        <ChannelSkeleton
                          isDark={isDark}
                        />

                        <ChannelSkeleton
                          isDark={isDark}
                        />
                      </>
                    ) : (
                      visibleChannels
                        .slice(0, 6)
                        .map((channel) => (
                          <ChannelAvatar
                            key={channel.key}
                            channel={channel}
                            isDark={isDark}
                          />
                        ))
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate("channels")
                  }
                  className={[
                    "flex items-center gap-1.5 rounded-full",
                    "px-3 py-1.5 text-[11px] font-medium",
                    "transition-colors",
                    isDark
                      ? "text-white/45 hover:bg-white/[0.06] hover:text-white"
                      : "text-black/45 hover:bg-black/[0.05] hover:text-black",
                  ].join(" ")}
                >
                  Manage
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </section>

            {/* BOTTOM ACTIONS */}
            <section className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-2">
              {/* PLAN YOUR NEXT POST */}
              <button
                type="button"
                onClick={() =>
                  navigate("calendar")
                }
                className={[
                  "group relative flex min-h-[150px] w-full",
                  "flex-col justify-between overflow-hidden",
                  "rounded-[22px] border p-5 text-left",
                  "transition-all duration-200",
                  "hover:-translate-y-[1px]",
                  "active:translate-y-0",
                  "focus:outline-none focus-visible:ring-2",
                  isDark
                    ? "border-white/[0.07] bg-[#101011] hover:border-white/[0.14] focus-visible:ring-white/20"
                    : "border-black/[0.06] bg-white hover:border-black/[0.12] focus-visible:ring-black/15",
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-current/5">
                      <CalendarDays
                        size={17}
                        strokeWidth={1.8}
                      />
                    </div>

                    <h3 className="text-[14px] font-semibold">
                      Plan your next post
                    </h3>

                    <p
                      className={[
                        "mt-1 text-[11px]",
                        isDark
                          ? "text-white/35"
                          : "text-black/35",
                      ].join(" ")}
                    >
                      Keep your content consistent
                    </p>
                  </div>

                  <ArrowUpRight
                    size={16}
                    className={[
                      "transition-transform duration-200",
                      "group-hover:-translate-y-0.5",
                      "group-hover:translate-x-0.5",
                      isDark
                        ? "text-white/25"
                        : "text-black/25",
                    ].join(" ")}
                  />
                </div>

                <div
                  className={[
                    "flex items-center gap-1.5 text-[11px] font-medium",
                    isDark
                      ? "text-white/50"
                      : "text-black/50",
                  ].join(" ")}
                >
                  Open
                  <ArrowUpRight size={13} />
                </div>
              </button>

              {/* CONTENT LIBRARY */}
              <button
                type="button"
                onClick={() =>
                  setIsFolderOpen(true)
                }
                className={[
                  "group relative flex min-h-[150px] w-full",
                  "flex-col justify-between overflow-hidden",
                  "rounded-[22px] border p-5 text-left",
                  "transition-all duration-200",
                  "hover:-translate-y-[1px]",
                  "active:translate-y-0",
                  "focus:outline-none focus-visible:ring-2",
                  isDark
                    ? "border-white/[0.07] bg-[#101011] hover:border-white/[0.14] focus-visible:ring-white/20"
                    : "border-black/[0.06] bg-white hover:border-black/[0.12] focus-visible:ring-black/15",
                ].join(" ")}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-current/5">
                      <FileText
                        size={17}
                        strokeWidth={1.8}
                      />
                    </div>

                    <h3 className="text-[14px] font-semibold">
                      Content library
                    </h3>

                    <p
                      className={[
                        "mt-1 text-[11px]",
                        isDark
                          ? "text-white/35"
                          : "text-black/35",
                      ].join(" ")}
                    >
                      Manage your saved content
                    </p>
                  </div>

                  <ArrowUpRight
                    size={16}
                    className={[
                      "transition-transform duration-200",
                      "group-hover:-translate-y-0.5",
                      "group-hover:translate-x-0.5",
                      isDark
                        ? "text-white/25"
                        : "text-black/25",
                    ].join(" ")}
                  />
                </div>

                <div
                  className={[
                    "flex items-center gap-1.5 text-[11px] font-medium",
                    isDark
                      ? "text-white/50"
                      : "text-black/50",
                  ].join(" ")}
                >
                  Open
                  <ArrowUpRight size={13} />
                </div>
              </button>
            </section>
          </div>
        </div>
      </div>

      {/* FOLDER */}
      <Folder
        isOpen={isFolderOpen}
        onClose={() => setIsFolderOpen(false)}
        isDark={isDark}
        offsetLeft={SIDEBAR_OFFSET}
      />

      {/* BOTTOM BAR */}
      <BottomBar
        isDark={isDark}
        offsetLeft={SIDEBAR_OFFSET}
        active="home"
        onChange={handleBottomBarChange}
        query=""
        onQueryChange={() => {}}
      />

      {/* HELP */}
      <HelpChatButton isDark={isDark} />

      {/* NEW POST MODAL */}
      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        isDark={isDark}
        onSubmit={handleNewPost}
      />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* STAT                                                                        */
/* -------------------------------------------------------------------------- */

function Stat({
  icon,
  label,
  value,
  isDark,
  border = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isDark: boolean;
  border?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col justify-center px-5",
        "first:pl-0 last:pr-0",
        border
          ? isDark
            ? "border-r border-white/[0.06]"
            : "border-r border-black/[0.06]"
          : "",
      ].join(" ")}
    >
      <div
        className={[
          "mb-4 flex items-center gap-2",
          isDark
            ? "text-white/35"
            : "text-black/35",
        ].join(" ")}
      >
        {icon}

        <span className="text-[11px] font-medium">
          {label}
        </span>
      </div>

      <span className="text-[25px] font-semibold tracking-[-0.04em]">
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* QUICK ACTION                                                                */
/* -------------------------------------------------------------------------- */

function QuickAction({
  icon,
  title,
  description,
  isDark,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  isDark: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex items-center gap-3 rounded-[18px]",
        "border px-4 py-3 text-left",
        "transition-all duration-200",
        "hover:-translate-y-[1px]",
        "active:translate-y-0",
        "focus:outline-none",
        "focus-visible:ring-2",
        isDark
          ? "border-white/[0.07] bg-[#101011] hover:border-white/[0.13] focus-visible:ring-white/20"
          : "border-black/[0.06] bg-white hover:border-black/[0.11] focus-visible:ring-black/15",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          isDark
            ? "bg-white/[0.05] text-white/60"
            : "bg-black/[0.04] text-black/60",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[12px] font-semibold">
          {title}
        </p>

        <p
          className={[
            "mt-0.5 truncate text-[10px]",
            isDark
              ? "text-white/30"
              : "text-black/30",
          ].join(" ")}
        >
          {description}
        </p>
      </div>

      <ArrowUpRight
        size={14}
        className={[
          "ml-auto shrink-0 transition-all duration-200",
          "group-hover:-translate-y-0.5",
          "group-hover:translate-x-0.5",
          isDark
            ? "text-white/20"
            : "text-black/20",
        ].join(" ")}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* CHANNEL AVATAR                                                              */
/* -------------------------------------------------------------------------- */

function ChannelAvatar({
  channel,
  isDark,
}: {
  channel: ConnectedChannel;
  isDark: boolean;
}) {
  const network = getNetworkId(channel);

  const icon =
    network &&
    (
      IntegrationIcons as Record<
        string,
        React.ReactNode
      >
    )[network];

  return (
    <div
      className={[
        "relative flex h-9 w-9 items-center justify-center",
        "overflow-hidden rounded-full border",
        isDark
          ? "border-[#101011] bg-[#181819]"
          : "border-white bg-[#f2f1ee]",
      ].join(" ")}
      title={
        channel.handle ||
        channel.name ||
        network ||
        "Channel"
      }
    >
      {channel.avatarUrl ? (
        <img
          src={channel.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : icon ? (
        <span className="scale-[0.65]">
          {icon}
        </span>
      ) : (
        <span className="text-[10px] font-semibold">
          {(channel.name || "?")
            .charAt(0)
            .toUpperCase()}
        </span>
      )}

      <span
        className={[
          "absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full",
          "border",
          isDark
            ? "border-[#101011] bg-emerald-400"
            : "border-white bg-emerald-500",
        ].join(" ")}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CHANNEL SKELETON                                                            */
/* -------------------------------------------------------------------------- */

function ChannelSkeleton({
  isDark,
}: {
  isDark: boolean;
}) {
  return (
    <div
      className={[
        "h-9 w-9 rounded-full border",
        "animate-pulse",
        isDark
          ? "border-[#101011] bg-white/10"
          : "border-white bg-black/5",
      ].join(" ")}
    />
  );
}
