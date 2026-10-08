import { useEffect } from "react";

type StoneBootProps = {
  onComplete: () => void;
};

const BOOT_DURATION = 5000;

function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-10 ${className}`}>
      <img
        src="/images/icon_nav.png"
        alt="Stone logo"
        draggable={false}
        className="h-28 w-auto select-none object-contain sm:h-36"
      />
      <span
        className="select-none text-[56px] leading-none text-white sm:text-[80px]"
        style={{ fontFamily: "'Patrick Hand', 'Caveat', cursive" }}
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
        @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');

        @keyframes stone-fill {
          from { clip-path: inset(0 0 100% 0); }
          to   { clip-path: inset(0 0 0 0); }
        }
      `}</style>

      <div className="relative">
        {/* Couche de fond : version "vide" */}
        <Brand className="opacity-[0.12]" />

        {/* Couche de remplissage : se révèle de haut en bas */}
        <Brand
          className="absolute inset-0"
        />
        <style>{`
          .stone-fill-layer {
            animation: stone-fill ${BOOT_DURATION}ms cubic-bezier(0.45, 0, 0.25, 1) forwards;
          }
        `}</style>
      </div>
    </div>
  );
}