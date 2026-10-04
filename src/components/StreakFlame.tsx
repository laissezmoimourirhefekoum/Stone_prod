// src/components/StreakFlame.tsx
// Streak affiché sous forme de cristal facetté (le nom du composant reste
// StreakFlame pour ne rien casser dans les imports existants).
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";

/* ============================================================================
   Types
============================================================================ */

export interface StreakFlameProps {
  /** Valeur du streak affichée dans le cristal. */
  value: number | string;
  /** Hauteur du cristal en px (défaut : 44). */
  size?: number;
  /** Adapte l'intensité du glow au thème (défaut : true). */
  isDark?: boolean;
}

interface Tier {
  /** Valeur minimale (incluse) pour atteindre ce palier. */
  min: number;
  /**
   * Teintes du cristal :
   * [0] reflets clairs · [1] teinte moyenne · [2] teinte soutenue · [3] cœur sombre.
   */
  body: [string, string, string, string];
  /** Contour du nombre. */
  stroke: string;
  /** Couleur du halo, format "r g b" (utilisé dans rgb(... / alpha)). */
  glow: string;
  /** Durée du flottement (plus court = cristal plus vivant). */
  breathe: number;
  /** Multiplicateur de la taille du halo. */
  glowScale: number;
  /** Nombre d'éclats qui scintillent autour. */
  sparkles: number;
  /** Durée entre deux passages de reflet (secondes). */
  sweep: number;
}

/* ============================================================================
   Paliers
   0–14 ambre · 15–29 rouge · 30–59 rose · 60–99 violet · 100–249 bleu · 250+ diamant
============================================================================ */

const TIERS: Tier[] = [
  {
    min: 0,
    body: ["#fff7ed", "#fdba74", "#f97316", "#2b1004"],
    stroke: "#9a3412",
    glow: "249 115 22",
    breathe: 4,
    glowScale: 0.85,
    sparkles: 1,
    sweep: 6,
  },
  {
    min: 15,
    body: ["#fff1f2", "#fda4af", "#f43f5e", "#2d0610"],
    stroke: "#881337",
    glow: "244 63 94",
    breathe: 3.7,
    glowScale: 0.95,
    sparkles: 2,
    sweep: 5.4,
  },
  {
    min: 30,
    body: ["#fdf2f8", "#f9a8d4", "#ec4899", "#2a0618"],
    stroke: "#831843",
    glow: "236 72 153",
    breathe: 3.4,
    glowScale: 1.05,
    sparkles: 3,
    sweep: 4.8,
  },
  {
    min: 60,
    body: ["#faf5ff", "#d8b4fe", "#a855f7", "#1a0733"],
    stroke: "#6b21a8",
    glow: "168 85 247",
    breathe: 3.1,
    glowScale: 1.15,
    sparkles: 4,
    sweep: 4.2,
  },
  {
    min: 100,
    body: ["#eff6ff", "#93c5fd", "#3b82f6", "#06142e"],
    stroke: "#1e3a8a",
    glow: "59 130 246",
    breathe: 2.8,
    glowScale: 1.25,
    sparkles: 5,
    sweep: 3.6,
  },
  {
    // Diamant : le plus proche d'un cristal pur.
    min: 250,
    body: ["#ffffff", "#a5f3fc", "#22d3ee", "#041a22"],
    stroke: "#155e75",
    glow: "34 211 238",
    breathe: 2.5,
    glowScale: 1.4,
    sparkles: 6,
    sweep: 3,
  },
];

/** Positions des éclats (coordonnées du viewBox 64×80). */
const SPARKLES = [
  { x: 32, y: 3, s: 1.2, d: 0 },
  { x: 51, y: 57, s: 0.9, d: 0.9 },
  { x: 14, y: 36, s: 0.8, d: 1.7 },
  { x: 58, y: 24, s: 0.7, d: 2.4 },
  { x: 7, y: 14, s: 0.7, d: 0.5 },
  { x: 45, y: 72, s: 0.8, d: 1.3 },
];

/* ============================================================================
   Keyframes + styles (CSS intégré au composant)
============================================================================ */

