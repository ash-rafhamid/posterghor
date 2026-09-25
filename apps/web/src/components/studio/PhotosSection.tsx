"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Scissors, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { MAX_PHOTOS } from "@poster/shared";
import { useT } from "@/i18n";
import { ACCEPTED_TYPES, isAcceptedImage, preparePhoto, samplePortrait } from "@/lib/image";
import { cn, uid } from "@/lib/utils";
import type { StudioPhoto } from "./state";

export function PhotosSection({
  photos,
  onChange,
  maxMb,
  error,
  onProcessing,
}: {
  photos: StudioPhoto[];
  onChange: (next: StudioPhoto[] | ((prev: StudioPhoto[]) => StudioPhoto[])) => void;
  maxMb: number;
  error?: string;
  /** true while a picked photo is still being decoded / resized — the parent holds its Generate button until it's false */
  onProcessing?: (processing: boolean) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(0);
  const replaceIndex = useRef<number | null>(null);

  useEffect(() => {
    onProcessing?.(busy > 0);
  }, [busy, onProcessing]);
  // never leave the parent stuck in "processing" if this section unmounts mid-way
  useEffect(() => () => onProcessing?.(false), [onProcessing]);

  async function addFiles(files: File[]) {
    const room = MAX_PHOTOS - photos.length;
    const list = replaceIndex.current !== null ? files.slice(0, 1) : files.slice(0, Math.max(0, room));
    if (!list.length && replaceIndex.current === null) return;
    for (const file of list) {
      if (!isAcceptedImage(file)) {
        toast.error(t("studio.notImage"));
        continue;
      }
      if (file.size > maxMb * 1024 * 1024 * 2.2) {
        toast.error(t("studio.tooBig", { mb: maxMb }));
        continue;
      }
      setBusy((b) => b + 1);
      try {
        const p = await preparePhoto(file);
        const photo: StudioPhoto = { id: uid(), blob: p.blob, previewUrl: p.previewUrl, hasAlpha: p.hasAlpha, lowRes: p.lowRes, type: p.type, caption: "", subcaption: "", state: "ready" };
        const at = replaceIndex.current;
        onChange((prev) => {
          if (at !== null && prev[at]) {
            URL.revokeObjectURL(prev[at]!.previewUrl);
            const copy = [...prev];
            copy[at] = { ...photo, caption: prev[at]!.caption, subcaption: prev[at]!.subcaption };
            return copy;
          }
          return prev.length >= MAX_PHOTOS ? prev : [...prev, photo];
        });
        if (p.lowRes) toast.warning(t("studio.lowRes"));
      } catch {
        toast.error(t("studio.notImage"));
      } finally {
        setBusy((b) => b - 1);
      }
    }
    replaceIndex.current = null;
  }

  async function addSamples() {
    setBusy((b) => b + 1);
    try {
      const names = [
        ["আলহাজ্ব করিম উদ্দিন", "সভাপতি, জেলা কমিটি"],
        ["সাবিনা ইয়াসমিন", "সাধারণ সম্পাদক"],
        ["মোঃ রফিকুল ইসলাম", "সাংগঠনিক সম্পাদক"],
      ] as const;
      const made = await Promise.all([0, 1, 2].map((i) => samplePortrait(i)));
      const list: StudioPhoto[] = made.map((p, i) => ({ id: uid(), blob: p.blob, previewUrl: p.previewUrl, hasAlpha: false, lowRes: false, type: p.type, caption: names[i]![0], subcaption: names[i]![1], state: "ready" }));
      onChange((prev) => {
        prev.forEach((x) => URL.revokeObjectURL(x.previewUrl));
        return list;
      });
    } catch {
      toast.error(t("common.genericError"));
    } finally {
      setBusy((b) => b - 1);
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    replaceIndex.current = null; // a dropped file is always "add", even if an earlier "replace" dialog was cancelled
    void addFiles([...e.dataTransfer.files]);
  };

  const patch = (id: string, p: Partial<StudioPhoto>) => onChange((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const remove = (id: string) =>
    onChange((prev) => {
      const gone = prev.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  const move = (i: number, dir: -1 | 1) =>
    onChange((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null);

  return (
    <div onDragOver={(e) => (e.preventDefault(), setDrag(true))} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple={replaceIndex.current === null}
        className="sr-only"
        onChange={(e) => {
          void addFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <p className="mb-4 text-[0.95rem] text-ink-3">{t("studio.photosHint")}</p>

      <div className={cn("grid grid-cols-3 gap-3 rounded-3xl transition-colors", drag && "bg-butter outline-[3px] outline-dashed outline-ink")}>
        {slots.map((p, i) =>
          p ? (
            <div key={p.id} className="flex flex-col gap-2">
              <div className="group relative overflow-hidden rounded-2xl border-[3px] border-ink bg-[repeating-conic-gradient(#dfe3ff_0%_25%,#f4f5ff_0%_50%)] [background-size:16px_16px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt="" className={cn("aspect-[3/4] w-full", p.hasAlpha ? "object-contain" : "object-cover")} />
                {i === 0 ? <span className="tag absolute left-1.5 top-1.5 !py-0 !text-[0.68rem]">Main</span> : null}
                <button type="button" onClick={() => remove(p.id)} aria-label={t("studio.remove")} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full border-[2.5px] border-ink bg-white hover:bg-rose hover:text-white">
                  <X size={15} strokeWidth={2.6} />
                </button>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-6 text-white">
                  <span className="flex gap-1">
                    {p.hasAlpha ? (
                      <span title="Cut-out" className="grid h-6 w-6 place-items-center rounded bg-leaf">
                        <Scissors size={13} />
                      </span>
                    ) : null}
                    {p.lowRes ? (
                      <span title={t("studio.lowRes")} className="grid h-6 w-6 place-items-center rounded bg-gold text-ink">
                        <TriangleAlert size={13} />
                      </span>
                    ) : null}
                  </span>
                  <span className="flex gap-1">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move left" className="grid h-6 w-6 place-items-center rounded bg-white/25 backdrop-blur hover:bg-white/45 disabled:opacity-30">
                      <ArrowLeft size={13} />
                    </button>
                    <button type="button" disabled={i === photos.length - 1} onClick={() => move(i, 1)} aria-label="Move right" className="grid h-6 w-6 place-items-center rounded bg-white/25 backdrop-blur hover:bg-white/45 disabled:opacity-30">
                      <ArrowRight size={13} />
                    </button>
                  </span>
                </div>
              </div>
              <input className="field !rounded-xl !border-[2.5px] !px-2.5 !py-1.5 !text-[0.88rem] font-body" value={p.caption} maxLength={60} placeholder={t("studio.captionName")} aria-label={t("studio.captionName")} onChange={(e) => patch(p.id, { caption: e.target.value })} />
              <input className="field !rounded-xl !border-[2.5px] !px-2.5 !py-1.5 !text-[0.84rem] font-body" value={p.subcaption} maxLength={70} placeholder={t("studio.captionSub")} aria-label={t("studio.captionSub")} onChange={(e) => patch(p.id, { subcaption: e.target.value })} />
              <button
                type="button"
                onClick={() => {
                  replaceIndex.current = i;
                  inputRef.current?.click();
                }}
                className="text-left text-[0.75rem] font-bold text-ink-3 underline decoration-dotted underline-offset-2 hover:text-rose"
              >
                {t("studio.replace")}
              </button>
            </div>
          ) : (
            <div key={`empty-${i}`}>
              <button
                type="button"
                disabled={i !== photos.length}
                onClick={() => {
                  replaceIndex.current = null;
                  inputRef.current?.click();
                }}
                className={cn(
                  "group grid aspect-[3/4] w-full place-items-center rounded-2xl border-[3px] border-dashed border-ink/40 bg-mist p-2 text-center transition-all",
                  i === photos.length ? "hover:border-ink hover:bg-butter" : "cursor-default opacity-45",
                )}
              >
                {busy > 0 && i === photos.length ? (
                  <span className="text-sm font-bold text-ink-3">{t("common.loading")}</span>
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-ink-2">
                    <span className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-ink bg-gold transition-transform group-hover:scale-110 group-hover:-rotate-6">
                      <ImagePlus size={19} />
                    </span>
                    <span className="text-[0.78rem] font-bold leading-tight">{i === 0 ? t("studio.dropHere") : t("studio.addPhoto")}</span>
                  </span>
                )}
              </button>
            </div>
          ),
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-deep">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-xs text-ink-3">{t("studio.firstIsMain")}</p>
      )}
      {photos.length === 0 ? (
        <button type="button" onClick={addSamples} className="mt-3 text-left text-sm font-bold text-ink-2 underline decoration-dotted decoration-2 underline-offset-4 hover:text-rose">
          {t("studio.useSamples")}
        </button>
      ) : null}
    </div>
  );
}
