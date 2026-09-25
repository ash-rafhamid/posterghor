"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { LayoutGrid, PenLine, Printer, WandSparkles } from "lucide-react";
import { Medallion, Wheel } from "@/components/ui/ornaments";
import { useLang, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { SectionHead } from "./SectionHead";

const STEPS = [
  { icon: LayoutGrid, t: "how.s1t", d: "how.s1d", color: "gold" },
  { icon: PenLine, t: "how.s2t", d: "how.s2d", color: "pink" },
  { icon: WandSparkles, t: "how.s3t", d: "how.s3d", color: "teal" },
  { icon: Printer, t: "how.s4t", d: "how.s4d", color: "leaf" },
] as const;

/** Four stops along a road; a rickshaw wheel rolls down it as you scroll. */
export function HowItWorks() {
  const t = useT();
  const { n } = useLang();
  const road = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: road, offset: ["start 65%", "end 45%"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const spin = useTransform(scrollYProgress, [0, 1], [0, 1080]);

  return (
    <section className="relative mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
      <SectionHead align="center" eyebrow={t("how.eyebrow")} title={t("how.title")} />

      <div ref={road} className="relative mt-16">
        {/* the road: night-blue tarmac, white lane dashes */}
        <div aria-hidden className="absolute bottom-0 left-[26px] top-0 w-[46px] -translate-x-1/2 rounded-full border-[3px] border-ink bg-blue-night md:left-1/2">
          <div className="road-dash absolute inset-x-[19px] inset-y-4" />
        </div>
        <motion.div aria-hidden style={{ top: y }} className="absolute left-[26px] z-20 -translate-x-1/2 -translate-y-1/2 md:left-1/2">
          <motion.div style={{ rotate: spin }}>
            <Wheel size={64} />
          </motion.div>
        </motion.div>

        <ol className="relative space-y-12 md:space-y-16">
          {STEPS.map((s, i) => {
            const right = i % 2 === 1;
            return (
              <li key={s.t} className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-5 md:grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)] md:gap-x-0">
                <div className="relative z-10 md:col-start-2 md:row-start-1">
                  <div className="grid justify-items-center pt-2">
                    <Medallion size={52} color={s.color}>
                      {n(i + 1)}
                    </Medallion>
                  </div>
                </div>
                <motion.article
                  initial={{ opacity: 0, x: right ? 40 : -40, rotate: right ? 2 : -2 }}
                  whileInView={{ opacity: 1, x: 0, rotate: right ? 0.6 : -0.6 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className={cn("plate relative p-6 pr-20 md:max-w-[440px]", right ? "md:col-start-3 md:row-start-1 md:justify-self-start" : "md:col-start-1 md:row-start-1 md:justify-self-end")}
                >
                  <span className="absolute -right-3 -top-4 grid h-14 w-14 place-items-center rounded-full border-[3px] border-ink" style={{ background: `var(--color-${s.color})` }}>
                    <s.icon size={26} strokeWidth={2.6} className="text-ink" />
                  </span>
                  <h3 className="text-[1.7rem]">{t(s.t)}</h3>
                  <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-2">{t(s.d)}</p>
                </motion.article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
