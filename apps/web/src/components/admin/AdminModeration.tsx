"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, Flag, Search } from "lucide-react";
import { toast } from "sonner";
import type { ApiPoster, ModerationStatus } from "@poster/shared";
import { Dialog, Spinner } from "@/components/ui/primitives";
import { ApiError, api } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { AdminHeading, Pager } from "./AdminShell";

const TABS: Array<[string, string]> = [
  ["flagged", "Needs review"],
  ["blocked", "Blocked"],
  ["clean", "Approved"],
  ["", "Everything"],
];

export function AdminModeration() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("flagged");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<{ poster: ApiPoster; status: ModerationStatus } | null>(null);
  const [note, setNote] = useState("");

  const list = useQuery({ queryKey: ["admin", "posters", tab, q, page], queryFn: () => api.admin.posters({ moderation: tab || undefined, q: q || undefined, page, pageSize: 12 }), placeholderData: (prev) => prev });

  const act = useMutation({
    mutationFn: (v: { id: string; status: ModerationStatus; note?: string }) => api.admin.moderate(v.id, { status: v.status, note: v.note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Moderation updated");
      setTarget(null);
      setNote("");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const items = list.data?.items ?? [];

  return (
    <>
      <AdminHeading title="Moderation queue" sub="Posters flagged by the text / photo screening, plus everything else you may want to review. Blocked posters disappear for their owners and can't be downloaded." />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} data-active={tab === k} onClick={() => (setTab(k), setPage(1))} className="chip">
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search size={17} strokeWidth={2.6} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <input className="field !py-2 !pl-10" placeholder="Search name / headline…" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
        </div>
      </div>

      {list.isPending ? (
        <div className="grid min-h-[30vh] place-items-center"><Spinner size={40} /></div>
      ) : items.length === 0 ? (
        <p className="mt-16 text-center text-[1.2rem] font-semibold text-white/85">Nothing here. The queue is clear.</p>
      ) : (
        <ul className="mt-8 space-y-5">
          {items.map((p) => (
            <li key={p.id} className="plate flex flex-col gap-5 p-4 sm:flex-row sm:p-5">
              <div className="w-full shrink-0 sm:w-36">
                {p.previewImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.previewImageUrl} alt="" width={300} height={400} loading="lazy" className="w-full rounded-lg border-[3px] border-ink" />
                ) : (
                  <div className="grid aspect-[3/4] place-items-center rounded-lg border-[3px] border-dashed border-ink/30 bg-mist text-xs text-ink-3">{p.status}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("tag", p.moderation.status === "blocked" ? "!bg-red !text-white" : p.moderation.status === "flagged" ? "!bg-butter" : "!bg-teal")}>{p.moderation.status}</span>
                  <span className="text-[0.88rem] font-semibold text-ink-3">{p.template?.title}</span>
                  <span className="ml-auto text-[0.88rem] font-semibold text-ink-3">{formatDateTime(p.createdAt)}</span>
                </div>
                <h3 className="mt-3 break-words text-[1.6rem] leading-snug">{p.formData.headline}</h3>
                {p.formData.subheadline ? <p className="font-body text-ink-2">{p.formData.subheadline}</p> : null}
                <p className="mt-2 text-sm text-ink-2">
                  <b className="font-body">{p.formData.name}</b>
                  {p.formData.designation ? <span className="font-body"> · {p.formData.designation}</span> : null}
                  {p.owner ? <span className="text-ink-3"> by {p.owner.name} ({p.owner.email ?? p.owner.phone})</span> : null}
                </p>
                {p.moderation.reasons.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {p.moderation.reasons.map((r) => (
                      <li key={r} className="rounded-full border-[2.5px] border-red-deep/60 bg-blush px-3 py-1 text-xs font-bold text-red-deep">
                        {r}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {p.moderation.note ? <p className="mt-3 rounded-xl bg-mist px-3 py-2 text-sm">Note: {p.moderation.note}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button type="button" className="btn btn-teal btn-sm" disabled={p.moderation.status === "clean"} onClick={() => setTarget({ poster: p, status: "clean" })}>
                    <Check size={15} strokeWidth={3} /> Approve
                  </button>
                  <button type="button" className="btn btn-gold btn-sm" disabled={p.moderation.status === "flagged"} onClick={() => setTarget({ poster: p, status: "flagged" })}>
                    <Flag size={15} strokeWidth={2.8} /> Flag
                  </button>
                  <button type="button" className="btn btn-rose btn-sm" disabled={p.moderation.status === "blocked"} onClick={() => setTarget({ poster: p, status: "blocked" })}>
                    <Ban size={15} /> Block
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {list.data ? <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} /> : null}

      <Dialog open={!!target} onClose={() => setTarget(null)} title={target ? `Mark as ${target.status}` : ""}>
        <p className="text-sm text-ink-2">Optionally leave a note. The owner sees it on their poster.</p>
        <textarea className="field mt-3" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / note (optional)" />
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost-ink" onClick={() => setTarget(null)}>
            Cancel
          </button>
          <button type="button" className="btn btn-rose" disabled={act.isPending} onClick={() => target && act.mutate({ id: target.poster.id, status: target.status, note: note || undefined })}>
            {act.isPending ? <Spinner /> : null} Confirm
          </button>
        </div>
      </Dialog>
    </>
  );
}
