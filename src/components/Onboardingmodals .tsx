// src/components/OnboardingModals.tsx
//
// Onboarding en 2 étapes après la connexion d'un canal :
//   1. <ConfirmAccountModal />   -> affiché sur /channels  ("C'est le bon compte ?")
//   2. <FrequencyOnboarding />   -> affiché sur /insight   (objectif de publication)
//
// Les deux sont reliés par sessionStorage (queueFrequencyOnboarding).

import { useEffect, useRef, useState } from "react";
import type { ComponentType, CSSProperties, KeyboardEvent, ReactNode } from "react";

import { useTheme } from "../hooks/useTheme";

import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  YouTubeIcon,
  PinterestIcon,
  ThreadsIcon,
} from "./IntegrationIcons";

/* ============================================================================
   TYPES + STORAGE
============================================================================ */

export type OnboardingChannelKey =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "threads";

export type OnboardingAccount = {
  key: OnboardingChannelKey;
  name: string;
  accountLabel: string;
  handle?: string;
  avatarUrl?: string;
};

type IconComponent = ComponentType<{ className?: string; size?: number }>;

const ICONS: Record<OnboardingChannelKey, IconComponent> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
  threads: ThreadsIcon,
};

const QUEUE_KEY = "stone:onboarding:frequency";
const GOAL_KEY = (key: string) => `stone:posting-goal:${key}`;

export function queueFrequencyOnboarding(account: OnboardingAccount) {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(account));
  } catch {
    /* storage indisponible */
  }
}

function readQueued(): OnboardingAccount | null {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingAccount) : null;
  } catch {
    return null;
  }
}

function clearQueued() {
  try {
    sessionStorage.removeItem(QUEUE_KEY);
  } catch {
    /* noop */
  }
}

/* ============================================================================
   PALETTE (blanc en dark, noir en light)
============================================================================ */

type Palette = {
  bg: string;
  border: string;
  surface: string;
  surfaceHover: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  overlay: string;
};

function palette(isDark: boolean): Palette {
  return isDark
    ? {
        bg: "#161616",
        border: "#2c2c2c",
        surface: "#1d1d1d",
        surfaceHover: "#252525",
        text: "#ffffff",
        muted: "#a1a1aa",
        accent: "#ffffff",
        accentText: "#0a0a0a",
        overlay: "rgba(0,0,0,0.7)",
      }
    : {
        bg: "#ffffff",
        border: "#e4e4e7",
        surface: "#fafafa",
        surfaceHover: "#f4f4f5",
        text: "#0a0a0a",
        muted: "#71717a",
        accent: "#0a0a0a",
        accentText: "#ffffff",
        overlay: "rgba(24,24,27,0.45)",
      };
}

/* ============================================================================
   ICONS
============================================================================ */

