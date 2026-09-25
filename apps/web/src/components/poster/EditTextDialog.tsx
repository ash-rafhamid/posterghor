"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { ApiPoster } from "@poster/shared";
import { Dialog, Field, Spinner } from "@/components/ui/primitives";
import { useT } from "@/i18n";

type Draft = {
  headline: string;
  subheadline: string;
  dateText: string;
  name: string;
  designation: string;
  party: string;
  union: string;
  thana: string;
  district: string;
  creditLabel: string;
  captions: Array<{ caption: string; subcaption: string }>;
};

const draftFrom = (p: ApiPoster, subheadline?: string): Draft => ({
  headline: p.formData.headline,
  subheadline: subheadline ?? p.formData.subheadline,
  dateText: p.formData.dateText,
  name: p.formData.name,
  designation: p.formData.designation,
  party: p.formData.party,
  union: p.formData.union,
  thana: p.formData.thana,
  district: p.formData.district,
  creditLabel: p.formData.creditLabel,
  captions: p.formData.photos.map((x) => ({ caption: x.caption, subcaption: x.subcaption })),
});

/** Fix a typo without changing the look: re-renders the same colourway with the edited text. */
export function EditTextDialog({
  open,
  poster,
  initialSubheadline,
  busy,
  onClose,
  onApply,
}: {
  open: boolean;
  poster: ApiPoster;
  initialSubheadline?: string;
  busy: boolean;
  onClose: () => void;
  onApply: (changes: Record<string, unknown>) => void;
}) {
  const t = useT();
  const [d, setD] = useState<Draft>(() => draftFrom(poster, initialSubheadline));

  // reset whenever the dialog is (re)opened
  useEffect(() => {
    if (open) setD(draftFrom(poster, initialSubheadline));
  }, [open, poster, initialSubheadline]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const text = (k: Exclude<keyof Draft, "captions">, max: number) => (p: object) => <input {...p} maxLength={max} className="field font-body" value={d[k]} onChange={(e) => set(k, e.target.value)} />;

  function apply() {
    const changes: Record<string, unknown> = {};
    for (const k of ["headline", "subheadline", "dateText", "name", "designation", "party", "union", "thana", "district", "creditLabel"] as const) {
      if (d[k].trim() !== poster.formData[k]) changes[k] = d[k];
    }
    const capsChanged = d.captions.some((c, i) => c.caption !== poster.formData.photos[i]?.caption || c.subcaption !== poster.formData.photos[i]?.subcaption);
    if (capsChanged) changes.photos = poster.formData.photos.map((p, i) => ({ ...p, caption: d.captions[i]?.caption ?? p.caption, subcaption: d.captions[i]?.subcaption ?? p.subcaption }));
    onApply(changes);
  }

  return (
    <Dialog open={open} onClose={onClose} title={t("poster.editText")} className="!max-w-2xl">
      <p className="-mt-1 mb-5 text-[0.95rem] text-ink-2">{t("poster.editTextHint")}</p>
      <div className="grid max-h-[60vh] gap-4 overflow-y-auto px-1 pb-2 pr-2 sm:grid-cols-2">
        <Field label={t("studio.headline")} className="sm:col-span-2">
          {(p) => <textarea {...p} rows={2} maxLength={90} className="field font-body !text-lg" value={d.headline} onChange={(e) => set("headline", e.target.value)} />}
        </Field>
        <Field label={t("studio.subheadline")} className="sm:col-span-2">
          {text("subheadline", 140)}
        </Field>
        <Field label={t("studio.dateText")}>{text("dateText", 40)}</Field>
        <Field label={t("studio.creditLabel")}>{text("creditLabel", 24)}</Field>
        <Field label={t("studio.name")}>{text("name", 70)}</Field>
        <Field label={t("studio.designation")}>{text("designation", 70)}</Field>
        <Field label={t("studio.party")} className="sm:col-span-2">
          {text("party", 80)}
        </Field>
        <Field label={t("studio.union")}>{text("union", 50)}</Field>
        <Field label={t("studio.thana")}>{text("thana", 50)}</Field>
        <Field label={t("studio.district")}>{text("district", 50)}</Field>

        {d.captions.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 rounded-2xl border-[3px] border-dashed border-ink/25 bg-mist p-3 sm:col-span-2">
            <Field label={`${t("studio.captionName")} · ${i + 1}`}>
              {(p) => <input {...p} maxLength={60} className="field font-body" value={c.caption} onChange={(e) => set("captions", d.captions.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />}
            </Field>
            <Field label={t("studio.captionSub")}>
              {(p) => <input {...p} maxLength={70} className="field font-body" value={c.subcaption} onChange={(e) => set("captions", d.captions.map((x, j) => (j === i ? { ...x, subcaption: e.target.value } : x)))} />}
            </Field>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t-[3px] border-dashed border-ink/15 pt-4">
        <button type="button" onClick={onClose} className="btn btn-ghost-ink">
          {t("common.cancel")}
        </button>
        <button type="button" onClick={apply} disabled={busy} className="btn btn-rose">
          {busy ? <Spinner /> : <Check size={18} strokeWidth={3.4} />}
          {t("poster.applyChanges")}
        </button>
      </div>
    </Dialog>
  );
}