const STREAK_FLAME_CSS = `
@keyframes sfBreathe {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50%      { transform: translateY(-1.5px) rotate(1.5deg); }
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

/* Passage de reflet sur les facettes. */
@keyframes sfSweep {
  0%   { transform: translateX(0) skewX(-20deg);     opacity: 0; }
  8%   { opacity: 1; }
  32%  { transform: translateX(105px) skewX(-20deg); opacity: 1; }
  38%  { transform: translateX(112px) skewX(-20deg); opacity: 0; }
  100% { transform: translateX(112px) skewX(-20deg); opacity: 0; }
}

@keyframes sfTwinkle {
  0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
  50%      { opacity: 1; transform: scale(1) rotate(45deg); }
}

@keyframes sfGlint {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}

/* Montée de palier : le cristal fait un tour sur lui-même en grossissant. */
@keyframes sfTierUp {
  0%   { transform: perspective(240px) rotateY(0deg)   scale(1);    filter: brightness(1); }
  30%  { transform: perspective(240px) rotateY(120deg) scale(0.85); filter: brightness(1.2); }
  60%  { transform: perspective(240px) rotateY(300deg) scale(1.45); filter: brightness(1.9); }
  100% { transform: perspective(240px) rotateY(360deg) scale(1);    filter: brightness(1); }
}

@keyframes sfValueTierUp {
  0%   { transform: scale(1); }
  35%  { transform: scale(0.7); }
  60%  { transform: scale(1.7); }
  100% { transform: scale(1); }
}

/* Descente de palier : le cristal se ternit et se tasse. */
@keyframes sfTierDown {
  0%   { transform: scale(1);    filter: brightness(1); }
  35%  { transform: scale(0.72); filter: brightness(0.7) saturate(0.7); }
  100% { transform: scale(1);    filter: brightness(1); }
}

@keyframes sfFlash {
  0%   { opacity: 0;    transform: scale(0.4); }
  25%  { opacity: 0.95; transform: scale(1.1); }
  100% { opacity: 0;    transform: scale(1.9); }
}

@keyframes sfRing {
  0%   { opacity: 0.9; transform: scale(0.3); border-width: 3px; }
  100% { opacity: 0;   transform: scale(2.4); border-width: 0.5px; }
}

@keyframes sfSpark {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(var(--sf-a)) translateX(0) scaleX(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--sf-a)) translateX(var(--sf-spark-d)) scaleX(0.2);
  }
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
  inset: calc(-22% * var(--sf-glow-scale, 1));
  z-index: -1;
  pointer-events: none;
  transition:
    inset 0.6s ease,
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    filter 0.4s ease;
}

.sf-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgb(var(--sf-glow) / 0.5) 0%,
    rgb(var(--sf-glow) / 0.22) 45%,
    transparent 70%
  );
  filter: blur(8px);
  animation: sfGlow var(--sf-breathe, 3.2s) ease-in-out infinite;
}

.sf-light .sf-glow {
  background: radial-gradient(
    circle,
    rgb(var(--sf-glow) / 0.34) 0%,
    rgb(var(--sf-glow) / 0.14) 45%,
    transparent 70%
  );
}

/* ---------- Cristal ---------- */

.sf-scale {
  position: absolute;
  inset: 0;
  transform-origin: 50% 90%;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sf-svg {
  display: block;
  overflow: visible;
  transform-origin: 50% 50%;
  animation: sfBreathe var(--sf-breathe, 3.2s) ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgb(var(--sf-glow) / 0.5));
}

.sf-light .sf-svg {
  filter: drop-shadow(0 1px 3px rgb(var(--sf-glow) / 0.5));
}

/* Les teintes passent en fondu d'un palier à l'autre. */
.sf-stop {
  transition: stop-color 0.8s ease, stop-opacity 0.8s ease;
}

.sf-fill {
  transition: fill 0.8s ease, stroke 0.8s ease;
}

/* Arêtes des facettes : fines lignes claires, comme le verre taillé. */
.sf-edge {
  stroke: rgba(255, 255, 255, 0.55);
  stroke-width: 0.5;
  stroke-linejoin: round;
}

.sf-light .sf-edge {
  stroke: rgb(var(--sf-glow) / 0.45);
}

.sf-outline {
  fill: none;
  stroke-width: 1.1;
  stroke-linejoin: round;
}

.sf-dark .sf-outline {
  opacity: 0.5;
}

.sf-light .sf-outline {
  opacity: 0.95;
}

.sf-sweep {
  opacity: 0;
  animation: sfSweep var(--sf-sweep, 5s) ease-in-out infinite;
}

.sf-glint {
  animation: sfGlint 3.6s ease-in-out infinite;
}

.sf-twinkle {
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
  fill: #ffffff;
  filter: drop-shadow(0 0 1.5px rgb(var(--sf-glow)));
  animation: sfTwinkle 2.6s ease-in-out infinite;
}

.sf-light .sf-twinkle {
  fill: rgb(var(--sf-glow));
}

/* ---------- Nombre ---------- */

.sf-value {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 24%;
  text-align: center;
  font-size: var(--sf-font-size, 16px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: #ffffff;
  -webkit-text-stroke: var(--sf-stroke, 3px) var(--sf-stroke-color, #6b21a8);
  paint-order: stroke fill;
  text-shadow: 0 1px 6px rgb(var(--sf-glow) / 0.55);
  white-space: nowrap;
  transition: -webkit-text-stroke-color 0.8s ease;
}

/* ---------- Boost (changement de valeur, même palier) ---------- */

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

/* ---------- Changement de palier ---------- */

.sf-tier-up .sf-scale {
  animation: sfTierUp 0.95s cubic-bezier(0.34, 1.1, 0.64, 1);
}

.sf-tier-up .sf-value {
  animation: sfValueTierUp 0.95s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sf-tier-up .sf-glow-wrap {
  transform: scale(1.7);
  filter: brightness(2) saturate(1.3);
}

.sf-tier-down .sf-scale {
  animation: sfTierDown 0.7s ease-out;
}

.sf-fx {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.sf-flash {
  position: absolute;
  left: 50%;
  top: 55%;
  width: 120%;
  height: 120%;
  margin: -60% 0 0 -60%;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, rgb(var(--sf-glow) / 0.7) 40%, transparent 70%);
  mix-blend-mode: screen;
  animation: sfFlash 0.7s ease-out forwards;
}

.sf-ring {
  position: absolute;
  left: 50%;
  top: 55%;
  width: 100%;
  height: 100%;
  margin: -50% 0 0 -50%;
  border-radius: 50%;
  border: 3px solid rgb(var(--sf-glow));
  box-shadow: 0 0 10px rgb(var(--sf-glow) / 0.6);
  animation: sfRing 0.9s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}

.sf-ring-2 {
  animation-delay: 0.14s;
  opacity: 0;
  animation-fill-mode: both;
}

.sf-spark {
  position: absolute;
  left: 50%;
  top: 55%;
  width: calc(var(--sf-spark-size) * 2.2);
  height: var(--sf-spark-size);
  border-radius: 999px;
  background: var(--sf-spark-color);
  box-shadow: 0 0 6px rgb(var(--sf-glow) / 0.9);
  animation: sfSpark 0.85s cubic-bezier(0.1, 0.7, 0.3, 1) forwards;
}

@media (prefers-reduced-motion: reduce) {
  .sf-svg,
  .sf-glow,
  .sf-sweep,
  .sf-glint,
  .sf-twinkle,
  .sf-boost .sf-value,
  .sf-tier-up .sf-scale,
  .sf-tier-up .sf-value,
  .sf-tier-down .sf-scale {
    animation: none;
  }

  .sf-sweep,
  .sf-twinkle {
    opacity: 0;
  }

  .sf-scale,
  .sf-glow-wrap,
  .sf-stop,
  .sf-fill {
    transition: none;
  }

  .sf-fx {
    display: none;
  }
}
`;

