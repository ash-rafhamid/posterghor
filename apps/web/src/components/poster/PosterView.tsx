"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Download, FileImage, FileText, LockKeyhole, Pencil, Plus, RefreshCw, ShieldAlert, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { ApiPoster, ExportFormat } from "@poster/shared";
import { Hoarding, Sparkle } from "@/components/ui/ornaments";
import { Dialog, EmptyState, Spinner } from "@/components/ui/primitives";
import { useLang, useT } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sampleFor } from "@/lib/samples";
import { cn, formatDateTime, saveBlob } from "@/lib/utils";
import { ArtNotes } from "./ArtNotes";
import { EditTextDialog } from "./EditTextDialog";
import { PressAnimation } from "./PressAnimation";

const errMsg = (e: unknown, t: ReturnType<typeof useT>) => (e instanceof ApiError ? (e.status === 0 ? t("common.networkError") : e.message) : t("common.genericError"));

export function PosterView({ id }: { id: string }) {
  const t = useT();
  const { lang, n } = useLang();
  const router = useRouter();
  const qc = useQueryClient();
  const { status: authStatus } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [editSub, setEditSub] = useState<string | undefined>();
  const [delOpen, setDelOpen] = useState(false);
  const [dl, setDl] = useState<ExportFormat | null>(null);

  const query = useQuery({
    queryKey: ["poster", id],
    queryFn: ({ signal }) => api.posters.get(id, signal),
    enabled: authStatus === "authed",
    // poll while the server is working; stop as soon as it's done
    refetchInterval: (q) => (q.state.data?.poster.status === "generating" ? 1100 : false),
    retry: (count, err) => count < 3 && !(err instanceof ApiError && err.status >= 400 && err.status < 500),
  });
  const poster = query.data?.poster;

  const tplQuery = useQuery({ queryKey: ["template", poster?.templateId], queryFn: () => api.templates.get(poster!.templateId), enabled: !!poster?.templateId, staleTime: 5 * 60_000, retry: false });

  const apply = (p: ApiPoster) => {
    qc.setQueryData(["poster", id], { poster: p });
    void qc.invalidateQueries({ queryKey: ["posters"] });
  };

  const regen = useMutation({
    mutationFn: (body: { formData?: Record<string, unknown>; keepStyle?: boolean }) => api.posters.regenerate(id, body),
    onSuccess: ({ poster: p }) => {
      apply(p);
      toast(t("poster.regenStarted"), { duration: 1800 });
      setEditOpen(false);
    },
    onError: (e) => toast.error(errMsg(e, t), { duration: 6000 }),
  });

  const pick = useMutation({
    mutationFn: (versionId: string) => api.posters.selectVersion(id, versionId),
    onSuccess: ({ poster: p }) => apply(p),
    onError: (e) => toast.error(errMsg(e, t)),
  });

  const del = useMutation({
    mutationFn: () => api.posters.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["posters"] });
      toast.success(t("poster.deleted"));
      router.replace("/history");
    },
    onError: (e) => toast.error(errMsg(e, t)),
  });

  async function download(format: ExportFormat) {
    if (!poster) return;
    setDl(format);
    try {
      const blob = await api.posters.download(id, format, poster.selectedVersion);
      saveBlob(blob, `posterghor-${id.slice(-6)}.${format}`);
    } catch (e) {
      toast.error(errMsg(e, t));
    } finally {
      setDl(null);
    }
  }

  /* ── guards ─────────────────────────────────────────────────────── */
  if (authStatus === "loading") return <Center><Spinner size={44} /></Center>;
  if (authStatus === "anon") {
    return (
      <EmptyState
        icon={<LockKeyhole size={40} strokeWidth={2.4} />}
        title={t("history.signInTitle")}
        action={
          <Link href={`/login?next=${encodeURIComponent(`/posters/${id}`)}`} className="btn btn-gold btn-lg">
            {t("nav.signIn")}
          </Link>
        }
      />
    );
  }
  if (query.isPending) return <Center><Spinner size={44} /></Center>;
  if (query.isError || !poster) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <EmptyState
        icon={<TriangleAlert size={40} strokeWidth={2.4} />}
        title={notFound ? t("poster.notFound") : t("common.genericError")}
        action={
          <Link href="/history" className="btn btn-white">
            <ArrowLeft size={18} strokeWidth={3} /> {t("poster.back")}
          </Link>
        }
      />
    );
  }

  const template = tplQuery.data?.template;
  const sample = sampleFor(poster.template?.slug ?? "")?.src ?? poster.template?.thumbnailUrl;

  /* ── generating ─────────────────────────────────────────────────── */
  if (poster.status === "generating" || poster.status === "draft") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <PressAnimation stage={poster.progress.stage} pct={poster.progress.pct} image={sample} />
      </div>
    );
  }

  /* ── failed ─────────────────────────────────────────────────────── */
  if (poster.status === "failed") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border-[3px] border-ink bg-red text-white shadow-[0_0_0_5px_rgba(255,255,255,0.9)] [transform:rotate(-5deg)]">
          <TriangleAlert size={42} strokeWidth={2.4} />
        </div>
        <h1 className="paint mt-8 text-[clamp(2.2rem,5vw,3.4rem)]">{t("poster.failedTitle")}</h1>
        <p className="mx-auto mt-4 max-w-md text-[1.15rem] text-white/85">{poster.error}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          {poster.regenRemaining > 0 ? (
            <button type="button" className="btn btn-gold btn-lg" disabled={regen.isPending} onClick={() => regen.mutate({ keepStyle: true })}>
              {regen.isPending ? <Spinner /> : <RefreshCw size={20} strokeWidth={2.8} />} {t("poster.tryAgain")}
            </button>
          ) : null}
          <Link href="/create" className="btn btn-white btn-lg">
            <Plus size={20} strokeWidth={3} /> {t("poster.newPoster")}
          </Link>
        </div>
      </div>
    );
  }

  /* ── completed ──────────────────────────────────────────────────── */
  const versions = poster.versions;
  const blocked = poster.moderation.status === "blocked";
  const busy = regen.isPending;
  const left = poster.regenRemaining;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link href="/history" className="btn btn-ghost btn-sm">
        <ArrowLeft size={16} strokeWidth={3} /> {t("poster.back")}
      </Link>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-14 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        {/* ───────── the poster ───────── */}
        <div className="min-w-0">
          <div className="mx-auto max-w-[520px]">
            <AnimatePresence mode="wait">
              {poster.previewImageUrl ? (
                <motion.a
                  key={poster.selectedVersion ?? "v"}
                  href={poster.previewImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, y: -28, rotate: -1.2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="block"
                  title="Open full size"
                >
                  <Hoarding>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={poster.previewImageUrl} alt={poster.formData.headline} width={1200} height={1600} className="block w-full" />
                  </Hoarding>
                </motion.a>
              ) : null}
            </AnimatePresence>
          </div>

          {versions.length > 1 ? (
            <div className="plate plate-flush mx-auto mt-8 max-w-[520px] px-5 py-4">
              <p className="font-display text-[1.05rem] font-extrabold">{t("poster.versions")}</p>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2 pl-1 pt-1">
                {versions.map((v, i) => {
                  const on = v.id === poster.selectedVersion;
                  return (
                    <button key={v.id} type="button" onClick={() => !on && pick.mutate(v.id)} disabled={pick.isPending} aria-pressed={on} className={cn("group w-[78px] shrink-0 text-left transition-transform", !on && "hover:-translate-y-1")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.previewUrl} alt="" width={300} height={400} loading="lazy" className={cn("block aspect-[3/4] w-full rounded-lg border-[3px] object-cover", on ? "border-ink shadow-[0_0_0_3px_var(--color-gold),0_0_0_6px_var(--color-ink)]" : "border-ink/60")} />
                      <span className={cn("mt-2 block text-[0.74rem] font-bold text-ink-3", on && "!text-rose")}>{on ? t("poster.versionCurrent") : t("poster.versionLabel", { n: i + 1 })}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* ───────── details + actions ───────── */}
        <div className="min-w-0 space-y-6">
          <header>
            <span className="tag !bg-teal">
              <Sparkle size={15} /> {t("poster.ready")}
            </span>
            <h1 className="paint mt-4 break-words text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1.18]">{poster.formData.headline}</h1>
            <dl className="mt-5 flex flex-wrap gap-2.5">
              {poster.template ? (
                <div className="tag !bg-white">
                  <dt className="font-semibold">{t("poster.template")}:</dt>
                  <dd>{lang === "bn" ? poster.template.titleBn : poster.template.title}</dd>
                </div>
              ) : null}
              <div className="tag !bg-white">
                <dt className="font-semibold">{t("poster.created")}:</dt>
                <dd>{formatDateTime(poster.createdAt, lang)}</dd>
              </div>
              {poster.width && poster.height ? (
                <div className="tag !bg-butter">
                  <dt className="font-semibold">{t("poster.size")}:</dt>
                  <dd>
                    {n(poster.width)}×{n(poster.height)} px
                  </dd>
                </div>
              ) : null}
            </dl>
          </header>

          {poster.moderation.status !== "clean" ? (
            <div role="status" className={cn("plate flex gap-3 p-4", blocked ? "!bg-blush" : "plate-butter")}>
              <ShieldAlert className={blocked ? "text-red-deep" : "text-ink-2"} size={24} strokeWidth={2.4} />
              <div>
                <p className="font-display text-[1.1rem] font-extrabold">{blocked ? t("poster.blocked") : t("poster.flagged")}</p>
                {poster.moderation.note ? <p className="mt-1 text-[0.95rem] text-ink-2">{poster.moderation.note}</p> : null}
              </div>
            </div>
          ) : null}

          {/* downloads */}
          {!blocked ? (
            <section className="plate p-5 sm:p-7">
              <h2 className="flex items-center gap-2.5 text-[1.6rem]">
                <Download size={24} strokeWidth={2.8} /> {t("common.download")}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["png", t("poster.downloadPng"), t("poster.pngNote"), FileImage],
                    ["jpg", t("poster.downloadJpg"), t("poster.jpgNote"), FileImage],
                    ["pdf", t("poster.downloadPdf"), t("poster.pdfNote"), FileText],
                  ] as const
                ).map(([fmt, label, note, Icon]) => (
                  <button key={fmt} type="button" onClick={() => download(fmt)} disabled={dl !== null} className={cn("btn !flex-col !items-start !gap-1 !whitespace-normal !rounded-3xl !px-4 !py-4 text-left", fmt === "png" ? "btn-gold" : fmt === "jpg" ? "btn-teal" : "btn-pink")}>
                    <span className="flex w-full items-center justify-between">
                      <span className="font-display text-[1.6rem] font-extrabold leading-none">{label}</span>
                      {dl === fmt ? <Spinner size={22} /> : <Icon size={24} strokeWidth={2.6} />}
                    </span>
                    <span className="text-[0.8rem] font-semibold leading-tight opacity-80">{dl === fmt ? t("poster.downloading") : note}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {/* actions */}
          <section className="plate p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <button type="button" onClick={() => regen.mutate({})} disabled={busy || left === 0 || blocked} className="btn btn-teal !flex-col !items-start !gap-0.5 !rounded-3xl !py-4 text-left">
                <span className="flex items-center gap-2">
                  {busy ? <Spinner /> : <RefreshCw size={20} strokeWidth={2.8} />} {t("poster.anotherLook")}
                </span>
                <span className="text-[0.8rem] font-semibold opacity-75">{left > 0 ? t("poster.regenLeft", { n: left, total: poster.regenLimit }) : t("poster.regenNone")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditSub(undefined);
                  setEditOpen(true);
                }}
                disabled={left === 0 || blocked}
                className="btn btn-white !flex-col !items-start !gap-0.5 !rounded-3xl !py-4 text-left"
              >
                <span className="flex items-center gap-2">
                  <Pencil size={19} strokeWidth={2.8} /> {t("poster.editText")}
                </span>
                <span className="text-[0.8rem] font-semibold opacity-70">{t("poster.editTextHint")}</span>
              </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-dashed border-ink/15 pt-5">
              <Link href="/create" className="btn btn-ghost-ink btn-sm">
                <Plus size={16} strokeWidth={3} /> {t("poster.newPoster")}
              </Link>
              <button type="button" onClick={() => setDelOpen(true)} className="btn btn-ghost-ink btn-sm !text-red-deep hover:!bg-blush">
                <Trash2 size={16} strokeWidth={2.8} /> {t("poster.delete")}
              </button>
            </div>
          </section>

          {!blocked ? (
            <ArtNotes
              poster={poster}
              template={template}
              onTagline={(tag) => {
                setEditSub(tag);
                setEditOpen(true);
              }}
            />
          ) : null}
        </div>
      </div>

      <EditTextDialog open={editOpen} poster={poster} initialSubheadline={editSub} busy={busy} onClose={() => setEditOpen(false)} onApply={(changes) => regen.mutate({ formData: changes, keepStyle: true })} />

      <Dialog open={delOpen} onClose={() => setDelOpen(false)} title={t("poster.delete")}>
        <p className="text-ink-2">{t("poster.deleteConfirm")}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost-ink" onClick={() => setDelOpen(false)}>
            {t("common.cancel")}
          </button>
          <button type="button" className="btn btn-rose" disabled={del.isPending} onClick={() => del.mutate()}>
            {del.isPending ? <Spinner /> : <Trash2 size={17} strokeWidth={2.8} />} {t("common.delete")}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[50vh] place-items-center text-white/80">{children}</div>;
}
