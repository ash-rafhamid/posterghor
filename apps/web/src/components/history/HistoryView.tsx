"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Download, FileImage, FileText, ImageIcon, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ApiPoster, ExportFormat, PosterStatus } from "@poster/shared";
import { Pin } from "@/components/ui/ornaments";
import { PageHead } from "@/components/ui/PageHead";
import { Dialog, EmptyState, Spinner } from "@/components/ui/primitives";
import { useLang, useT } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sampleFor } from "@/lib/samples";
import { cn, formatDate, saveBlob } from "@/lib/utils";

type Filter = "all" | PosterStatus;
const PAGE = 12;

function StatusTag({ p }: { p: ApiPoster }) {
  const t = useT();
  const base = "tag !text-[0.74rem] shadow-[0_2px_0_rgba(27,17,71,0.35)]";
  if (p.moderation.status === "blocked") return <span className={cn(base, "!bg-red !text-white")}>{t("history.blocked")}</span>;
  if (p.status === "completed" && p.moderation.status === "flagged") return <span className={cn(base, "!bg-butter")}>{t("history.review")}</span>;
  if (p.status === "completed") return <span className={cn(base, "!bg-teal")}>{t("history.statusCompleted")}</span>;
  if (p.status === "generating")
    return (
      <span className={base}>
        <Spinner size={13} /> {t("history.statusGenerating")}
      </span>
    );
  if (p.status === "failed") return <span className={cn(base, "!bg-red !text-white")}>{t("history.statusFailed")}</span>;
  return <span className={cn(base, "!bg-white")}>{t("history.statusDraft")}</span>;
}

