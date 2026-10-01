import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { navigate } from "../hooks/useHashRoute";
import { useUser } from "../contexts/UserContext";

/* ============================================================
   REVEAL
   ============================================================ */

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
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={visible ? { transitionDelay: `${delay}ms` } : undefined}
      className={`pricing-reveal ${
        visible ? "pricing-reveal-visible" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ============================================================
   PLANS
   ============================================================ */

const plans = [
  {
    key: "starter",
    badge: "Starter",
    monthly: 19,
    annual: 15,
    description: "Perfect For Small Teams",
    cta: "Start",
    features: ["3 Projects", "AI Applicant Screening", "AI Recruiter"],
  },
  {
    key: "pro",
    badge: "PROFESSIONAL",
    monthly: 49,
    annual: 39,
    description: "Perfect For Growing Teams",
    cta: "Start",
    featured: true,
    features: [
      "Unlimited Projects",
      "AI Applicant Screening",
      "AI Recruiter",
      "Risk-Free Guarantee",
    ],
  },
  {
    key: "enterprise",
    badge: "ENTERPRISE",
    monthly: 99,
    annual: 79,
    description: "For Large Organizations",
    cta: "Contact Us",
    salesOnly: true,
    features: [
      "Unlimited Projects",
      "AI Applicant Screening",
      "Custom Skill Assessments",
      "Custom AI Recruiter",
    ],
  },
] as const;

type Plan = (typeof plans)[number];
type PlanKey = Plan["key"];

/* ============================================================
   API BASE
   ============================================================ */

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3002";

/* ============================================================
   LECTURE DES PARAMS D'URL
   ============================================================ */

function readUrlParams(): URLSearchParams {
  const params = new URLSearchParams();

  if (typeof window === "undefined") return params;

  new URLSearchParams(window.location.search).forEach((value, key) => {
    params.set(key, value);
  });

  const rawHash = window.location.hash || "";
  const qIdx = rawHash.indexOf("?");

  if (qIdx !== -1) {
    new URLSearchParams(rawHash.slice(qIdx + 1)).forEach((value, key) => {
      params.set(key, value);
    });
  }

  return params;
}

/* ============================================================
   TOKEN HELPERS
   ============================================================ */

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function clearStoredTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

/* ============================================================
   HELPERS
   ============================================================ */

function goToSignup() {
  navigate("signup");
}

/* ============================================================
   TYPES
   ============================================================ */

type SubscriptionInfo = {
  id: string;
  status: string;
};

const ACTIVE_STATUSES = ["active", "trialing"];

/* ============================================================
   PRICING SECTION

   Comportement du bouton "Start" :
   - utilisateur connecté      → Stripe (Checkout, ou portail si déjà abonné)
   - utilisateur non connecté  → /signup (plan + période conservés)
   - Enterprise                → mailto dans tous les cas
   ============================================================ */

export default function PricingSection() {
  const { user, loading: userLoading } = useUser();
  const isLoggedIn = Boolean(user);

  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // La période reste pilotable via ?period=annual
  useEffect(() => {
    const urlPeriod = readUrlParams().get("period");
    if (urlPeriod === "annual" || urlPeriod === "monthly") {
      setPeriod(urlPeriod);
    }
  }, []);

  // Vérification de l'abonnement (uniquement si connecté)
  useEffect(() => {
    if (!isLoggedIn) {
      setHasActiveSubscription(false);
      return;
    }

    const token = getStoredToken();
    if (!token) return;

    let cancelled = false;

    fetch(`${API_BASE}/api/user`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const sub: SubscriptionInfo | null =
          data?.success && data.user?.subscription
            ? data.user.subscription
            : null;

        setHasActiveSubscription(
          Boolean(sub && ACTIVE_STATUSES.includes(sub.status)),
        );
      })
      .catch(() => {
        /* silencieux */
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const handlePlanClick = useCallback(
    async (plan: Plan) => {
      setCheckoutError(null);

      // Enterprise → mailto
      if ("salesOnly" in plan && plan.salesOnly) {
        window.location.href =
          "mailto:sales@stone.app?subject=Enterprise%20plan";
        return;
      }

      // Non connecté → /signup (on garde plan + période)
      if (!isLoggedIn) {
        goToSignup();
        return;
      }

      // Connecté → Stripe
      const token = getStoredToken();
      if (!token) {
        setCheckoutError("Session expirée. Reconnecte-toi.");
        return;
      }

      setLoadingPlan(plan.key);

      try {
        // Déjà abonné → portail Stripe, sinon Checkout
        const res = hasActiveSubscription
          ? await fetch(`${API_BASE}/api/stripe/portal`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            })
          : await fetch(`${API_BASE}/api/stripe/checkout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ plan: plan.key, period }),
            });

        if (res.status === 401) {
          clearStoredTokens();
          throw new Error("Session expirée. Reconnecte-toi.");
        }

        const data = await res.json();

        if (!res.ok || !data?.url) {
          throw new Error(
            data?.error ||
              (hasActiveSubscription
                ? "Could not open the billing portal"
                : "Could not start checkout"),
          );
        }

        window.location.href = data.url;
      } catch (err) {
        console.error("[pricing] erreur:", err);
        setCheckoutError(
          err instanceof Error ? err.message : "Unknown error",
        );
        setLoadingPlan(null);
      }
    },
    [isLoggedIn, period, hasActiveSubscription],
  );

  const getButtonText = (plan: Plan): string => {
    if ("salesOnly" in plan && plan.salesOnly) return plan.cta;
    if (isLoggedIn && hasActiveSubscription) return "Manage subscription";
    return plan.cta;
  };

  return (
    <section
      id="pricing"
      className="relative z-10 w-full overflow-hidden bg-white py-14 text-neutral-950 dark:bg-[#050505] dark:text-white"
    >
      <style>{`
        .pricing-reveal {
          opacity: 0;
          transform: translate3d(0, 18px, 0);
          transition:
            opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pricing-reveal-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        .pricing-panel-pro {
          background: linear-gradient(120deg, #dcdaf0 0%, #d6dcee 50%, #cfe0f0 100%);
        }
        .dark .pricing-panel-pro {
          background: linear-gradient(120deg, #26244a 0%, #20284a 50%, #1a3048 100%);
        }
        .pricing-cta {
          background: linear-gradient(180deg, #2b2b2d 0%, #141414 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            inset 0 -3px 6px rgba(0, 0, 0, 0.5),
            0 6px 14px -4px rgba(0, 0, 0, 0.35);
        }
        .pricing-cta:hover:not(:disabled) {
          background: linear-gradient(180deg, #38383b 0%, #1c1c1c 100%);
        }
        .pricing-cta:focus-visible {
          outline: 2px solid #6d7bd6;
          outline-offset: 3px;
        }

        /* Dark mode : bouton blanc uni, sans effet 3D */
        .dark .pricing-cta {
          background: #ffffff;
          color: #0a0a0a;
          box-shadow: none;
        }
        .dark .pricing-cta:hover:not(:disabled) {
          background: #e5e5e5;
        }

        .price-change {
          animation: price-change 280ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes price-change {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .price-change { animation: none; }
          .pricing-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center">
            <h2 className="font-display text-[clamp(28px,3.4vw,38px)] font-bold leading-none tracking-[-0.045em]">
              Pricing plans
            </h2>
            <p className="mt-2 text-[13.5px] tracking-[-0.01em] text-neutral-900 dark:text-neutral-300">
              Choose the right plan for your needs.
            </p>
          </div>

          <div className="mt-7 flex justify-center">
            <div className="inline-flex rounded-full bg-white p-1 shadow-[0_6px_16px_-10px_rgba(0,0,0,0.25)] dark:bg-white/[0.06]">
              {(["monthly", "annual"] as const).map((value) => {
                const isActive = period === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setPeriod(value)}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6d7bd6]",
                      isActive
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                        : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white",
                    ].join(" ")}
                  >
                    {value === "monthly" ? "Monthly" : "Annual"}
                    {value === "annual" ? (
                      <span className="rounded-full bg-[#dcdaf0] px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800">
                        -20%
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 grid items-start gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isFeatured = "featured" in plan && plan.featured;
              const price = period === "monthly" ? plan.monthly : plan.annual;
              const isLoading = loadingPlan === plan.key;

              return (
                <div
                  key={plan.key}
                  data-plan={plan.key}
                  className={[
                    "flex min-h-[420px] flex-col rounded-[28px] bg-white dark:bg-[#0b0b0d] dark:ring-1 dark:ring-white/[0.06] dark:shadow-none",
                    isFeatured
                      ? "shadow-[0_40px_60px_-30px_rgba(0,0,0,0.22),0_4px_16px_rgba(0,0,0,0.04)]"
                      : "shadow-[0_20px_40px_-28px_rgba(0,0,0,0.16),0_2px_10px_rgba(0,0,0,0.03)]",
                  ].join(" ")}
                >
                  {/* Bloc supérieur surélevé */}
                  <div className="rounded-[28px] bg-white p-2.5 shadow-[0_14px_28px_-16px_rgba(0,0,0,0.18)] dark:bg-[#111114] dark:shadow-none">
                    <div
                      className={[
                        "flex h-[112px] flex-col justify-between rounded-[20px] p-3",
                        isFeatured
                          ? "pricing-panel-pro"
                          : "bg-[#eeeeee] dark:bg-white/[0.04]",
                      ].join(" ")}
                    >
                      <span className="w-fit rounded-full bg-white/80 px-3 py-1.5 text-[11.5px] font-medium leading-none tracking-[-0.005em] text-neutral-950 dark:bg-white/10 dark:text-white">
                        {plan.badge}
                      </span>

                      <div className="flex items-end px-1 pb-0.5 text-neutral-950 dark:text-white">
                        <>
                          <span
                            key={`${plan.key}-${period}`}
                            className="price-change font-display text-[32px] font-semibold leading-none tracking-[-0.04em]"
                          >
                            ${price}
                          </span>
                          <span className="pb-[2px] text-[15px] font-medium tracking-[-0.03em]">
                            /month
                          </span>
                        </>
                      </div>
                    </div>

                    <p className="px-2 pb-3.5 pt-4 text-[13px] tracking-[-0.01em] text-neutral-900 dark:text-neutral-200">
                      {plan.description}
                    </p>

                    <button
                      type="button"
                      onClick={() => handlePlanClick(plan)}
                      disabled={loadingPlan !== null || userLoading}
                      className="pricing-cta inline-flex h-[42px] w-full cursor-pointer items-center justify-center rounded-full text-[13px] font-medium text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? "Redirecting…" : getButtonText(plan)}
                    </button>
                  </div>

                  {/* Fonctionnalités */}
                  <ul className="space-y-3 px-5 pb-6 pt-5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2.5 text-[13px] tracking-[-0.01em] text-neutral-900 dark:text-neutral-200"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          className="h-3.5 w-3.5 shrink-0 text-neutral-300 dark:text-neutral-500"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 8.5 6.3 11.8 13 4.5" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {checkoutError ? (
            <p
              role="alert"
              className="mt-8 text-center text-sm text-red-600 dark:text-red-400"
            >
              {checkoutError}
            </p>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}