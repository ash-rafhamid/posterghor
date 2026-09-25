"use client";

import { CREDIT_LABELS } from "@poster/shared";
import { Field } from "@/components/ui/primitives";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { StudioForm } from "./state";

export function DetailsSection({ form, onField, errors }: { form: StudioForm; onField: <K extends keyof StudioForm>(key: K, value: StudioForm[K]) => void; errors: { name?: string } }) {
  const t = useT();
  const text = (key: keyof StudioForm, max: number, ph?: string) => (p: object) => (
    <input {...p} maxLength={max} className="field font-body" value={form[key] as string} onChange={(e) => onField(key, e.target.value as never)} placeholder={ph} />
  );

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("studio.name")} error={errors.name}>
        {text("name", 70, t("studio.namePh"))}
      </Field>
      <Field label={t("studio.designation")} optionalLabel={t("common.optional")}>
        {text("designation", 70, t("studio.designationPh"))}
      </Field>
      <Field label={t("studio.party")} optionalLabel={t("common.optional")}>
        {text("party", 80, t("studio.partyPh"))}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("studio.union")}>{text("union", 50)}</Field>
        <Field label={t("studio.thana")}>{text("thana", 50)}</Field>
        <Field label={t("studio.district")}>{text("district", 50)}</Field>
      </div>

      <div>
        <p className="font-display text-[1rem] font-extrabold text-ink">{t("studio.creditLabel")}</p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={t("studio.creditLabel")}>
          {CREDIT_LABELS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={form.creditLabel === c} data-active={form.creditLabel === c} onClick={() => onField("creditLabel", c)} className={cn("chip font-body !text-[0.95rem]")}>
              {c}
            </button>
          ))}
        </div>
        <input className="field mt-2.5 font-body" maxLength={24} value={form.creditLabel} onChange={(e) => onField("creditLabel", e.target.value)} aria-label={t("studio.creditLabel")} />
        <p className="mt-1.5 text-[0.85rem] text-ink-3">{t("studio.creditHint")}</p>
      </div>
    </div>
  );
}