function PosterCard({ p, index, onDelete }: { p: ApiPoster; index: number; onDelete: (p: ApiPoster) => void }) {
  const t = useT();
  const { lang } = useLang();
  const [dl, setDl] = useState<ExportFormat | null>(null);
  const [menu, setMenu] = useState(false);
  const img = p.previewImageUrl ?? sampleFor(p.template?.slug ?? "")?.src;
  const ready = p.status === "completed" && p.moderation.status !== "blocked";

  async function download(fmt: ExportFormat) {
    setDl(fmt);
    try {
      saveBlob(await api.posters.download(p.id, fmt, p.selectedVersion), `posterghor-${p.id.slice(-6)}.${fmt}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("common.genericError"));
    } finally {
      setDl(null);
      setMenu(false);
    }
  }

  return (
    <motion.article initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.04 }} className="plate plate-flush group relative p-2.5 pb-3">
      <Pin className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" color={index % 2 ? "pink" : "gold"} />
      <Link href={`/posters/${p.id}`} className="block">
        <div className="relative overflow-hidden rounded-[12px] border-[3px] border-ink bg-mist transition-transform duration-300 group-hover:-translate-y-0.5">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={p.formData.headline} width={720} height={960} loading="lazy" className={cn("block aspect-[3/4] w-full object-cover", p.status !== "completed" && "opacity-40 grayscale")} />
          ) : (
            <div className="grid aspect-[3/4] place-items-center text-ink-3">
              <ImageIcon size={40} />
            </div>
          )}
          <span className="absolute left-2 top-2">
            <StatusTag p={p} />
          </span>
        </div>
        <h3 className="mt-3 line-clamp-2 px-1 text-[1.2rem] leading-snug">{p.formData.headline}</h3>
        <p className="mt-0.5 px-1 text-[0.85rem] font-semibold text-ink-3">
          {p.template ? (lang === "bn" ? p.template.titleBn : p.template.title) : ""} · {formatDate(p.createdAt, lang)}
        </p>
      </Link>

      <div className="mt-3 flex items-center gap-2 px-1">
        {ready ? (
          <div className="relative">
            <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="btn btn-gold btn-sm">
              {dl ? <Spinner size={15} /> : <Download size={15} strokeWidth={3} />} {t("common.download")}
            </button>
            {menu ? (
              <>
                <button aria-label="Close menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenu(false)} />
                <div role="menu" className="plate plate-flush absolute bottom-[calc(100%+10px)] left-0 z-30 w-44 overflow-hidden !rounded-2xl">
                  {(
                    [
                      ["png", "PNG", FileImage],
                      ["jpg", "JPG", FileImage],
                      ["pdf", "PDF", FileText],
                    ] as const
                  ).map(([f, label, Icon]) => (
                    <button key={f} role="menuitem" type="button" disabled={dl !== null} onClick={() => download(f)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-display text-[1rem] font-extrabold hover:bg-butter">
                      {dl === f ? <Spinner size={16} /> : <Icon size={17} strokeWidth={2.6} />} {label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        <button type="button" onClick={() => onDelete(p)} aria-label={t("poster.delete")} className="btn btn-ghost-ink btn-sm ml-auto !px-2.5 !text-ink-3 hover:!bg-blush hover:!text-red-deep">
          <Trash2 size={16} strokeWidth={2.6} />
        </button>
      </div>
    </motion.article>
  );
}

export function HistoryView() {
  const t = useT();
  const { status: authStatus } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [toDelete, setToDelete] = useState<ApiPoster | null>(null);

  const q = useInfiniteQuery({
    queryKey: ["posters", filter],
    queryFn: ({ pageParam }) => api.posters.list({ status: filter === "all" ? undefined : filter, page: pageParam, pageSize: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled: authStatus === "authed",
    // keep refreshing while anything is still being composed
    refetchInterval: (query) => (query.state.data?.pages.some((pg) => pg.items.some((p) => p.status === "generating")) ? 3000 : false),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.posters.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["posters"] });
      toast.success(t("poster.deleted"));
      setToDelete(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.genericError")),
  });

  const items = q.data?.pages.flatMap((pg) => pg.items) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;

  const tabs: Array<[Filter, string]> = [
    ["all", t("history.filterAll")],
    ["completed", t("history.filterCompleted")],
    ["generating", t("history.filterGenerating")],
    ["failed", t("history.filterFailed")],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHead
        tag={authStatus === "authed" ? `${total}` : "0"}
        title={t("history.title")}
        sub={t("history.sub")}
        action={
          <Link href="/create" className="btn btn-gold btn-lg">
            <Plus size={22} strokeWidth={3} /> {t("history.createFirst")}
          </Link>
        }
      />

      {authStatus === "anon" ? (
        <EmptyState
          icon={<LockKeyhole size={38} strokeWidth={2.4} />}
          title={t("history.signInTitle")}
          action={
            <Link href="/login?next=/history" className="btn btn-gold btn-lg">
              {t("nav.signIn")}
            </Link>
          }
        />
      ) : (
        <>
          <div className="mt-9 flex flex-wrap gap-3" role="tablist">
            {tabs.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} data-active={filter === k} onClick={() => setFilter(k)} className="chip !py-1.5 !text-[1rem]">
                {label}
              </button>
            ))}
          </div>

          {q.isPending ? (
            <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="plate plate-flush p-2.5">
                  <div className="aspect-[3/4] animate-pulse rounded-[12px] bg-mist" />
                  <div className="mt-3 h-5 w-3/4 animate-pulse rounded-full bg-mist" />
                </div>
              ))}
            </div>
          ) : q.isError ? (
            <EmptyState icon={<ImageIcon size={38} strokeWidth={2.4} />} title={t("common.genericError")} action={<button className="btn btn-white" onClick={() => q.refetch()}>{t("common.retry")}</button>} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<ImageIcon size={38} strokeWidth={2.4} />}
              title={t("history.empty")}
              body={t("history.emptySub")}
              action={
                <Link href="/create" className="btn btn-gold btn-lg">
                  <Plus size={22} strokeWidth={3} /> {t("history.createFirst")}
                </Link>
              }
            />
          ) : (
            <>
              <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:grid-cols-4">
                {items.map((p, i) => (
                  <PosterCard key={p.id} p={p} index={i} onDelete={setToDelete} />
                ))}
              </div>
              {q.hasNextPage ? (
                <div className="mt-14 text-center">
                  <button type="button" className="btn btn-white btn-lg" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                    {q.isFetchingNextPage ? <Spinner /> : null} {t("history.loadMore")}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)} title={t("poster.delete")}>
        <p className="text-ink-2">{t("poster.deleteConfirm")}</p>
        {toDelete ? <p className="mt-3 rounded-xl bg-mist px-3 py-2 font-body font-bold">{toDelete.formData.headline}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost-ink" onClick={() => setToDelete(null)}>
            {t("common.cancel")}
          </button>
          <button type="button" className="btn btn-rose" disabled={del.isPending} onClick={() => toDelete && del.mutate(toDelete.id)}>
            {del.isPending ? <Spinner /> : <Trash2 size={17} strokeWidth={2.8} />} {t("common.delete")}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
