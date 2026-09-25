"use client";

import Link from "next/link";
import { ArrowRight, FileImage, History, RefreshCw, ShieldCheck, Type, WandSparkles, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { Bunting, Lotus, Marigold, Wheel } from "@/components/ui/ornaments";
import { useT, type TKey } from "@/i18n";
import { SectionHead } from "./SectionHead";

type Feature = { icon: LucideIcon; t: TKey; d: TKey };
const PANELS: Array<{ color: "butter" | "blush" | "aqua"; crown: "marigold" | "lotus" | "wheel"; items: [Feature, Feature] }> = [
  {
    color: "butter",
    crown: "marigold",
    items: [
      { icon: Type, t: "features.f1t", d: "features.f1d" },
      { icon: FileImage, t: "features.f3t", d: "features.f3d" },
    ],
  },
  {
    color: "blush",
    crown: "lotus",
    items: [
      { icon: WandSparkles, t: "features.f2t", d: "features.f2d" },
      { icon: RefreshCw, t: "features.f4t", d: "features.f4d" },
    ],
  },
  {
    color: "aqua",
    crown: "wheel",
    items: [
      { icon: ShieldCheck, t: "features.f5t", d: "features.f5d" },
      { icon: History, t: "features.f6t", d: "features.f6d" },
    ],
  },
];

const BG = { butter: "bg-butter", blush: "bg-blush", aqua: "bg-aqua" } as const;

/** Six features, told as three arched panels — like the painted back of a rickshaw. */
export function Features() {
  const t = useT();
  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6">
      <SectionHead align="center" eyebrow={t("features.eyebrow")} title={t("features.title")} />
      <div className="mt-20 grid gap-x-8 gap-y-20 md:grid-cols-3">
        {PANELS.map((p, i) => (
          <motion.article
            key={p.color}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: i * 0.1 }}
            className={`relative rounded-t-[999px] border-[3px] border-ink px-7 pb-9 pt-28 text-ink ${BG[p.color]}`}
          >
            {/* inner arch line + the medallion at the crown */}
            <span aria-hidden className="pointer-events-none absolute inset-[8px] rounded-t-[999px] border-2 border-dashed border-ink/20" />
            <span aria-hidden className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[52%]">
              {p.crown === "marigold" ? <Marigold size={96} /> : p.crown === "lotus" ? <Lotus size={132} /> : <Wheel size={96} />}
            </span>
            {p.items.map((f, j) => (
              <div key={f.t} className={j ? "mt-7 border-t-[3px] border-dashed border-ink/20 pt-7" : ""}>
                <h3 className="flex items-center gap-2.5 text-[1.45rem]">
                  <f.icon size={22} strokeWidth={2.7} className="shrink-0" /> {t(f.t)}
                </h3>
                <p className="mt-2 text-[1.02rem] leading-relaxed text-ink-2">{t(f.d)}</p>
              </div>
            ))}
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  const t = useT();
  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-4 sm:px-6">
      <div className="relative overflow-hidden rounded-[34px] border-[3px] border-ink bg-gold px-6 pb-16 pt-24 text-center text-ink shadow-[0_34px_50px_-30px_rgba(6,8,70,0.9)] sm:px-12">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[-7px]">
          <Bunting height={74} tile={264} flags={6} />
        </div>
        <Wheel size={440} spin rim="rose" className="pointer-events-none absolute -bottom-60 -right-32" />
        <Wheel size={300} spin rim="teal" className="pointer-events-none absolute -bottom-40 -left-24" />
        <Lotus size={150} className="pointer-events-none absolute -bottom-2 left-[12%] hidden md:block" />
        <Marigold size={88} className="pointer-events-none absolute bottom-6 right-[14%] hidden md:block" />
        <div className="relative">
          <h2 className="paint mx-auto max-w-3xl text-[clamp(2.2rem,5.2vw,4.2rem)] leading-[1.14]">{t("cta.title")}</h2>
          <p className="mt-4 text-[1.2rem] font-semibold text-ink-2">{t("cta.sub")}</p>
          <Link href="/create" className="btn btn-rose btn-lg mt-9">
            {t("cta.button")} <ArrowRight size={22} strokeWidth={3} />
          </Link>
        </div>
      </div>
    </section>
  );
}
