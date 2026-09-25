import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Header of an app page: eyebrow tag, painted title, sub line, optional action on the right. */
export function PageHead({ tag, title, sub, action, className }: { tag?: ReactNode; title: string; sub?: string; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-6", className)}>
      <div className="max-w-3xl">
        {tag ? <span className="tag !bg-white">{tag}</span> : null}
        <h1 className="paint mt-4 text-[clamp(2.4rem,5vw,4rem)] leading-[1.14]">{title}</h1>
        {sub ? <p className="mt-3 text-[1.15rem] leading-relaxed text-white/85">{sub}</p> : null}
      </div>
      {action}
    </header>
  );
}
