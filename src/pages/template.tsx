import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import DashboardSidebar from "../components/DashboardSidebar";
import { useTheme } from "../hooks/useTheme";
import { navigate, useHashRoute } from "../hooks/useHashRoute";

/* ============================================================================
   Types
============================================================================ */

type TemplateKind = "captions" | "hashtags" | "replies";

type Template = {
  id: string;
  kind: TemplateKind;
  name: string;
  description: string;
  content: string;
  tags: string[];
  usage: number;
  updatedAt: string;
};

const KIND_LABELS: Record<TemplateKind, string> = {
  captions: "Captions",
  hashtags: "Hashtags",
  replies: "Replies",
};

const sampleData: Record<string, string> = {
  product: "Stone",
  benefit: "publie plus vite, avec plus de clarté",
  link: "stone.app",
  hashtag: "buildinpublic",
  name: "Ronan",
};

/* ============================================================================
   Mock data
============================================================================ */

const initialTemplates: Template[] = [
  {
    id: "t1",
    kind: "captions",
    name: "Lancement produit",
    description: "Annonce courte et énergique pour un nouveau produit.",
    content:
      "🚀 {{product}} est là ! {{benefit}}. Découvrez-le sur {{link}} #{{hashtag}}",
    tags: ["produit", "lancement"],
    usage: 12,
    updatedAt: "2025-02-10",
  },
  {
    id: "t2",
    kind: "captions",
    name: "Conseil rapide",
    description: "Format tips pour les réseaux.",
    content:
      "💡 Le tip du jour : {{benefit}}. Enregistre ce post pour plus tard !",
    tags: ["tips", "growth"],
    usage: 8,
    updatedAt: "2025-02-08",
  },
  {
    id: "t3",
    kind: "hashtags",
    name: "Pack growth FR",
    description:
      "Hashtags génériques pour toucher une audience francophone.",
    content: "#growth #marketing #startup #buildinpublic #indiehacker",
    tags: ["growth", "francophone"],
    usage: 24,
    updatedAt: "2025-02-11",
  },
  {
    id: "t4",
    kind: "hashtags",
    name: "Pack design",
    description: "Pour les posts design / UI.",
    content: "#design #ui #ux #figma #productdesign",
    tags: ["design", "ui"],
    usage: 5,
    updatedAt: "2025-02-05",
  },
  {
    id: "t5",
    kind: "replies",
    name: "Remerciement",
    description: "Réponse courte pour remercier un commentaire.",
    content: "Merci beaucoup {{name}} ! 🙏 Ça fait plaisir à lire.",
    tags: ["community", "merci"],
    usage: 17,
    updatedAt: "2025-02-09",
  },
  {
    id: "t6",
    kind: "replies",
    name: "Question ouverte",
    description: "Relance la discussion sous un post.",
    content:
      "Très bonne question ! Et toi {{name}}, tu utilises quoi aujourd'hui ?",
    tags: ["engagement", "question"],
    usage: 6,
    updatedAt: "2025-02-07",
  },
];

/* ============================================================================
   Icônes
============================================================================ */

function Svg({
  className = "h-4 w-4",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const PlusIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

const SearchIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Svg className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

const EditIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
);

const CopyIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Svg className={className}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);

const TrashIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Svg className={className}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
);

const XIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Svg className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

const SparkIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </Svg>
);

/* ============================================================================
   Hook : état collapsed de la sidebar
============================================================================ */

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ collapsed: boolean }>).detail;
      if (detail && typeof detail.collapsed === "boolean") {
        setCollapsed(detail.collapsed);
      }
    };

    window.addEventListener("sidebar-state-change", handler);
    return () => window.removeEventListener("sidebar-state-change", handler);
  }, []);

  return collapsed;
}

/* ============================================================================
   Page
============================================================================ */

