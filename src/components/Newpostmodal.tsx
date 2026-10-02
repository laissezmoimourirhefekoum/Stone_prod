import { useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "../hooks/useHashRoute";
import {
  useConnectedChannels,
  type ConnectedChannel,
} from "../hooks/useConnectedChannels";

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */

export type NewPostPayload = {
  content: string;
  /** Clés (`channel.key`) des réseaux sélectionnés. */
  channelKeys: string[];
  tags: string[];
  media: File[];
  /** Valeur d'un <input type="datetime-local"> ou null = publier maintenant. */
  scheduledAt: string | null;
};

type NewPostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onSubmit?: (payload: NewPostPayload) => void | Promise<void>;
};

type PlatformId =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "facebook"
  | "x"
  | "linkedin"
  | "unknown";

/* ──────────────────────────────────────────────────────────────
   Plateformes : détection + icônes
   ────────────────────────────────────────────────────────────── */

/**
 * Déduit la plateforme d'un canal connecté. On regarde d'abord un champ
 * `platform` / `network` s'il existe, puis la clé du canal.
 */
function getPlatform(channel: ConnectedChannel): PlatformId {
  const c = channel as unknown as Record<string, unknown>;
  const raw = String(c.platform ?? c.network ?? c.provider ?? channel.key)
    .toLowerCase()
    .trim();

  if (raw.includes("tiktok")) return "tiktok";
  if (raw.includes("insta")) return "instagram";
  if (raw.includes("youtube") || raw === "yt") return "youtube";
  if (raw.includes("facebook") || raw === "fb") return "facebook";
  if (raw.includes("linkedin")) return "linkedin";
  if (raw === "x" || raw.includes("twitter")) return "x";
  return "unknown";
}

function PlatformIcon({
  platform,
  className = "h-4 w-4",
}: {
  platform: PlatformId;
  className?: string;
}) {
  const fillProps = {
    viewBox: "0 0 24 24",
    className,
    fill: "currentColor",
  } as const;

  switch (platform) {
    case "tiktok":
      return (
        <svg {...fillProps}>
          <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
        </svg>
      );
    case "instagram":
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...fillProps}>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...fillProps}>
          <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3z" />
        </svg>
      );
    case "x":
      return (
        <svg {...fillProps}>
          <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...fillProps}>
          <path d="M6.9 9H3.6v11h3.3V9zM5.3 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM20.4 13.4c0-3-1.6-4.6-3.9-4.6-1.3 0-2.2.7-2.7 1.4V9h-3.2v11h3.3v-6c0-1.5.7-2.4 1.9-2.4 1.1 0 1.7.8 1.7 2.4V20h3.3v-6.6z" />
        </svg>
      );
    default:
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
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        </svg>
      );
  }
}

/* ──────────────────────────────────────────────────────────────
   Petites icônes UI
   ────────────────────────────────────────────────────────────── */

