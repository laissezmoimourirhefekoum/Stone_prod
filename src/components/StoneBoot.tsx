import { useEffect, useState } from "react";

type StoneBootProps = {
  onComplete: () => void;
};

export default function StoneBoot({
  onComplete,
}: StoneBootProps) {
  const [text, setText] = useState("");

  useEffect(() => {
    const word = "stone";

    // Animation d'écriture
    const typingInterval = window.setInterval(() => {
      setText((current) => {
        if (current.length >= word.length) {
          window.clearInterval(typingInterval);
          return current;
        }

        return word.slice(
          0,
          current.length + 1
        );
      });
    }, 120);

    // Le boot dure exactement 5 secondes
    const completeTimer = window.setTimeout(() => {
      onComplete();
    }, 5000);

    return () => {
      window.clearInterval(typingInterval);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#050505]">
      <div className="relative flex items-center">
        <span
          className="
            font-display
            text-[48px]
            font-semibold
            tracking-[-0.06em]
            text-white
            sm:text-[64px]
          "
        >
          {text}
        </span>

        {/* Curseur */}
        <span
          className="
            ml-[4px]
            h-[48px]
            w-[2px]
            bg-white
            animate-pulse
            sm:h-[64px]
          "
        />
      </div>
    </div>
  );
}