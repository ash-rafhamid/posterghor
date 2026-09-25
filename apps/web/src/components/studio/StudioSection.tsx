"use client";

import type { ReactNode } from "react";
import { Medallion } from "@/components/ui/ornaments";
import { useLang } from "@/i18n";
import { cn } from "@/lib/utils";

/** A numbered plate in the studio's left column: ১ Template, ২ Words … */
export function StudioSection({ n, title, hint, children, id, className, color = "gold" }: { n: string; title: string; hint?: string; children: ReactNode; id?: string; className?: string; color?: string }) {
  const { n: num } = useLang();
  return (
    <section id={id} className={cn("plate scroll-mt-28 p-5 pt-6 sm:p-7", className)}>
      <header className="mb-6 flex items-start gap-4">
        <Medallion size={56} color={color}>
          {num(String(Number(n)))}
        </Medallion>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-[1.75rem] leading-tight">{title}</h2>
          {hint ? <p className="mt-0.5 text-[0.95rem] text-ink-3">{hint}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

/** Row of one-tap suggestion chips. */
export function IdeaChips({ items, onPick, label }: { items: string[]; onPick: (s: string) => void; label?: string }) {
  if (!items.length) return null;
  return (
    <div className="mt-2.5">
      {label ? <p className="mb-1.5 text-[0.82rem] font-bold text-ink-3">{label}</p> : null}
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <button key={s} type="button" onClick={() => onPick(s)} className="chip text-left font-body !text-[0.95rem]">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
