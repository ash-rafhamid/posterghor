"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Vine, Wheel } from "./ornaments";

/** A wheel that turns: tiny (for buttons) it is a simple spoked ring, large it is the full painted wheel. */
export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  if (size >= 30) return <Wheel size={size} className={cn("animate-spin [animation-duration:1.6s]", className)} />;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" className={cn("animate-spin [animation-duration:0.9s]", className)} fill="none" stroke="currentColor" strokeLinecap="round">
      <circle cx="12" cy="12" r="9.5" strokeWidth="3" />
      <path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Label + control + hint / error. Children should carry `id={fieldId}` (use the render-prop). */
export function Field({
  label,
  hint,
  error,
  optionalLabel,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const descId = `${id}-d`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-center justify-between gap-2 font-display text-[1rem] font-extrabold text-ink">
        <span>{label}</span>
        {optionalLabel ? <span className="rounded-full bg-mist px-2.5 py-0.5 font-body text-[0.72rem] font-bold text-ink-3">{optionalLabel}</span> : null}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? descId : undefined })}
      {error ? (
        <p id={descId} role="alert" className="text-[0.92rem] font-bold text-red-deep">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="text-[0.85rem] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Modal dialog: Esc / backdrop closes, scroll is locked, focus moves in and is restored on close. */
export function Dialog({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("input, button, textarea, select, a[href]")?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])')];
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          <div className="fixed inset-0 bg-blue-night/75 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 30, scale: 0.94, rotate: -1.2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className={cn("plate relative my-auto w-full max-w-md", className)}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-5">
              <h2 id={titleId} className="text-[1.9rem]">
                {title}
              </h2>
              <button type="button" onClick={onClose} aria-label="Close" className="btn btn-white btn-sm !h-10 !w-10 shrink-0 !rounded-full !p-0">
                <X size={19} strokeWidth={3} />
              </button>
            </div>
            <Vine className="mx-auto mt-1 max-w-[calc(100%-3rem)] opacity-90" height={26} tile={120} />
            <div className="px-6 pb-6 pt-3">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode }>; className?: string; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex flex-wrap gap-1 rounded-full border-[3px] border-ink bg-white p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-full px-4 py-1.5 font-display text-[0.95rem] font-extrabold transition-colors", value === o.value ? "bg-ink text-white" : "text-ink hover:bg-butter")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-8 w-14 shrink-0 rounded-full border-[3px] border-ink transition-colors", checked ? "bg-teal" : "bg-mist")}
    >
      <span className={cn("absolute top-[1px] h-[1.35rem] w-[1.35rem] rounded-full border-[3px] border-ink bg-white transition-all", checked ? "left-[calc(100%-1.45rem)]" : "left-[1px]")} />
    </button>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border-[3px] border-ink bg-gold text-ink [transform:rotate(-5deg)] shadow-[0_0_0_5px_rgba(255,255,255,0.9)]">{icon}</div>
      <h3 className="paint mt-8 text-[clamp(2rem,4vw,2.8rem)]">{title}</h3>
      {body ? <p className="mt-4 text-[1.1rem] text-white/85">{body}</p> : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
