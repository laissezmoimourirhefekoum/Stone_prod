import { useEffect } from "react";

type StoneBootProps = {
  onComplete: () => void;
};

const BOOT_DURATION = 5000;

function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img
        src="/images/icon_nav.png"
        alt="Stone logo"
        draggable={false}
        className="h-40 w-auto select-none object-contain sm:h-56 md:h-64"
      />
      <span
        className="mt-10 select-none text-center font-semibold uppercase leading-none text-white"
        style={{
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "clamp(64px, 12vw, 140px)",
          letterSpacing: "0.12em",
          paddingLeft: "0.12em", // compense l'espace ajouté après la dernière lettre
        }}
      >
        STONE
      </span>
    </div>
  );
}

export default function StoneBoot({ onComplete }: StoneBootProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, BOOT_DURATION);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#050505]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600&display=swap');

        @keyframes stone-fill {
          from { clip-path: inset(0 0 100% 0); }
          to   { clip-path: inset(0 0 0 0); }
        }

        .stone-fill-layer {
          animation: stone-fill ${BOOT_DURATION}ms cubic-bezier(0.45, 0, 0.25, 1) forwards;
        }
      `}</style>

      <div className="relative">
        {/* Fond : version terne */}
        <Brand className="opacity-[0.12]" />

        {/* Remplissage de haut en bas */}
        <Brand className="stone-fill-layer absolute inset-0" />
      </div>
    </div>
  );
}