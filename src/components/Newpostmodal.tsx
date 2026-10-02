import { useEffect, useMemo, useRef, useState } from "react";
import { 
  Maximize2, Minimize2, X, Tag, FileText, 
  Eye, Smile, Hash, Image as ImageIcon, ImagePlus, Pencil, ChevronDown,
  CalendarClock, Check, Sparkles, ArrowLeft, Wand2, Plus
} from "lucide-react";
import {
  XIcon, FacebookIcon, InstagramIcon, LinkedInIcon, 
  TikTokIcon, YouTubeIcon, PinterestIcon,
} from "./IntegrationIcons";
import { CalendarPicker } from "./CalendarPicker";
import { TimePicker } from "./TimePicker";
import EditMediaModal from "./EditMediaModal";
import { navigate } from "../hooks/useHashRoute";
import {
  useConnectedChannels,
  type ConnectedChannel,
} from "../hooks/useConnectedChannels";
import {
  getTikTokCreatorInfo,
  publishToTikTok,
  waitForTikTokPublish,
  type TikTokCreatorInfo,
  type TikTokPostOptions,
  type TikTokPrivacy,
} from "../services/tiktok";

export type SocialNetworkId =
  | "x" | "facebook" | "instagram" | "linkedin" 
  | "tiktok" | "youtube" | "pinterest";

type MediaKind = "image" | "video";

type MediaItem = {
  id: string;
  file: File;
  url: string;
  kind: MediaKind;
};

export type ScheduleAction = "save_in_folder" | "now" | "set_date";

export type TikTokPayload = TikTokPostOptions & {
  /** "direct" = publication immédiate, "draft" = brouillon dans l'app TikTok */
  mode: "direct" | "draft";
};

export type NewPostPayload = {
  title: string;
  content: string;
  hashtags: string[];
  networks: SocialNetworkId[];
  scheduleMode: "now" | "save_in_folder" | "later";
  scheduledAt: string | null;
  media: File[];
  /**
   * Renseigné uniquement si TikTok est sélectionné avec "Now".
   * La publication TikTok est déjà effectuée par le modal lui-même
   * quand onSubmit est appelé : le parent n'a rien à faire pour TikTok.
   */
  tiktok?: TikTokPayload;
};

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onSubmit?: (payload: NewPostPayload) => void | Promise<void>;
}

const MAX_MEDIA = 20;

// Doit correspondre au MAX_VIDEO_SIZE et aux types du backend.
const TIKTOK_MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const TIKTOK_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

const TIKTOK_PRIVACY_LABELS: Record<TikTokPrivacy, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};

const DEFAULT_TIKTOK_OPTIONS: TikTokPostOptions = {
  privacy_level: "",
  disable_comment: false,
  disable_duet: false,
  disable_stitch: false,
};

const SOCIAL_NETWORKS: {
  id: SocialNetworkId;
  label: string;
  Icon: (props: { className?: string }) => JSX.Element;
}[] = [
  { id: "x", label: "X", Icon: XIcon },
  { id: "facebook", label: "Facebook", Icon: FacebookIcon },
  { id: "instagram", label: "Instagram", Icon: InstagramIcon },
  { id: "linkedin", label: "LinkedIn", Icon: LinkedInIcon },
  { id: "tiktok", label: "TikTok", Icon: TikTokIcon },
  { id: "youtube", label: "YouTube", Icon: YouTubeIcon },
  { id: "pinterest", label: "Pinterest", Icon: PinterestIcon },
];

const SCHEDULE_ACTIONS: {
  id: ScheduleAction;
  label: string;
  description: string;
}[] = [
  { id: "save_in_folder", label: "Save in folder", description: "Save your post in a folder to publish it later." },
  { id: "now", label: "Now", description: "Publish your post right away." },
  { id: "set_date", label: "Set Date and Time", description: "Choose a specific time to post, or use our recommendation." },
];

const POSTING_SLOTS: { label: string; hour: number; minute: number }[] = [
  { label: "9:00 AM", hour: 9, minute: 0 },
  { label: "12:00 PM", hour: 12, minute: 0 },
  { label: "6:00 PM", hour: 18, minute: 0 },
];

/* ──────────────────────────────────────────────────────────────
   Brouillon
   ────────────────────────────────────────────────────────────── */

type DraftData = {
  title: string;
  content: string;
  hashtags: string[];
  networks: SocialNetworkId[];
  scheduleAction: ScheduleAction;
  scheduledAt: number;
  files: File[];
};

// Survit à la fermeture (et même au démontage) du composant.
// Les File ne peuvent pas être mis dans localStorage, d'où la variable de module.
let savedDraft: DraftData | null = null;

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergeDateTime(datePart: Date, timePart: Date): Date {
  const merged = new Date(datePart);
  merged.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return merged;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function defaultScheduledDate(): Date {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
  return d;
}

function toSentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatShortDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Local";
  }
}

/**
 * Déduit le réseau (SocialNetworkId) d'un canal connecté.
 * On regarde d'abord un champ `platform` / `network` / `provider`
 * s'il existe, puis la clé du canal.
 */
