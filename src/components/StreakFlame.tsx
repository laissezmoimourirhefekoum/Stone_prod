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

interface Tier {
  /** Valeur minimale (incluse) pour atteindre ce palier. */
  min: number;
  /** Dégradé du corps : haut → bas. */
  body: [string, string, string, string];
  /** Flamme intérieure. */
  inner: string;
  /** Lumière centrale : centre, milieu, bord. */
  core: [string, string, string];
  /** Liseré du contour : début, fin. */
  edge: [string, string];
  /** Contour du nombre. */
  stroke: string;
  /** Couleur du glow, format "r g b" (utilisé dans rgb(... / alpha)). */
  glow: string;
  /** Durée de la respiration (plus court = flamme plus nerveuse). */
  breathe: number;
  /** Multiplicateur de la taille du halo. */
  glowScale: number;
  /** Nombre de braises qui montent en continu. */
  embers: number;
}

/* ============================================================================
   Paliers
   0–14 orange · 15–29 rouge · 30–59 rose · 60–99 violet · 100–249 bleu · 250+ cyan
============================================================================ */

const TIERS: Tier[] = [
  {
    min: 0,
    body: ["#fde68a", "#fb923c", "#ea580c", "#c2410c"],
    inner: "#facc15",
    core: ["#fffbeb", "#fde047", "#f97316"],
    edge: ["#fed7aa", "#fdba74"],
    stroke: "#9a3412",
    glow: "249 115 22",
    breathe: 3.6,
    glowScale: 0.85,
    embers: 0,
  },
  {
    min: 15,
    body: ["#fecdd3", "#fb7185", "#e11d48", "#9f1239"],
    inner: "#fb923c",
    core: ["#fff1f2", "#fda4af", "#f43f5e"],
    edge: ["#fecdd3", "#fb7185"],
    stroke: "#881337",
    glow: "244 63 94",
    breathe: 3.3,
    glowScale: 0.95,
    embers: 2,
  },
  {
    min: 30,
    body: ["#fbcfe8", "#f472b6", "#db2777", "#9d174d"],
    inner: "#f43f5e",
    core: ["#fff1fb", "#f9a8d4", "#ec4899"],
    edge: ["#fbcfe8", "#f9a8d4"],
    stroke: "#831843",
    glow: "236 72 153",
    breathe: 3.0,
    glowScale: 1.05,
    embers: 3,
  },
  {
    // Palier d'origine du composant.
    min: 60,
    body: ["#f0abfc", "#d946ef", "#9333ea", "#6d28d9"],
    inner: "#ec4899",
    core: ["#fff1fb", "#f9a8d4", "#ec4899"],
    edge: ["#fbcfe8", "#a78bfa"],
    stroke: "#a21caf",
    glow: "217 70 239",
    breathe: 2.7,
    glowScale: 1.15,
    embers: 4,
  },
  {
    min: 100,
    body: ["#bfdbfe", "#60a5fa", "#2563eb", "#1e3a8a"],
    inner: "#818cf8",
    core: ["#eff6ff", "#93c5fd", "#6366f1"],
    edge: ["#dbeafe", "#818cf8"],
    stroke: "#1e3a8a",
    glow: "59 130 246",
    breathe: 2.4,
    glowScale: 1.25,
    embers: 5,
  },
  {
    min: 250,
    body: ["#ecfeff", "#22d3ee", "#0891b2", "#4f46e5"],
    inner: "#a5f3fc",
    core: ["#ffffff", "#a5f3fc", "#22d3ee"],
    edge: ["#ffffff", "#67e8f9"],
    stroke: "#155e75",
    glow: "34 211 238",
    breathe: 2.1,
    glowScale: 1.4,
    embers: 6,
  },
];

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

/* Changement de palier vers le haut : la flamme se tasse, puis explose. */
@keyframes sfTierUp {
  0%   { transform: scale(1)    rotate(0deg);  filter: brightness(1); }
  20%  { transform: scale(0.82) rotate(-6deg); filter: brightness(1.1); }
  50%  { transform: scale(1.5)  rotate(5deg);  filter: brightness(1.8); }
  72%  { transform: scale(0.96) rotate(-2deg); filter: brightness(1.2); }
  100% { transform: scale(1)    rotate(0deg);  filter: brightness(1); }
}

@keyframes sfValueTierUp {
  0%   { transform: scale(1); }
  35%  { transform: scale(0.7); }
  60%  { transform: scale(1.7); }
  100% { transform: scale(1); }
}

/* Changement de palier vers le bas : la flamme s'affaisse. */
@keyframes sfTierDown {
  0%   { transform: scale(1);    filter: brightness(1); }
  35%  { transform: scale(0.72); filter: brightness(0.7) saturate(0.7); }
  100% { transform: scale(1);    filter: brightness(1); }
}