/* ============================================================================
   Helpers
============================================================================ */

const BOOST_DURATION_MS = 650;
const TIER_DURATION_MS = 1000;
const SPARK_COUNT = 10;

function getFontScale(length: number): number {
  if (length <= 2) return 0.4;
  if (length === 3) return 0.34;
  if (length === 4) return 0.27;
  return 0.21;
}

/** Retourne l'index du palier correspondant à la valeur. */
function getTierIndex(value: number | string): number {
  const n = typeof value === "number" ? value : parseInt(value, 10);
  if (!Number.isFinite(n)) return 0;

  let index = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (n >= TIERS[i].min) index = i;
  }
  return index;
}

interface TierFx {
  dir: "up" | "down";
  id: number;
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

  const tierIndex = getTierIndex(value);
  const tier = TIERS[tierIndex];

  const [boost, setBoost] = useState(false);
  const [fx, setFx] = useState<TierFx | null>(null);

  const previousValue = useRef<number | string>(value);
  const previousTier = useRef<number>(tierIndex);
  const fxId = useRef(0);

  // Déclenche les animations uniquement quand la valeur change (pas au montage).
  useEffect(() => {
    if (previousValue.current === value) return;
    previousValue.current = value;

    const changedTier = previousTier.current !== tierIndex;
    const direction: TierFx["dir"] =
      tierIndex > previousTier.current ? "up" : "down";
    previousTier.current = tierIndex;

    setBoost(true);
    const boostTimeout = window.setTimeout(
      () => setBoost(false),
      BOOST_DURATION_MS,
    );

    let fxTimeout: number | undefined;
    if (changedTier) {
      fxId.current += 1;
      setFx({ dir: direction, id: fxId.current });
      fxTimeout = window.setTimeout(() => setFx(null), TIER_DURATION_MS);
    }

    return () => {
      window.clearTimeout(boostTimeout);
      if (fxTimeout !== undefined) window.clearTimeout(fxTimeout);
    };
  }, [value, tierIndex]);