function Svg({ className = "h-4 w-4", children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const CheckIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="m5 12 4 4L19 6" />
  </Svg>
);
const ArrowIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
);
const CloseIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </Svg>
);
const HelpIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </Svg>
);
const PencilIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </Svg>
);
const MinusIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M5 12h14" />
  </Svg>
);
const PlusIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);
const SwapIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M7 4 3 8l4 4" />
    <path d="M3 8h14" />
    <path d="m17 20 4-4-4-4" />
    <path d="M21 16H7" />
  </Svg>
);

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} animate-spin`} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================================
   KEYFRAMES
============================================================================ */

function Keyframes() {
  return (
    <style>{`
      @keyframes stone-fade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes stone-pop {
        from { opacity: 0; transform: translateY(14px) scale(0.965); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes stone-rise {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes stone-confetti {
        0%   { opacity: 0; transform: translateY(-46px) rotate(0deg) scale(0.6); }
        25%  { opacity: 1; }
        100% { opacity: 1; transform: translateY(0) rotate(var(--rot)) scale(1); }
      }
      @keyframes stone-badge {
        0%   { transform: scale(0); }
        70%  { transform: scale(1.18); }
        100% { transform: scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .stone-modal, .stone-modal * { animation-duration: 0.01ms !important; animation-delay: 0s !important; }
      }
    `}</style>
  );
}

/* ============================================================================
   CONFETTI
============================================================================ */

type Piece = { l: string; t: number; c: string; w: number; h: number; r: number; d: number; s: "rect" | "circle" };

const PIECES: Piece[] = [
  { l: "10%", t: 20, c: "a", w: 7, h: 7, r: 0, d: 0, s: "circle" },
  { l: "15%", t: 54, c: "#6f6fe0", w: 12, h: 4, r: 20, d: 120, s: "rect" },
  { l: "21%", t: 30, c: "a", w: 16, h: 6, r: 10, d: 60, s: "rect" },
  { l: "27%", t: 68, c: "#f5c518", w: 8, h: 14, r: 25, d: 180, s: "rect" },
  { l: "19%", t: 80, c: "#2aa8ff", w: 7, h: 7, r: 0, d: 90, s: "circle" },
  { l: "38%", t: 8, c: "#f5c518", w: 14, h: 5, r: -15, d: 30, s: "rect" },
  { l: "45%", t: 74, c: "a", w: 14, h: 9, r: 15, d: 150, s: "rect" },
  { l: "51%", t: 4, c: "#f5c518", w: 14, h: 12, r: 10, d: 70, s: "rect" },
  { l: "56%", t: 78, c: "#2aa8ff", w: 7, h: 7, r: 0, d: 210, s: "circle" },
  { l: "67%", t: 28, c: "#6f6fe0", w: 18, h: 9, r: 5, d: 40, s: "rect" },
  { l: "74%", t: 6, c: "a", w: 10, h: 4, r: -30, d: 130, s: "rect" },
  { l: "79%", t: 10, c: "#f5c518", w: 12, h: 12, r: 8, d: 100, s: "rect" },
  { l: "82%", t: 60, c: "a", w: 12, h: 4, r: 15, d: 170, s: "rect" },
  { l: "88%", t: 42, c: "#ff2d8a", w: 8, h: 8, r: 0, d: 60, s: "circle" },
  { l: "89%", t: 8, c: "a", w: 14, h: 11, r: 25, d: 190, s: "rect" },
  { l: "86%", t: 54, c: "#f5c518", w: 8, h: 16, r: 18, d: 110, s: "rect" },
];

function Confetti({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[120px] overflow-hidden" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute block"
          style={
            {
              left: p.l,
              top: p.t,
              width: p.w,
              height: p.h,
              background: p.c === "a" ? accent : p.c,
              borderRadius: p.s === "circle" ? 9999 : 2,
              transform: `rotate(${p.r}deg)`,
              "--rot": `${p.r}deg`,
              animation: `stone-confetti 0.95s cubic-bezier(.2,.8,.25,1) ${p.d}ms both`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ============================================================================
   SHELL
============================================================================ */

function useModalBehavior(onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);
}

function StepDots({ current, total, p }: { current: number; total: number; p: Palette }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Étape ${current} sur ${total}`}>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="h-[4px] rounded-full transition-all duration-300"
            style={{
              width: i + 1 === current ? 22 : 10,
              background: i + 1 <= current ? p.accent : p.border,
            }}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium" style={{ color: p.muted }}>
        {current}/{total}
      </span>
    </div>
  );
}

function ModalShell({
  p,
  onClose,
  labelledBy,
  step,
  confetti,
  children,
  footer,
}: {
  p: Palette;
  onClose: () => void;
  labelledBy: string;
  step: { current: number; total: number };
  confetti?: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  useModalBehavior(onClose);

  return (
    <div
      className="stone-modal fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{
        background: p.overlay,
        backdropFilter: "blur(6px)",
        animation: "stone-fade 0.2s ease-out both",
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Keyframes />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative flex min-h-[560px] w-full max-w-[680px] flex-col overflow-hidden rounded-[20px] border"
        style={{
          background: p.bg,
          borderColor: p.border,
          color: p.text,
          maxHeight: "calc(100vh - 32px)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.45)",
          animation: "stone-pop 0.34s cubic-bezier(.2,.9,.25,1) both",
        }}
      >
        {confetti && <Confetti accent={p.accent} />}

        <div className="absolute left-6 top-6 z-10">
          <StepDots current={step.current} total={step.total} p={p} />
        </div>

        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="absolute right-6 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
          style={{ borderColor: p.border, color: p.muted }}
          onMouseEnter={(e) => (e.currentTarget.style.background = p.surfaceHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>

        <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 pb-8 pt-[78px] sm:px-[96px]">
          {children}
        </div>

        <div
          className="relative flex min-h-[66px] shrink-0 items-center justify-between gap-3 border-t px-6"
          style={{ borderColor: p.border }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

function Avatar({ account, p }: { account: OnboardingAccount; p: Palette }) {
  const Icon = ICONS[account.key];
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(account.avatarUrl) && !failed;

  return (
    <div className="relative mb-9 h-[68px] w-[68px]" style={{ animation: "stone-rise 0.4s ease-out both" }}>
      {hasImage ? (
        <img
          src={account.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full rounded-[14px] object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-[14px] border"
          style={{ background: p.surface, borderColor: p.border }}
        >
          <Icon className="h-7 w-7" size={28} />
        </div>
      )}

      <span
        className="absolute -left-[10px] -top-[10px] flex h-[24px] w-[24px] items-center justify-center rounded-full border-2"
        style={{
          background: p.accent,
          color: p.accentText,
          borderColor: p.bg,
          animation: "stone-badge 0.5s cubic-bezier(.2,.9,.3,1) 0.25s both",
        }}
      >
        <CheckIcon className="h-3 w-3" />
      </span>

      <span
        className="absolute -bottom-[10px] -right-[12px] flex h-[28px] w-[28px] items-center justify-center rounded-[9px] border-2 shadow"
        style={{ background: "#ffffff", color: "#0a0a0a", borderColor: p.bg }}
      >
        <Icon className="h-[14px] w-[14px]" size={14} />
      </span>
    </div>
  );
}

function PrimaryButton({
  p,
  onClick,
  loading,
  autoFocus,
  children,
}: {
  p: Palette;
  onClick: () => void;
  loading?: boolean;
  autoFocus?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      disabled={loading}
      onClick={onClick}
      className="inline-flex h-[38px] items-center justify-center gap-2 rounded-[10px] px-5 text-[14px] font-semibold transition-all hover:opacity-90 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ background: p.accent, color: p.accentText, outlineColor: p.accent }}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

function GhostButton({
  p,
  onClick,
  children,
}: {
  p: Palette;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[38px] items-center gap-2 rounded-[10px] px-3 text-[13px] font-medium transition-colors"
      style={{ color: p.muted }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = p.surfaceHover;
        e.currentTarget.style.color = p.text;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = p.muted;
      }}
    >
      {children}
    </button>
  );
}

/* ============================================================================
   ÉTAPE 1 : "C'EST LE BON COMPTE ?"
============================================================================ */

export function ConfirmAccountModal({
  account,
  isDark,
  loading,
  onConfirm,
  onReject,
  onClose,
}: {
  account: OnboardingAccount;
  isDark: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const p = palette(isDark);

  return (
    <ModalShell
      p={p}
      onClose={onClose}
      labelledBy="stone-confirm-title"
      step={{ current: 1, total: 2 }}
      footer={
        <>
          <GhostButton p={p} onClick={onReject}>
            <SwapIcon className="h-4 w-4" /> Ce n'est pas mon compte
          </GhostButton>
          <PrimaryButton p={p} onClick={onConfirm} loading={loading} autoFocus>
            Oui, c'est bien lui <ArrowIcon className="h-4 w-4" />
          </PrimaryButton>
        </>
      }
    >
      <Avatar account={account} p={p} />

      <h2
        id="stone-confirm-title"
        className="text-center text-[22px] font-semibold tracking-[-0.02em]"
        style={{ animation: "stone-rise 0.4s ease-out 0.05s both" }}
      >
        Est-ce le bon compte ?
      </h2>
      <p
        className="mb-8 mt-3 max-w-[380px] text-center text-[14px] leading-relaxed"
        style={{ color: p.muted, animation: "stone-rise 0.4s ease-out 0.1s both" }}
      >
        Vérifie que c'est bien le {account.accountLabel.toLowerCase()} que tu veux relier à Stone.
      </p>

      <div
        className="flex w-full items-center gap-3 rounded-[12px] border px-4 py-3.5"
        style={{
          background: p.surface,
          borderColor: p.accent,
          animation: "stone-rise 0.4s ease-out 0.15s both",
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{account.handle || account.name}</p>
          <p className="mt-0.5 text-[12px]" style={{ color: p.muted }}>
            {account.accountLabel} · {account.name}
          </p>
        </div>
        <span
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
          style={{ background: p.accent, color: p.accentText }}
        >
          <CheckIcon className="h-3 w-3" />
        </span>
      </div>

      <p
        className="mt-5 text-center text-[12px]"
        style={{ color: p.muted, animation: "stone-rise 0.4s ease-out 0.2s both" }}
      >
        Tu pourras te déconnecter à tout moment depuis la page Channels.
      </p>
    </ModalShell>
  );
}

/* ============================================================================
   ÉTAPE 2 : FRÉQUENCE DE PUBLICATION
============================================================================ */

type FrequencyOption = {
  id: "1x" | "3x" | "5x" | "custom";
  label: string;
  hint: string;
  tile: ReactNode;
  dark: [string, string];
  light: [string, string];
};

const OPTIONS: FrequencyOption[] = [
  { id: "1x", label: "Keep it steady · 1 time/week", hint: "Idéal pour démarrer", tile: "1x", dark: ["#2a1f4a", "#cdb8ff"], light: ["#ede9fe", "#5b21b6"] },
  { id: "3x", label: "Build a presence · 3 times/week", hint: "Recommandé", tile: "3x", dark: ["#5a2f10", "#ffd2a8"], light: ["#ffedd5", "#9a3412"] },
  { id: "5x", label: "Reach new heights · 5 times/week", hint: "Croissance rapide", tile: "5x", dark: ["#0f4a44", "#a8f0e4"], light: ["#ccfbf1", "#115e59"] },
  { id: "custom", label: "Choose your goal", hint: "Ton propre rythme", tile: <PencilIcon className="h-4 w-4" />, dark: ["#4a1a4a", "#f0a8f0"], light: ["#fae8ff", "#86198f"] },
];

function cadenceLabel(perWeek: number): string {
  if (perWeek === 1) return "Environ 1 publication par semaine";
  if (perWeek === 7) return "1 publication par jour";
  if (perWeek > 7) return `Environ ${(perWeek / 7).toFixed(1).replace(".", ",")} publications par jour`;
  const days = (7 / perWeek).toFixed(1).replace(".0", "").replace(".", ",");
  return `Environ 1 publication tous les ${days} jours`;
}

export function PostingFrequencyModal({
  account,
  isDark,
  onNext,
  onClose,
}: {
  account: OnboardingAccount;
  isDark: boolean;
  onNext: (postsPerWeek: number) => void;
  onClose: () => void;
}) {
  const p = palette(isDark);
  const [selected, setSelected] = useState<FrequencyOption["id"]>("3x");
  const [custom, setCustom] = useState(7);
  const [showTip, setShowTip] = useState(false);
  const [saving, setSaving] = useState(false);

  const perWeek = selected === "custom" ? custom : parseInt(selected, 10);

  const move = (delta: number) => {
    const index = OPTIONS.findIndex((o) => o.id === selected);
    const next = OPTIONS[(index + delta + OPTIONS.length) % OPTIONS.length];
    setSelected(next.id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
  };

  const submit = () => {
    setSaving(true);
    window.setTimeout(() => onNext(perWeek), 280);
  };

  return (
    <ModalShell
      p={p}
      onClose={onClose}
      labelledBy="stone-frequency-title"
      step={{ current: 2, total: 2 }}
      confetti
      footer={
        <>
          <div className="relative">
            <GhostButton p={p} onClick={() => setShowTip((v) => !v)}>
              <HelpIcon className="h-4 w-4" /> What's a Recommended Time?
            </GhostButton>
            {showTip && (
              <div
                role="tooltip"
                className="absolute bottom-[calc(100%+10px)] left-0 w-[290px] rounded-xl border p-3.5 text-[12.5px] leading-relaxed shadow-xl"
                style={{
                  background: p.bg,
                  borderColor: p.border,
                  color: p.muted,
                  animation: "stone-rise 0.2s ease-out both",
                }}
              >
                <span className="font-semibold" style={{ color: p.text }}>
                  Les horaires recommandés
                </span>{" "}
                sont les créneaux où ton audience est la plus active. Stone les place dans ta file d'attente
                selon ton objectif hebdomadaire.
              </div>
            )}
          </div>

          <PrimaryButton p={p} onClick={submit} loading={saving} autoFocus>
            Save goal <ArrowIcon className="h-4 w-4" />
          </PrimaryButton>
        </>
      }
    >
      <Avatar account={account} p={p} />

      <h2
        id="stone-frequency-title"
        className="text-center text-[22px] font-semibold tracking-[-0.02em]"
        style={{ animation: "stone-rise 0.4s ease-out 0.05s both" }}
      >
        How many times a week would you like to post?
      </h2>
      <p
        className="mb-7 mt-3 text-center text-[13.5px]"
        style={{ color: p.muted, animation: "stone-rise 0.4s ease-out 0.1s both" }}
      >
        This posting goal will tell us how many times to recommend per week.
      </p>

      <div
        role="radiogroup"
        aria-label="Posting frequency"
        onKeyDown={onKeyDown}
        className="flex w-full flex-col gap-2"
      >
        {OPTIONS.map((option, i) => {
          const active = selected === option.id;
          const [tileBg, tileFg] = isDark ? option.dark : option.light;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(option.id)}
              className="group flex h-[54px] w-full items-center gap-4 rounded-[12px] border px-2 text-left transition-all duration-150 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: active ? p.surface : "transparent",
                borderColor: active ? p.accent : p.border,
                outlineColor: p.accent,
                animation: `stone-rise 0.4s ease-out ${140 + i * 55}ms both`,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = p.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = active ? p.surface : "transparent";
              }}
            >
              <span
                className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[9px] text-[16px] font-semibold transition-transform duration-150 group-hover:scale-105"
                style={{ background: tileBg, color: tileFg }}
              >
                {option.tile}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{option.label}</span>
                <span className="block truncate text-[11.5px]" style={{ color: p.muted }}>
                  {option.hint}
                </span>
              </span>

              <span
                className="mr-3 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition-colors"
                style={{ borderColor: active ? p.accent : p.muted }}
              >
                <span
                  className="h-[8px] w-[8px] rounded-full transition-transform duration-200"
                  style={{ background: p.accent, transform: active ? "scale(1)" : "scale(0)" }}
                />
              </span>
            </button>
          );
        })}
      </div>

      {selected === "custom" && (
        <div
          className="mt-3 flex w-full items-center justify-between rounded-[12px] border px-4 py-3"
          style={{ background: p.surface, borderColor: p.border, animation: "stone-rise 0.25s ease-out both" }}
        >
          <span className="text-[13px] font-medium">Publications par semaine</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Diminuer"
              disabled={custom <= 1}
              onClick={() => setCustom((n) => Math.max(1, n - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-30"
              style={{ borderColor: p.border }}
            >
              <MinusIcon className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-[16px] font-semibold tabular-nums">{custom}</span>
            <button
              type="button"
              aria-label="Augmenter"
              disabled={custom >= 21}
              onClick={() => setCustom((n) => Math.min(21, n + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-30"
              style={{ borderColor: p.border }}
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <p
        className="mt-5 text-center text-[12.5px]"
        style={{ color: p.muted, animation: "stone-rise 0.4s ease-out 0.45s both" }}
        aria-live="polite"
      >
        {cadenceLabel(perWeek)}
      </p>
    </ModalShell>
  );
}

/* ============================================================================
   À MONTER SUR LA PAGE /insight
============================================================================ */

export default function FrequencyOnboarding() {
  const { theme } = useTheme();
  const [account, setAccount] = useState<OnboardingAccount | null>(() => readQueued());

  if (!account) return null;

  const dismiss = () => {
    clearQueued();
    setAccount(null);
  };

  return (
    <PostingFrequencyModal
      account={account}
      isDark={theme === "dark"}
      onClose={dismiss}
      onNext={(postsPerWeek) => {
        try {
          localStorage.setItem(GOAL_KEY(account.key), String(postsPerWeek));
        } catch {
          /* noop */
        }
        dismiss();
      }}
    />
  );
}