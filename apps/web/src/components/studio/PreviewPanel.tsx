"use client";

import { WandSparkles } from "lucide-react";
import { mergePalette, type LayoutConfig, type ResolvedPoster } from "@poster/shared";
import { PosterPreview } from "@/components/poster/PosterPreview";
import { Hoarding } from "@/components/ui/ornaments";
import { useLang, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { StudioForm } from "./state";

/** The poster on a lit hoarding, with the template's colourways as little paint pots underneath. */
export function PreviewPanel({
  resolved,
  layout,
  form,
  onPalette,
  placeholders,
}: {
  resolved: ResolvedPoster;
  layout: LayoutConfig;
  form: StudioForm;
  onPalette: (id: string) => void;
  placeholders: boolean;
}) {
  const t = useT();
  const { lang, n } = useLang();

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="tag !bg-white">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-ink bg-rose" />
          </span>
          {t("studio.previewTitle")}
        </span>
        <span className="tag !bg-butter">
          {n(1200)}×{n(1600)} → {n(2400)}×{n(3200)}
        </span>
      </div>

      <div className="mx-auto" style={{ width: "min(100%, calc((100dvh - 24rem) * 0.75 + 64px))" }}>
        <Hoarding>
          <PosterPreview resolved={resolved} placeholders={placeholders} />
        </Hoarding>
      </div>

      {/* paint pots: one per curated colourway */}
      <div className="plate plate-flush mx-auto mt-6 flex max-w-[34rem] flex-wrap items-center justify-center gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={() => onPalette("auto")}
          aria-pressed={form.palette === "auto"}
          title={t("studio.paletteAuto")}
          className={cn("btn btn-sm", form.palette === "auto" ? "btn-gold shadow-[0_0_0_3px_var(--color-ink)]" : "btn-white")}
        >
          <WandSparkles size={15} strokeWidth={2.8} /> Auto
        </button>
        {layout.colorways.map((cw) => {
          const p = mergePalette(layout.palette, cw.palette);
          const on = form.palette === cw.id;
          return (
            <button
              key={cw.id}
              type="button"
              onClick={() => onPalette(cw.id)}
              aria-pressed={on}
              title={lang === "bn" ? cw.nameBn : cw.name}
              className={cn("relative h-10 w-10 overflow-hidden rounded-full border-[3px] border-ink transition-transform hover:scale-110", on && "scale-110 shadow-[0_0_0_3px_var(--color-gold),0_0_0_6px_var(--color-ink)]")}
              style={{ background: `linear-gradient(135deg, ${p.bgFrom} 0 50%, ${p.secondary} 50% 100%)` }}
            >
              <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-ink" style={{ background: p.accent }} />
            </button>
          );
        })}
      </div>

      <p className="mx-auto mt-4 max-w-[34rem] text-center text-[0.88rem] leading-snug text-white/75">{t("studio.editingNote")}</p>
    </div>
  );
}
