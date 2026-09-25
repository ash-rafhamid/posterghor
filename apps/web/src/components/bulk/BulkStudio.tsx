"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, Download, Eye, FileSpreadsheet, Layers, Pencil, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATE_PRESETS } from "@poster/shared";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { PreviewPanel } from "@/components/studio/PreviewPanel";
import { PhotosSection } from "@/components/studio/PhotosSection";
import { StudioSection } from "@/components/studio/StudioSection";
import { StyleSection } from "@/components/studio/StyleSection";
import { TemplatePicker } from "@/components/studio/TemplatePicker";
import { WordsSection } from "@/components/studio/WordsSection";
import { initialForm, previewResolved, templateDefaults, type StudioForm, type StudioPhoto, type StudioTemplate, type TextKey, type Touched } from "@/components/studio/state";
import { Field, Spinner } from "@/components/ui/primitives";
import { useT } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { parseCsv, sampleCsv, toBulkTable } from "@/lib/csv";
import { cn, saveBlob } from "@/lib/utils";

const PRESETS: StudioTemplate[] = TEMPLATE_PRESETS.map((p) => ({ id: p.slug, slug: p.slug, title: p.title, titleBn: p.titleBn, occasionType: p.occasionType, layoutConfig: p.layoutConfig }));

/** Bulk mode: shared words + portraits + style, and one CSV row per person → one poster each. */
export function BulkStudio() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useAuth();

  const tplQuery = useQuery({ queryKey: ["templates"], queryFn: () => api.templates.list(), placeholderData: keepPreviousData, staleTime: 60_000 });
  const cfg = useQuery({ queryKey: ["config"], queryFn: () => api.config(), staleTime: 5 * 60_000, retry: 1 }).data;
  const templates: StudioTemplate[] = useMemo(() => {
    const items = tplQuery.data?.items;
    return items?.length ? items.map((x) => ({ id: x.id, slug: x.slug, title: x.title, titleBn: x.titleBn, occasionType: x.occasionType, layoutConfig: x.layoutConfig, thumbnailUrl: x.thumbnailUrl })) : PRESETS;
  }, [tplQuery.data]);
  const apiReady = !!tplQuery.data?.items?.length;

  const wanted = params.get("template");
  const [slug, setSlug] = useState(() => (wanted && PRESETS.some((x) => x.slug === wanted) ? wanted : PRESETS[0]!.slug));
  const template = templates.find((x) => x.slug === slug) ?? templates[0]!;
  const [form, setForm] = useState<StudioForm>(() => initialForm(PRESETS.find((x) => x.slug === slug) ?? PRESETS[0]!));
  const [touched, setTouched] = useState<Touched>({});
  const [photos, setPhotos] = useState<StudioPhoto[]>([]);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState(0);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ headline?: string; photos?: string; consent?: string; rows?: string }>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const pending = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const maxRows = cfg?.limits.bulkMaxRows ?? 30;

  const table = useMemo(() => toBulkTable(parseCsv(csv)), [csv]);
  const valid = table.rows.filter((r) => r.valid);
  const current = table.rows[Math.min(preview, Math.max(0, table.rows.length - 1))];

  // free object URLs on unmount
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const setField = <K extends keyof StudioForm>(key: K, value: StudioForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "headlineFont") setTouched((x) => ({ ...x, headlineFont: true }));
  };
  const setText = (key: TextKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setTouched((x) => ({ ...x, [key]: true }));
    if (key === "headline") setErrors((e) => ({ ...e, headline: undefined }));
  };

  function chooseTemplate(next: string) {
    const tpl = templates.find((x) => x.slug === next);
    if (!tpl || next === slug) return;
    const d = templateDefaults(tpl);
    setForm((f) => ({
      ...f,
      headline: touched.headline ? f.headline : d.headline,
      subheadline: touched.subheadline ? f.subheadline : d.subheadline,
      dateText: touched.dateText ? f.dateText : d.dateText,
      creditLabel: touched.creditLabel ? f.creditLabel : d.creditLabel,
      headlineFont: touched.headlineFont ? f.headlineFont : tpl.layoutConfig.headline.fontId,
      palette: "auto",
    }));
    setSlug(next);
  }

  // the poster for whichever person is selected: shared form + that row's own fields
  const resolved = useMemo(() => {
    const merged: StudioForm = { ...form, ...(current?.values ?? {}) } as StudioForm;
    return previewResolved(template.layoutConfig, merged, photos, template.occasionType);
  }, [form, current, photos, template]);

  async function readFile(file: File) {
    if (file.size > 1_000_000) return void toast.error("That file is too large for a CSV.");
    setCsv(await file.text());
    setPreview(0);
    setErrors((e) => ({ ...e, rows: undefined }));
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (form.headline.trim().length < 2) e.headline = t("studio.needHeadline");
    if (!photos.length) e.photos = t("studio.needPhoto");
    if (!valid.length) e.rows = t("bulk.noValid");
    if (!consent) e.consent = t("studio.needConsent");
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error(t("studio.fixFirst"));
      setTab("edit");
      const target = e.headline ? "b-words" : e.photos ? "b-photos" : e.rows ? "b-people" : "b-submit";
      requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return false;
    }
    return true;
  }

  async function submit() {
    if (photosBusy) return; // a photo is still being prepared — it would be left out of every poster
    if (!validate()) return;
    if (status !== "authed") {
      pending.current = true;
      setAuthOpen(true);
      return;
    }
    if (!apiReady || template.id === template.slug) return void toast.error(t("common.networkError"));
    try {
      const uploaded = [...photos];
      for (let i = 0; i < uploaded.length; i++) {
        const p = uploaded[i]!;
        if (p.uploadedUrl) continue;
        setBusy(t("studio.uploading", { i: i + 1, n: uploaded.length }));
        const file = new File([p.blob], `photo-${i + 1}.${p.type === "image/png" ? "png" : "jpg"}`, { type: p.type });
        const up = await api.upload(file);
        uploaded[i] = { ...p, uploadedUrl: up.url };
        setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, uploadedUrl: up.url } : x)));
      }
      setBusy(t("studio.generating"));
      const { posters, skipped } = await api.posters.bulk({
        templateId: template.id,
        consent: true,
        base: {
          occasion: template.occasionType,
          headline: form.headline,
          subheadline: form.subheadline,
          dateText: form.dateText,
          creditLabel: form.creditLabel,
          party: form.party,
          union: form.union,
          thana: form.thana,
          district: form.district,
          headlineFont: form.headlineFont,
          frame: form.frame,
          photoLayout: form.photoLayout,
          palette: form.palette,
          useAiBackdrop: form.useAiBackdrop,
          photos: uploaded.map((p) => ({ url: p.uploadedUrl!, caption: p.caption, subcaption: p.subcaption })),
        },
        rows: valid.map((r) => r.values),
      });
      toast.success(t("bulk.started", { n: posters.length }));
      if (skipped.length) toast.warning(t("bulk.skipped", { n: skipped.length }), { duration: 6000 });
      router.push(`/bulk/results?ids=${posters.map((p) => p.id).join(",")}${skipped.length ? `&skipped=${skipped.length}` : ""}`);
    } catch (err) {
      setBusy(null);
      toast.error(err instanceof ApiError ? (err.status === 0 ? t("common.networkError") : err.message) : t("common.genericError"), { duration: 6000 });
    }
  }

  useEffect(() => {
    if (status === "authed" && pending.current) {
      pending.current = false;
      setAuthOpen(false);
      void submit();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-28 pt-8 sm:px-6 lg:pb-16">
      <header className="mb-10 max-w-3xl">
        <span className="tag !bg-white">
          <Layers size={14} strokeWidth={2.8} /> {t("bulk.nav")}
        </span>
        <h1 className="paint mt-4 text-[clamp(2.4rem,5vw,4rem)] leading-[1.14]">{t("bulk.title")}</h1>
        <p className="mt-3 text-[1.15rem] text-white/85">{t("bulk.sub")}</p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
        <div className={cn("min-w-0 space-y-6", tab === "preview" && "hidden lg:block")}>
          <StudioSection n="01" color="gold" title={t("studio.stepTemplate")}>
            <TemplatePicker templates={templates} value={template.slug} onChange={chooseTemplate} />
          </StudioSection>

          <StudioSection n="02" color="pink" title={t("bulk.stepShared")} id="b-words">
            <WordsSection form={form} onText={setText} occasion={template.occasionType} errors={errors} authed={status === "authed"} onNeedAuth={() => setAuthOpen(true)} />
          </StudioSection>

          <StudioSection n="03" color="teal" title={t("bulk.stepPhotos")} hint={t("bulk.photosHint")} id="b-photos">
            <PhotosSection
              photos={photos}
              onChange={(next) => {
                setPhotos(next);
                setErrors((e) => ({ ...e, photos: undefined }));
              }}
              maxMb={cfg?.limits.maxUploadMb ?? 12}
              error={errors.photos}
              onProcessing={setPhotosBusy}
            />
          </StudioSection>

          <StudioSection n="04" color="leaf" title={t("bulk.stepPeople")} id="b-people">
            <p className="text-[0.95rem] text-ink-2">{t("bulk.csvHint")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => (e.target.files?.[0] ? void readFile(e.target.files[0]) : undefined, (e.target.value = ""))} />
              <button type="button" className="btn btn-gold btn-sm" onClick={() => fileRef.current?.click()}>
                <FileSpreadsheet size={16} /> {t("bulk.upload")}
              </button>
              <button type="button" className="btn btn-teal btn-sm" onClick={() => saveBlob(new Blob([sampleCsv()], { type: "text/csv;charset=utf-8" }), "posterghor-people-template.csv")}>
                <Download size={16} /> {t("bulk.template")}
              </button>
            </div>
            <label className="mt-5 block font-display text-[1rem] font-extrabold text-ink">{t("bulk.paste")}</label>
            <textarea
              className="field mt-1.5 !font-mono !text-[0.8rem] !leading-relaxed"
              rows={5}
              value={csv}
              spellCheck={false}
              placeholder={t("bulk.pastePh")}
              onChange={(e) => {
                setCsv(e.target.value);
                setPreview(0);
                setErrors((x) => ({ ...x, rows: undefined }));
              }}
            />

            {errors.rows ? (
              <p role="alert" className="mt-3 text-sm font-semibold text-red-deep">
                {errors.rows}
              </p>
            ) : null}

            {table.rows.length ? (
              <div className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display font-extrabold">
                    {t("bulk.people", { n: valid.length })} <span className="font-normal text-ink-3">/ {maxRows}</span>
                  </p>
                  {table.rows.length !== valid.length ? (
                    <span className="flex items-center gap-1 text-[0.82rem] font-bold text-red-deep">
                      <TriangleAlert size={13} /> {table.rows.length - valid.length} × {t("bulk.needName")}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 max-h-72 overflow-auto rounded-2xl border-[3px] border-ink bg-white">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <tbody>
                      {table.rows.map((r, i) => (
                        <tr key={r.n} onClick={() => setPreview(i)} className={cn("cursor-pointer border-b border-ink/10 last:border-0 hover:bg-butter/60", i === preview && "bg-butter")}>
                          <td className="w-8 px-3 py-2 font-mono text-xs text-ink-3">{r.n}</td>
                          <td className="px-2 py-2 font-body font-bold">{r.values.name ?? <span className="text-red-deep">{t("bulk.needName")}</span>}</td>
                          <td className="px-2 py-2 font-body text-ink-2">{r.values.designation}</td>
                          <td className="hidden px-2 py-2 font-body text-ink-3 sm:table-cell">{[r.values.union, r.values.thana, r.values.district].filter(Boolean).join(", ")}</td>
                          <td className="w-8 px-2 text-right">{i === preview ? <Eye size={15} className="ml-auto" /> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {table.ignored.length ? <p className="mt-2 text-xs text-ink-3">{t("bulk.ignored", { cols: table.ignored.join(", ") })}</p> : null}
                {table.truncated ? <p className="mt-1 text-xs font-semibold text-red-deep">{t("bulk.tooMany", { n: maxRows, total: table.total })}</p> : null}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border-[3px] border-dashed border-ink/25 bg-mist p-4 text-center text-[0.95rem] text-ink-3">{t("bulk.empty")}</p>
            )}

            <div className="mt-6 border-t-[3px] border-dashed border-ink/15 pt-5">
              <p className="font-display font-extrabold">{t("bulk.defaults")}</p>
              <p className="mb-3 text-[0.8rem] text-ink-3">{t("bulk.defaultsHint")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("studio.party")}>{(p) => <input {...p} className="field font-body" maxLength={80} value={form.party} onChange={(e) => setField("party", e.target.value)} />}</Field>
                <Field label={t("studio.union")}>{(p) => <input {...p} className="field font-body" maxLength={50} value={form.union} onChange={(e) => setField("union", e.target.value)} />}</Field>
                <Field label={t("studio.thana")}>{(p) => <input {...p} className="field font-body" maxLength={50} value={form.thana} onChange={(e) => setField("thana", e.target.value)} />}</Field>
                <Field label={t("studio.district")}>{(p) => <input {...p} className="field font-body" maxLength={50} value={form.district} onChange={(e) => setField("district", e.target.value)} />}</Field>
              </div>
            </div>
          </StudioSection>

          <StudioSection n="05" color="gold-deep" title={t("bulk.stepStyle")}>
            <StyleSection form={form} onField={setField} layout={template.layoutConfig} backdropsEnabled={!!cfg?.ai.backdrops} />
          </StudioSection>

          <section id="b-submit" className="plate scroll-mt-28 p-5 sm:p-7">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => (setConsent(e.target.checked), setErrors((x) => ({ ...x, consent: undefined })))}
                className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer appearance-none rounded-lg border-[3px] border-ink bg-white checked:bg-teal checked:[background-image:url(&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path d='M4.5 10.5l3.4 3.4 7.6-8' fill='none' stroke='%231b1147' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'/></svg>&quot;)]"
              />
              <span className="text-[0.95rem] leading-snug">{t("studio.consent")}</span>
            </label>
            {errors.consent ? <p role="alert" className="mt-2 pl-8 text-sm font-semibold text-red-deep">{errors.consent}</p> : null}
            <button type="button" onClick={submit} disabled={!!busy || photosBusy} className="btn btn-gold btn-lg mt-5 w-full">
              {busy || photosBusy ? <Spinner /> : <Check size={20} strokeWidth={3} />}
              {busy ?? (photosBusy ? t("studio.preparing") : status === "anon" ? t("studio.signInToGenerate") : t("bulk.generate", { n: valid.length || 0 }))}
            </button>
          </section>
        </div>

        <div className={cn("min-w-0 lg:sticky lg:top-28 lg:self-start", tab === "edit" && "hidden lg:block")}>
          <PreviewPanel resolved={resolved} layout={template.layoutConfig} form={form} onPalette={(id) => setField("palette", id)} placeholders={photos.length === 0} />
          {current ? (
            <p className="mt-4 text-center text-[0.95rem] text-white/85">
              {t("bulk.previewing")}: <b className="font-body text-white">{current.values.name ?? "n/a"}</b> · {preview + 1}/{table.rows.length}
            </p>
          ) : null}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center lg:hidden">
        <div className="flex overflow-hidden rounded-full border-[3px] border-ink bg-white p-1 shadow-[0_18px_28px_-12px_rgba(6,8,70,0.8)]">
          {(
            [
              ["edit", t("studio.mobileEdit"), Pencil],
              ["preview", t("studio.mobilePreview"), Eye],
            ] as const
          ).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className={cn("flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-[0.98rem] font-extrabold", tab === k ? "bg-ink text-white" : "text-ink hover:bg-butter")}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      <AuthDialog
        open={authOpen}
        onClose={() => {
          pending.current = false;
          setAuthOpen(false);
        }}
        onSuccess={() => setAuthOpen(false)}
      />
    </div>
  );
}
