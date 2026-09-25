"use client";

import Link from "next/link";
import { Bunting, Marigold, Wheel } from "@/components/ui/ornaments";
import { useT } from "@/i18n";
import { Logo } from "./Logo";

export function Footer() {
  const t = useT();
  const link = "font-display text-[1.05rem] font-bold text-white/90 transition-colors hover:text-gold";
  return (
    <footer className="relative mt-32 bg-blue-night text-white">
      {/* pennants strung along the top edge */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-[7px] z-10">
        <Bunting height={74} tile={264} flags={6} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Wheel size={420} spin filled={false} className="absolute -bottom-32 -right-24 opacity-[0.22]" />
        <Wheel size={200} spin filled={false} className="absolute -left-14 top-1/3 opacity-[0.12]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-14 pt-24 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo size="lg" />
          <p className="mt-6 text-[1.02rem] leading-relaxed text-white/80">{t("footer.line")}</p>
          <div aria-hidden className="mt-6 flex items-center gap-3">
            <Marigold size={34} />
            <span className="beads w-32" />
            <Marigold size={34} />
          </div>
        </div>
        <div>
          <p className="font-display text-sm font-extrabold uppercase tracking-[0.22em] text-gold">{t("footer.product")}</p>
          <ul className="mt-5 space-y-3">
            <li><Link className={link} href="/templates">{t("nav.templates")}</Link></li>
            <li><Link className={link} href="/create">{t("nav.create")}</Link></li>
            <li><Link className={link} href="/bulk">{t("nav.bulk")}</Link></li>
            <li><Link className={link} href="/history">{t("nav.history")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-display text-sm font-extrabold uppercase tracking-[0.22em] text-gold">{t("footer.account")}</p>
          <ul className="mt-5 space-y-3">
            <li><Link className={link} href="/login">{t("nav.signIn")}</Link></li>
            <li><Link className={link} href="/register">{t("nav.getStarted")}</Link></li>
          </ul>
        </div>
      </div>

      <div className="relative border-t-[3px] border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-[0.88rem] text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t("footer.made")}</p>
          <p>{t("footer.rights")}</p>
        </div>
      </div>
    </footer>
  );
}
