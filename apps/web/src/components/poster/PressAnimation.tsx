"use client";

import { useEffect, useState } from "react";
import { Camera, Check, Clock, HardDriveDownload, Printer, WandSparkles } from "lucide-react";
import { POSTER_STAGES, type PosterStage } from "@poster/shared";
import { Hoarding, Sparkle, Wheel } from "@/components/ui/ornaments";
import { Spinner } from "@/components/ui/primitives";
import { useLang, useT } from "@/i18n";
import { cn } from "@/lib/utils";

const STAGE_ICON = { queued: Clock, photos: Camera, art_direction: WandSparkles, rendering: Printer, saving: HardDriveDownload, done: Check } as const;
const LISTED: PosterStage[] = ["photos", "art_direction", "rendering", "saving"];

/**
 * The waiting room: the template's design is "painted" onto a lit hoarding top-to-bottom as the server moves through
 * its stages, next to a live step list.
 */
export function PressAnimation({ stage, pct, image }: { stage: PosterStage; pct: number; image?: string }) {
  const t = useT();
  const { n } = useLang();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // the sheet is revealed a little ahead of the reported progress so it never looks stuck
  const reveal = Math.min(100, Math.max(6, pct));
  const idx = POSTER_STAGES.indexOf(stage);

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-14 py-6 md:grid-cols-[minmax(0,440px)_1fr]">
      <div className="relative mx-auto w-full max-w-[440px]">
        <Hoarding>
          <div className="relative aspect-[3/4] overflow-hidden bg-mist">
            {image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.16] grayscale" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-[clip-path,filter] duration-[1400ms] ease-out"
                  style={{ clipPath: `inset(0 0 ${100 - reveal}% 0)`, filter: `blur(${Math.max(0, (100 - pct) / 14)}px)` }}
                />
              </>
            ) : (
              <div className="absolute inset-0 animate-pulse bg-butter" />
            )}
            {/* the brush edge */}
            <div className="pointer-events-none absolute inset-x-0 transition-[top] duration-[1400ms] ease-out" style={{ top: `${reveal}%` }}>
              <div className="h-[6px] bg-gold shadow-[0_0_0_3px_var(--color-ink),0_0_26px_6px_rgba(255,189,26,0.75)]" />
              <div className="h-12 -translate-y-full bg-gradient-to-t from-gold/30 to-transparent" />
            </div>
            <span className="tag absolute bottom-3 right-3 !bg-white">{n(pct)}%</span>
          </div>
        </Hoarding>
      </div>

      <div className="relative">
        <Wheel size={200} spin className="pointer-events-none absolute -right-10 -top-24 hidden opacity-90 lg:block" />
        <span className="tag !bg-white">
          <Sparkle size={15} /> {t("poster.composing")}
        </span>
        <h1 className="paint mt-5 text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1.16]">{t("poster.composing")}…</h1>
        <p className="mt-3 max-w-md text-[1.15rem] text-white/85">{t("poster.composingSub")}</p>

        <ol className="mt-9 space-y-3">
          {LISTED.map((s) => {
            const si = POSTER_STAGES.indexOf(s);
            const state = idx > si || stage === "done" ? "done" : idx === si ? "active" : "todo";
            const Icon = STAGE_ICON[s];
            return (
              <li key={s} className={cn("plate plate-flush flex items-center gap-4 !rounded-2xl px-4 py-3 transition-all", state === "active" ? "plate-butter -translate-y-0.5" : state === "done" ? "plate-aqua" : "opacity-70")}>
                <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full border-[3px] border-ink", state === "done" ? "bg-teal" : state === "active" ? "bg-gold" : "bg-mist")}>
                  {state === "done" ? <Check size={20} strokeWidth={3.4} /> : state === "active" ? <Spinner size={20} /> : <Icon size={19} strokeWidth={2.6} />}
                </span>
                <span className="font-display text-[1.15rem] font-extrabold">{t(`poster.${s}`)}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 font-display text-[1.1rem] font-bold text-white/80">
          {n(String(Math.floor(elapsed / 60)).padStart(2, "0"))}:{n(String(elapsed % 60).padStart(2, "0"))}
        </p>
      </div>
    </div>
  );
}
