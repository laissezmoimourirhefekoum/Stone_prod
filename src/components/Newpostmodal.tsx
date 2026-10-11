// src/components/NewPostModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactElement,
} from "react";
import { EmojiPicker as FrimousseEmojiPicker } from "frimousse";
// … (reste des imports inchangé)

type NetworkIconComponent = (props: { className?: string }) => ReactElement;

// EmojiPickerPanel — typage explicite des composants internes
function EmojiPickerPanel({
  isDark,
  onPick,
}: {
  isDark: boolean;
  onPick: (emoji: string) => void;
}) {
  const components = useMemo(
    () => ({
      CategoryHeader: ({
        category,
        ...props
      }: { category: { label: string } } & HTMLAttributes<HTMLDivElement>) => (
        <div
          className={[
            "px-3 pb-1.5 pt-3 text-[11.5px] font-semibold",
            isDark ? "bg-[#1c1c1e] text-neutral-400" : "bg-white text-neutral-500",
          ].join(" ")}
          {...props}
        >
          {category.label}
        </div>
      ),
      Row: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
        <div className="scroll-my-1.5 px-1.5" {...props}>
          {children}
        </div>
      ),
      Emoji: ({
        emoji,
        ...props
      }: { emoji: { emoji: string } } & ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button
          {...props}
          style={{ ...props.style, fontFamily: EMOJI_FONT }}
          className={[
            "flex size-9 items-center justify-center rounded-lg text-[22px] grayscale",
            isDark
              ? "text-white data-[active]:bg-white/15"
              : "text-neutral-900 data-[active]:bg-black/[0.07]",
          ].join(" ")}
        >
          {emoji.emoji}
        </button>
      ),
    }),
    [isDark]
  );

  return (
    <div
      role="dialog"
      aria-label="Choisir un emoji"
      className={[
        "absolute bottom-full left-0 z-50 mb-2 overflow-hidden rounded-xl border shadow-2xl",
        isDark ? "border-white/10 bg-[#1c1c1e]" : "border-black/10 bg-white",
      ].join(" ")}
    >
      <FrimousseEmojiPicker.Root
        locale="fr"
        columns={8}
        onEmojiSelect={({ emoji }: { emoji: string }) => onPick(emoji)}
        className="isolate flex h-[340px] w-[300px] flex-col"
      >
        {/* … reste inchangé */}
      </FrimousseEmojiPicker.Root>
    </div>
  );
}