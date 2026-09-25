"use client";

import { Check, Copy, Quote, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { resolvePoster, type ApiPoster, type ApiTemplate } from "@poster/shared";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

/** "Art director's notes": what Gemini (or the curated fallback) decided, with the palette it used. */
export function ArtNotes({ poster, template, onTagline }: { poster: ApiPoster; template?: ApiTemplate; onTagline: (t: string) => void }) {
  const t = useT();
  const scheme = poster.scheme;
  if (!scheme) return null;

  let swatches: Array<{ label: string; hex: string }> = [];
  if (template) {
    const r = resolvePoster({
      layout: template.layoutConfig,
      content: { occasion: poster.formData.occasion, headline: "", name: "", photos: [] },
      scheme,
      variant: scheme.variant,
    });
    swatches = [
      { label: "bgFrom", hex: r.palette.bgFrom },
      { label: "bgTo", hex: r.palette.bgTo },
      { label: "primary", hex: r.palette.primary },
      { label: "secondary", hex: r.palette.secondary },
      { label: "accent", hex: r.palette.accent },
      { label: "headline", hex: r.palette.headline },
      { label: "paper", hex: r.palette.paper },
    ];
  }
  const isAi = scheme.source === "gemini";

  return (
    <section className="plate p-5 sm:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-[1.6rem]">
          <span className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-ink bg-pink">
            <WandSparkles size={20} strokeWidth={2.6} />
          </span>
          {t("poster.notes")}
        </h2>
        <span className={cn("tag", isAi ? "!bg-teal" : "!bg-butter")}>{isAi ? t("poster.sourceGemini") : t("poster.sourceFallback")}</span>
      </header>

      {scheme.colorwayName ? <p className="mt-5 font-display text-[1.7rem] font-extrabold leading-tight">{scheme.colorwayName}</p> : null}
      {scheme.mood ? <p className="mt-0.5 text-[0.95rem] font-semibold text-ink-3">{scheme.mood}</p> : null}
      {scheme.rationale ? (
        <p className="relative mt-4 rounded-2xl border-[3px] border-ink bg-blush p-4 pl-12 text-[0.98rem] leading-relaxed text-ink-2">
          <Quote size={22} strokeWidth={2.6} className="absolute left-3.5 top-4 text-rose" />
          {scheme.rationale}
        </p>
      ) : null}

      {swatches.length ? (
        <div className="mt-6">
          <p className="font-display text-[1rem] font-extrabold">{t("poster.palette")}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {swatches.map((s) => (
              <button
                key={s.label}
                type="button"
                title={`${s.label} · ${s.hex}`}
                onClick={() => {
                  void navigator.clipboard?.writeText(s.hex);
                  toast(`${s.hex} ${t("common.copy")} ✓`, { duration: 1400 });
                }}
                className="group flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-white py-1 pl-1 pr-3 transition-transform hover:-translate-y-0.5 hover:rotate-[-1deg]"
              >
                <span className="h-6 w-6 rounded-full border-2 border-ink" style={{ background: s.hex }} />
                <span className="font-mono text-[0.72rem] font-bold uppercase tracking-wider">{s.hex}</span>
                <Copy size={12} className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {scheme.taglines?.length ? (
        <div className="mt-6">
          <p className="font-display text-[1rem] font-extrabold">{t("poster.taglines")}</p>
          <p className="mb-2.5 text-[0.85rem] text-ink-3">{t("poster.taglinesHint")}</p>
          <div className="flex flex-wrap gap-2">
            {scheme.taglines.map((tag) => (
              <button key={tag} type="button" onClick={() => onTagline(tag)} className="chip font-body !text-[0.95rem]">
                <Check size={13} className="opacity-0" /> {tag}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
