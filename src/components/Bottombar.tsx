import { useEffect, useRef, useState, type ReactNode } from "react";

export type BottomBarTab = "files" | "add";

type Item = {
  id: BottomBarTab;
  label: string;
  icon: ReactNode;
  primary?: boolean;
};

const svgProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const FILES_ITEM: Item = {
  id: "files",
  label: "Dossiers",
  icon: (
    <svg {...svgProps}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  ),
};

const ADD_ITEM: Item = {
  id: "add",
  label: "Nouvelle publication",
  primary: true,
  icon: (
    <svg {...svgProps} width={24} height={24} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[17px] w-[17px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** Animation jouée par la loupe quand la recherche se replie. */
const SEARCH_POP_KEYFRAMES = `
@keyframes bottomBarSearchPop {
  0%   { transform: scale(1)    rotate(0deg); }
  35%  { transform: scale(0.78) rotate(-18deg); }
  70%  { transform: scale(1.12) rotate(6deg); }
  100% { transform: scale(1)    rotate(0deg); }
}
`;

type BottomBarProps = {
  isDark?: boolean;
  onChange?: (id: BottomBarTab) => void;
  /** Onglet actuellement actif (contrôlé par le parent). */
  active?: BottomBarTab | null;
  /** Valeur du champ de recherche. */
  query: string;
  onQueryChange: (value: string) => void;
  /** Décalage gauche (px) pour centrer la barre sur la zone de contenu. */
  offsetLeft?: number;
};

export default function BottomBar({
  isDark = false,
  onChange,
  active = null,
  query,
  onQueryChange,
  offsetLeft = 0,
}: BottomBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchPopping, setIsSearchPopping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Au dépliage, le champ prend le focus directement.
  useEffect(() => {
    if (isSearchOpen) inputRef.current?.focus();
  }, [isSearchOpen]);

  // On coupe l'animation une fois qu'elle est terminée.
  useEffect(() => {
    if (!isSearchPopping) return;
    const timer = window.setTimeout(() => setIsSearchPopping(false), 460);
    return () => window.clearTimeout(timer);
  }, [isSearchPopping]);

  const openSearch = () => setIsSearchOpen(true);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setIsSearchPopping(true); // déclenche le "pop" de la loupe
  };

  const renderButton = ({ id, label, icon, primary }: Item) => {
    const isActive = active === id;

    const tone = primary
      ? isDark
        ? "bg-white text-neutral-900"
        : "bg-black text-white"
      : isDark
        ? isActive
          ? "border border-white/60 bg-[#141416] text-white"
          : "border border-white/10 bg-[#141416] text-neutral-300"
        : isActive
          ? "border border-black bg-white text-black"
          : "border border-black/10 bg-white text-black/80";

    return (
      <li key={id}>
        <button
          type="button"
          aria-label={label}
          title={label}
          aria-current={isActive ? "true" : undefined}
          onClick={() => onChange?.(id)}
          className={[
            "flex h-12 w-12 items-center justify-center rounded-full transition duration-150 active:scale-90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2",
            tone,
          ].join(" ")}
        >
          {icon}
        </button>
      </li>
    );
  };

  return (
    <nav
      aria-label="Actions rapides"
      className="pointer-events-none fixed bottom-0 right-0 z-30 flex justify-center px-4"
      style={{
        left: offsetLeft,
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      }}
    >
      <style>{SEARCH_POP_KEYFRAMES}</style>

      <ul
        className={[
          "pointer-events-auto flex items-center gap-2 rounded-full p-2",
          isDark
            ? "border border-white/10 bg-[#1c1c1e] shadow-[0_16px_44px_rgba(0,0,0,0.5)]"
            : "bg-[#faf9f6] shadow-[0_16px_44px_rgba(0,0,0,0.10)]",
        ].join(" ")}
      >
        {renderButton(FILES_ITEM)}

        <li>
          {/* La pilule s'élargit / se rétracte : largeur animée + overflow caché */}
          <div
            className={[
              "flex h-12 items-center overflow-hidden rounded-full border",
              "transition-[width,padding] duration-300 ease-out motion-reduce:transition-none",
              isDark
                ? "border-white/10 bg-[#141416] text-neutral-300"
                : "border-black/10 bg-white text-black/80",
              isSearchOpen ? "w-[190px] pr-4 sm:w-[280px]" : "w-12",
            ].join(" ")}
          >
            <button
              type="button"
              aria-label="Rechercher"
              aria-expanded={isSearchOpen}
              title="Rechercher"
              // Garde le focus dans le champ quand on clique sur la loupe ouverte.
              onMouseDown={(event) => {
                if (isSearchOpen) event.preventDefault();
              }}
              onClick={() => {
                if (isSearchOpen) inputRef.current?.focus();
                else openSearch();
              }}
              className={[
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2",
                !isSearchOpen && "transition duration-150 active:scale-90",
              ].join(" ")}
            >
              <span
                className="flex items-center justify-center will-change-transform"
                style={
                  isSearchPopping
                    ? {
                        animation:
                          "bottomBarSearchPop 460ms cubic-bezier(0.34, 1.4, 0.64, 1)",
                      }
                    : undefined
                }
              >
                <SearchIcon />
              </span>
            </button>

            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onBlur={() => {
                // On replie le champ seulement s'il est vide.
                if (query.trim() === "") closeSearch();
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  onQueryChange("");
                  closeSearch();
                  inputRef.current?.blur();
                }
              }}
              placeholder="Search everything"
              aria-label="Search everything"
              aria-hidden={!isSearchOpen}
              tabIndex={isSearchOpen ? 0 : -1}
              className={[
                "min-w-0 flex-1 bg-transparent text-[13px] outline-none",
                "transition-opacity duration-200 motion-reduce:transition-none",
                "placeholder:text-inherit placeholder:opacity-60",
                isDark ? "text-white" : "text-neutral-800",
                isSearchOpen
                  ? "opacity-100"
                  : "pointer-events-none opacity-0",
              ].join(" ")}
            />
          </div>
        </li>

        {renderButton(ADD_ITEM)}
      </ul>
    </nav>
  );
}