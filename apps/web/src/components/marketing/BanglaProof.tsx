"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Sparkle, Sticker } from "@/components/ui/ornaments";
import { useT } from "@/i18n";
import { SectionHead } from "./SectionHead";

const SAMPLE = "মহান বিজয় দিবস";

/**
 * The pitch in one picture: an image model "draws" letters (melted conjuncts) — Posterghor typesets real glyphs.
 * The left board is deliberately distorted with an SVG displacement filter to show the failure mode.
 */
export function BanglaProof() {
  const t = useT();
  const points = [t("proof.point1"), t("proof.point2"), t("proof.point3")];
  return (
    <section
      className="scallop-t scallop-b relative bg-teal-deep py-28 text-white"
      style={{ ["--sec" as string]: "var(--color-teal-deep)", backgroundImage: "url(/art/pattern.svg)", backgroundSize: "168px 168px" }}
    >
      <svg width="0" height="0" aria-hidden className="absolute">
        <filter id="melt" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.06" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="15" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </svg>

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div>
          <SectionHead tone="canvas" eyebrow={t("proof.eyebrow")} title={t("proof.title")} sub={t("proof.body")} />
          <ul className="mt-8 space-y-3.5">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 font-display text-[1.2rem] font-bold">
                <span className="grid h-8 w-8 place-items-center rounded-full border-[3px] border-ink bg-gold text-ink">
                  <Check size={17} strokeWidth={3.4} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-9 sm:grid-cols-2">
          <motion.figure initial={{ opacity: 0, rotate: -6, y: 24 }} whileInView={{ opacity: 1, rotate: -2.5, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="plate plate-blush relative p-5">
            <Sticker color="red" points={12} className="absolute -right-5 -top-7 z-10 h-[4.6rem] w-[4.6rem] rotate-[10deg] font-display text-[1.02rem] font-extrabold leading-none text-white">
              ✗ AI
            </Sticker>
            <div className="grid min-h-40 place-items-center overflow-hidden rounded-2xl border-[3px] border-dashed border-ink/30 bg-white px-3 py-6">
              <span aria-hidden className="select-none text-center font-display text-[2.1rem] font-extrabold leading-tight tracking-[-0.05em] text-ink/85" style={{ filter: "url(#melt)" }}>
                {SAMPLE}
              </span>
            </div>
            <figcaption className="mt-4">
              <p className="font-display text-[1.25rem] font-extrabold">{t("proof.bad")}</p>
              <p className="text-[0.95rem] font-semibold text-red-deep">{t("proof.badNote")}</p>
            </figcaption>
          </motion.figure>

          <motion.figure initial={{ opacity: 0, rotate: 6, y: 24 }} whileInView={{ opacity: 1, rotate: 1.8, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="plate plate-butter relative p-5 sm:mt-10">
            <Sticker color="teal" points={12} className="absolute -right-5 -top-7 z-10 h-[4.6rem] w-[4.6rem] rotate-[-8deg] font-display text-[1.02rem] font-extrabold leading-none text-ink">
              ✓ OK
            </Sticker>
            <div className="grid min-h-40 place-items-center rounded-2xl border-[3px] border-ink bg-white px-3 py-6">
              <span className="text-center font-display text-[2.1rem] font-extrabold leading-tight text-ink">{SAMPLE}</span>
            </div>
            {/* proofreader's marks */}
            <div aria-hidden className="mt-3 flex flex-wrap gap-2">
              {["যুক্তাক্ষর", "কার-চিহ্ন", "রেফ"].map((m) => (
                <span key={m} className="flex items-center gap-1 rounded-full border-2 border-ink bg-teal px-2.5 py-0.5 font-display text-[0.78rem] font-extrabold text-ink">
                  <Sparkle size={12} /> {m}
                </span>
              ))}
            </div>
            <figcaption className="mt-4">
              <p className="font-display text-[1.25rem] font-extrabold">{t("proof.good")}</p>
              <p className="text-[0.95rem] font-semibold text-teal-deep">{t("proof.goodNote")}</p>
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}
