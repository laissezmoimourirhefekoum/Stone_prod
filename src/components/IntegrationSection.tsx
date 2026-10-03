"use client";

import * as React from "react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";

import {
  ZapierIcon,
  ClaudeIcon,
  ChatGPTIcon,
  NotionIcon,
  GoogleIcon,
  N8nIcon,
  GoogleCalendarIcon,
  GmailIcon,
} from "../components/IntegrationIcons";

/* -------------------------------------------------------------------------- */
/*                                   Reveal                                   */
/* -------------------------------------------------------------------------- */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={visible ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal-up ${visible ? "reveal-up-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Tool mesh                                 */
/* -------------------------------------------------------------------------- */

type IconComponent = ComponentType<{ className?: string }>;

interface MeshTool {
  name: string;
  icon: IconComponent;
}

interface MeshCategory {
  job: string;
  tools: MeshTool[];
}

/* Exactly 7: two on top, three in the middle (index 3 = featured centre),
   two below. */
const CATEGORIES: MeshCategory[] = [
  { job: "Automation", tools: [{ name: "Zapier", icon: ZapierIcon }] },
  { job: "Workflows", tools: [{ name: "n8n", icon: N8nIcon }] },
  { job: "Workspace", tools: [{ name: "Notion", icon: NotionIcon }] },
  {
    job: "AI assistants",
    tools: [
      { name: "Claude", icon: ClaudeIcon },
      { name: "ChatGPT", icon: ChatGPTIcon },
    ],
  },
  { job: "Search", tools: [{ name: "Google", icon: GoogleIcon }] },
  { job: "Calendar", tools: [{ name: "Google Calendar", icon: GoogleCalendarIcon }] },
  { job: "Email", tools: [{ name: "Gmail", icon: GmailIcon }] },
];

const ACCENT = "var(--color-primary, #6366f1)";
const TILE = 80;
const FADE_S = 0.3;
const INTERVAL = 1600;

/* where each tile sits, in tile units, to choose hops by distance */
const AT: [number, number][] = [
  [0.5, 0], [1.5, 0],
  [0, 1], [1, 1], [2, 1],
  [0.5, 2], [1.5, 2],
];
const CENTRE = 3;
const RING = [0, 1, 2, 4, 5, 6];
const MIN_HOP = 1.5;

const gap = (a: number, b: number) =>
  Math.hypot(AT[a][0] - AT[b][0], AT[a][1] - AT[b][1]);

function hop(left: number[], from: number | null) {
  if (from === null) return left[Math.floor(Math.random() * left.length)];
  let pool = left.filter((c) => gap(c, from) >= MIN_HOP);
  if (!pool.length) {
    const best = Math.max(...left.map((c) => gap(c, from)));
    pool = left.filter((c) => gap(c, from) === best);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/* one loop: every ring tile once, far from the last, the centre at the
   start and halfway */
function planLoop(after: number | null) {
  const left = [...RING];
  const order: number[] = [];
  let from = after;
  while (left.length) {
    const pick = hop(left, from);
    order.push(pick);
    left.splice(left.indexOf(pick), 1);
    from = pick;
  }
  return [CENTRE, order[0], order[1], order[2], CENTRE, order[3], order[4], order[5]];
}

function Tile({
  category,
  step,
  featured,
}: {
  category: MeshCategory;
  step: number;
  featured: boolean;
}) {
  const tool = category.tools[step % category.tools.length];
  const Icon = tool.icon;

  return (
    <div
      role="img"
      aria-label={`${category.job}: ${category.tools.map((t) => t.name).join(", ")}`}
      title={category.job}
      className="relative flex rounded-xl"
      style={{
        width: TILE,
        height: TILE,
        background: featured
          ? `color-mix(in srgb, ${ACCENT} 14%, transparent)`
          : undefined,
      }}
    >
      <div
        className={
          "absolute inset-0 rounded-xl border " +
          (featured ? "" : "border-neutral-900/15 dark:border-white/15")
        }
        style={
          featured
            ? {
                borderColor: `color-mix(in srgb, ${ACCENT} 55%, transparent)`,
                boxShadow: `0 0 28px color-mix(in srgb, ${ACCENT} 30%, transparent)`,
              }
            : undefined
        }
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          /* step in the key so single-tool tiles still re-fade when picked */
          key={`${tool.name}-${step}`}
          aria-hidden
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.86 }}
          transition={{ duration: FADE_S, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-20 m-auto flex h-8 w-8 items-center justify-center"
        >
          <Icon className="h-full w-full" />
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function ToolMesh() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.3 });
  const [steps, setSteps] = useState<number[]>(() => CATEGORIES.map(() => 0));
  const queue = useRef<number[]>([]);
  const lastRing = useRef<number | null>(null);

  useEffect(() => {
    if (reduce || !inView) return;
    const id = window.setInterval(() => {
      if (!queue.current.length) queue.current = planLoop(lastRing.current);
      const next = queue.current.shift()!;
      if (next !== CENTRE) lastRing.current = next;
      setSteps((s) => s.map((v, i) => (i === next ? v + 1 : v)));
    }, INTERVAL);
    return () => window.clearInterval(id);
  }, [reduce, inView]);

  const rows = [
    CATEGORIES.slice(0, 2),
    CATEGORIES.slice(2, 5),
    CATEGORIES.slice(5, 7),
  ];
  let index = 0;

  return (
    <div ref={ref} className="tool-mesh relative mx-auto w-fit">
      {/* edges dissolve into the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, var(--mesh-fade) 78%)",
        }}
      />
      {rows.map((row, r) => (
        <div
          key={r}
          className={`flex w-fit justify-center gap-2 ${r === 1 ? "my-2" : "mx-auto"}`}
        >
          {row.map((category) => {
            const i = index++;
            return (
              <Tile
                key={category.job}
                category={category}
                step={steps[i] ?? 0}
                featured={i === CENTRE}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Integration Section                             */
/* -------------------------------------------------------------------------- */

export default function IntegrationSection() {
  return (
    <section
      id="integration"
      className="relative w-full overflow-hidden bg-white py-24 text-neutral-900 dark:bg-[#050505] dark:text-white"
    >
      <style>{`
        .reveal-up {
          opacity: 0;
          transform: translate3d(0, 18px, 0);
          transition:
            opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .reveal-up-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }

        /* colour the mesh fades into = the section background */
        .tool-mesh { --mesh-fade: #ffffff; }
        .dark .tool-mesh { --mesh-fade: #050505; }

        @media (prefers-reduced-motion: reduce) {
          .reveal-up {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1200px] px-4">
        <Reveal>
          <div className="relative overflow-hidden rounded-[40px] px-6 py-16 sm:px-12 sm:py-24">
            <div className="relative z-10 mx-auto max-w-[760px] text-center">
              <h2 className="font-display text-[clamp(32px,4.2vw,56px)] font-bold leading-[1.05] tracking-[-0.04em] text-neutral-900 dark:text-white">
                Integrate with favorite tools
              </h2>

              <p className="mx-auto mt-4 max-w-[540px] text-[clamp(14px,1.1vw,17px)] leading-relaxed text-neutral-500 dark:text-neutral-400">
                Connect your favorite tools and manage everything from one
                place.
              </p>

              <a
                href="/signup"
                className="mt-8 inline-flex rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)] transition-all hover:bg-neutral-800 hover:shadow-[0_14px_36px_-12px_rgba(0,0,0,0.5)] active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                Get started
              </a>
            </div>

            <div className="relative mt-16">
              <ToolMesh />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}