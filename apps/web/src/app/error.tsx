"use client";

import { useEffect } from "react";
import { Wheel } from "@/components/ui/ornaments";
import { useT } from "@/i18n";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <Wheel size={110} spin className="mx-auto [animation-duration:6s]" />
      <h1 className="paint mt-8 text-[clamp(2.2rem,5vw,3.4rem)]">{t("errors.errorTitle")}</h1>
      <p className="mx-auto mt-4 max-w-md text-[1.15rem] text-white/85">{t("errors.errorBody")}</p>
      <button type="button" onClick={reset} className="btn btn-gold btn-lg mt-9">
        {t("common.retry")}
      </button>
    </div>
  );
}