function getNetworkId(channel: ConnectedChannel): SocialNetworkId | null {
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
   Pastille d'un canal connecté : photo de profil + badge du réseau
   ────────────────────────────────────────────────────────────── */

function ChannelTile({
  channel,
  NetworkIcon,
  isDark,
  isSelected,
  onToggle,
}: {
  channel: ConnectedChannel;
  NetworkIcon: (props: { className?: string }) => JSX.Element;
  isDark: boolean;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [failed, setFailed] = useState(false);

  // Si l'URL change (reconnexion), on retente le chargement.
  useEffect(() => {
    setFailed(false);
  }, [channel.avatarUrl]);

  const label = channel.handle || channel.name;
  const initial = label.replace(/^@/, "").charAt(0).toUpperCase() || "?";
  const showImage = Boolean(channel.avatarUrl) && !failed;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-pressed={isSelected}
      className={[
        "relative h-14 w-14 shrink-0 rounded-2xl transition",
        isSelected
          ? isDark
            ? "opacity-100 ring-2 ring-white/70 ring-offset-2 ring-offset-[#141416]"
            : "opacity-100 ring-2 ring-neutral-900 ring-offset-2 ring-offset-white"
          : "opacity-50 hover:opacity-80",
      ].join(" ")}
    >
      {showImage ? (
        <img
          src={channel.avatarUrl}
          alt={label}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-2xl object-cover"
        />
      ) : (
        <span
          className={[
            "flex h-full w-full items-center justify-center rounded-2xl text-[18px] font-semibold",
            isDark ? "bg-[#2a2a2d] text-white" : "bg-neutral-900 text-white",
          ].join(" ")}
        >
          {initial}
        </span>
      )}

      <span
        className={[
          "absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-black ring-[3px]",
          isDark ? "ring-[#141416]" : "ring-white",
        ].join(" ")}
      >
        <NetworkIcon className="h-3 w-3" />
      </span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
   Composant principal
   ────────────────────────────────────────────────────────────── */

export default function NewPostModal({ isOpen, onClose, isDark, onSubmit }: NewPostModalProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagDraft, setHashtagDraft] = useState("");
  const [networks, setNetworks] = useState<SocialNetworkId[]>([]);
  const [scheduleAction, setScheduleAction] = useState<ScheduleAction>("now");
  const [scheduledAt, setScheduledAt] = useState<Date>(() => defaultScheduledDate());
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDateTimePanel, setShowDateTimePanel] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [hoveredMediaId, setHoveredMediaId] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);

  // Réseaux connectés (cache partagé avec la page Channels).
  const connectedChannels = useConnectedChannels();

  // ── TikTok ──
  const [tiktokInfo, setTiktokInfo] = useState<TikTokCreatorInfo | null>(null);
  const [tiktokInfoError, setTiktokInfoError] = useState<string | null>(null);
  const [tiktokOptions, setTiktokOptions] = useState<TikTokPostOptions>(DEFAULT_TIKTOK_OPTIONS);
  const [tiktokDraftMode, setTiktokDraftMode] = useState(false);
  const [tiktokConsent, setTiktokConsent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaItem[]>(media);
  mediaRef.current = media;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeWithDraftRef = useRef<() => void>(() => {});

  const tiktokSelected = networks.includes("tiktok");

  const timeMin = useMemo(() => {
    const now = new Date();
    return isSameCalendarDay(scheduledAt, now) ? now : undefined;
  }, [scheduledAt]);

  const timezone = useMemo(() => getLocalTimezone(), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showActionMenu || showDateTimePanel) {
          setShowActionMenu(false);
          setShowDateTimePanel(false);
        } else {
          closeWithDraftRef.current();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, showActionMenu, showDateTimePanel]);

  useEffect(() => {
    return () => {
      mediaRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  // À l'ouverture : s'il existe un brouillon, on propose de le reprendre
  useEffect(() => {
    setPendingDraft(isOpen ? savedDraft : null);
  }, [isOpen]);

  // Charge les options autorisées du créateur TikTok (confidentialité,
  // interactions désactivées…) dès que TikTok est sélectionné.
  useEffect(() => {
    if (!isOpen || !tiktokSelected || tiktokInfo) return;

    let cancelled = false;

    getTikTokCreatorInfo()
      .then((info) => {
        if (cancelled) return;
        setTiktokInfo(info);
        setTiktokInfoError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTiktokInfoError(
          error instanceof Error && error.message
            ? error.message
            : "Could not load your TikTok settings."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, tiktokSelected, tiktokInfo]);

  useEffect(() => {
    if (!showActionMenu && !showDateTimePanel) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setShowActionMenu(false);
        setShowDateTimePanel(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [showActionMenu, showDateTimePanel]);

  if (!isOpen) return null;

  const hasDraftContent =
    content.trim().length > 0 ||
    title.trim().length > 0 ||
    hashtags.length > 0 ||
    networks.length > 0 ||
    media.length > 0;

  const clearForm = () => {
    media.forEach((item) => URL.revokeObjectURL(item.url));
    setContent("");
    setTitle("");
    setHashtags([]);
    setHashtagDraft("");
    setNetworks([]);
    setScheduleAction("now");
    setScheduledAt(defaultScheduledDate());
    setMedia([]);
    setMediaError(null);
    setIsSubmitting(false);
    setIsFullscreen(false);
    setShowActionMenu(false);
    setShowDateTimePanel(false);
    setEditingItem(null);
    setTiktokOptions(DEFAULT_TIKTOK_OPTIONS);
    setTiktokDraftMode(false);
    setTiktokConsent(false);
    setSubmitError(null);
    setSubmitProgress(null);
  };

  // Fermeture après publication : on jette tout
  const discardAndClose = () => {
    savedDraft = null;
    clearForm();
    onClose();
  };

  // Fermeture manuelle (X, fond, Escape) : on garde un brouillon
  const closeWithDraft = () => {
    // Pendant un envoi, on ne ferme pas : l'upload TikTok est en cours.
    if (isSubmitting) return;

    if (hasDraftContent) {
      savedDraft = {
        title,
        content,
        hashtags,
        networks,
        scheduleAction,
        scheduledAt: scheduledAt.getTime(),
        files: media.map((m) => m.file),
      };
    }
    clearForm();
    onClose();
  };
  closeWithDraftRef.current = closeWithDraft;

  const resumeDraft = () => {
    if (!pendingDraft) return;
    setTitle(pendingDraft.title);
    setContent(pendingDraft.content);
    setHashtags(pendingDraft.hashtags);
    setNetworks(pendingDraft.networks);
    setScheduleAction(pendingDraft.scheduleAction);
    setScheduledAt(new Date(pendingDraft.scheduledAt));
    setMedia(
      pendingDraft.files.map((file) => ({
        id: makeId(),
        file,
        url: URL.createObjectURL(file),
        kind: file.type.startsWith("video/") ? "video" : "image",
      }))
    );
    savedDraft = null;
    setPendingDraft(null);
  };

  const ignoreDraft = () => {
    savedDraft = null;
    setPendingDraft(null);
  };

  const toggleNetwork = (id: SocialNetworkId) => {
    setNetworks((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  // Un canal connecté par pastille (les canaux dont le réseau n'est pas reconnu sont ignorés).
  const channelTiles = connectedChannels
    .map((channel) => {
      const networkId = getNetworkId(channel);
      const network = SOCIAL_NETWORKS.find((n) => n.id === networkId);
      return network ? { channel, network } : null;
    })
    .filter(
      (tile): tile is { channel: ConnectedChannel; network: (typeof SOCIAL_NETWORKS)[number] } =>
        tile !== null
    );

  // Le brouillon est sauvegardé, puis on va connecter un réseau.
  const handleConnectChannel = () => {
    closeWithDraft();
    navigate("channels");
  };

  const commitHashtagDraft = () => {
    const clean = toSentenceCase(hashtagDraft.trim().replace(/^#+/, ""));
    if (!clean) {
      setHashtagDraft("");
      return;
    }
    setHashtags((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setHashtagDraft("");
  };

  const removeHashtag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  };

  const addFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    setMedia((prev) => {
      const room = MAX_MEDIA - prev.length;
      const accepted = incoming.slice(0, Math.max(room, 0));

      if (incoming.length > accepted.length) {
        setMediaError(`Maximum ${MAX_MEDIA} fichiers.`);
      } else {
        setMediaError(null);
      }

      const newItems: MediaItem[] = accepted.map((file) => ({
        id: makeId(),
        file,
        url: URL.createObjectURL(file),
        kind: file.type.startsWith("video/") ? "video" : "image",
      }));

      return [...prev, ...newItems];
    });
  };

  const removeMedia = (id: string) => {
    setMedia((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
    setMediaError(null);
  };

  const handleApplyMediaEdit = (id: string, newFile: File, newUrl: string) => {
    setMedia((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        URL.revokeObjectURL(item.url);
        return { ...item, file: newFile, url: newUrl };
      })
    );
    setEditingItem(null);
  };

  /* ── Règles TikTok ──
     - publication TikTok uniquement avec "Now" (l'API TikTok ne
       programme pas les posts) ;
     - une vidéo valide (mp4 / mov / webm, ≤ 100 Mo) est obligatoire ;
     - en publication directe : confidentialité choisie + consentement ;
       en brouillon, TikTok demande ces choix dans son app. */

  const tiktokVideo = media.find((item) => item.kind === "video") ?? null;

  const tiktokVideoProblem: string | null = !tiktokVideo
    ? "TikTok requires a video."
    : !TIKTOK_VIDEO_TYPES.includes(tiktokVideo.file.type)
    ? "TikTok only accepts MP4, MOV or WebM videos."
    : tiktokVideo.file.size > TIKTOK_MAX_VIDEO_BYTES
    ? `The video is too large (max ${TIKTOK_MAX_VIDEO_BYTES / 1024 / 1024} MB).`
    : null;

  const tiktokActive = tiktokSelected && scheduleAction === "now";
  const tiktokBlockedBySchedule = tiktokSelected && scheduleAction === "set_date";

  const tiktokReady =
    !tiktokActive ||
    (tiktokVideoProblem === null &&
      (tiktokDraftMode ||
        (tiktokOptions.privacy_level !== "" && tiktokConsent)));

  const canSubmit =
    networks.length > 0 &&
    (content.trim().length > 0 || media.length > 0) &&
    (scheduleAction !== "set_date" || scheduledAt.getTime() > Date.now()) &&
    !tiktokBlockedBySchedule &&
    tiktokReady &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const tiktokMode: "direct" | "draft" = tiktokDraftMode ? "draft" : "direct";

    const payload: NewPostPayload = {
      title: title.trim(),
      content: content.trim(),
      hashtags,
      networks,
      scheduleMode: scheduleAction === "set_date" ? "later" : scheduleAction,
      scheduledAt:
        scheduleAction === "set_date" ? scheduledAt.toISOString() : null,
      media: media.map((item) => item.file),
      tiktok: tiktokActive ? { ...tiktokOptions, mode: tiktokMode } : undefined,
    };

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      if (tiktokActive && tiktokVideo) {
        const caption = [
          content.trim(),
          hashtags.map((tag) => `#${tag}`).join(" "),
        ]
          .filter(Boolean)
          .join(" ");

        setSubmitProgress("Uploading video to TikTok…");

        const publishId = await publishToTikTok({
          video: tiktokVideo.file,
          caption,
          mode: tiktokMode,
          options: tiktokOptions,
        });

        setSubmitProgress("TikTok is processing your video…");

        await waitForTikTokPublish(publishId);
      }

      setSubmitProgress(null);
      await onSubmit?.(payload);
      discardAndClose();
    } catch (error) {
      console.error("Erreur lors de la création du post:", error);
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : "Something went wrong while publishing."
      );
      setSubmitProgress(null);
      setIsSubmitting(false);
    }
  };

  const selectAction = (action: ScheduleAction) => {
    setScheduleAction(action);
    if (action === "set_date") {
      setShowActionMenu(false);
      setShowDateTimePanel(true);
    } else {
      setShowDateTimePanel(false);
      setShowActionMenu(false);
    }
  };

  const applyPostingSlot = (hour: number, minute: number) => {
    setScheduledAt((prev) => {
      const next = new Date(prev);
      next.setHours(hour, minute, 0, 0);
      return next;
    });
  };

  const footerLabel =
    scheduleAction === "set_date"
      ? formatShortDateTime(scheduledAt)
      : scheduleAction === "save_in_folder"
      ? "Save in folder"
      : "Now";

  const submitLabel = isSubmitting
    ? scheduleAction === "save_in_folder"
      ? "Saving…"
      : "Publishing…"
    : scheduleAction === "now"
    ? "Post Now"
    : scheduleAction === "save_in_folder"
    ? "Save Post"
    : "Schedule Post";

  // ── Thèmes ──
  const bgModal = isDark ? "bg-[#141416]" : "bg-white";
  const bgPanel = isDark ? "bg-[#1c1c1e]" : "bg-neutral-50";
  const border = isDark ? "border-white/10" : "border-black/[0.06]";
  const textPrimary = isDark ? "text-white" : "text-neutral-900";
  const textSecondary = isDark ? "text-neutral-400" : "text-neutral-500";

  const accentBg = isDark ? "bg-white/10" : "bg-neutral-200";
  const accentText = isDark ? "text-white" : "text-neutral-900";
  const accentCheck = isDark ? "text-white" : "text-neutral-900";
  const accentSolid = isDark ? "bg-white/5" : "bg-neutral-100";
  const accentBorder = isDark ? "border-white/15" : "border-black/10";

  const tiktokNotConnected =
    tiktokInfoError !== null && /not connected|reconnect|expired/i.test(tiktokInfoError);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeWithDraft();
      }}
    >
      <div
        className={[
          "relative flex flex-col overflow-hidden border",
          isFullscreen
            ? "h-[96vh] w-[96vw] rounded-[24px]"
            : "h-[90vh] w-full max-w-[1200px] rounded-[20px]",
          bgModal,
          border,
          isDark ? "shadow-[0_32px_80px_rgba(0,0,0,0.6)]" : "shadow-[0_32px_80px_rgba(0,0,0,0.22)]",
        ].join(" ")}
      >
        {/* ── Header ── */}
        <div className={["flex shrink-0 items-center justify-between border-b px-5 py-3", border].join(" ")}>
          <div className="flex items-center gap-4">
            <h2 className={["text-[18px] font-bold", textPrimary].join(" ")}>Create Post</h2>
            <button className={["flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition", border, isDark ? "hover:bg-white/5" : "hover:bg-black/5", textSecondary].join(" ")}>
              <Tag className="h-3.5 w-3.5" />
              Tags
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className={["flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium transition", textSecondary, isDark ? "hover:text-white" : "hover:text-neutral-900"].join(" ")}>
              <FileText className="h-4 w-4" />
              Templates
            </button>
            <div className={["mx-1 h-5 w-px", isDark ? "bg-white/10" : "bg-black/10"].join(" ")} />
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              className={["flex h-8 w-8 items-center justify-center rounded-full transition", textSecondary, isDark ? "hover:bg-white/10 hover:text-white" : "hover:bg-black/5 hover:text-neutral-900"].join(" ")}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={closeWithDraft}
              className={["flex h-8 w-8 items-center justify-center rounded-full transition", textSecondary, isDark ? "hover:bg-white/10 hover:text-white" : "hover:bg-black/5 hover:text-neutral-900"].join(" ")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Colonne gauche */}
          <div className="flex min-h-0 flex-1 flex-col p-5">
            {/* Canaux connectés (photo de profil + badge du réseau) + bouton « + » */}
            <div className="mb-4 flex flex-wrap items-center gap-4">
              {channelTiles.map(({ channel, network }) => (
                <ChannelTile
                  key={channel.key}
                  channel={channel}
                  NetworkIcon={network.Icon}
                  isDark={isDark}
                  isSelected={networks.includes(network.id)}
                  onToggle={() => toggleNetwork(network.id)}
                />
              ))}

              <button
                type="button"
                onClick={handleConnectChannel}
                title="Connect a network"
                aria-label="Connect a network"
                className={[
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition",
                  isDark
                    ? "border-white/10 bg-[#242427] text-neutral-400 hover:bg-[#2e2e31] hover:text-white"
                    : "border-black/10 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900",
                ].join(" ")}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex min-h-[120px] flex-1 flex-col">
              <textarea
                value={content}
                onChange={(event) => setContent(toSentenceCase(event.target.value))}
                placeholder="Start writing or get inspired with Templates"
                className={[
                  "w-full flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none",
                  textPrimary,
                  isDark ? "placeholder:text-neutral-500" : "placeholder:text-neutral-400",
                ].join(" ")}
              />
            </div>

            {/* ── Miniatures média : croix + crayon visibles au survol de la miniature ── */}
            <div className="mt-3 flex flex-wrap items-end gap-3">
              {media.map((item) => {
                const isHovered = hoveredMediaId === item.id;
                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredMediaId(item.id)}
                    onMouseLeave={() => setHoveredMediaId(null)}
                    className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-2xl"
                  >
                    <div className="h-full w-full overflow-hidden rounded-2xl">
                      {item.kind === "image" ? (
                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="relative h-full w-full">
                          <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                            <Eye className="h-5 w-5" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Léger assombrissement au survol pour mieux détacher les icônes */}
                    <div
                      className={[
                        "pointer-events-none absolute inset-0 transition-colors duration-150",
                        isHovered ? "bg-black/20" : "bg-black/0",
                      ].join(" ")}
                    />

                    {/* Bouton supprimer — visible uniquement au survol de la miniature */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMedia(item.id);
                      }}
                      title="Supprimer"
                      aria-label="Supprimer le média"
                      className={[
                        "absolute right-1.5 top-1.5 z-30 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-sm transition-opacity duration-150 hover:bg-black/90",
                        isHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                      ].join(" ")}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>

                    {/* Bouton éditer — visible uniquement au survol de la miniature (images uniquement) */}
                    {item.kind === "image" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                        }}
                        title="Éditer"
                        aria-label="Éditer le média"
                        className={[
                          "absolute bottom-1.5 right-1.5 z-30 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-sm transition-opacity duration-150 hover:bg-black/90",
                          isHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                        ].join(" ")}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                );
              })}

              {media.length < MAX_MEDIA && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
                  }}
                  className={[
                    "flex h-[100px] w-[100px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-center transition-all duration-200",
                    isDragging
                      ? isDark
                        ? "scale-105 border-white/50 bg-white/5"
                        : "scale-105 border-neutral-400 bg-neutral-100"
                      : isDark
                      ? "border-white/15 hover:border-white/30 hover:bg-white/5"
                      : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  <ImagePlus className={["h-6 w-6", isDark ? "text-white/40" : "text-neutral-400"].join(" ")} strokeWidth={1.75} />
                  <span className={["mt-1 text-[10px] font-medium leading-tight", isDark ? "text-white/50" : "text-neutral-400"].join(" ")}>
                    Drag & drop or
                  </span>
                  <span className={["text-[10px] font-semibold leading-tight", textPrimary].join(" ")}>
                    select a file
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {mediaError && <p className="mt-1 text-[11px] text-red-500">{mediaError}</p>}

            {/* ── Réglages TikTok ── */}
            {tiktokSelected && (
              <div
                className={[
                  "mt-3 max-h-[230px] shrink-0 overflow-y-auto rounded-xl border p-3 text-[12.5px]",
                  border,
                  isDark ? "bg-white/[0.03]" : "bg-neutral-50",
                  textPrimary,
                ].join(" ")}
              >
                <div className="mb-2 flex items-center gap-2">
                  <TikTokIcon className="h-4 w-4" />
                  <p className="text-[13px] font-semibold">TikTok settings</p>
                </div>

                {tiktokBlockedBySchedule && (
                  <p className="mb-2 text-amber-500">
                    TikTok can't schedule posts. Choose "Now" to publish on TikTok, or
                    unselect TikTok.
                  </p>
                )}

                {scheduleAction === "save_in_folder" && (
                  <p className={["mb-2", textSecondary].join(" ")}>
                    TikTok is only sent when you choose "Now".
                  </p>
                )}

                {tiktokVideoProblem && (
                  <p className="mb-2 text-red-500">{tiktokVideoProblem}</p>
                )}

                {tiktokInfoError && (
                  <p className="mb-2 text-red-500">
                    {tiktokInfoError}{" "}
                    {tiktokNotConnected && (
                      <a href="#/channels" className="underline">
                        Open Channels
                      </a>
                    )}
                  </p>
                )}

                {!tiktokInfo && !tiktokInfoError && (
                  <p className={textSecondary}>Loading your TikTok settings…</p>
                )}

                {tiktokInfo && (
                  <>
                    {tiktokInfo.creator_nickname && (
                      <p className={["mb-2", textSecondary].join(" ")}>
                        Posting as <span className="font-semibold">{tiktokInfo.creator_nickname}</span>
                      </p>
                    )}

                    <label className="mb-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={tiktokDraftMode}
                        onChange={(e) => setTiktokDraftMode(e.target.checked)}
                      />
                      Send as a draft to my TikTok inbox (finish it in the TikTok app)
                    </label>

                    {!tiktokDraftMode && (
                      <>
                        <select
                          value={tiktokOptions.privacy_level}
                          onChange={(e) =>
                            setTiktokOptions((o) => ({
                              ...o,
                              privacy_level: e.target.value as TikTokPostOptions["privacy_level"],
                            }))
                          }
                          className={[
                            "mb-2 w-full rounded-lg border px-2 py-1.5 outline-none",
                            border,
                            isDark ? "bg-[#1c1c1e] text-white" : "bg-white text-neutral-900",
                          ].join(" ")}
                        >
                          <option value="">Who can view this video? (required)</option>
                          {tiktokInfo.privacy_level_options.map((level) => (
                            <option key={level} value={level}>
                              {TIKTOK_PRIVACY_LABELS[level as TikTokPrivacy] ?? level}
                            </option>
                          ))}
                        </select>

                        {(
                          [
                            ["disable_comment", "Disable comments", tiktokInfo.comment_disabled],
                            ["disable_duet", "Disable Duet", tiktokInfo.duet_disabled],
                            ["disable_stitch", "Disable Stitch", tiktokInfo.stitch_disabled],
                          ] as const
                        ).map(([key, label, forced]) => (
                          <label key={key} className="mb-1 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={forced || tiktokOptions[key]}
                              disabled={forced}
                              onChange={(e) =>
                                setTiktokOptions((o) => ({ ...o, [key]: e.target.checked }))
                              }
                            />
                            {label}
                            {forced && (
                              <span className={textSecondary}>(disabled in your TikTok settings)</span>
                            )}
                          </label>
                        ))}

                        <label className="mt-2 flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={tiktokConsent}
                            onChange={(e) => setTiktokConsent(e.target.checked)}
                          />
                          <span>
                            By posting, you agree to TikTok's{" "}
                            <a
                              href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              Music Usage Confirmation
                            </a>
                            .
                          </span>
                        </label>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {submitProgress && (
              <p className={["mt-2 text-[12px]", textSecondary].join(" ")}>{submitProgress}</p>
            )}
            {submitError && <p className="mt-2 text-[12px] text-red-500">{submitError}</p>}

            <div className={["mt-4 flex items-center gap-4 border-t pt-3", border].join(" ")}>
              <button className={["flex h-8 w-8 items-center justify-center rounded-full transition", textSecondary, isDark ? "hover:bg-white/10 hover:text-white" : "hover:bg-black/5 hover:text-neutral-900"].join(" ")}>
                <Smile className="h-4 w-4" />
              </button>
              <button
                onClick={() => document.getElementById("hashtag-input")?.focus()}
                className={["flex h-8 w-8 items-center justify-center rounded-full transition", textSecondary, isDark ? "hover:bg-white/10 hover:text-white" : "hover:bg-black/5 hover:text-neutral-900"].join(" ")}
              >
                <Hash className="h-4 w-4" />
              </button>
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                {hashtags.map((tag) => (
                  <span key={tag} className={["flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", isDark ? "bg-white/10 text-white" : "bg-neutral-200 text-neutral-800"].join(" ")}>
                    #{tag}
                    <button onClick={() => removeHashtag(tag)} className={isDark ? "text-neutral-400 hover:text-white" : "text-neutral-500 hover:text-neutral-900"}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  id="hashtag-input"
                  type="text"
                  value={hashtagDraft}
                  onChange={(e) => setHashtagDraft(toSentenceCase(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "," || e.key === " ") {
                      e.preventDefault();
                      commitHashtagDraft();
                    } else if (e.key === "Backspace" && !hashtagDraft && hashtags.length > 0) {
                      removeHashtag(hashtags[hashtags.length - 1]);
                    }
                  }}
                  onBlur={commitHashtagDraft}
                  placeholder={hashtags.length === 0 ? "Add hashtag..." : ""}
                  className={["min-w-[100px] flex-1 bg-transparent text-[13px] outline-none", textPrimary, isDark ? "placeholder:text-neutral-600" : "placeholder:text-neutral-400"].join(" ")}
                />
              </div>
            </div>
          </div>

          {/* Colonne droite : Previews */}
          <div className={["flex w-[400px] shrink-0 flex-col border-l", border, bgPanel].join(" ")}>
            <div className={["flex items-center gap-2 border-b px-5 py-4", border].join(" ")}>
              <h3 className={["text-[15px] font-semibold", textPrimary].join(" ")}>Post Previews</h3>
              <div className={["flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold", textSecondary, border].join(" ")}>
                i
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center p-6">
              {(content.trim() || media.length > 0) ? (
                <div className={["w-full max-w-[300px] rounded-xl border p-4 shadow-sm", border, isDark ? "bg-[#242427]" : "bg-white"].join(" ")}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className={["h-8 w-8 rounded-full", isDark ? "bg-white/10" : "bg-neutral-200"].join(" ")} />
                    <div>
                      <div className={["h-2 w-20 rounded", isDark ? "bg-white/10" : "bg-neutral-200"].join(" ")} />
                      <div className={["mt-1 h-2 w-12 rounded", isDark ? "bg-white/5" : "bg-neutral-100"].join(" ")} />
                    </div>
                  </div>
                  {content && <p className={["text-[13px] leading-relaxed", textPrimary].join(" ")}>{content}</p>}
                  {hashtags.length > 0 && (
                    <p className={["mt-2 text-[12px]", isDark ? "text-white/60" : "text-neutral-500"].join(" ")}>
                      {hashtags.map(t => `#${t}`).join(" ")}
                    </p>
                  )}
                  {media.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-lg">
                      {media[0].kind === "image" ? (
                        <img src={media[0].url} alt="" className="w-full object-cover" />
                      ) : (
                        <video src={media[0].url} className="w-full object-cover" muted playsInline />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className={["relative mb-4 flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed", isDark ? "border-neutral-600/30" : "border-neutral-300"].join(" ")}>
                    <div className={["flex h-16 w-16 items-center justify-center rounded-xl", isDark ? "bg-white/5" : "bg-neutral-200/50"].join(" ")}>
                      <ImageIcon className={["h-6 w-6", textSecondary].join(" ")} />
                    </div>
                    <Sparkles className={["absolute -right-2 -top-2 h-5 w-5", isDark ? "text-white/30" : "text-neutral-300"].join(" ")} />
                    <Sparkles className={["absolute -bottom-1 -left-1 h-3 w-3", isDark ? "text-white/30" : "text-neutral-300"].join(" ")} />
                  </div>
                  <p className={["text-[13px]", textSecondary].join(" ")}>See your post's preview here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className={["relative flex shrink-0 items-center justify-end border-t px-5 py-3", border].join(" ")}>
          <div className="relative" ref={dropdownRef}>
            <div
              className={[
                "flex items-stretch overflow-hidden rounded-xl border",
                border,
                isDark ? "bg-white/5" : "bg-neutral-100",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => {
                  if (showDateTimePanel) {
                    setShowDateTimePanel(false);
                    setShowActionMenu(true);
                  } else {
                    setShowActionMenu((v) => !v);
                  }
                }}
                aria-expanded={showActionMenu || showDateTimePanel}
                aria-haspopup="menu"
                className={[
                  "flex items-center gap-2 px-4 py-2.5 text-[13.5px] font-semibold transition",
                  textPrimary,
                  isDark ? "hover:bg-white/5" : "hover:bg-black/5",
                ].join(" ")}
              >
                <CalendarClock className={["h-4 w-4", textSecondary].join(" ")} />
                <span>{footerLabel}</span>
                <ChevronDown
                  className={[
                    "h-3.5 w-3.5 transition",
                    (showActionMenu || showDateTimePanel) ? "rotate-180" : "",
                    textSecondary,
                  ].join(" ")}
                />
              </button>

              <div className={["w-px", isDark ? "bg-white/10" : "bg-black/10"].join(" ")} />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={[
                  "px-5 py-2.5 text-[14px] font-semibold transition",
                  canSubmit
                    ? isDark
                      ? "bg-white text-[#141416] hover:bg-neutral-200"
                      : "bg-neutral-900 text-white hover:bg-neutral-800"
                    : isDark
                    ? "cursor-not-allowed text-neutral-600"
                    : "cursor-not-allowed text-neutral-400",
                ].join(" ")}
              >
                {submitLabel}
              </button>
            </div>

            {showActionMenu && (
              <div
                role="menu"
                className={[
                  "absolute bottom-full right-0 z-50 mb-2 w-[340px] overflow-hidden rounded-xl border p-2 shadow-2xl",
                  isDark ? "border-white/10 bg-[#1c1c1e]" : "border-black/10 bg-white",
                ].join(" ")}
              >
                {SCHEDULE_ACTIONS.map((action) => {
                  const isSelected = scheduleAction === action.id;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      role="menuitem"
                      onClick={() => selectAction(action.id)}
                      className={[
                        "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition",
                        isSelected
                          ? `${accentBg} ${accentText}`
                          : isDark
                          ? "text-neutral-200 hover:bg-white/5"
                          : "text-neutral-700 hover:bg-black/[0.04]",
                      ].join(" ")}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                        {isSelected && <Check className={["h-4 w-4", accentCheck].join(" ")} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={["block text-[13.5px] font-bold", isSelected ? accentText : ""].join(" ")}>
                          {action.label}
                        </span>
                        <span className={["mt-0.5 block text-[12.5px] leading-snug", isSelected ? (isDark ? "text-white/80" : "text-neutral-700") : textSecondary].join(" ")}>
                          {action.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {showDateTimePanel && (
              <div
                className={[
                  "absolute bottom-full right-0 z-50 mb-2 w-[280px] overflow-hidden rounded-xl border shadow-2xl",
                  isDark ? "border-white/10 bg-[#1c1c1e]" : "border-black/10 bg-white",
                ].join(" ")}
              >
                <div className="w-full p-3">
                  <CalendarPicker
                    value={scheduledAt}
                    onChange={(date) => {
                      setScheduledAt((prev) => mergeDateTime(date, prev));
                    }}
                    isDark={isDark}
                  />
                </div>

                <div className={["border-t p-3", isDark ? "border-white/10" : "border-black/10"].join(" ")}>
                  <p className={["mb-2 text-[13px] font-semibold", textPrimary].join(" ")}>
                    Posting Slots
                  </p>
                  <div className="flex flex-col gap-2">
                    {POSTING_SLOTS.map((slot) => {
                      const isActive =
                        scheduledAt.getHours() === slot.hour &&
                        scheduledAt.getMinutes() === slot.minute;
                      return (
                        <button
                          key={slot.label}
                          type="button"
                          onClick={() => applyPostingSlot(slot.hour, slot.minute)}
                          className={[
                            "flex w-full items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition",
                            isActive
                              ? `${accentBg} ${accentText} ${accentBorder}`
                              : isDark
                              ? "border-white/10 text-neutral-200 hover:bg-white/5"
                              : "border-black/10 text-neutral-700 hover:bg-black/[0.04]",
                          ].join(" ")}
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <p className={["mb-2 text-[13px] font-semibold", textPrimary].join(" ")}>
                    Select Time
                  </p>
                  <div className={["rounded-lg border px-3 py-2", accentSolid, accentBorder].join(" ")}>
                    <TimePicker
                      value={scheduledAt}
                      onChange={(date) => setScheduledAt(date)}
                      isDark={isDark}
                      min={timeMin}
                      className={
                        isDark
                          ? "border-transparent bg-transparent text-white hover:border-transparent"
                          : "border-transparent bg-transparent text-neutral-900 hover:border-transparent"
                      }
                    />
                  </div>
                  <p className={["mt-1.5 text-[11.5px]", textSecondary].join(" ")}>
                    {timezone}
                  </p>
                </div>

                <div className={["flex items-center justify-between border-t px-3 py-2.5", isDark ? "border-white/10" : "border-black/10"].join(" ")}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDateTimePanel(false);
                      setShowActionMenu(true);
                    }}
                    className={["flex items-center gap-1.5 text-[12.5px] font-semibold transition", textPrimary].join(" ")}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    More
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDateTimePanel(false)}
                    className={["flex items-center gap-1.5 text-[12.5px] font-semibold transition", textPrimary].join(" ")}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Dialogue : reprendre le brouillon ou l'ignorer ── */}
        {pendingDraft && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <div
              className={[
                "w-[360px] rounded-2xl border p-6 text-center shadow-2xl",
                isDark ? "border-white/10 bg-[#1c1c1e]" : "border-black/10 bg-white",
              ].join(" ")}
            >
              <h3 className={["text-[16px] font-bold", textPrimary].join(" ")}>
                Reprendre votre brouillon ?
              </h3>
              <p className={["mt-2 text-[13px]", textSecondary].join(" ")}>
                Vous aviez un post en cours. Voulez-vous reprendre où vous en étiez ou repartir de zéro ?
              </p>
              {pendingDraft.content && (
                <p
                  className={[
                    "mt-3 line-clamp-2 rounded-lg px-3 py-2 text-left text-[12.5px]",
                    isDark ? "bg-white/5 text-neutral-300" : "bg-neutral-100 text-neutral-600",
                  ].join(" ")}
                >
                  {pendingDraft.content}
                </p>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={ignoreDraft}
                  className={[
                    "flex-1 rounded-xl border px-4 py-2.5 text-[13.5px] font-semibold transition",
                    border,
                    textPrimary,
                    isDark ? "hover:bg-white/5" : "hover:bg-black/5",
                  ].join(" ")}
                >
                  Ignorer
                </button>
                <button
                  type="button"
                  onClick={resumeDraft}
                  className={[
                    "flex-1 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition",
                    isDark
                      ? "bg-white text-[#141416] hover:bg-neutral-200"
                      : "bg-neutral-900 text-white hover:bg-neutral-800",
                  ].join(" ")}
                >
                  Reprendre
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Éditeur de média ── */}
      <EditMediaModal
        isOpen={editingItem !== null}
        mediaItem={editingItem}
        isDark={isDark}
        onClose={() => setEditingItem(null)}
        onApply={handleApplyMediaEdit}
      />
    </div>
  );
}