function Svg({
  className = "h-4 w-4",
  strokeWidth = 1.8,
  children,
}: {
  className?: string;
  strokeWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const TagIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8z" />
    <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
  </Svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <Svg className={className} strokeWidth={2.2}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <Svg className={className} strokeWidth={2}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <Svg className={className} strokeWidth={2}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
  </Svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <rect x="4" y="5" width="16" height="15" rx="3" />
    <path d="M4 10h16M8 3v4M16 3v4" />
  </Svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <Svg className={className} strokeWidth={2.4}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Svg>
);

/* ──────────────────────────────────────────────────────────────
   Tags : bouton + menu déroulant
   ────────────────────────────────────────────────────────────── */

const DEFAULT_TAGS = ["Promo", "Annonce", "Coulisses", "Tutoriel", "Événement"];

function TagsDropdown({
  isDark,
  selected,
  onChange,
}: {
  isDark: boolean;
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Ferme le menu quand on clique en dehors.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const options = [...DEFAULT_TAGS, ...extra];

  const toggle = (tag: string) =>
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    );

  const addCustom = () => {
    const tag = custom.trim();
    if (!tag) return;
    if (!options.includes(tag)) setExtra((prev) => [...prev, tag]);
    if (!selected.includes(tag)) onChange([...selected, tag]);
    setCustom("");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "flex items-center gap-2 rounded-[14px] border px-4 py-2.5 text-[15px] font-semibold transition",
          isDark
            ? "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]"
            : "border-black/10 bg-neutral-50 text-neutral-900 hover:bg-neutral-100",
        ].join(" ")}
      >
        <TagIcon className="h-[18px] w-[18px] opacity-70" />
        Tags
        {selected.length > 0 && (
          <span
            className={[
              "rounded-full px-1.5 text-[11px] font-bold leading-[18px]",
              isDark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white",
            ].join(" ")}
          >
            {selected.length}
          </span>
        )}
        <ChevronDownIcon
          className={[
            "h-4 w-4 opacity-60 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={[
            "absolute left-0 top-full z-10 mt-2 w-60 rounded-2xl border p-2 shadow-2xl",
            isDark
              ? "border-white/10 bg-[#232426]"
              : "border-black/10 bg-white",
          ].join(" ")}
        >
          <ul className="max-h-48 overflow-y-auto">
            {options.map((tag) => {
              const active = selected.includes(tag);
              return (
                <li key={tag}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => toggle(tag)}
                    className={[
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13.5px] font-medium transition",
                      isDark
                        ? "text-neutral-200 hover:bg-white/[0.06]"
                        : "text-neutral-700 hover:bg-neutral-100",
                    ].join(" ")}
                  >
                    {tag}
                    {active && <CheckIcon className="h-4 w-4" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div
            className={[
              "mt-2 flex items-center gap-2 border-t pt-2",
              isDark ? "border-white/10" : "border-black/10",
            ].join(" ")}
          >
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Nouveau tag"
              className={[
                "min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-[13px] outline-none",
                isDark
                  ? "text-white placeholder:text-neutral-500"
                  : "text-neutral-900 placeholder:text-neutral-400",
              ].join(" ")}
            />
            <button
              type="button"
              onClick={addCustom}
              aria-label="Ajouter le tag"
              className={[
                "flex h-7 w-7 items-center justify-center rounded-lg transition",
                isDark
                  ? "text-neutral-300 hover:bg-white/10"
                  : "text-neutral-600 hover:bg-neutral-100",
              ].join(" ")}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Avatar de canal (carré arrondi + badge de plateforme)
   ────────────────────────────────────────────────────────────── */

function ChannelTile({
  channel,
  isDark,
  selected,
  onToggle,
}: {
  channel: ConnectedChannel;
  isDark: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [channel.avatarUrl]);

  const platform = getPlatform(channel);
  const label = channel.handle || channel.name;
  const initial = label.replace(/^@/, "").charAt(0).toUpperCase() || "?";
  const showImage = Boolean(channel.avatarUrl) && !failed;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-pressed={selected}
      aria-label={`${selected ? "Retirer" : "Ajouter"} ${label}`}
      className={[
        "relative h-[70px] w-[70px] shrink-0 rounded-[18px] transition",
        selected ? "opacity-100" : "opacity-40 hover:opacity-70",
      ].join(" ")}
    >
      {showImage ? (
        <img
          src={channel.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-[18px] object-cover"
        />
      ) : (
        <span
          className={[
            "flex h-full w-full items-center justify-center rounded-[18px] text-[22px] font-semibold",
            isDark ? "bg-[#2a2a2d] text-white" : "bg-neutral-900 text-white",
          ].join(" ")}
        >
          {initial}
        </span>
      )}

      <span
        className={[
          "absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-black ring-[3px]",
          isDark ? "ring-[#1c1d1f]" : "ring-white",
        ].join(" ")}
      >
        <PlatformIcon platform={platform} className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
   Modal
   ────────────────────────────────────────────────────────────── */

export default function NewPostModal({
  isOpen,
  onClose,
  isDark,
  onSubmit,
}: NewPostModalProps) {
  const channels = useConnectedChannels();

  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [media, setMedia] = useState<File[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // À l'ouverture : on repart d'un brouillon vide, tous les canaux cochés.
  useEffect(() => {
    if (!isOpen) return;
    setContent("");
    setTags([]);
    setMedia([]);
    setScheduledAt("");
    setSubmitting(false);
    setSelectedKeys(channels.map((c) => c.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Si un canal est connecté pendant que la modale est ouverte, on le coche.
  const knownKeys = useRef<string[]>([]);
  useEffect(() => {
    const keys = channels.map((c) => c.key);
    const added = keys.filter((k) => !knownKeys.current.includes(k));
    if (isOpen && added.length > 0 && knownKeys.current.length > 0) {
      setSelectedKeys((prev) => [...prev, ...added]);
    }
    knownKeys.current = keys;
  }, [channels, isOpen]);

  // Échap pour fermer + blocage du scroll de la page.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, onClose]);

  const selectedChannels = useMemo(
    () => channels.filter((c) => selectedKeys.includes(c.key)),
    [channels, selectedKeys]
  );

  const editorPlatform: PlatformId | null = selectedChannels[0]
    ? getPlatform(selectedChannels[0])
    : null;

  const canSubmit =
    !submitting &&
    selectedChannels.length > 0 &&
    (content.trim().length > 0 || media.length > 0);

  const toggleChannel = (key: string) =>
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setMedia((prev) => [...prev, ...Array.from(files)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConnect = () => {
    onClose();
    navigate("channels");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit?.({
        content: content.trim(),
        channelKeys: selectedKeys,
        tags,
        media,
        scheduledAt: scheduledAt || null,
      });
      onClose();
    } catch (error) {
      console.error("Error creating post:", error);
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const divider = isDark ? "border-white/[0.08]" : "border-black/[0.08]";
  const muted = isDark ? "text-neutral-500" : "text-neutral-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Créer une publication"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panneau */}
      <div
        className={[
          "relative flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[28px] border shadow-[0_30px_80px_rgba(0,0,0,0.5)]",
          isDark
            ? "border-white/10 bg-[#1c1d1f] text-white"
            : "border-black/10 bg-white text-neutral-900",
        ].join(" ")}
      >
        {/* En-tête : titre + tags */}
        <header
          className={["flex items-center gap-4 border-b px-7 py-5", divider].join(
            " "
          )}
        >
          <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em]">
            Create Post
          </h2>

          <TagsDropdown isDark={isDark} selected={tags} onChange={setTags} />

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className={[
              "ml-auto flex h-9 w-9 items-center justify-center rounded-full transition",
              isDark
                ? "text-neutral-400 hover:bg-white/10 hover:text-white"
                : "text-neutral-500 hover:bg-black/5 hover:text-neutral-900",
            ].join(" ")}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {/* Canaux connectés + bouton « + » */}
          <div className="flex flex-wrap items-center gap-4">
            {channels.map((channel) => (
              <ChannelTile
                key={channel.key}
                channel={channel}
                isDark={isDark}
                selected={selectedKeys.includes(channel.key)}
                onToggle={() => toggleChannel(channel.key)}
              />
            ))}

            <button
              type="button"
              onClick={handleConnect}
              aria-label="Connecter un réseau"
              title="Connecter un réseau"
              className={[
                "flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[18px] border transition",
                isDark
                  ? "border-white/10 bg-white/[0.04] text-neutral-400 hover:bg-white/[0.09] hover:text-white"
                  : "border-black/10 bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900",
              ].join(" ")}
            >
              <PlusIcon className="h-6 w-6" />
            </button>
          </div>

          {channels.length === 0 && (
            <p className={["mt-3 text-[13px] font-medium", muted].join(" ")}>
              Connectez un réseau pour choisir où publier.
            </p>
          )}

          {/* Éditeur */}
          <div
            className={[
              "mt-6 rounded-[22px] p-5",
              isDark ? "bg-white/[0.05]" : "bg-neutral-100",
            ].join(" ")}
          >
            <div className="flex items-start gap-4">
              <span
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]",
                  editorPlatform
                    ? "bg-white text-black"
                    : isDark
                    ? "bg-white/10 text-neutral-400"
                    : "bg-white text-neutral-400",
                ].join(" ")}
              >
                <PlatformIcon
                  platform={editorPlatform ?? "unknown"}
                  className="h-6 w-6"
                />
              </span>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Start writing or get inspired..."
                className={[
                  "min-h-[140px] w-full flex-1 resize-none bg-transparent pt-2.5 text-[16px] leading-relaxed outline-none",
                  isDark
                    ? "text-white placeholder:text-neutral-500"
                    : "text-neutral-900 placeholder:text-neutral-400",
                ].join(" ")}
              />
            </div>

            {media.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2 pl-[60px]">
                {media.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className={[
                      "flex max-w-[200px] items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-[12px] font-medium",
                      isDark
                        ? "bg-white/10 text-neutral-200"
                        : "bg-white text-neutral-700",
                    ].join(" ")}
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setMedia((prev) => prev.filter((_, i) => i !== index))
                      }
                      aria-label={`Retirer ${file.name}`}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-black/10"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex items-center justify-between pl-[60px]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={[
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition",
                  isDark
                    ? "text-neutral-400 hover:bg-white/10 hover:text-white"
                    : "text-neutral-500 hover:bg-white hover:text-neutral-900",
                ].join(" ")}
              >
                <ImageIcon className="h-[18px] w-[18px]" />
                Ajouter un média
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => handleFiles(e.target.files)}
              />

              <span className={["text-[12px] tabular-nums", muted].join(" ")}>
                {content.length}
              </span>
            </div>
          </div>
        </div>

        {/* Pied : planification + publication */}
        <footer
          className={[
            "flex flex-wrap items-center justify-between gap-3 border-t px-7 py-4",
            divider,
          ].join(" ")}
        >
          <label
            className={[
              "flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium",
              isDark
                ? "border-white/10 text-neutral-300"
                : "border-black/10 text-neutral-600",
            ].join(" ")}
          >
            <CalendarIcon className="h-4 w-4" />
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={[
                "bg-transparent text-[13px] outline-none",
                isDark ? "[color-scheme:dark]" : "",
              ].join(" ")}
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={[
                "rounded-full px-4 py-2.5 text-[13.5px] font-semibold transition",
                isDark
                  ? "text-neutral-300 hover:bg-white/10"
                  : "text-neutral-600 hover:bg-neutral-100",
              ].join(" ")}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={[
                "rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                isDark
                  ? "bg-white text-neutral-900 enabled:hover:bg-neutral-200"
                  : "bg-neutral-900 text-white enabled:hover:bg-neutral-800",
              ].join(" ")}
            >
              {submitting
                ? "Envoi…"
                : scheduledAt
                ? "Planifier"
                : "Publier"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}