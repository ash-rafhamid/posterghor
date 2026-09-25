"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  OCCASIONS,
  TEMPLATE_PRESETS,
  demoContent,
  layoutConfigSchema,
  resolvePoster,
  type ApiTemplate,
  type LayoutConfig,
  type OccasionId,
} from "@poster/shared";
import { PosterPreview } from "@/components/poster/PosterPreview";
import { Dialog, Spinner, Switch } from "@/components/ui/primitives";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AdminHeading } from "./AdminShell";

interface EditorState {
  id?: string;
  title: string;
  titleBn: string;
  slug: string;
  description: string;
  occasionType: OccasionId;
  sortOrder: number;
  isActive: boolean;
  layoutJson: string;
}

const blank = (): EditorState => {
  const p = TEMPLATE_PRESETS[0]!;
  return { title: "New template", titleBn: "নতুন টেমপ্লেট", slug: "", description: "", occasionType: p.occasionType, sortOrder: 100, isActive: true, layoutJson: JSON.stringify(p.layoutConfig, null, 2) };
};

const fromTemplate = (t: ApiTemplate): EditorState => ({
  id: t.id,
  title: t.title,
  titleBn: t.titleBn,
  slug: t.slug,
  description: t.description,
  occasionType: t.occasionType,
  sortOrder: t.sortOrder,
  isActive: t.isActive,
  layoutJson: JSON.stringify(t.layoutConfig, null, 2),
});

