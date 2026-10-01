import { useEffect, useRef, useState, type ReactNode } from "react";

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
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={visible ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal-up ${
        visible ? "reveal-up-visible" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Integration Icon                              */
/* -------------------------------------------------------------------------- */

function IntegrationIcon({
  type,
}: {
  type:
    | "zapier"
    | "claude"
    | "chatgpt"
    | "notion"
    | "google"
    | "n8n"
    | "googleCalendar"
    | "gmail";
}) {
  const className = "h-5 w-5 sm:h-6 sm:w-6";

  switch (type) {
    case "zapier":
      return <ZapierIcon className={className} />;

    case "claude":
      return <ClaudeIcon className={className} />;

    case "chatgpt":
      return <ChatGPTIcon className={className} />;

    case "notion":
      return <NotionIcon className={className} />;

    case "google":
      return <GoogleIcon className={className} />;

    case "n8n":
      return <N8nIcon className={className} />;

    case "googleCalendar":
      return <GoogleCalendarIcon className={className} />;

    case "gmail":
      return <GmailIcon className={className} />;

    default:
      return null;
  }
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

        @keyframes integration-left {
          0%, 100% {
            transform: translate(0, -50%);
          }

          50% {
            transform: translate(-18px, calc(-50% - 18px));
          }
        }

        @keyframes integration-right {
          0%, 100% {
            transform: translate(0, -50%);
          }

          50% {
            transform: translate(18px, calc(-50% + 18px));
          }
        }

        .integration-left {
          animation: integration-left 5s ease-in-out infinite;
        }

        .integration-right {
          animation: integration-right 5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal-up {
            opacity: 1;
            transform: none;
            transition: none;
          }

          .integration-left,
          .integration-right {
            animation: none;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1200px] px-4">
        <Reveal>
          <div className="relative overflow-hidden rounded-[40px] px-6 py-16 sm:px-12 sm:py-24">

            {/* ---------------------------------------------------------------- */}
            {/*                              Content                             */}
            {/* ---------------------------------------------------------------- */}

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

            {/* ---------------------------------------------------------------- */}
            {/*                              Diagram                             */}
            {/* ---------------------------------------------------------------- */}

            <div className="relative mx-auto mt-16 h-[320px] w-full max-w-[900px] sm:h-[400px]">

              {/* Connecting Lines */}
              <svg
                aria-hidden="true"
                viewBox="0 0 1000 400"
                fill="none"
                className="absolute inset-0 h-full w-full text-black/[0.06] dark:text-white/[0.12]"
                preserveAspectRatio="none"
              >
                {/* Left side */}

                <path
                  d="M 100 180 Q 200 180 300 280"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />

                <path
                  d="M 220 120 Q 300 120 400 280"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />

                <path
                  d="M 350 140 Q 400 140 450 280"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />

                <path
                  d="M 150 300 Q 250 300 400 280"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />

                {/* Right side */}

                <path
                  d="M 900 180 Q 800 180 700 280"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />

                <path
                  d="M 780 120 Q 700 120 600 280"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />

                <path
                  d="M 650 140 Q 600 140 550 280"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />

                <path
                  d="M 850 300 Q 750 300 600 280"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>

              {/* ---------------------------------------------------------------- */}
              {/*                           Left Icons                            */}
              {/* ---------------------------------------------------------------- */}

              {/* Zapier */}
              <div className="integration-left absolute left-[6%] top-[38%] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05] sm:h-12 sm:w-12 dark:bg-[#1c1c1f] dark:ring-white/10">
                <IntegrationIcon type="zapier" />
              </div>

              {/* Claude */}
              <div className="integration-left absolute left-[18%] top-[22%] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05] sm:h-12 sm:w-12 dark:bg-[#1c1c1f] dark:ring-white/10">
                <IntegrationIcon type="claude" />
              </div>

              {/* ChatGPT */}
              <div className="integration-left absolute left-[32%] top-[30%] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05] sm:h-12 sm:w-12 dark:bg-[#1c1c1f] dark:ring-white/10">
                <IntegrationIcon type="chatgpt" />
              </div>

              {/* Notion */}
              <div className="integration-left absolute left-[13%] top-[75%] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05] sm:h-12 sm:w-12 dark:bg-[#1c1c1f] dark:ring-white/10">
                <IntegrationIcon type="notion" />
              </div>

              {/* ---------------------------------------------------------------- */}
              {/*                           Right Icons                           */}
              {/* ---------------------------------------------------------------- */}

              {/* Google */}
              <div className="integration-right absolute right-[6%] top-[38%] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05] sm:h-12 sm:w-12 dark:bg-[#1c1c1f] dark:ring-white/10">
                <IntegrationIcon type="google" />
              </div>

              {/* n8n */}
              <div className="integration-right absolute right-[18%] top-[22%] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05] sm:h-12 sm:w-12 dark:bg-[#1c1c1f] dark:ring-white/10">
                <IntegrationIcon type="n8n" />
              </div>

              {/* Google Calendar */}
              <div className="integration-right absolute right-[32%] top-[30%] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05] sm:h-12 sm:w-12 dark:bg-[#1c1c1f] dark:ring-white/10">
                <IntegrationIcon type="googleCalendar" />
              </div>

              {/* Gmail */}
              <div className="integration-right absolute right-[13%] top-[75%] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05] sm:h-12 sm:w-12 dark:bg-[#1c1c1f] dark:ring-white/10">
                <IntegrationIcon type="gmail" />
              </div>

              {/* ---------------------------------------------------------------- */}
              {/*                            Central Hub                          */}
              {/* ---------------------------------------------------------------- */}

              <div className="absolute left-1/2 top-[70%] z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[20px] bg-neutral-900 text-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] sm:h-20 sm:w-20 sm:rounded-[24px] dark:bg-white dark:text-neutral-900 dark:shadow-[0_20px_50px_-15px_rgba(255,255,255,0.15)]">
                <svg
                  viewBox="0 0 32 32"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 4v24M4 16h24M8 8l16 16M24 8 8 24" />
                </svg>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}