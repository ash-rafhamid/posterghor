"use client";

import Link from "next/link";
import { Wheel } from "@/components/ui/ornaments";
import { useT } from "@/i18n";

export default function NotFound() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <div className="flex items-center justify-center gap-2 sm:gap-6">
        <Wheel size={110} spin className="hidden sm:block" />
        <p className="paint font-display text-[clamp(6rem,20vw,11rem)] font-extrabold leading-none" style={{ ["--paint" as string]: "var(--color-gold)" }}>
          ৪০৪
        </p>
        <Wheel size={110} spin rim="teal" className="hidden sm:block" />
      </div>
      <h1 className="paint mt-6 text-[clamp(2rem,4.6vw,3.2rem)]">{t("errors.notFoundTitle")}</h1>
      <p className="mx-auto mt-4 max-w-md text-[1.15rem] text-white/85">{t("errors.notFoundBody")}</p>
      <Link href="/" className="btn btn-gold btn-lg mt-9">
        {t("errors.goHome")}
      </Link>
    </div>
  );
}
