"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Download, Layers, LockKeyhole, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Spinner } from "@/components/ui/primitives";
import { useT } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, saveBlob } from "@/lib/utils";

function Inner() {
  const t = useT();
  const params = useSearchParams();
  const { status } = useAuth();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);
  const skipped = Number(params.get("skipped") ?? 0);
  const [zipping, setZipping] = useState<"png" | "jpg" | null>(null);

  const q = useQuery({
    queryKey: ["batch", ids.join(",")],
    queryFn: ({ signal }) => api.posters.batch(ids, signal),
    enabled: status === "authed" && ids.length > 0,
    refetchInterval: (query) => {
      const items = query.state.data?.items;
      return items && items.every((p) => p.status === "completed" || p.status === "failed") ? false : 1500;
    },
  });

  if (!ids.length) {
    return (
      <EmptyState
        icon={<Layers size={38} strokeWidth={2.4} />}
        title={t("bulk.noBatch")}
        action={
          <Link href="/bulk" className="btn btn-gold btn-lg">
            <Plus size={20} strokeWidth={3} /> {t("bulk.newBatch")}
          </Link>
        }
      />
    );
  }
  if (status === "anon") {
    return (
      <EmptyState
        icon={<LockKeyhole size={38} strokeWidth={2.4} />}
        title={t("history.signInTitle")}
        action={
          <Link href={`/login?next=${encodeURIComponent(`/bulk/results?ids=${ids.join(",")}`)}`} className="btn btn-gold btn-lg">
            {t("nav.signIn")}
          </Link>
        }
      />
    );
  }

  const items = q.data?.items ?? [];
  const done = items.filter((p) => p.status === "completed").length;
  const failed = items.filter((p) => p.status === "failed").length;
  const total = ids.length;
  const pct = Math.round(((done + failed) / total) * 100);
  const allFinished = done + failed === total && items.length > 0;

  async function zip(format: "png" | "jpg") {
    setZipping(format);
    try {
      const readyIds = items.filter((p) => p.status === "completed").map((p) => p.id);
      saveBlob(await api.posters.zip(readyIds, format), `posterghor-batch-${format}.zip`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("common.genericError"));
    } finally {
      setZipping(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="tag !bg-white">
            <Layers size={14} strokeWidth={2.8} /> {t("bulk.nav")}
          </span>
          <h1 className="paint mt-4 text-[clamp(2.4rem,5vw,4rem)] leading-[1.14]">{t("bulk.resultsTitle")}</h1>
          <p className="mt-3 font-display text-[1.3rem] font-extrabold text-white">{t("bulk.ready", { done, total })}</p>
          {skipped ? (
            <p className="mt-2">
              <span className="tag !bg-blush !text-red-deep">{t("bulk.skipped", { n: skipped })}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-gold" disabled={!done || zipping !== null} onClick={() => zip("png")}>
            {zipping === "png" ? <Spinner /> : <Download size={18} />} {zipping === "png" ? t("bulk.zipping") : t("bulk.zipPng")}
          </button>
          <button type="button" className="btn btn-white" disabled={!done || zipping !== null} onClick={() => zip("jpg")}>
            {zipping === "jpg" ? <Spinner /> : <Download size={18} />} {t("bulk.zipJpg")}
          </button>
        </div>
      </header>

      <div className="mt-8 h-6 overflow-hidden rounded-full border-[3px] border-ink bg-white" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full transition-all duration-700", allFinished ? "bg-teal" : "bg-gold")} style={{ width: `${Math.max(4, pct)}%` }} />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-5">
        {ids.map((id, i) => {
          const p = items.find((x) => x.id === id);
          return (
            <motion.div key={id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
              <Link href={`/posters/${id}`} className="group plate plate-flush block p-2 transition-transform hover:-translate-y-1">
                <div className="relative overflow-hidden rounded-[12px] border-[3px] border-ink bg-mist">
                  {p?.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.previewImageUrl} alt={p.formData.name} width={720} height={960} loading="lazy" className="block aspect-[3/4] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[3/4] place-items-center bg-mist">{p?.status === "failed" ? <span className="tag !bg-red !text-white">failed</span> : <Spinner size={26} />}</div>
                  )}
                </div>
                <p className="mt-3 line-clamp-1 px-1 font-body text-[1.1rem] font-bold">{p?.formData.name ?? "…"}</p>
                <p className="line-clamp-1 px-1 pb-1 font-body text-[0.88rem] text-ink-3">{p?.formData.designation}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-14 flex flex-wrap justify-center gap-4">
        <Link href="/history" className="btn btn-white">
          {t("bulk.viewHistory")}
        </Link>
        <Link href="/bulk" className="btn btn-ghost">
          <Plus size={17} strokeWidth={3} /> {t("bulk.newBatch")}
        </Link>
      </div>
    </div>
  );
}

export function BulkResults() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