function TemplateEditor({ open, initial, onClose, onSaved }: { open: boolean; initial: EditorState; onClose: () => void; onSaved: () => void }) {
  const [s, setS] = useState(initial);
  const [variant, setVariant] = useState(0);
  const [photos, setPhotos] = useState<1 | 2 | 3>(3);
  useEffect(() => {
    if (open) setS(initial);
  }, [open, initial]);

  const parsed = useMemo(() => {
    try {
      const json = JSON.parse(s.layoutJson);
      const r = layoutConfigSchema.safeParse(json);
      if (r.success) return { ok: true as const, layout: r.data as LayoutConfig };
      return { ok: false as const, errors: r.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
    } catch (e) {
      return { ok: false as const, errors: [`Invalid JSON — ${(e as Error).message}`] };
    }
  }, [s.layoutJson]);

  const resolved = useMemo(() => {
    if (!parsed.ok) return null;
    const content = demoContent(parsed.layout, s.occasionType, { photos });
    return resolvePoster({ layout: parsed.layout, content, variant });
  }, [parsed, s.occasionType, variant, photos]);

  const save = useMutation({
    mutationFn: async () => {
      if (!parsed.ok) throw new Error("Fix the layout JSON first");
      const body = {
        title: s.title,
        titleBn: s.titleBn,
        ...(s.slug ? { slug: s.slug } : {}),
        description: s.description,
        occasionType: s.occasionType,
        sortOrder: s.sortOrder,
        isActive: s.isActive,
        layoutConfig: parsed.layout,
      };
      const res = s.id ? await api.admin.updateTemplate(s.id, body) : await api.admin.createTemplate(body as never);
      // the preview image is rendered from the layout — refresh it after a layout change
      if (s.id && s.layoutJson !== initial.layoutJson) await api.admin.rethumb(res.template.id).catch(() => undefined);
      return res;
    },
    onSuccess: () => {
      toast.success("Template saved");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  return (
    <Dialog open={open} onClose={onClose} title={s.id ? "Edit template" : "New template"} className="!max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="font-display text-[0.98rem] font-extrabold">
              Title (English)
              <input className="field mt-1" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} />
            </label>
            <label className="font-display text-[0.98rem] font-extrabold">
              Title (Bangla)
              <input className="field mt-1 font-body" value={s.titleBn} onChange={(e) => setS({ ...s, titleBn: e.target.value })} />
            </label>
            <label className="font-display text-[0.98rem] font-extrabold">
              Slug <span className="font-body font-normal text-ink-3">(optional)</span>
              <input className="field mt-1 font-mono text-sm" value={s.slug} disabled={!!s.id} onChange={(e) => setS({ ...s, slug: e.target.value })} placeholder="auto-generated" />
            </label>
            <label className="font-display text-[0.98rem] font-extrabold">
              Occasion
              <select className="field mt-1" value={s.occasionType} onChange={(e) => setS({ ...s, occasionType: e.target.value as OccasionId })}>
                {OCCASIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.en}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-display text-[0.98rem] font-extrabold sm:col-span-2">
              Description
              <input className="field mt-1" maxLength={240} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} />
            </label>
            <label className="font-display text-[0.98rem] font-extrabold">
              Sort order
              <input type="number" className="field mt-1" value={s.sortOrder} onChange={(e) => setS({ ...s, sortOrder: Number(e.target.value) || 0 })} />
            </label>
            <div className="flex items-center justify-between rounded-2xl border-[3px] border-dashed border-ink/30 bg-mist px-4 py-3">
              <span className="font-display text-[0.98rem] font-extrabold">Active (visible to users)</span>
              <Switch checked={s.isActive} onChange={(v) => setS({ ...s, isActive: v })} label="Active" />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-display text-[0.98rem] font-extrabold">layoutConfig (JSON)</span>
              <span className={cn("tag !text-[0.74rem]", parsed.ok ? "!bg-teal" : "!bg-red !text-white")}>{parsed.ok ? "valid ✓" : "invalid"}</span>
            </div>
            <textarea spellCheck={false} className="field h-72 !font-mono !text-[0.78rem] !leading-relaxed" value={s.layoutJson} onChange={(e) => setS({ ...s, layoutJson: e.target.value })} aria-label="layoutConfig JSON" />
            {!parsed.ok ? (
              <ul className="mt-2 space-y-1 rounded-xl border-[3px] border-red-deep/50 bg-blush p-3 font-mono text-[0.72rem] text-red-deep">
                {parsed.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
            <p className="mt-1.5 text-xs text-ink-3">
              Slots are pixel boxes on a 1200×1600 canvas. Change a colour or a slot and the preview updates instantly; decorations come from the theme&apos;s motif pool.
            </p>
          </div>
        </div>

        <div>
          <div className="lg:sticky lg:top-2">
            <p className="mb-2 font-display text-[1rem] font-extrabold">Live preview (demo content)</p>
            {resolved ? (
              <div className="overflow-hidden rounded-xl border-[3px] border-ink">
                <PosterPreview resolved={resolved} />
              </div>
            ) : (
              <div className="grid aspect-[3/4] place-items-center rounded-xl border-[3px] border-dashed border-ink/30 bg-mist p-6 text-center text-sm text-ink-3">Fix the JSON to see the preview</div>
            )}
            {parsed.ok ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {parsed.layout.colorways.map((c, i) => (
                    <button key={c.id} type="button" className="chip !px-2.5 !py-1 !text-xs" data-active={variant === i} onClick={() => setVariant(i)}>
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {([1, 2, 3] as const).map((n) => (
                    <button key={n} type="button" className="chip !px-2.5 !py-1 !text-xs" data-active={photos === n} onClick={() => setPhotos(n)}>
                      {n} photo{n > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t-[3px] border-dashed border-ink/15 pt-4">
        <button type="button" className="btn btn-ghost-ink" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-rose" disabled={!parsed.ok || save.isPending || !s.title.trim() || !s.titleBn.trim()} onClick={() => save.mutate()}>
          {save.isPending ? <Spinner /> : null} {s.id ? "Save changes" : "Create template"}
        </button>
      </div>
    </Dialog>
  );
}

export function AdminTemplates() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "templates"], queryFn: () => api.admin.templates() });
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toDelete, setToDelete] = useState<ApiTemplate | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "templates"] });
    void qc.invalidateQueries({ queryKey: ["templates"] });
  };
  const toggle = useMutation({
    mutationFn: (t: ApiTemplate) => api.admin.updateTemplate(t.id, { isActive: !t.isActive }),
    onSuccess: refresh,
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });
  const rethumb = useMutation({
    mutationFn: (id: string) => api.admin.rethumb(id),
    onSuccess: () => (toast.success("Thumbnail re-rendered"), refresh()),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.admin.deleteTemplate(id),
    onSuccess: (r) => {
      toast.success(r.deleted ? "Template deleted" : "Template has posters — deactivated instead");
      setToDelete(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const items = q.data?.items ?? [];
  return (
    <>
      <AdminHeading
        title="Templates"
        sub="Edit layouts as JSON with a live preview, switch templates on or off, and refresh thumbnails."
        actions={
          <button type="button" className="btn btn-gold" onClick={() => setEditor(blank())}>
            <Plus size={18} strokeWidth={3} /> New template
          </button>
        }
      />

      {q.isPending ? (
        <div className="grid min-h-[30vh] place-items-center"><Spinner size={40} /></div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((t) => (
            <article key={t.id} className={cn("plate plate-flush overflow-hidden", !t.isActive && "opacity-70")}>
              <div className="flex gap-4 p-4">
                {t.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.thumbnailUrl} alt="" width={300} height={400} className="h-36 w-[108px] shrink-0 rounded-lg border-[3px] border-ink object-cover" />
                ) : (
                  <div className="h-36 w-[108px] shrink-0 rounded-lg border-[3px] border-dashed border-ink/30 bg-mist" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-[1.35rem] leading-tight">{t.titleBn}</h3>
                  <p className="mt-0.5 truncate text-[0.88rem] font-semibold text-ink-3">{t.title}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="chip !cursor-default !py-0.5 !text-[0.7rem]">{t.occasionType}</span>
                    <span className="chip !cursor-default !py-0.5 !text-[0.7rem]">{t.layoutConfig.themeId}</span>
                  </div>
                  <p className="mt-3 text-sm text-ink-2">
                    <b className="font-mono">{t.usageCount ?? 0}</b> posters
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t-[3px] border-ink/15 bg-mist px-4 py-3">
                <label className="flex items-center gap-2 font-display text-[0.95rem] font-extrabold">
                  <Switch checked={t.isActive} onChange={() => toggle.mutate(t)} label={`Toggle ${t.title}`} />
                  {t.isActive ? "Active" : "Hidden"}
                </label>
                <div className="flex gap-1.5">
                  <button type="button" title="Edit" className="btn btn-white btn-sm !px-2.5" onClick={() => setEditor(fromTemplate(t))}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" title="Re-render thumbnail" className="btn btn-white btn-sm !px-2.5" disabled={rethumb.isPending} onClick={() => rethumb.mutate(t.id)}>
                    {rethumb.isPending && rethumb.variables === t.id ? <Spinner size={15} /> : <ImagePlus size={15} />}
                  </button>
                  <button type="button" title="Delete" className="btn btn-white btn-sm !px-2.5 !text-red-deep" onClick={() => setToDelete(t)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editor ? <TemplateEditor open initial={editor} onClose={() => setEditor(null)} onSaved={() => (setEditor(null), refresh())} /> : null}

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)} title="Delete template">
        <p className="text-ink-2">
          Delete <b>{toDelete?.title}</b>? If people have already made posters with it, it will be deactivated instead so their posters keep working.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost-ink" onClick={() => setToDelete(null)}>
            Cancel
          </button>
          <button type="button" className="btn btn-rose" disabled={del.isPending} onClick={() => toDelete && del.mutate(toDelete.id)}>
            {del.isPending ? <Spinner /> : <Trash2 size={16} />} Delete
          </button>
        </div>
      </Dialog>
    </>
  );
}
