"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Eye, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATE_PRESETS } from "@poster/shared";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Spinner } from "@/components/ui/primitives";
import { useLang, useT } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { DetailsSection } from "./DetailsSection";
import { PhotosSection } from "./PhotosSection";
import { PreviewPanel } from "./PreviewPanel";
import { StudioSection } from "./StudioSection";
import { StyleSection } from "./StyleSection";
import { TemplatePicker } from "./TemplatePicker";
import { WordsSection } from "./WordsSection";
import {
  clearDraft,
  initialForm,
  loadDraft,
  previewResolved,
  saveDraft,
  templateDefaults,
  type StudioForm,
  type StudioPhoto,
  type StudioTemplate,
  type TextKey,
  type Touched,
} from "./state";

/** Local presets in the API shape — instant first paint, and a working preview even if the API is down. */
const PRESET_TEMPLATES: StudioTemplate[] = TEMPLATE_PRESETS.map((p) => ({
  id: p.slug,
  slug: p.slug,
  title: p.title,
  titleBn: p.titleBn,
  occasionType: p.occasionType,
  layoutConfig: p.layoutConfig,
}));

interface Errors {
  headline?: string;
  name?: string;
  photos?: string;
  consent?: string;
}

export function Studio() {
  const t = useT();
  const { lang } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const { status, user } = useAuth();

  /* ── data ─────────────────────────────────────────────────────────── */
  const tplQuery = useQuery({ queryKey: ["templates"], queryFn: () => api.templates.list(), placeholderData: keepPreviousData, staleTime: 60_000 });
  const cfgQuery = useQuery({ queryKey: ["config"], queryFn: () => api.config(), staleTime: 5 * 60_000, retry: 1 });
  const templates: StudioTemplate[] = useMemo(() => {
    const items = tplQuery.data?.items;
    return items?.length ? items.map((x) => ({ id: x.id, slug: x.slug, title: x.title, titleBn: x.titleBn, occasionType: x.occasionType, layoutConfig: x.layoutConfig, thumbnailUrl: x.thumbnailUrl })) : PRESET_TEMPLATES;
  }, [tplQuery.data]);
  const apiReady = !!tplQuery.data?.items?.length;
  const cfg = cfgQuery.data;

  /* ── state ────────────────────────────────────────────────────────── */
  const wantedSlug = params.get("template");
  const [slug, setSlug] = useState<string>(() => (wantedSlug && PRESET_TEMPLATES.some((x) => x.slug === wantedSlug) ? wantedSlug : PRESET_TEMPLATES[0]!.slug));
  const template = templates.find((x) => x.slug === slug) ?? templates[0]!;

  const [form, setForm] = useState<StudioForm>(() => initialForm(PRESET_TEMPLATES.find((x) => x.slug === slug) ?? PRESET_TEMPLATES[0]!));
  const [touched, setTouched] = useState<Touched>({});
  const [photos, setPhotos] = useState<StudioPhoto[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<null | { step: "uploading" | "creating"; i?: number; n?: number }>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const pendingSubmit = useRef(false);
  const restored = useRef(false);

  // restore a draft (text only — photos can't survive a reload) once
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const d = loadDraft();
    if (d && (!wantedSlug || wantedSlug === d.slug) && PRESET_TEMPLATES.some((x) => x.slug === d.slug)) {
      setSlug(d.slug);
      setForm({ ...initialForm(PRESET_TEMPLATES.find((x) => x.slug === d.slug)!), ...d.form });
      setTouched(d.touched);
    }
  }, [wantedSlug]);

  useEffect(() => {
    const id = setTimeout(() => saveDraft({ slug, form, touched }), 400);
    return () => clearTimeout(id);
  }, [slug, form, touched]);

  // keep the URL shareable
  useEffect(() => {
    if (params.get("template") !== slug) router.replace(`/create?template=${slug}`, { scroll: false });
  }, [slug, params, router]);

  // free object URLs on unmount
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  /* ── handlers ─────────────────────────────────────────────────────── */
  const setField = useCallback(<K extends keyof StudioForm>(key: K, value: StudioForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "headlineFont") setTouched((x) => ({ ...x, headlineFont: true }));
  }, []);

  const setText = useCallback((key: TextKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setTouched((x) => ({ ...x, [key]: true }));
    if (key === "headline") setErrors((e) => ({ ...e, headline: undefined }));
  }, []);

  function chooseTemplate(next: string) {
    if (next === slug) return;
    const tpl = templates.find((x) => x.slug === next);
    if (!tpl) return;
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
    if (Object.values(touched).some(Boolean)) toast(t("studio.templateChanged"), { duration: 2200 });
  }

  /* ── live preview ─────────────────────────────────────────────────── */
  const resolved = useMemo(() => previewResolved(template.layoutConfig, form, photos, template.occasionType), [template, form, photos]);

  /* ── validation + submit ──────────────────────────────────────────── */
  function validate(): boolean {
    const e: Errors = {};
    if (form.headline.trim().length < 2) e.headline = t("studio.needHeadline");
    if (form.name.trim().length < 2) e.name = t("studio.needName");
    if (!photos.length) e.photos = t("studio.needPhoto");
    if (!consent) e.consent = t("studio.needConsent");
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error(t("studio.fixFirst"));
      const target = e.headline ? "sec-words" : e.photos ? "sec-photos" : e.name ? "sec-details" : "sec-submit";
      setTab("edit");
      requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return false;
    }
    return true;
  }

  async function submit() {
    if (photosBusy) return; // a photo is still being prepared — it would be left out of the poster
    if (!validate()) return;
    if (status !== "authed") {
      pendingSubmit.current = true;
      setAuthOpen(true);
      return;
    }
    if (!apiReady || template.id === template.slug) {
      toast.error(t("common.networkError"));
      return;
    }
    try {
      const uploaded = [...photos];
      for (let i = 0; i < uploaded.length; i++) {
        const p = uploaded[i]!;
        if (p.uploadedUrl) continue;
        setBusy({ step: "uploading", i: i + 1, n: uploaded.length });
        const file = new File([p.blob], `photo-${i + 1}.${p.type === "image/png" ? "png" : "jpg"}`, { type: p.type });
        const up = await api.upload(file);
        uploaded[i] = { ...p, uploadedUrl: up.url };
        setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, uploadedUrl: up.url } : x)));
      }
      setBusy({ step: "creating" });
      const { poster } = await api.posters.create({
        templateId: template.id,
        consent: true,
        formData: {
          occasion: template.occasionType,
          headline: form.headline,
          subheadline: form.subheadline,
          dateText: form.dateText,
          name: form.name,
          designation: form.designation,
          party: form.party,
          union: form.union,
          thana: form.thana,
          district: form.district,
          creditLabel: form.creditLabel,
          headlineFont: form.headlineFont,
          frame: form.frame,
          photoLayout: form.photoLayout,
          palette: form.palette,
          useAiBackdrop: form.useAiBackdrop,
          photos: uploaded.map((p) => ({ url: p.uploadedUrl!, caption: p.caption, subcaption: p.subcaption })),
        },
      });
      clearDraft();
      toast.success(t("studio.created"));
      router.push(`/posters/${poster.id}`);
    } catch (err) {
      setBusy(null);
      if (err instanceof ApiError) {
        if (err.status === 0) toast.error(t("common.networkError"));
        else toast.error(err.message, { duration: 6000 });
      } else toast.error(t("common.genericError"));
    }
  }

  // signed in through the dialog → carry on where we left off
  useEffect(() => {
    if (status === "authed" && pendingSubmit.current) {
      pendingSubmit.current = false;
      setAuthOpen(false);
      void submit();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadingLabel = busy?.step === "uploading" ? t("studio.uploading", { i: busy.i ?? 1, n: busy.n ?? 1 }) : busy ? t("studio.generating") : null;

  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-28 pt-8 sm:px-6 lg:pb-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl">
          <span className="tag !bg-white">Studio</span>
          <h1 className="paint mt-4 text-[clamp(2.4rem,5vw,4rem)] leading-[1.14]">{t("studio.title")}</h1>
          <p className="mt-3 text-[1.15rem] text-white/85">{t("studio.sub")}</p>
          <Link href="/bulk" className="mt-3 inline-block font-display text-[1.02rem] font-extrabold text-gold underline decoration-[3px] underline-offset-4 hover:text-white">
            {t("bulk.banner")}
          </Link>
        </div>
        <div className={cn("tag !py-1.5 !text-[0.85rem]", cfg?.ai.gemini ? "!bg-teal" : "!bg-butter")}>
          <Sparkles size={15} strokeWidth={2.8} />
          {cfg?.ai.gemini ? `Gemini · ${cfg.ai.textModel}` : lang === "bn" ? "এআই বন্ধ, বাছাই করা রঙের সাজ" : "AI off · curated colourways"}
        </div>
      </header>

      {tplQuery.isSuccess && !tplQuery.data.items.length ? (
        <p role="status" className="plate plate-butter mb-6 px-5 py-4 text-[0.98rem] font-bold">
          The server has no templates yet. An admin needs to run <code className="rounded-md bg-ink px-1.5 py-0.5 font-mono text-[0.85em] text-white">npm run seed</code>. You can still design with the built-in presets; generating needs the seeded templates.
        </p>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
        {/* ───────── left: the form ───────── */}
        <div className={cn("min-w-0 space-y-6", tab === "preview" && "hidden lg:block")}>
          <StudioSection n="01" color="gold" title={t("studio.stepTemplate")} id="sec-template">
            <TemplatePicker templates={templates} value={template.slug} onChange={chooseTemplate} />
          </StudioSection>

          <StudioSection n="02" color="pink" title={t("studio.stepWords")} id="sec-words">
            <WordsSection form={form} onText={setText} occasion={template.occasionType} errors={errors} authed={status === "authed"} onNeedAuth={() => setAuthOpen(true)} />
          </StudioSection>

          <StudioSection n="03" color="teal" title={t("studio.stepPhotos")} id="sec-photos">
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

          <StudioSection n="04" color="leaf" title={t("studio.stepDetails")} id="sec-details">
            <DetailsSection
              form={form}
              errors={errors}
              onField={(k, v) => {
                setField(k, v);
                if (k === "name") setErrors((e) => ({ ...e, name: undefined }));
              }}
            />
          </StudioSection>

          <StudioSection n="05" color="gold-deep" title={t("studio.stepStyle")} id="sec-style">
            <StyleSection form={form} onField={setField} layout={template.layoutConfig} backdropsEnabled={!!cfg?.ai.backdrops} />
          </StudioSection>

          {/* submit */}
          <section id="sec-submit" className="plate scroll-mt-28 p-5 sm:p-7">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  setErrors((x) => ({ ...x, consent: undefined }));
                }}
                className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer appearance-none rounded-lg border-[3px] border-ink bg-white checked:bg-teal checked:[background-image:url(&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path d='M4.5 10.5l3.4 3.4 7.6-8' fill='none' stroke='%231b1147' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'/></svg>&quot;)]"
                aria-invalid={errors.consent ? true : undefined}
              />
              <span className="text-[0.95rem] leading-snug">{t("studio.consent")}</span>
            </label>
            {errors.consent ? (
              <p role="alert" className="mt-2 pl-8 text-sm font-semibold text-red-deep">
                {errors.consent}
              </p>
            ) : null}

            <button type="button" onClick={submit} disabled={!!busy || photosBusy} className="btn btn-gold btn-lg mt-5 w-full">
              {busy || photosBusy ? <Spinner /> : <Sparkles size={20} strokeWidth={2.4} />}
              {uploadingLabel ?? (photosBusy ? t("studio.preparing") : status === "authed" ? t("studio.generate") : status === "anon" ? t("studio.signInToGenerate") : t("studio.generate"))}
            </button>
            {status === "authed" && user ? <p className="mt-3 text-center text-[0.85rem] font-bold text-ink-3">{user.name}</p> : null}
          </section>
        </div>

        {/* ───────── right: live preview ───────── */}
        <div className={cn("min-w-0 lg:sticky lg:top-28 lg:self-start", tab === "edit" && "hidden lg:block")}>
          <PreviewPanel resolved={resolved} layout={template.layoutConfig} form={form} onPalette={(id) => setField("palette", id)} placeholders={photos.length === 0} />
        </div>
      </div>

      {/* mobile: edit / preview switch */}
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
          pendingSubmit.current = false;
          setAuthOpen(false);
        }}
        onSuccess={() => setAuthOpen(false)}
      />
    </div>
  );
}
