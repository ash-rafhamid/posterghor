"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getOccasion, type OccasionId } from "@poster/shared";
import { Field, Spinner } from "@/components/ui/primitives";
import { useT } from "@/i18n";
import { ApiError, api, type TextSuggestions } from "@/lib/api";
import { IdeaChips } from "./StudioSection";
import type { StudioForm, TextKey } from "./state";

export function WordsSection({
  form,
  onText,
  occasion,
  errors,
  authed,
  onNeedAuth,
}: {
  form: StudioForm;
  onText: (key: TextKey, value: string) => void;
  occasion: OccasionId;
  errors: { headline?: string };
  authed: boolean;
  onNeedAuth: () => void;
}) {
  const t = useT();
  const meta = getOccasion(occasion);
  const [ai, setAi] = useState<TextSuggestions | null>(null);
  const [busy, setBusy] = useState(false);

  async function suggest() {
    if (!authed) return onNeedAuth();
    setBusy(true);
    try {
      setAi(await api.ai.suggest(occasion, meta.tone));
    } catch (e) {
      toast.error(e instanceof ApiError && e.status !== 0 ? e.message : t("common.networkError"));
    } finally {
      setBusy(false);
    }
  }

  const headlines = ai?.headlines?.length ? ai.headlines : meta.headlines;
  const subs = ai?.subheadlines?.length ? ai.subheadlines : meta.subheadlines;

  return (
    <div className="flex flex-col gap-5">
      <Field label={t("studio.headline")} hint={t("studio.headlineHint")} error={errors.headline}>
        {(p) => (
          <div className="relative">
            <textarea
              {...p}
              rows={2}
              maxLength={90}
              className="field font-body !text-[1.25rem] !leading-snug"
              value={form.headline}
              onChange={(e) => onText("headline", e.target.value)}
              placeholder={t("studio.headlinePh")}
            />
            <span className="pointer-events-none absolute bottom-2 right-3 rounded-full bg-white/80 px-2 text-[0.72rem] font-bold text-ink-3">{form.headline.length}/90</span>
          </div>
        )}
      </Field>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-[1rem] font-extrabold text-ink">{t("studio.ideas")}</p>
          <button type="button" onClick={suggest} disabled={busy} className="btn btn-teal btn-sm">
            {busy ? <Spinner size={15} /> : <Sparkles size={15} strokeWidth={2.8} />}
            {busy ? t("studio.suggesting") : t("studio.suggest")}
          </button>
        </div>
        <IdeaChips items={headlines.slice(0, 6)} onPick={(s) => onText("headline", s)} />
        {ai ? <p className="mt-2 text-[0.82rem] font-bold text-teal-deep">{ai.source === "gemini" ? t("studio.suggestGemini") : t("studio.suggestCurated")}</p> : null}
        {!authed && !ai ? <p className="mt-2 text-xs text-ink-3">{t("studio.suggestLogin")}</p> : null}
      </div>

      <Field label={t("studio.subheadline")} optionalLabel={t("common.optional")}>
        {(p) => <input {...p} maxLength={140} className="field font-body" value={form.subheadline} onChange={(e) => onText("subheadline", e.target.value)} placeholder={t("studio.subheadlinePh")} />}
      </Field>
      <IdeaChips items={subs.slice(0, 3)} onPick={(s) => onText("subheadline", s)} />

      <Field label={t("studio.dateText")} optionalLabel={t("common.optional")}>
        {(p) => <input {...p} maxLength={40} className="field font-body" value={form.dateText} onChange={(e) => onText("dateText", e.target.value)} placeholder={t("studio.dateTextPh")} />}
      </Field>
    </div>
  );
}
