import { cn } from "@/lib/utils";

/** Eyebrow tag + painted title (+ optional sub line). `tone` picks the lettering for the background it sits on. */
export function SectionHead({
  eyebrow,
  title,
  sub,
  align = "left",
  tone = "canvas",
  className,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "left" | "center";
  /** canvas: painted white on blue · ink: plain ink on a light/gold section · light: plain white on a dark section */
  tone?: "canvas" | "ink" | "light";
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <span className={cn("tag", tone === "ink" && "!bg-white")}>{eyebrow}</span>
      <h2 className={cn("mt-4 text-[clamp(2.1rem,4.6vw,3.7rem)] leading-[1.14]", tone === "canvas" ? "paint" : tone === "ink" ? "text-ink" : "text-white")}>{title}</h2>
      {sub ? <p className={cn("mt-4 text-[1.12rem] leading-relaxed", tone === "ink" ? "text-ink-2" : "text-white/85")}>{sub}</p> : null}
    </div>
  );
}
