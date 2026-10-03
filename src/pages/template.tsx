import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import DashboardSidebar from "../components/DashboardSidebar";
import { useTheme } from "../hooks/useTheme";

/* ============================================================================
   Types
============================================================================ */

type Template = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  usage: number;
  updatedAt: string;
};

/* ============================================================================
   Mock data
============================================================================ */

const FEATURED: Template[] = [
  {
    id: "f1",
    emoji: "📊",
    name: "Report on a one-week experiment you ran",
    description:
      "Share a one-week experiment you actually ran, what was hard about it, and what shifted by the end.",
    content: "",
    tags: ["experiment"],
    usage: 0,
    updatedAt: "",
  },
  {
    id: "f2",
    emoji: "🟥",
    name: "Describe the rule you broke and what happened",
    description:
      "Share a “best practice” or common belief that no longer served you and what you now do instead.",
    content: "",
    tags: ["story"],
    usage: 0,
    updatedAt: "",
  },
  {
    id: "f3",
    emoji: "💸",
    name: "Walk through how your pricing changed",
    description:
      "How you used to set prices, what that cost you, and how you price now.",
    content: "",
    tags: ["pricing"],
    usage: 0,
    updatedAt: "",
  },
];

const TIPS: Template[] = [
  {
    id: "t1",
    emoji: "💬",
    name: "The fuller answer to a question you get a lot",
    description:
      "What's the question people ask you over and over? This prompt is space for the answer you'd give if you had the time.",
    content: "",
    tags: ["audience"],
    usage: 0,
    updatedAt: "",
  },
  {
    id: "t2",
    emoji: "🕯️",
    name: "The thing that nearly made you stop",
    description:
      "Many of us have had a stretch when carrying on with the work felt like too much. If you've been through one, describe it.",
    content: "",
    tags: ["story"],
    usage: 0,
    updatedAt: "",
  },
  {
    id: "t3",
    emoji: "🔍",
    name: "Feedback that turned out to be right",
    description:
      "Has a piece of feedback ever stung at first and stuck with you anyway? If it took you a while to come around, share it.",
    content: "",
    tags: ["feedback"],
    usage: 0,
    updatedAt: "",
  },
  {
    id: "t4",
    emoji: "✏️",
    name: "A mistake that taught you something specific",
    description:
      "Think of a mistake you've made that taught you something you still use. Small ones work just as well as big ones.",
    content: "",
    tags: ["lesson"],
    usage: 0,
    updatedAt: "",
  },
  {
    id: "t5",
    emoji: "📐",
    name: "Something you're still working on",
    description:
      "There might be a part of your craft that has never come naturally, however long you've been at it. Name it.",
    content: "",
    tags: ["craft"],
    usage: 0,
    updatedAt: "",
  },
  {
    id: "t6",
    emoji: "🧭",
    name: "The advice you'd give your past self",
    description:
      "If you could send one short message back to yourself a year ago, what would it say?",
    content: "",
    tags: ["advice"],
    usage: 0,
    updatedAt: "",
  },
];

