import { useEffect, useRef, useState } from "react";

type ExpertiseItem = {
  title: string;
  description: string;
  icon: string;
  featured?: boolean;
  wide?: boolean;
};

const ITEMS: ExpertiseItem[] = [
  { title: "Affordability", description: "Access high-quality design services at a fraction of traditional costs.", icon: "bolt" },
  { title: "Consistency", description: "Ensure a consistent brand identity with regular design output.", icon: "spark" },
  { title: "Scalability", description: "Scale systems built to support growing products and businesses.", icon: "clip" },
  { title: "Speed", description: "Get quicker turnarounds on design projects without sacrificing quality at a way better price on your wallet.", icon: "palette", featured: true },
  { title: "Flexibility", description: "Adapt the service to cover a wide range of design tasks as needed.", icon: "trophy" },
  { title: "Diversity", description: "Access to a variety of styles and expertise from a pool of creative professionals and people.", icon: "target", wide: true },
  { title: "Support", description: "Enjoy dedicated customer service and revisions to perfect your designs.", icon: "headphones" },
  { title: "Convenience", description: "Streamline the design process with a simple workflow and process.", icon: "pin-shield" },
];

function CardIcon({ name }: { name: string }) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.04] text-neutral-800 shadow-[0_8px_16px_-10px_rgba(0,0,0,0.45)] dark:bg-white/[0.08] dark:text-white">
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {name === "bolt" && <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />}

        {name === "spark" && (
          <>
            <path d="m15 3-1.5 5.5L8 10l5.5 1.5L15 17l1.5-5.5L22 10l-5.5-1.5L15 3Z" />
            <path d="m5 15-.6 2.4L2 18l2.4.6L5 21l.6-2.4L8 18l-2.4-.6L5 15Z" />
          </>
        )}

        {name === "clip" && (
          <path d="M20.5 11.5 12.9 19.1a5 5 0 0 1-7.07-7.07l7.6-7.6a3.5 3.5 0 0 1 4.95 4.95l-7.6 7.6a2 2 0 0 1-2.83-2.83l7.07-7.07" />
        )}

        {name === "palette" && (
          <>
            <path d="M12 21a9 9 0 1 1 0-18c4.5 0 8.5 3.2 8.5 7 0 2.5-1.8 4-4 4h-1.7c-1 0-1.6.9-1.2 1.8.5 1 .1 2.2-1 2.7-.2.2-.4.3-.6.5Z" />
            <circle cx="8" cy="10.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="16.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
          </>
        )}

        {name === "trophy" && (
          <>
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
            <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M9 21h6" />
          </>
        )}

        {name === "target" && (
          <>
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 4V2M20 12h2M12 20v2M4 12H2" />
          </>
        )}

        {name === "headphones" && (
          <path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 0 2 2h1v-5H5a1 1 0 0 0-1 1v2Zm16 0a2 2 0 0 1-2 2h-1v-5h2a1 1 0 0 1 1 1v2Z" />
        )}

        {name === "pin-shield" && (
          <>
            <path d="M12 3c2.8 1.2 4.7 1.6 7 1.6V11c0 5-3 8.3-7 9.4-4-1.1-7-4.4-7-9.4V4.6c2.3 0 4.2-.4 7-1.6Z" />
            <circle cx="12" cy="10.3" r="1.7" />
            <path d="M12 12v3.2" />
          </>
        )}
      </svg>
    </span>
  );
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`${className} reveal-up ${visible ? "reveal-up-visible" : ""}`}>
      {children}
    </div>
  );
}

export default function ExpertiseSection() {
  return (
    <section id="expertise" className="relative scroll-mt-4 overflow-hidden bg-white px-[clamp(16px,4vw,64px)] py-[clamp(90px,12vw,170px)] text-neutral-900 dark:bg-[#050505] dark:text-white">
      <div className="mx-auto max-w-[1160px]">
        <Reveal className="mx-auto max-w-[720px] text-center">
          <h2 className="mt-5 font-display text-[clamp(32px,4.6vw,60px)] leading-[1.02] font-semibold tracking-[-0.045em]">Design support with clear direction</h2>
          <p className="mx-auto mt-5 max-w-[590px] text-[clamp(13px,1.2vw,16px)] leading-relaxed text-neutral-500 dark:text-neutral-400">A focused mix of strategy, design, and execution to help ideas become clear, refined, and ready to launch with confidence.</p>
        </Reveal>

        <div className="mt-[clamp(42px,6vw,72px)] grid auto-rows-[minmax(210px,1fr)] grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {ITEMS.map((item, index) => (
            <Reveal key={item.title} delay={index * 70} className={item.featured ? "lg:col-span-2" : item.wide ? "sm:col-span-2 lg:col-span-2" : ""}>
              <article
                className={`group relative flex h-full min-h-[210px] flex-col justify-between overflow-hidden rounded-[18px] border p-[clamp(18px,2vw,24px)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_40px_-28px_rgba(0,0,0,0.55)] ${
                  item.featured
                    ? "border-[#2c2c32] bg-[#1b1b1f] text-white shadow-[0_22px_45px_-28px_rgba(0,0,0,0.8)] dark:border-white/10"
                    : "border-black/[0.08] bg-white/75 dark:border-white/[0.08] dark:bg-white/[0.035]"
                }`}
              >
                {item.featured && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-90 mix-blend-screen"
                    style={{
                      background:
                        "radial-gradient(38% 55% at 78% 22%, rgba(255,255,255,0.22), transparent 60%), radial-gradient(45% 60% at 55% 55%, rgba(255,255,255,0.14), transparent 65%), radial-gradient(35% 50% at 30% 80%, rgba(255,255,255,0.10), transparent 60%), radial-gradient(30% 40% at 90% 85%, rgba(255,255,255,0.08), transparent 60%)",
                      filter: "blur(28px)",
                    }}
                  />
                )}
                <div className="relative z-10">
                  <CardIcon name={item.icon} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-[16px] font-medium tracking-[-0.02em]">{item.title}</h3>
                  <p className={`mt-2 max-w-[32ch] text-[12px] leading-relaxed ${item.featured ? "text-white/55" : "text-neutral-500 dark:text-neutral-400"}`}>{item.description}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}