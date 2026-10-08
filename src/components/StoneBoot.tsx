import { useEffect, useRef, useState, useCallback } from "react";

type StoneBootProps = {
  onComplete: () => void;
};

const FILL_DURATION = 8000; // durée du remplissage (modifie ici pour ajuster la vitesse)
const HOLD_AFTER_FILL = 500; // pause une fois le logo plein
const FADE_OUT = 600; // fondu final
const WAVE_AMPLITUDE = 3; // hauteur de la vague (en % de la hauteur)

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img
        src="/images/icon_nav.png"
        alt=""
        draggable={false}
        className="h-40 w-auto select-none object-contain sm:h-56 md:h-64"
      />
      <span
        className="mt-10 select-none text-center font-semibold uppercase leading-none text-white"
        style={{
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "clamp(64px, 12vw, 140px)",
          letterSpacing: "0.12em",
          paddingLeft: "0.12em",
        }}
      >
        STONE
      </span>
    </div>
  );
}

export default function StoneBoot({ onComplete }: StoneBootProps) {
  const fillRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const [percent, setPercent] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    window.setTimeout(() => onCompleteRef.current(), FADE_OUT);
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const duration = reduceMotion ? 1500 : FILL_DURATION;
    const start = performance.now();
    let raf = 0;
    let lastPercent = -1;
    let holdTimer = 0;

    const frame = (now: number) => {
      const elapsed = now - start;
      const p = easeInOut(Math.min(elapsed / duration, 1));

      // Niveau du liquide : de 100 % (vide) à 0 % (plein), de bas en haut
      const level = (1 - p) * (100 + 2 * WAVE_AMPLITUDE) - WAVE_AMPLITUDE;
      const phase = elapsed * 0.004;
      const amp = reduceMotion ? 0 : WAVE_AMPLITUDE;

      const points: string[] = [];
      for (let x = 0; x <= 100; x += 2.5) {
        const y = level + amp * Math.sin(x * 0.12 + phase);
        points.push(`${x}% ${y.toFixed(2)}%`);
      }
      points.push("100% 100%", "0% 100%");

      if (fillRef.current) {
        fillRef.current.style.clipPath = `polygon(${points.join(",")})`;
      }

      const rounded = Math.round(p * 100);
      if (rounded !== lastPercent) {
        lastPercent = rounded;
        setPercent(rounded);
      }

      if (elapsed < duration) {
        raf = requestAnimationFrame(frame);
      } else {
        holdTimer = window.setTimeout(finish, reduceMotion ? 200 : HOLD_AFTER_FILL);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(holdTimer);
    };
  }, [finish]);

  return (
    <div
      role="progressbar"
      aria-label="Chargement de Stone"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#050505]"
      style={{
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_OUT}ms ease`,
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600&display=swap');

        @keyframes stone-enter {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .stone-enter { animation: stone-enter 800ms ease-out both; }
      `}</style>

      <div className="stone-enter relative">
        {/* Fond : version terne (le « vide ») */}
        <Brand className="opacity-[0.12]" />

        {/* Remplissage liquide de bas en haut */}
        <div
          ref={fillRef}
          className="absolute inset-0"
          style={{ clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)" }}
        >
          <Brand />
        </div>
      </div>

      {/* Pourcentage */}
      <div className="absolute bottom-10">
        <span
          className="text-sm font-medium text-white/60"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.2em",
          }}
        >
          {percent}%
        </span>
      </div>
    </div>
  );
}