const CASE_STUDIES: Template[] = [
  {
    id: "c1",
    emoji: "🚀",
    name: "From 0 to 10k users in 90 days",
    description:
      "Break down the tactics, channels, and turning points that grew your product fastest.",
    content: "",
    tags: ["growth"],
    usage: 0,
    updatedAt: "",
  },
  {
    id: "c2",
    emoji: "🔁",
    name: "A pivot that saved the product",
    description:
      "What signal told you to change direction, and what did the pivot actually look like?",
    content: "",
    tags: ["pivot"],
    usage: 0,
    updatedAt: "",
  },
  {
    id: "c3",
    emoji: "📉",
    name: "The launch that flopped",
    description:
      "Walk through what you expected, what actually happened, and what you'd do differently.",
    content: "",
    tags: ["launch"],
    usage: 0,
    updatedAt: "",
  },
  {
    id: "c4",
    emoji: "🤝",
    name: "The partnership that unlocked growth",
    description:
      "Who did you partner with, how did you find them, and what did both sides actually get out of it?",
    content: "",
    tags: ["partnership"],
    usage: 0,
    updatedAt: "",
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

const ChevronRightIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Svg className={className}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

const PlusIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

const XIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Svg className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
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
   Carte de template
============================================================================ */

function TemplateCard({
  template,
  onOpen,
  surface,
  titleClass,
  descClass,
  fixedWidth = false,
}: {
  template: Template;
  onOpen: (t: Template) => void;
  surface: string;
  titleClass: string;
  descClass: string;
  fixedWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(template)}
      className={[
        "group flex h-full flex-col items-start rounded-2xl border p-5 text-left",
        "transition-[background-color,border-color,transform] duration-150",
        "hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/20",
        fixedWidth ? "w-[280px] shrink-0" : "",
        surface,
      ].join(" ")}
    >
      <span
        className="text-[20px] leading-none"
        role="img"
        aria-hidden="true"
      >
        {template.emoji}
      </span>

      <h3
        className={[
          "mt-4 text-[15px] font-semibold leading-snug",
          titleClass,
        ].join(" ")}
      >
        {template.name}
      </h3>

      <p
        className={[
          "mt-2 line-clamp-3 text-[12.5px] leading-relaxed",
          descClass,
        ].join(" ")}
      >
        {template.description}
      </p>
    </button>
  );
}

/* ============================================================================
   Section horizontale (Tip / Case Study)
============================================================================ */

function HorizontalSection({
  title,
  items,
  onOpen,
  surface,
  titleClass,
  descClass,
  sectionTitleClass,
  seeAllClass,
}: {
  title: string;
  items: Template[];
  onOpen: (t: Template) => void;
  surface: string;
  titleClass: string;
  descClass: string;
  sectionTitleClass: string;
  seeAllClass: string;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2
          className={[
            "text-[18px] font-semibold tracking-tight",
            sectionTitleClass,
          ].join(" ")}
        >
          {title}
        </h2>

        <button
          type="button"
          className={[
            "flex items-center gap-1 text-[13px] font-medium",
            "transition-colors duration-150",
            seeAllClass,
          ].join(" ")}
        >
          See All
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        className={[
          "mt-4 flex gap-4 overflow-x-auto pb-2",
          "[scrollbar-width:none] [-ms-overflow-style:none]",
          "[&::-webkit-scrollbar]:hidden",
        ].join(" ")}
      >
        {items.map((item) => (
          <TemplateCard
            key={item.id}
            template={item}
            onOpen={onOpen}
            surface={surface}
            titleClass={titleClass}
            descClass={descClass}
            fixedWidth
          />
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   Page
============================================================================ */

export default function TemplatesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const sidebarCollapsed = useSidebarCollapsed();

  /* ----- Éditeur ----- */
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Template | null>(null);

  const openEditor = useCallback((template: Template) => {
    setDraft({ ...template });
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setDraft(null);
  }, []);

  useEffect(() => {
    if (!editorOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEditor();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorOpen, closeEditor]);

  /* ----- Thème ----- */
  const t = useMemo(
    () =>
      isDark
        ? {
            page: "bg-[#0a0a0b] text-[#f3f3ef]",
            title: "text-white",
            muted: "text-[#99a2a2]",

            // Section "Featured" : fond sombre + halo vert
            featuredBg:
              "border border-white/10 bg-[#111112] " +
              "bg-[radial-gradient(120%_100%_at_0%_0%,rgba(16,185,129,0.12),rgba(0,0,0,0)_55%)]",

            featuredLabel: "text-emerald-400/80",
            featuredTitle: "text-white",
            featuredDesc: "text-white/55",

            // Cartes dans le Featured (un peu plus claires que la section)
            cardFeatured:
              "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20",

            // Cartes des sections horizontales (sur fond de page)
            cardFlat:
              "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20",

            cardTitle: "text-white",
            cardDesc: "text-[#99a2a2]",

            sectionTitle: "text-white",
            seeAll: "text-[#99a2a2] hover:text-white",

            input:
              "border-white/10 bg-white/[0.04] text-white placeholder:text-white/40 focus:border-white/30",
            buttonPrimary: "bg-white text-black hover:bg-white/90",
            buttonGhost: "border-white/10 text-[#d7d7d2] hover:bg-white/[0.06]",
            modal: "border-white/10 bg-[#111112]",
            divider: "border-white/10",
            iconBtn: "hover:bg-white/10 text-[#d7d7d2]",
          }
        : {
            page: "bg-[#f7f7f5] text-[#151515]",
            title: "text-[#151515]",
            muted: "text-[#71706d]",

            featuredBg:
              "border border-black/[0.06] bg-[#eef3ec] " +
              "bg-[radial-gradient(120%_100%_at_0%_0%,rgba(16,185,129,0.10),rgba(255,255,255,0)_55%)]",

            featuredLabel: "text-emerald-600/90",
            featuredTitle: "text-[#151515]",
            featuredDesc: "text-[#52514e]",

            cardFeatured:
              "border-black/[0.06] bg-white hover:bg-white hover:border-black/20 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",

            cardFlat:
              "border-black/10 bg-white hover:bg-black/[0.02] hover:border-black/20",

            cardTitle: "text-[#151515]",
            cardDesc: "text-[#71706d]",

            sectionTitle: "text-[#151515]",
            seeAll: "text-[#71706d] hover:text-[#151515]",

            input:
              "border-black/10 bg-white text-[#151515] placeholder:text-black/40 focus:border-black/30",
            buttonPrimary: "bg-[#151515] text-white hover:bg-[#2a2a2a]",
            buttonGhost: "border-black/10 text-[#3f3f3d] hover:bg-black/[0.04]",
            modal: "border-black/10 bg-white",
            divider: "border-black/[0.07]",
            iconBtn: "hover:bg-black/[0.05] text-[#3f3f3d]",
          },
    [isDark]
  );

  /* ==========================================================================
     Render
  ========================================================================== */

  return (
    <div
      className={["relative h-screen w-screen overflow-hidden", t.page].join(" ")}
    >
      <DashboardSidebar />

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
          {/* ---------- Featured templates ---------- */}
          <section
            className={[
              "relative overflow-hidden rounded-3xl p-6 sm:p-8",
              t.featuredBg,
            ].join(" ")}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
              {/* Colonne gauche */}
              <div className="flex flex-col justify-center">
                <span
                  className={[
                    "text-[11px] font-semibold uppercase tracking-[0.08em]",
                    t.featuredLabel,
                  ].join(" ")}
                >
                  Featured templates
                </span>
                <h2
                  className={[
                    "mt-2 font-display text-[30px] font-semibold tracking-[-0.02em] sm:text-[34px]",
                    t.featuredTitle,
                  ].join(" ")}
                >
                  Our top picks
                </h2>
                <p
                  className={[
                    "mt-2 max-w-[220px] text-[13px] leading-relaxed",
                    t.featuredDesc,
                  ].join(" ")}
                >
                  Helpful starting points to plan your next post.
                </p>
              </div>

              {/* Colonne droite : 3 cartes */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {FEATURED.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onOpen={openEditor}
                    surface={t.cardFeatured}
                    titleClass={t.cardTitle}
                    descClass={t.cardDesc}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* ---------- Tip ---------- */}
          <HorizontalSection
            title="Tip"
            items={TIPS}
            onOpen={openEditor}
            surface={t.cardFlat}
            titleClass={t.cardTitle}
            descClass={t.cardDesc}
            sectionTitleClass={t.sectionTitle}
            seeAllClass={t.seeAll}
          />

          {/* ---------- Case Study ---------- */}
          <HorizontalSection
            title="Case Study"
            items={CASE_STUDIES}
            onOpen={openEditor}
            surface={t.cardFlat}
            titleClass={t.cardTitle}
            descClass={t.cardDesc}
            sectionTitleClass={t.sectionTitle}
            seeAllClass={t.seeAll}
          />
        </div>
      </main>

      {/* ---------- Éditeur (panneau latéral) ---------- */}
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
              <div className="flex items-center gap-3">
                <span className="text-[22px] leading-none" aria-hidden="true">
                  {draft.emoji}
                </span>
                <h2
                  className={["text-[16px] font-semibold", t.title].join(" ")}
                >
                  Utiliser ce template
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                aria-label="Fermer"
                className={["rounded-lg p-1.5 transition-colors", t.iconBtn].join(
                  " "
                )}
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <Field label="Titre">
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
                  rows={8}
                  placeholder="Écrivez votre post ici…"
                  className={[
                    "resize-none rounded-xl border px-3 py-2 text-[13px] outline-none transition-colors",
                    t.input,
                  ].join(" ")}
                />
              </Field>
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
                onClick={closeEditor}
                className={[
                  "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold",
                  "transition-[background-color,transform] duration-150",
                  "active:scale-[0.98]",
                  t.buttonPrimary,
                ].join(" ")}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Utiliser
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