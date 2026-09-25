"use client";

import Link from "next/link";
import { TEMPLATE_PRESETS, type OccasionId } from "@poster/shared";
import { Coin, OccasionIcon } from "@/components/ui/ornaments";
import { useT } from "@/i18n";
import { SectionHead } from "./SectionHead";

const ORDER: Array<{ id: OccasionId; ring: string }> = [
  { id: "victory", ring: "leaf" },
  { id: "tribute", ring: "blue" },
  { id: "campaign", ring: "pink" },
  { id: "greeting", ring: "gold-deep" },
  { id: "festival", ring: "teal" },
];

/** Gold colour-block with a scalloped edge: "what's the poster for?" — five painted coins that start the studio. */
export function Occasions() {
  const t = useT();
  return (
    <section className="scallop-t scallop-b relative bg-gold pb-24 pt-16 text-ink" style={{ ["--sec" as string]: "var(--color-gold)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead tone="ink" align="center" eyebrow={t("occasions.eyebrow")} title={t("occasions.title")} />
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {ORDER.map(({ id, ring }) => {
            const list = TEMPLATE_PRESETS.filter((p) => p.occasionType === id);
            const first = list[0];
            return (
              <li key={id}>
                <Link href={first ? `/create?template=${first.slug}` : "/create"} className="group grid justify-items-center gap-3 text-center">
                  <Coin size={150} ring={ring} className="transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-[-5deg]">
                    <OccasionIcon id={id} size={88} />
                  </Coin>
                  <span className="font-display text-[1.3rem] font-extrabold leading-tight">{t(`occasion.${id}`)}</span>
                  <span className="tag !bg-white">{t("occasions.designs", { n: list.length })}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
