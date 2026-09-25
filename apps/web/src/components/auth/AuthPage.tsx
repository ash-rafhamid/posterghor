"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkle, Wheel } from "@/components/ui/ornaments";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { SAMPLES } from "@/lib/samples";
import { AuthForm, type AuthMode } from "./AuthForm";

function Inner({ mode }: { mode: AuthMode }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useAuth();
  const rawNext = params.get("next") ?? "/create";
  // only allow same-site relative redirects
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/create";

  useEffect(() => {
    if (status === "authed") router.replace(next);
  }, [status, next, router]);

  const wall = [SAMPLES[0], SAMPLES[2], SAMPLES[4], SAMPLES[1], SAMPLES[5], SAMPLES[3]].filter(Boolean);

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,500px)_1fr] lg:py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="plate self-start p-7 pt-9 sm:p-10">
        <Wheel size={84} spin className="absolute -right-6 -top-9 z-10" />
        <span className="tag !bg-butter">
          <Sparkle size={15} /> Posterghor
        </span>
        <h1 className="mt-5 text-[2.6rem] leading-tight">{mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h1>
        <p className="mb-7 mt-2 text-[1.05rem] text-ink-2">{mode === "login" ? t("auth.loginSub") : t("auth.registerSub")}</p>
        <AuthForm mode={mode} onSuccess={() => router.replace(next)} showDemoHint />
        <p className="mt-6 text-center text-[0.98rem] text-ink-2">
          {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
          <Link href={mode === "login" ? `/register?next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(next)}`} className="font-bold text-rose underline decoration-[3px] underline-offset-4 hover:text-ink">
            {mode === "login" ? t("auth.goRegister") : t("auth.goLogin")}
          </Link>
        </p>
      </motion.div>

      {/* a wall of sample posters under a sunburst — pure decoration */}
      <div aria-hidden className="relative hidden min-h-[640px] overflow-hidden rounded-[34px] border-[3px] border-ink bg-blue-night lg:block" style={{ backgroundImage: "url(/art/pattern.svg)", backgroundSize: "168px 168px" }}>
        <div className="sunburst absolute inset-0 opacity-80" />
        <div className="absolute inset-0 grid grid-cols-3 gap-4 p-6 [transform:rotate(-6deg)_scale(1.25)]">
          {[0, 1, 2].map((col) => (
            <div key={col} className="flex flex-col gap-4" style={{ marginTop: col === 1 ? "-3rem" : col === 2 ? "1.5rem" : "0" }}>
              {wall
                .filter((_, i) => i % 3 === col)
                .concat(wall.filter((_, i) => i % 3 === col))
                .map((s, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={s!.src} alt="" width={720} height={960} className="w-full rounded-lg border-[3px] border-ink bg-white p-1.5 shadow-[0_18px_28px_-14px_rgba(0,0,0,0.7)]" />
                ))}
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-night via-blue-night/90 to-transparent p-9 pt-28">
          <p className="max-w-md font-hand text-[2.2rem] leading-tight text-gold [text-shadow:2px_3px_0_var(--color-ink)]">{t("auth.quote")}</p>
        </div>
      </div>
    </div>
  );
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  return (
    <Suspense fallback={null}>
      <Inner mode={mode} />
    </Suspense>
  );
}
