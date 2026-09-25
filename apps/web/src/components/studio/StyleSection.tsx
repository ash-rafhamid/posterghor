"use client";

import { WandSparkles } from "lucide-react";
import { DISPLAY_FONTS, FRAME_STYLES, buildFontFaceCss, mergePalette, type FrameStyle, type LayoutConfig } from "@poster/shared";
import { Segmented, Switch } from "@/components/ui/primitives";
import { useLang, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { StudioForm } from "./state";

/** @font-face for every headline font, so the picker can preview each one in its real typeface. */
const FONT_FACES = buildFontFaceCss(
  DISPLAY_FONTS.map((f) => ({ id: f.id, weights: [f.defaultWeight] })),
  (file) => `/fonts/${file}`,
);

function FrameIcon({ frame }: { frame: FrameStyle }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 26 32" width="22" height="27" aria-hidden>
      {frame === "auto" ? (
        <g {...common} strokeDasharray="3 3">
          <rect x="3" y="3" width="20" height="26" rx="3" />
        </g>
      ) : frame === "arch" ? (
        <path {...common} d="M3 29V13a10 10 0 0 1 20 0v16z" />
      ) : frame === "circle" ? (
        <circle {...common} cx="13" cy="16" r="10.5" />
      ) : frame === "rounded" ? (
        <rect {...common} x="3" y="3" width="20" height="26" rx="7" />
      ) : frame === "hex" ? (
        <path {...common} d="M13 2l10 7.5v13L13 30 3 22.5v-13z" />
      ) : frame === "fade" ? (
        <>
          <defs>
            <linearGradient id="fi-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.35" stopColor="currentColor" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="3" y="3" width="20" height="26" rx="2" fill="url(#fi-fade)" />
        </>
      ) : (
        <>
          <rect {...common} x="2.5" y="3" width="21" height="26" rx="1.5" />
          <rect x="6" y="6.5" width="14" height="14" fill="currentColor" opacity="0.35" />
        </>
      )}
    </svg>
  );
}

export function StyleSection({
  form,
  onField,
  layout,
  backdropsEnabled,
}: {
  form: StudioForm;
  onField: <K extends keyof StudioForm>(key: K, value: StudioForm[K]) => void;
  layout: LayoutConfig;
  backdropsEnabled: boolean;
}) {
  const t = useT();
  const { lang } = useLang();

  return (
    <div className="flex flex-col gap-7">
      <style>{FONT_FACES}</style>

      {/* headline font */}
      <div>
        <p className="font-display text-[1rem] font-extrabold text-ink">{t("studio.fontTitle")}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label={t("studio.fontTitle")}>
          {DISPLAY_FONTS.map((f) => {
            const on = form.headlineFont === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onField("headlineFont", f.id)}
                className={cn(
                  "rounded-2xl border-[3px] border-ink px-3 py-2.5 text-left transition-all",
                  on ? "bg-ink text-white shadow-[0_0_0_3px_var(--color-gold)]" : "bg-white hover:-translate-y-0.5 hover:bg-butter",
                )}
              >
                <span className="block text-[1.5rem] leading-tight" style={{ fontFamily: `'${f.family}', 'Hind Siliguri', sans-serif`, fontWeight: f.defaultWeight }}>
                  মহান বিজয়
                </span>
                <span className={cn("mt-1 block text-[0.74rem] font-bold text-ink-3", on && "!text-white/70")}>{lang === "bn" ? f.labelBn : f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* photo layout */}
      <div>
        <p className="font-display text-[1rem] font-extrabold text-ink">{t("studio.layoutTitle")}</p>
        <Segmented
          className="mt-2.5"
          label={t("studio.layoutTitle")}
          value={form.photoLayout}
          onChange={(v) => onField("photoLayout", v)}
          options={[
            { value: "auto", label: t("studio.layoutAuto") },
            { value: "1", label: t("studio.layout1") },
            { value: "2", label: t("studio.layout2") },
            { value: "3", label: t("studio.layout3") },
          ]}
        />
      </div>

      {/* frame */}
      <div>
        <p className="font-display text-[1rem] font-extrabold text-ink">{t("studio.frameTitle")}</p>
        <div className="mt-2.5 grid grid-cols-4 gap-2 sm:grid-cols-7" role="radiogroup" aria-label={t("studio.frameTitle")}>
          {FRAME_STYLES.map((f) => {
            const on = form.frame === f;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={on}
                title={f === "auto" ? t("studio.frameAuto") : t(`studio.frames.${f}`)}
                onClick={() => onField("frame", f)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border-[3px] border-ink px-1 py-2 transition-all",
                  on ? "bg-ink text-white shadow-[0_0_0_3px_var(--color-gold)]" : "bg-white hover:-translate-y-0.5 hover:bg-butter",
                )}
              >
                <FrameIcon frame={f} />
                <span className="text-[0.62rem] font-bold leading-none">{f === "auto" ? "Auto" : t(`studio.frames.${f}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* palette */}
      <div>
        <p className="font-display text-[1rem] font-extrabold text-ink">{t("studio.paletteTitle")}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label={t("studio.paletteTitle")}>
          <button
            type="button"
            role="radio"
            aria-checked={form.palette === "auto"}
            onClick={() => onField("palette", "auto")}
            className={cn(
              "relative overflow-hidden rounded-2xl border-[3px] border-ink p-3 text-left transition-all sm:col-span-1",
              form.palette === "auto" ? "shadow-[0_0_0_3px_var(--color-gold),0_0_0_6px_var(--color-ink)]" : "hover:-translate-y-0.5",
            )}
            style={{ background: "linear-gradient(135deg,#fff4c7,#ffd9c2 45%,#d7ecff)" }}
          >
            <span className="flex items-center gap-1.5 font-display text-sm font-extrabold">
              <WandSparkles size={15} /> {t("studio.paletteAuto")}
            </span>
            <span className="mt-1 block text-[0.74rem] leading-snug text-ink-2">{t("studio.paletteAutoHint")}</span>
          </button>
          {layout.colorways.map((cw) => {
            const p = mergePalette(layout.palette, cw.palette);
            const on = form.palette === cw.id;
            return (
              <button
                key={cw.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onField("palette", cw.id)}
                className={cn("overflow-hidden rounded-2xl border-[3px] border-ink bg-white text-left transition-all", on ? "shadow-[0_0_0_3px_var(--color-gold),0_0_0_6px_var(--color-ink)]" : "hover:-translate-y-0.5")}
              >
                <span className="relative block h-10" style={{ background: `linear-gradient(135deg, ${p.bgFrom}, ${p.bgTo})` }}>
                  <span className="absolute bottom-1.5 right-1.5 flex gap-1">
                    {[p.secondary, p.accent, p.paper].map((c, i) => (
                      <span key={i} className="h-3.5 w-3.5 rounded-full border border-black/30" style={{ background: c }} />
                    ))}
                  </span>
                </span>
                <span className="block px-2.5 py-1.5 font-display text-[0.86rem] font-extrabold leading-tight">{lang === "bn" ? cw.nameBn : cw.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {backdropsEnabled ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border-[3px] border-dashed border-ink/30 bg-mist p-3.5">
          <div>
            <p className="font-display text-[1rem] font-extrabold text-ink">{t("studio.backdrop")}</p>
            <p className="text-[0.85rem] text-ink-3">{t("studio.backdropHint")}</p>
          </div>
          <Switch checked={form.useAiBackdrop} onChange={(v) => onField("useAiBackdrop", v)} label={t("studio.backdrop")} />
        </div>
      ) : null}
    </div>
  );
}
