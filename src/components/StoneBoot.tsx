// src/components/StoneBoot.tsx

import { useEffect, useState } from "react";

type StoneBootProps = {
  onReady?: () => void;
};

export default function StoneBoot({ onReady }: StoneBootProps) {
  const [visibleText, setVisibleText] = useState("");
  const text = "stone";

  useEffect(() => {
    let index = 0;

    const interval = window.setInterval(() => {
      index++;

      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(interval);

        window.setTimeout(() => {
          onReady?.();
        }, 350);
      }
    }, 90);

    return () => window.clearInterval(interval);
  }, [onReady]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#050505]">
      <div className="flex items-center">
        <span
          className="
            font-display
            text-[42px]
            font-semibold
            tracking-[-0.05em]
            text-white
            sm:text-[52px]
          "
        >
          {visibleText}
        </span>

        <span
          className="
            ml-[2px]
            h-[42px]
            w-[2px]
            animate-pulse
            bg-white
            sm:h-[52px]
          "
        />
      </div>
    </div>
  );
}