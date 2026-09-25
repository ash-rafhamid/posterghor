"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { useLang } from "@/i18n";
import { sampleFor } from "@/lib/samples";
import { cn } from "@/lib/utils";
import type { StudioTemplate } from "./state";

/** Horizontal strip of template thumbnails. */
export function TemplatePicker({ templates, value, onChange }: { templates: StudioTemplate[]; value: string; onChange: (slug: string) => void }) {
  const { lang, t } = useLang();
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // keep the chosen template in view (e.g. when arriving via ?template=…)
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [value]);

  return (
    <div role="radiogroup" aria-label="Template" className="scrollbar-none -mx-2 flex snap-x gap-4 overflow-x-auto px-3 pb-4 pt-4">
      {templates.map((tpl) => {
        const selected = tpl.slug === value;
        const src = sampleFor(tpl.slug)?.src ?? tpl.thumbnailUrl;
        return (
          <button key={tpl.slug} ref={selected ? selectedRef : undefined} type="button" role="radio" aria-checked={selected} onClick={() => onChange(tpl.slug)} className="group w-[116px] shrink-0 snap-start text-left">
            <span
              className={cn(
                "relative block overflow-hidden rounded-[12px] border-[3px] border-ink bg-mist p-1 transition-all duration-200",
                selected ? "-translate-y-1.5 rotate-[-1.5deg] shadow-[0_0_0_4px_var(--color-gold),0_0_0_7px_var(--color-ink)]" : "group-hover:-translate-y-1 group-hover:rotate-[1deg]",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {src ? <img src={src} alt="" width={720} height={960} className="block aspect-[3/4] w-full rounded-[7px] object-cover" loading="lazy" /> : <span className="block aspect-[3/4]" />}
              {selected ? (
                <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-[2.5px] border-ink bg-gold">
                  <Check size={13} strokeWidth={4} />
                </span>
              ) : null}
            </span>
            <span className={cn("mt-3 block font-display text-[1rem] font-extrabold leading-tight", selected && "text-rose")}>{lang === "bn" ? tpl.titleBn : tpl.title}</span>
            <span className="mt-0.5 block text-[0.72rem] font-bold text-ink-3">{t(`occasion.${tpl.occasionType}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
