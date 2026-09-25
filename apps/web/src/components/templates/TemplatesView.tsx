"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { OCCASIONS, TEMPLATE_PRESETS, type OccasionId } from "@poster/shared";
import { OccasionIcon, Pin } from "@/components/ui/ornaments";
import { PageHead } from "@/components/ui/PageHead";
import { useLang, useT } from "@/i18n";
import { api } from "@/lib/api";
import { sampleFor } from "@/lib/samples";

interface Card {
  slug: string;
  title: string;
  titleBn: string;
  description: string;
  occasion: OccasionId;
  image?: string;
}

const PRESET_CARDS: Card[] = TEMPLATE_PRESETS.map((p) => ({ slug: p.slug, title: p.title, titleBn: p.titleBn, description: p.description, occasion: p.occasionType, image: sampleFor(p.slug)?.src }));

export function TemplatesView() {
  const t = useT();
  const { lang } = useLang();
  const [occasion, setOccasion] = useState<OccasionId | "all">("all");
  const q = useQuery({ queryKey: ["templates"], queryFn: () => api.templates.list(), staleTime: 60_000, retry: 1 });

  // live templates when the API answers (admins can add more); the bundled presets otherwise
  const cards: Card[] = useMemo(() => {
    const items = q.data?.items;
    if (!items?.length) return PRESET_CARDS;
    return items.map((x) => ({ slug: x.slug, title: x.title, titleBn: x.titleBn, description: x.description, occasion: x.occasionType, image: sampleFor(x.slug)?.src ?? x.thumbnailUrl }));
  }, [q.data]);

  const shown = occasion === "all" ? cards : cards.filter((c) => c.occasion === occasion);
  const count = (o: OccasionId) => cards.filter((c) => c.occasion === o).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHead tag={t("templates.count", { n: cards.length })} title={t("templates.title")} sub={t("templates.sub")} />

      <div className="mt-10 flex flex-wrap gap-3" role="tablist" aria-label="Occasion">
        <button type="button" role="tab" aria-selected={occasion === "all"} data-active={occasion === "all"} onClick={() => setOccasion("all")} className="chip !py-1.5 !text-[1rem]">
          {t("common.all")} <span className="opacity-60">{cards.length}</span>
        </button>
        {OCCASIONS.map((o) => (
          <button key={o.id} type="button" role="tab" aria-selected={occasion === o.id} data-active={occasion === o.id} onClick={() => setOccasion(o.id)} className="chip !py-1.5 !text-[1rem]">
            <OccasionIcon id={o.id} size={22} /> {lang === "bn" ? o.bn : o.en} <span className="opacity-60">{count(o.id)}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-16 text-center text-lg text-white/80">{t("templates.empty")}</p>
      ) : (
        <div className="mt-14 grid grid-cols-1 gap-x-9 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c, i) => (
            <motion.article key={c.slug} layout className="h-full" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i % 3) * 0.07, duration: 0.45 }}>
              <Link href={`/create?template=${c.slug}`} className="group plate plate-flush flex h-full flex-col p-3 pb-5 transition-transform duration-300 hover:-translate-y-2 hover:rotate-[-0.8deg]">
                <Pin className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" />
                <div className="overflow-hidden rounded-[14px] border-[3px] border-ink bg-mist">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={`${c.title} poster template`} width={720} height={960} loading="lazy" className="block w-full" />
                  ) : (
                    <div className="aspect-[3/4]" />
                  )}
                </div>
                <div className="mt-4 flex items-start justify-between gap-3 px-2">
                  <div className="min-w-0">
                    <h2 className="text-[1.6rem] leading-tight">{lang === "bn" ? c.titleBn : c.title}</h2>
                    <p className="mt-0.5 text-[0.9rem] font-semibold text-ink-3">{lang === "bn" ? c.title : c.titleBn}</p>
                  </div>
                  <span className="tag shrink-0">{t(`occasion.${c.occasion}`)}</span>
                </div>
                <p className="mb-5 mt-3 line-clamp-2 px-2 text-[0.98rem] text-ink-2">{c.description}</p>
                <span className="btn btn-gold btn-sm pointer-events-none ml-2 mt-auto self-start">
                  {t("templates.use")} <ArrowUpRight size={16} strokeWidth={3} />
                </span>
              </Link>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
