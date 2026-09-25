"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Hoarding, Lotus, Marigold, Sparkle, Sticker } from "@/components/ui/ornaments";
import { useLang, useT } from "@/i18n";
import { SAMPLES, sampleFor } from "@/lib/samples";

/** A framed print, pinned up with a white matte. */
function Print({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={720} height={960} draggable={false} className="block w-full rounded-[10px] border-[3px] border-ink bg-white p-1.5 shadow-[0_22px_30px_-18px_rgba(6,8,70,0.85)]" />
    </div>
  );
}

function PosterCluster() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 70, damping: 16 });
  const sy = useSpring(my, { stiffness: 70, damping: 16 });
  const rotateY = useTransform(sx, [-1, 1], [-5, 5]);
  const rotateX = useTransform(sy, [-1, 1], [4, -4]);
  const { n } = useLang();

  const victory = sampleFor("bijoy-gourab") ?? SAMPLES[0]!;
  const tribute = sampleFor("nirob-shraddha") ?? SAMPLES[1]!;
  const eid = sampleFor("eid-mubarak") ?? SAMPLES[5]!;

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="relative mx-auto aspect-[1/1.08] w-full max-w-[600px]"
      style={{ perspective: 1600 }}
    >
      {/* sun disc + rays */}
      <div aria-hidden className="sunburst absolute inset-x-[-16%] bottom-[6%] top-[-6%]" />
      <div aria-hidden className="absolute left-[7%] right-[7%] top-[9%] aspect-square rounded-full border-[3px] border-ink bg-gold shadow-[inset_0_0_0_10px_rgba(255,255,255,0.28)]" />
      <div aria-hidden className="absolute left-[12%] right-[12%] top-[13.5%] aspect-square rounded-full border-[3px] border-dashed border-ink/40" />

      <motion.div style={{ rotateX, rotateY }} className="absolute inset-0">
        <Print src={tribute.src} alt={tribute.title} className="absolute left-[-2%] top-[22%] z-10 w-[46%] animate-bob" style={{ ["--r" as string]: "-9deg", transform: "rotate(-9deg)" }} />
        <Print src={eid.src} alt={eid.title} className="absolute right-[-2%] top-[17%] z-10 w-[46%] animate-bob [animation-delay:-3s]" style={{ ["--r" as string]: "8deg", transform: "rotate(8deg)" }} />
        <div className="absolute left-[17%] top-[1%] z-20 w-[66%]" style={{ transform: "rotate(-1.5deg)" }}>
          <Hoarding>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={victory.src} alt={victory.title} width={720} height={960} draggable={false} className="block w-full" />
          </Hoarding>
        </div>
      </motion.div>

      <Sticker className="absolute -right-[1%] top-[3%] z-30 h-[19%] w-[19%] rotate-[10deg] font-display text-[clamp(0.62rem,1.3vw,0.95rem)] font-extrabold leading-[1.05] text-ink">
        {n(2400)}×{n(3200)}
        <br />
        px
      </Sticker>
      <Sticker color="pink" points={12} className="absolute bottom-[19%] left-[-2%] z-30 h-[16%] w-[16%] rotate-[-9deg] font-display text-[clamp(0.6rem,1.2vw,0.9rem)] font-extrabold leading-[1.05] text-white">
        PNG
        <br />
        PDF
      </Sticker>
      <Lotus size={170} className="absolute -bottom-[3%] left-[10%] z-30 w-[29%] max-w-[170px]" />
      <Marigold size={84} className="absolute bottom-[2%] right-[8%] z-30 w-[14%] max-w-[84px] animate-spin-slow" />
      <Sparkle size={34} className="absolute left-[3%] top-[10%] z-30 animate-bob" />
      <Sparkle size={22} fill="pink" className="absolute right-[10%] top-[40%] z-30 animate-bob [animation-delay:-2s]" />
    </div>
  );
}

export function Hero() {
  const t = useT();
  const proofs = [t("hero.proof1"), t("hero.proof2"), t("hero.proof3"), t("hero.proof4")];

  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:pb-32 lg:pt-16">
        <div className="relative z-10">
          <motion.span initial={{ opacity: 0, y: 8, rotate: -5 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} transition={{ duration: 0.5 }} className="tag !bg-white">
            <Sparkle size={16} /> {t("hero.stamp")}
          </motion.span>

          <h1 className="paint mt-6 text-[clamp(2.7rem,6vw,5.5rem)] leading-[1.12]">
            <motion.span initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.55 }} className="block">
              {t("hero.line1")}
            </motion.span>
            <motion.span initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.55 }} className="block" style={{ ["--paint" as string]: "var(--color-gold)", ["--paint-shadow" as string]: "var(--color-rose)" }}>
              {t("hero.line2")}
            </motion.span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.5 }} className="mt-3 font-hand text-[clamp(1.7rem,3.2vw,2.7rem)] leading-tight text-gold [text-shadow:2px_3px_0_var(--color-ink)]">
            {t("hero.line3")}
          </motion.p>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 max-w-xl text-[1.12rem] leading-relaxed text-white/90">
            {t("hero.sub")}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-9 flex flex-wrap items-center gap-5">
            <Link href="/create" className="btn btn-gold btn-lg">
              {t("hero.ctaPrimary")} <ArrowRight size={22} strokeWidth={3} />
            </Link>
            <Link href="/templates" className="btn btn-ghost btn-lg">
              {t("hero.ctaSecondary")}
            </Link>
          </motion.div>

          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mt-10 flex flex-wrap gap-x-6 gap-y-2.5">
            {proofs.map((p) => (
              <li key={p} className="flex items-center gap-2 font-display text-[0.98rem] font-bold text-white">
                <Sparkle size={18} />
                {p}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }} className="relative z-10">
          <PosterCluster />
        </motion.div>
      </div>
    </section>
  );
}