@keyframes sfFlash {
  0%   { opacity: 0;   transform: scale(0.4); }
  25%  { opacity: 0.95; transform: scale(1.1); }
  100% { opacity: 0;   transform: scale(1.9); }
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

@keyframes sfEmber {
  0%   { opacity: 0; transform: translate(0, 0) scale(1); }
  15%  { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--sf-ex), -150%) scale(0.2); }
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
    rgb(var(--sf-glow) / 0.6) 0%,
    rgb(var(--sf-glow) / 0.28) 45%,
    transparent 70%
  );
  filter: blur(8px);
  animation: sfGlow var(--sf-breathe, 3.2s) ease-in-out infinite;
}

.sf-light .sf-glow {
  background: radial-gradient(
    circle,
    rgb(var(--sf-glow) / 0.4) 0%,
    rgb(var(--sf-glow) / 0.16) 45%,
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
  animation: sfBreathe var(--sf-breathe, 3.2s) ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgb(var(--sf-glow) / 0.55));
}

.sf-light .sf-svg {
  filter: drop-shadow(0 1px 3px rgb(var(--sf-glow) / 0.5));
}

/* Les couleurs changent en fondu quand on passe d'un palier à l'autre. */
.sf-stop {
  transition: stop-color 0.8s ease, stop-opacity 0.8s ease;
}

.sf-fill {
  transition: fill 0.8s ease;
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
  -webkit-text-stroke: var(--sf-stroke, 3px) var(--sf-stroke-color, #a21caf);
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
  animation: sfTierUp 0.95s cubic-bezier(0.34, 1.3, 0.64, 1);
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

/* ---------- Braises (ambiance, paliers supérieurs) ---------- */

.sf-embers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.sf-ember {
  position: absolute;
  bottom: 40%;
  width: 7%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--sf-spark-color);
  box-shadow: 0 0 4px rgb(var(--sf-glow) / 0.9);
  opacity: 0;
  animation: sfEmber 2.2s ease-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .sf-svg,
  .sf-glow,
  .sf-boost .sf-value,
  .sf-tier-up .sf-scale,
  .sf-tier-up .sf-value,
  .sf-tier-down .sf-scale {
    animation: none;
  }

  .sf-scale,
  .sf-glow-wrap,
  .sf-stop,
  .sf-fill {
    transition: none;
  }

  .sf-fx,
  .sf-embers {
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

      {/* Braises permanentes : de plus en plus nombreuses avec le palier. */}
      {tier.embers > 0 && (
        <span className="sf-embers" aria-hidden="true">
          {Array.from({ length: tier.embers }, (_, i) => (
            <span
              key={i}
              className="sf-ember"
              style={
                {
                  left: `${22 + ((i * 17) % 56)}%`,
                  animationDelay: `${(i * 0.37).toFixed(2)}s`,
                  animationDuration: `${(1.8 + (i % 3) * 0.5).toFixed(1)}s`,
                  "--sf-ex": `${((i % 3) - 1) * 7}px`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      )}

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
              <stop className="sf-stop" offset="0%" style={{ stopColor: tier.body[0] }} />
              <stop className="sf-stop" offset="35%" style={{ stopColor: tier.body[1] }} />
              <stop className="sf-stop" offset="70%" style={{ stopColor: tier.body[2] }} />
              <stop className="sf-stop" offset="100%" style={{ stopColor: tier.body[3] }} />
            </linearGradient>

            <radialGradient id={`${uid}-core`} cx="50%" cy="72%" r="55%">
              <stop
                className="sf-stop"
                offset="0%"
                style={{ stopColor: tier.core[0], stopOpacity: 0.95 }}
              />
              <stop
                className="sf-stop"
                offset="55%"
                style={{ stopColor: tier.core[1], stopOpacity: 0.55 }}
              />
              <stop
                className="sf-stop"
                offset="100%"
                style={{ stopColor: tier.core[2], stopOpacity: 0 }}
              />
            </radialGradient>

            <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="1" y2="1">
              <stop
                className="sf-stop"
                offset="0%"
                style={{ stopColor: tier.edge[0], stopOpacity: 0.9 }}
              />
              <stop
                className="sf-stop"
                offset="100%"
                style={{ stopColor: tier.edge[1], stopOpacity: 0.2 }}
              />
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
            className="sf-fill"
            d="M32 30 C34 40 46 46 47 59 C48 69 41 75 32 75 C23 75 17 69 18 60 C19 51 28 45 32 30 Z"
            style={{ fill: tier.inner }}
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

      {/* Effets de montée de palier : flash, ondes de choc, étincelles. */}
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