  const text = String(value);
  const width = Math.round(size * 0.8);
  const fontSize = Math.round(size * getFontScale(text.length) * 10) / 10;

  const style = {
    width,
    height: size,
    "--sf-font-size": `${fontSize}px`,
    "--sf-stroke": `${Math.max(2, size * 0.075)}px`,
    "--sf-stroke-color": tier.stroke,
    "--sf-glow": tier.glow,
    "--sf-glow-scale": tier.glowScale,
    "--sf-breathe": `${tier.breathe}s`,
    "--sf-sweep": `${tier.sweep}s`,
    "--sf-spark-d": `${Math.round(size * 0.85)}px`,
    "--sf-spark-size": `${Math.max(2, Math.round(size * 0.07))}px`,
    "--sf-spark-color": tier.body[0],
  } as CSSProperties;

  const className = [
    "sf-root",
    isDark ? "sf-dark" : "sf-light",
    boost ? "sf-boost" : "",
    fx?.dir === "up" ? "sf-tier-up" : "",
    fx?.dir === "down" ? "sf-tier-down" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const [light, mid, deep, dark] = tier.body;

  return (
    <span
      className={className}
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
            {/* Facettes claires, dégradé vertical */}
            <linearGradient id={`${uid}-a`} x1="0.2" y1="0" x2="0.8" y2="1">
              <stop className="sf-stop" offset="0%" style={{ stopColor: light, stopOpacity: 0.95 }} />
              <stop className="sf-stop" offset="100%" style={{ stopColor: mid, stopOpacity: 0.5 }} />
            </linearGradient>

            {/* Facettes éclairées par la droite */}
            <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="1" y2="0.4">
              <stop className="sf-stop" offset="0%" style={{ stopColor: mid, stopOpacity: 0.55 }} />
              <stop className="sf-stop" offset="100%" style={{ stopColor: light, stopOpacity: 0.95 }} />
            </linearGradient>

            {/* Facettes basses */}
            <linearGradient id={`${uid}-c`} x1="0.5" y1="0" x2="0.5" y2="1">
              <stop className="sf-stop" offset="0%" style={{ stopColor: light, stopOpacity: 0.9 }} />
              <stop className="sf-stop" offset="100%" style={{ stopColor: deep, stopOpacity: 0.6 }} />
            </linearGradient>

            {/* Cœur sombre, comme la pointe vitrée du cristal */}
            <linearGradient id={`${uid}-core`} x1="0.5" y1="0" x2="0.5" y2="1">
              <stop className="sf-stop" offset="0%" style={{ stopColor: dark, stopOpacity: 0.95 }} />
              <stop className="sf-stop" offset="100%" style={{ stopColor: deep, stopOpacity: 0.5 }} />
            </linearGradient>

            {/* Dispersion de la lumière (reflet arc-en-ciel) */}
            <linearGradient id={`${uid}-glint`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f9a8d4" />
              <stop offset="50%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>

            <linearGradient id={`${uid}-sweep`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <clipPath id={`${uid}-clip`}>
              <path d="M32 2 L55 50 L32 78 L9 50 Z" />
            </clipPath>
          </defs>

          {/* Facettes hautes */}
          <path className="sf-edge" d="M32 2 L9 50 L21 48 L32 5 Z" fill={`url(#${uid}-a)`} />
          <path className="sf-edge" d="M32 2 L55 50 L43 48 L32 5 Z" fill={`url(#${uid}-b)`} />

          {/* Cœur sombre */}
          <path className="sf-edge" d="M32 5 L21 48 L32 57 L43 48 Z" fill={`url(#${uid}-core)`} />
          <path d="M32 5 L21 48 L32 57 Z" fill="#ffffff" opacity="0.07" />
          <path
            className="sf-fill"
            d="M32 14 L28 40 L32 46 Z"
            style={{ fill: mid }}
            opacity="0.25"
          />

          {/* Facettes de ceinture */}
          <path
            className="sf-edge sf-fill"
            d="M9 50 L21 48 L32 57 Z"
            style={{ fill: mid }}
            opacity="0.7"
          />
          <path
            className="sf-edge sf-fill"
            d="M55 50 L43 48 L32 57 Z"
            style={{ fill: light }}
            opacity="0.85"
          />

          {/* Facettes basses */}
          <path className="sf-edge" d="M9 50 L32 57 L32 78 Z" fill={`url(#${uid}-c)`} />
          <path className="sf-edge" d="M55 50 L32 57 L32 78 Z" fill={`url(#${uid}-b)`} />

          {/* Reflets arc-en-ciel */}
          <path className="sf-glint" d="M23 27 L28 23 L30 27 L25 30 Z" fill={`url(#${uid}-glint)`} />
          <path className="sf-glint" d="M44 55 L48 53 L49 56 L45 58 Z" fill={`url(#${uid}-glint)`} />

          {/* Passage de lumière sur les facettes */}
          <g clipPath={`url(#${uid}-clip)`}>
            <rect
              className="sf-sweep"
              x="-16"
              y="-4"
              width="12"
              height="90"
              fill={`url(#${uid}-sweep)`}
            />
          </g>

          {/* Contour */}
          <path
            className="sf-outline sf-fill"
            d="M32 2 L55 50 L32 78 L9 50 Z"
            style={{ stroke: deep }}
          />

          {/* Éclats : de plus en plus nombreux avec le palier */}
          {SPARKLES.slice(0, tier.sparkles).map((s, i) => (
            <g key={i} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
              <path
                className="sf-twinkle"
                d="M0 -4 L1.1 -1.1 L4 0 L1.1 1.1 L0 4 L-1.1 1.1 L-4 0 L-1.1 -1.1 Z"
                style={{ animationDelay: `${s.d}s` }}
              />
            </g>
          ))}
        </svg>
      </span>

      <span className="sf-value">{text}</span>

      {/* Effets de montée de palier : flash, ondes de choc, éclats de cristal. */}
      {fx?.dir === "up" && (
        <span className="sf-fx" key={fx.id} aria-hidden="true">
          <span className="sf-flash" />
          <span className="sf-ring" />
          <span className="sf-ring sf-ring-2" />
          {Array.from({ length: SPARK_COUNT }, (_, i) => (
            <span
              key={i}
              className="sf-spark"
              style={
                {
                  "--sf-a": `${(360 / SPARK_COUNT) * i + (i % 2 ? 8 : -8)}deg`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      )}
    </span>
  );
}