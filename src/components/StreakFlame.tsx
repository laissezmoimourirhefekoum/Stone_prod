// src/components/StreakFlame.tsx
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";

/* ============================================================================
   Types
============================================================================ */

export interface StreakFlameProps {
  /** Valeur du streak affichée dans la flamme. */
  value: number | string;
  /** Hauteur de la flamme en px (défaut : 44). */
  size?: number;
  /** Adapte l'intensité du glow au thème (défaut : true). */
  isDark?: boolean;
}

/* ============================================================================
   Keyframes + styles (CSS intégré au composant)
============================================================================ */

const STREAK_FLAME_CSS = `
@keyframes sfBreathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-1.5px) scale(1.04); }
}

@keyframes sfGlow {
  0%, 100% { opacity: 0.6; transform: scale(0.95); }
  50%      { opacity: 1;   transform: scale(1.05); }
}

@keyframes sfValueBounce {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.35); }
  100% { transform: scale(1); }
}

.sf-root {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  isolation: isolate;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* ---------- Glow ---------- */

.sf-glow-wrap {
  position: absolute;
  inset: -22%;
  z-index: -1;
  pointer-events: none;
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 0.4s ease;
}

.sf-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(217, 70, 239, 0.6) 0%,
    rgba(139, 92, 246, 0.28) 45%,
    transparent 70%
  );
  filter: blur(8px);
  animation: sfGlow 3.2s ease-in-out infinite;
}

.sf-light .sf-glow {
  background: radial-gradient(
    circle,
    rgba(192, 38, 211, 0.38) 0%,
    rgba(124, 58, 237, 0.16) 45%,
    transparent 70%
  );
}

/* ---------- Flamme ---------- */

.sf-scale {
  position: absolute;
  inset: 0;
  transform-origin: 50% 90%;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sf-svg {
  display: block;
  overflow: visible;
  transform-origin: 50% 90%;
  animation: sfBreathe 3.2s ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgba(217, 70, 239, 0.55));
}

.sf-light .sf-svg {
  filter: drop-shadow(0 1px 3px rgba(147, 51, 234, 0.4));
}

/* ---------- Nombre ---------- */

.sf-value {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12%;
  text-align: center;
  font-size: var(--sf-font-size, 16px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: #ffffff;
  -webkit-text-stroke: var(--sf-stroke, 3px) #a21caf;
  paint-order: stroke fill;
  text-shadow: 0 1px 6px rgba(162, 28, 175, 0.55);
  white-space: nowrap;
}

/* ---------- Boost (changement de valeur) ---------- */

.sf-boost .sf-scale {
  transform: scale(1.18);
}

.sf-boost .sf-glow-wrap {
  transform: scale(1.3);
  filter: brightness(1.5) saturate(1.2);
}

.sf-boost .sf-value {
  animation: sfValueBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: reduce) {
  .sf-svg,
  .sf-glow,
  .sf-boost .sf-value {
    animation: none;
  }

  .sf-scale,
  .sf-glow-wrap {
    transition: none;
  }
}
`;

/* ============================================================================
   Helpers
============================================================================ */

const BOOST_DURATION_MS = 650;

function getFontScale(length: number): number {
  if (length <= 2) return 0.4;
  if (length === 3) return 0.34;
  if (length === 4) return 0.27;
  return 0.21;
}

/* ============================================================================
   Component
============================================================================ */

export default function StreakFlame({
  value,
  size = 44,
  isDark = true,
}: StreakFlameProps) {
  const uid = useId().replace(/:/g, "");

  const [boost, setBoost] = useState(false);
  const previousValue = useRef<number | string>(value);

  // Déclenche l'animation uniquement quand la valeur change (pas au montage).
  useEffect(() => {
    if (previousValue.current === value) return;
    previousValue.current = value;

    setBoost(true);
    const timeout = window.setTimeout(() => setBoost(false), BOOST_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [value]);

  const text = String(value);
  const width = Math.round(size * 0.8);
  const fontSize = Math.round(size * getFontScale(text.length) * 10) / 10;

  const style = {
    width,
    height: size,
    "--sf-font-size": `${fontSize}px`,
    "--sf-stroke": `${Math.max(2, size * 0.075)}px`,
  } as CSSProperties;

  return (
    <span
      className={[
        "sf-root",
        isDark ? "sf-dark" : "sf-light",
        boost ? "sf-boost" : "",
      ].join(" ")}
      style={style}
      role="img"
      aria-label={`Streak : ${text}`}
    >
      <style>{STREAK_FLAME_CSS}</style>

      <span className="sf-glow-wrap" aria-hidden="true">
        <span className="sf-glow" />
      </span>

      <span className="sf-scale" aria-hidden="true">
        <svg
          className="sf-svg"
          viewBox="0 0 64 80"
          width="100%"
          height="100%"
          focusable="false"
        >
          <defs>
            <linearGradient id={`${uid}-body`} x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#f0abfc" />
              <stop offset="35%" stopColor="#d946ef" />
              <stop offset="70%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>

            <radialGradient id={`${uid}-core`} cx="50%" cy="72%" r="55%">
              <stop offset="0%" stopColor="#fff1fb" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#f9a8d4" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
            </radialGradient>

            <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbcfe8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Corps de la flamme */}
          <path
            d="M32 2 C34 14 50 22 54 42 C58 60 46 78 32 78 C18 78 6 62 10 44 C12 34 18 28 22 20 C24 28 28 30 30 28 C34 22 30 12 32 2 Z"
            fill={`url(#${uid}-body)`}
            stroke={`url(#${uid}-edge)`}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Flamme intérieure */}
          <path
            d="M32 30 C34 40 46 46 47 59 C48 69 41 75 32 75 C23 75 17 69 18 60 C19 51 28 45 32 30 Z"
            fill="#ec4899"
            opacity="0.55"
          />

          {/* Lumière centrale */}
          <ellipse
            cx="32"
            cy="58"
            rx="20"
            ry="22"
            fill={`url(#${uid}-core)`}
          />

          {/* Reflet */}
          <path
            d="M20 46 C19 54 22 62 27 67"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.35"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <span className="sf-value">{text}</span>
    </span>
  );
}