export default function TemplatesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const route = useHashRoute();
  const sidebarCollapsed = useSidebarCollapsed();

  const activeKind: TemplateKind =
    route === "hashtags"
      ? "hashtags"
      : route === "replies"
        ? "replies"
        : "captions";

  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Template | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  /* --------------------------------------------------------------------------
     Theme tokens
  -------------------------------------------------------------------------- */

  const t = useMemo(
    () =>
      isDark
        ? {
            page: "bg-[#0a0a0b] text-[#f3f3ef]",
            title: "text-white",
            muted: "text-[#99a2a2]",
            card: "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20",
            cardTitle: "text-white",
            cardDesc: "text-[#99a2a2]",
            cardBody: "text-[#d7d7d2]",
            tag: "bg-white/10 text-[#d7d7d2]",
            tabList: "border border-white/10 bg-white/[0.04]",
            tabActive: "bg-white/15 text-white",
            tabIdle: "text-[#99a2a2] hover:text-white",
            input:
              "border-white/10 bg-white/[0.04] text-white placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.06]",
            buttonPrimary: "bg-white text-black hover:bg-white/90",
            buttonGhost:
              "border-white/10 text-[#d7d7d2] hover:bg-white/[0.06]",
            modal: "border-white/10 bg-[#111112]",
            divider: "border-white/10",
            iconBtn: "hover:bg-white/10 text-[#d7d7d2]",
            empty: "text-[#99a2a2]",
          }
        : {
            page: "bg-[#f7f7f5] text-[#151515]",
            title: "text-[#151515]",
            muted: "text-[#71706d]",
            card: "border-black/10 bg-white hover:bg-black/[0.02] hover:border-black/20",
            cardTitle: "text-[#151515]",
            cardDesc: "text-[#71706d]",
            cardBody: "text-[#3f3f3d]",
            tag: "bg-black/[0.05] text-[#3f3f3d]",
            tabList: "border border-black/10 bg-black/[0.03]",
            tabActive: "bg-white text-[#151515] shadow-sm",
            tabIdle: "text-[#71706d] hover:text-[#151515]",
            input:
              "border-black/10 bg-white text-[#151515] placeholder:text-black/40 focus:border-black/30 focus:bg-white",
            buttonPrimary: "bg-[#151515] text-white hover:bg-[#2a2a2a]",
            buttonGhost:
              "border-black/10 text-[#3f3f3d] hover:bg-black/[0.04]",
            modal: "border-black/10 bg-white",
            divider: "border-black/[0.07]",
            iconBtn: "hover:bg-black/[0.05] text-[#3f3f3d]",
            empty: "text-[#71706d]",
          },
    [isDark]
  );

  /* --------------------------------------------------------------------------
     Filtrage
  -------------------------------------------------------------------------- */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return templates.filter((template) => {
      if (template.kind !== activeKind) return false;
      if (!q) return true;

      return (
        template.name.toLowerCase().includes(q) ||
        template.description.toLowerCase().includes(q) ||
        template.content.toLowerCase().includes(q) ||
        template.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [templates, activeKind, query]);

  /* --------------------------------------------------------------------------
     Actions
  -------------------------------------------------------------------------- */

  const openNew = useCallback(() => {
    setIsNew(true);
    setTagsInput("");
    setDraft({
      id: "",
      kind: activeKind,
      name: "",
      description: "",
      content: "",
      tags: [],
      usage: 0,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setEditorOpen(true);
  }, [activeKind]);

  const openEdit = useCallback((template: Template) => {
    setIsNew(false);
    setTagsInput(template.tags.join(", "));
    setDraft({ ...template });
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setDraft(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!draft) return;

    const now = new Date().toISOString().slice(0, 10);
    const tags = tagsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (isNew) {
      setTemplates((prev) => [
        {
          ...draft,
          id: `t-${Date.now()}`,
          tags,
          usage: 0,
          updatedAt: now,
        },
        ...prev,
      ]);
    } else {
      setTemplates((prev) =>
        prev.map((item) =>
          item.id === draft.id ? { ...draft, tags, updatedAt: now } : item
        )
      );
    }

    closeEditor();
  }, [draft, tagsInput, isNew, closeEditor]);

  const handleDuplicate = useCallback((template: Template) => {
    setTemplates((prev) => [
      {
        ...template,
        id: `t-${Date.now()}`,
        name: `${template.name} (copie)`,
        usage: 0,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /* Ferme l'éditeur avec Escape */
  useEffect(() => {
    if (!editorOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEditor();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorOpen, closeEditor]);

  /* ==========================================================================
     Render
  ========================================================================== */

  return (
    <div className={["relative h-screen w-screen overflow-hidden", t.page].join(" ")}>
      {/* Sidebar flottante */}
      <DashboardSidebar />

      {/* Contenu principal — se décale selon l'état de la sidebar */}
      <main
        className={[
          "h-full overflow-y-auto",
          "transition-[padding] duration-[380ms]",
          "ease-[cubic-bezier(0.4,0,0.2,1)]",
          "motion-reduce:transition-none",
          sidebarCollapsed ? "pl-[96px]" : "pl-[272px]",
        ].join(" ")}
      >
        <div className="mx-auto max-w-[1200px] px-6 py-10 sm:px-10 sm:py-12">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1
                className={[
                  "text-[26px] font-semibold tracking-tight",
                  t.title,
                ].join(" ")}
              >
                Templates
              </h1>
              <p className={["mt-1 text-[13px]", t.muted].join(" ")}>
                Créez, réutilisez et adaptez vos captions, hashtags et réponses.
              </p>
            </div>

            <button
              type="button"
              onClick={openNew}
              className={[
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4",
                "text-[13px] font-semibold",
                "transition-[background-color,transform] duration-150",
                "active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/20",
                t.buttonPrimary,
              ].join(" ")}
            >
              <PlusIcon />
              Nouveau template
            </button>
          </div>

          {/* Tabs + search */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              className={["flex gap-1 rounded-xl p-1", t.tabList].join(" ")}
              role="tablist"
            >
              {(Object.keys(KIND_LABELS) as TemplateKind[]).map((kind) => {
                const active = kind === activeKind;
                return (
                  <button
                    key={kind}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => navigate(kind)}
                    className={[
                      "rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium",
                      "transition-colors duration-150",
                      active ? t.tabActive : t.tabIdle,
                    ].join(" ")}
                  >
                    {KIND_LABELS[kind]}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un template…"
                className={[
                  "h-10 w-full rounded-xl border pl-9 pr-3 text-[13px]",
                  "outline-none transition-colors duration-150",
                  t.input,
                ].join(" ")}
              />
            </div>
          </div>

          {/* Grid */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((template) => (
              <article
                key={template.id}
                className={[
                  "group flex flex-col rounded-2xl border p-4",
                  "transition-[background-color,border-color,transform] duration-150",
                  "hover:-translate-y-0.5",
                  t.card,
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2
                      className={[
                        "truncate text-[14px] font-semibold",
                        t.cardTitle,
                      ].join(" ")}
                    >
                      {template.name}
                    </h2>
                    <p
                      className={[
                        "mt-0.5 line-clamp-2 text-[12px]",
                        t.cardDesc,
                      ].join(" ")}
                    >
                      {template.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      aria-label="Éditer"
                      onClick={() => openEdit(template)}
                      className={[
                        "rounded-lg p-1.5 transition-colors",
                        t.iconBtn,
                      ].join(" ")}
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Dupliquer"
                      onClick={() => handleDuplicate(template)}
                      className={[
                        "rounded-lg p-1.5 transition-colors",
                        t.iconBtn,
                      ].join(" ")}
                    >
                      <CopyIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Supprimer"
                      onClick={() => handleDelete(template.id)}
                      className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p
                  className={[
                    "mt-3 line-clamp-3 whitespace-pre-wrap text-[12px]",
                    t.cardBody,
                  ].join(" ")}
                >
                  {template.content}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        t.tag,
                      ].join(" ")}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div
                  className={[
                    "mt-4 flex items-center justify-between border-t pt-3 text-[11px]",
                    t.divider,
                    t.muted,
                  ].join(" ")}
                >
                  <span>{template.usage} utilisations</span>
                  <span>{template.updatedAt}</span>
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div
              className={[
                "mt-16 flex flex-col items-center gap-3 text-center text-[13px]",
                t.empty,
              ].join(" ")}
            >
              <SparkIcon className="h-6 w-6 opacity-50" />
              <p>
                {query
                  ? `Aucun template trouvé pour « ${query} ».`
                  : "Aucun template dans cette catégorie."}
              </p>
              <button
                type="button"
                onClick={openNew}
                className={[
                  "mt-1 inline-flex h-9 items-center gap-2 rounded-xl px-3.5",
                  "text-[12.5px] font-semibold",
                  "transition-[background-color,transform] duration-150",
                  "active:scale-[0.98]",
                  t.buttonPrimary,
                ].join(" ")}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Créer un template
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Editor modal (panneau latéral) */}
      {editorOpen && draft && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
          onClick={closeEditor}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className={[
              "h-full w-full max-w-lg overflow-y-auto border-l p-6",
              "shadow-[-30px_0_60px_-20px_rgba(0,0,0,0.35)]",
              t.modal,
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <h2 className={["text-[16px] font-semibold", t.title].join(" ")}>
                {isNew ? "Nouveau template" : "Éditer le template"}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Fermer"
                className={[
                  "rounded-lg p-1.5 transition-colors",
                  t.iconBtn,
                ].join(" ")}
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <Field label="Nom">
                <input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  className={[
                    "h-10 rounded-xl border px-3 text-[13px] outline-none transition-colors",
                    t.input,
                  ].join(" ")}
                />
              </Field>

              <Field label="Description">
                <input
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                  className={[
                    "h-10 rounded-xl border px-3 text-[13px] outline-none transition-colors",
                    t.input,
                  ].join(" ")}
                />
              </Field>

              <Field label="Contenu">
                <textarea
                  value={draft.content}
                  onChange={(event) =>
                    setDraft({ ...draft, content: event.target.value })
                  }
                  rows={5}
                  className={[
                    "resize-none rounded-xl border px-3 py-2 text-[13px] outline-none transition-colors",
                    t.input,
                  ].join(" ")}
                />
              </Field>

              <Field label="Tags (séparés par des virgules)">
                <input
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="growth, tips, fr"
                  className={[
                    "h-10 rounded-xl border px-3 text-[13px] outline-none transition-colors",
                    t.input,
                  ].join(" ")}
                />
              </Field>

              {/* Aperçu */}
              <div
                className={[
                  "mt-2 rounded-xl border p-3.5",
                  t.divider,
                ].join(" ")}
              >
                <p
                  className={[
                    "text-[11px] font-semibold uppercase tracking-wide",
                    t.muted,
                  ].join(" ")}
                >
                  Aperçu
                </p>
                <p
                  className={[
                    "mt-2 whitespace-pre-wrap text-[13px]",
                    t.cardBody,
                  ].join(" ")}
                >
                  {draft.content
                    ? draft.content.replace(
                        /\{\{(\w+)\}\}/g,
                        (_, key) => sampleData[key] ?? `{{${key}}}`
                      )
                    : "…"}
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className={[
                  "h-10 rounded-xl border px-4 text-[13px] font-medium",
                  "transition-colors duration-150",
                  t.buttonGhost,
                ].join(" ")}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!draft.name.trim() || !draft.content.trim()}
                className={[
                  "h-10 rounded-xl px-4 text-[13px] font-semibold",
                  "transition-[background-color,transform] duration-150",
                  "active:scale-[0.98]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  t.buttonPrimary,
                ].join(" ")}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   Field
============================================================================ */

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium">{label}</span>
      {children}
    </label>
  );
}