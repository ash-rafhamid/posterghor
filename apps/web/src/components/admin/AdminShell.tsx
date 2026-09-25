"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, LayoutDashboard, LayoutGrid, LockKeyhole, ScrollText, ShieldAlert, Users } from "lucide-react";
import { EmptyState, Spinner } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/templates", label: "Templates", icon: LayoutGrid },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/logs", label: "AI & render logs", icon: ScrollText },
] as const;

/** Staff area chrome — sidebar on desktop, tab strip on mobile. Gated on the admin role. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { status, isAdmin } = useAuth();
  const path = usePathname();

  if (status === "loading") {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size={44} />
      </div>
    );
  }
  if (status === "anon") {
    return (
      <EmptyState
        icon={<LockKeyhole size={38} strokeWidth={2.4} />}
        title="Staff area"
        body="Sign in with an admin account to continue."
        action={
          <Link href="/login?next=/admin" className="btn btn-gold btn-lg">
            Sign in
          </Link>
        }
      />
    );
  }
  if (!isAdmin) {
    return <EmptyState icon={<LockKeyhole size={38} strokeWidth={2.4} />} title="Admins only" body="Your account doesn't have access to this area." action={<Link href="/" className="btn btn-white">Back to home</Link>} />;
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[230px_1fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-ink bg-gold text-ink">
            <Activity size={20} strokeWidth={2.8} />
          </span>
          <div>
            <p className="font-display text-[1.3rem] font-extrabold leading-none text-white">Control room</p>
            <p className="mt-1 text-[0.78rem] font-bold uppercase tracking-[0.18em] text-gold">Posterghor admin</p>
          </div>
        </div>
        <nav aria-label="Admin" className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV.map((n) => {
            const active = "exact" in n && n.exact ? path === n.href : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-full border-[3px] px-4 py-2.5 font-display text-[1rem] font-extrabold transition-all",
                  active ? "border-ink bg-gold text-ink" : "border-transparent text-white hover:bg-white/15",
                )}
              >
                <n.icon size={18} strokeWidth={2.6} />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}

export function AdminHeading({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="paint text-[clamp(2rem,3.8vw,3rem)] leading-[1.16]">{title}</h1>
        {sub ? <p className="mt-2 max-w-3xl text-[1.05rem] text-white/85">{sub}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <p className="font-display text-[0.98rem] font-bold text-white/85">
        Page {page} / {pages} · {total} total
      </p>
      <div className="flex gap-2">
        <button type="button" className="btn btn-white btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button type="button" className="btn btn-white btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
