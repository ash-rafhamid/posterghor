"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useLang, useT } from "@/i18n";
import { SAMPLES, type Sample } from "@/lib/samples";
import { cn } from "@/lib/utils";
import { SectionHead } from "./SectionHead";

/** A poster pegged to the line; it sways a little, and settles when you reach for it. */
function Hanging({ s, i }: { s: Sample; i: number }) {
  const t = useT();
  const { lang } = useLang();
  const tilt = 1.4 + (i % 3) * 0.5;
  return (
    <motion.div initial={{ opacity: 0, y: -30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.55, delay: (i % 3) * 0.08 }} className="w-[68vw] max-w-[300px] shrink-0 snap-center md:w-auto md:max-w-none">
      <Link
        href={`/create?template=${s.slug}`}
        className="group block origin-top animate-sway hover:[animation-play-state:paused]"
        style={{ ["--r0" as string]: `${-tilt}deg`, ["--r1" as string]: `${tilt}deg`, animationDelay: `${-i * 0.9}s`, animationDuration: `${4.6 + (i % 3) * 0.7}s` }}
      >
        <div className="relative pt-5">
          {/* clothes-pegs */}
          {[16, 76].map((left) => (
            <span key={left} aria-hidden className="absolute top-0 z-10 h-9 w-3.5 rounded-[4px] border-[2.5px] border-ink bg-gold" style={{ left: `${left}%` }}>
              <span className="absolute inset-x-0 top-[42%] h-[2.5px] bg-ink" />
            </span>
          ))}
          <div className="relative rounded-[12px] border-[3px] border-ink bg-white p-2 shadow-[0_26px_32px_-20px_rgba(6,8,70,0.9)] transition-transform duration-300 group-hover:-translate-y-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt={`${s.title} poster template`} loading="lazy" width={720} height={960} className="block w-full rounded-[6px]" />
            <span className="btn btn-gold btn-sm pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              {t("templates.use")} <ArrowUpRight size={15} strokeWidth={3} />
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-start justify-between gap-3 px-1">
          <p className="font-display text-[1.35rem] font-extrabold leading-tight text-white">{lang === "bn" ? s.titleBn : s.title}</p>
          <span className="tag !bg-white">{t(`occasion.${s.occasion}`)}</span>
        </div>
      </Link>
    </motion.div>
  );
}

function Row({ items, offset = 0, className }: { items: Sample[]; offset?: number; className?: string }) {
  return (
    <div className={cn("relative pt-3", className)}>
      <div aria-hidden className="rope absolute inset-x-[-2%] top-0" />
      {items.map((s, i) => (
        <Hanging key={s.slug} s={s} i={i + offset} />
      ))}
    </div>
  );
}

export function Showcase() {
  const t = useT();
  const rows = [SAMPLES.slice(0, 3), SAMPLES.slice(3, 6)];
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHead eyebrow={t("showcase.eyebrow")} title={t("showcase.title")} sub={t("showcase.sub")} />
        <Link href="/templates" className="btn btn-white">
          {t("showcase.cta")} <ArrowUpRight size={19} strokeWidth={3} />
        </Link>
      </div>

      {/* phones: one long line to swipe along */}
      <div className="scrollbar-none mt-14 md:hidden">
        <Row items={SAMPLES} className="flex snap-x gap-6 overflow-x-auto px-2 pb-6 pt-3" />
      </div>
      {/* desktop: two lines of three */}
      <div className="mt-14 hidden space-y-16 md:block">
        {rows.map((r, ri) => (
          <Row key={ri} items={r} offset={ri * 3} className="grid grid-cols-3 gap-x-10" />
        ))}
      </div>
    </section>
  );
}
