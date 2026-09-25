import Link from "next/link";
import { Wheel } from "@/components/ui/ornaments";
import { cn } from "@/lib/utils";

/** Wordmark: a rickshaw wheel that turns on hover + the Bangla name in painted lettering. */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <Link href="/" aria-label="Posterghor home" className={cn("group inline-flex items-center gap-2.5", className)}>
      <Wheel size={big ? 64 : 48} className="shrink-0 transition-transform duration-[900ms] ease-out group-hover:rotate-[200deg]" />
      <span className="flex flex-col leading-none">
        <span className={cn("paint paint-sm font-extrabold", big ? "text-[2.1rem]" : "text-[1.6rem]")}>পোস্টারঘর</span>
        <span className="mt-1 pl-0.5 font-display text-[0.62rem] font-extrabold uppercase tracking-[0.36em] text-gold">Posterghor</span>
      </span>
    </Link>
  );
}
