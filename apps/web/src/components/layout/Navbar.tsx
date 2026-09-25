"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { History, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { Awning } from "@/components/ui/ornaments";
import { useLang, useT } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={cn("relative px-1 py-2 font-display text-[1.05rem] font-bold transition-colors hover:text-gold", active ? "text-gold" : "text-white")}>
      {children}
      {active ? <motion.span layoutId="nav-diamond" aria-hidden className="absolute -bottom-0.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-2 border-ink bg-gold" /> : null}
    </Link>
  );
}

/** Two-way switch: বাংলা | EN */
export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label="Language" className={cn("inline-flex overflow-hidden rounded-full border-[3px] border-ink bg-white p-0.5 text-sm font-extrabold", className)}>
      {(["bn", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={cn("rounded-full px-3 py-1 font-display transition-colors", lang === l ? "bg-ink text-white" : "text-ink hover:bg-butter")}
        >
          {l === "bn" ? "বাংলা" : "EN"}
        </button>
      ))}
    </div>
  );
}

function UserMenu() {
  const { user, logout, isAdmin } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  const initial = (user.name.trim()[0] ?? "?").toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border-[3px] border-ink bg-white py-0.5 pl-0.5 pr-3.5 text-ink transition-transform hover:-translate-y-0.5 hover:rotate-[-1deg]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-pink font-display text-base font-extrabold">{initial}</span>
        <span className="max-w-[9rem] truncate font-display text-sm font-bold">{user.name}</span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="plate absolute right-0 top-[calc(100%+12px)] z-50 w-64 !rounded-2xl"
          >
            <div className="border-b-[3px] border-ink/10 px-4 py-3">
              <p className="truncate font-display text-base font-extrabold">{user.name}</p>
              <p className="mt-0.5 truncate text-[0.82rem] text-ink-3">{user.email ?? user.phone}</p>
            </div>
            <div className="p-1.5 text-[0.95rem] font-bold">
              <Link role="menuitem" href="/history" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-butter">
                <History size={18} strokeWidth={2.6} /> {t("nav.history")}
              </Link>
              {isAdmin ? (
                <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-butter">
                  <ShieldCheck size={18} strokeWidth={2.6} /> {t("nav.admin")}
                </Link>
              ) : null}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-red-deep hover:bg-blush"
              >
                <LogOut size={18} strokeWidth={2.6} /> {t("nav.signOut")}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  const t = useT();
  const { status, isAdmin } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [path]);

  const links = (
    <>
      <NavLink href="/templates">{t("nav.templates")}</NavLink>
      <NavLink href="/create">{t("nav.create")}</NavLink>
      <NavLink href="/bulk">{t("nav.bulk")}</NavLink>
      {status === "authed" ? <NavLink href="/history">{t("nav.history")}</NavLink> : null}
      {isAdmin ? <NavLink href="/admin">{t("nav.admin")}</NavLink> : null}
    </>
  );

  return (
    <>
      {/* the shop-front awning (scrolls away) */}
      <div aria-hidden className="relative z-[41] -mb-[3px]">
        <Awning className="hidden sm:block" height={46} stripe={44} />
        <Awning className="sm:hidden" height={36} stripe={32} />
      </div>

      <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-blue/92 backdrop-blur-md">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <div className="mx-auto flex h-[4.6rem] max-w-7xl items-center justify-between gap-6 px-4 pt-1 sm:px-6">
          <div className="flex items-center gap-10">
            <Logo />
            <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
              {links}
            </nav>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <LangToggle />
            {status === "authed" ? (
              <UserMenu />
            ) : status === "anon" ? (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  {t("nav.signIn")}
                </Link>
                <Link href="/register" className="btn btn-gold btn-sm">
                  {t("nav.getStarted")}
                </Link>
              </>
            ) : (
              <span className="h-9 w-28 animate-pulse rounded-full bg-white/20" />
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LangToggle />
            <button type="button" aria-label={t("nav.menu")} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="btn btn-white btn-sm !px-2.5">
              {open ? <X size={20} strokeWidth={2.8} /> : <Menu size={20} strokeWidth={2.8} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open ? (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t-[3px] border-ink bg-blue md:hidden">
              <div className="flex flex-col gap-1 px-5 py-4 text-lg [&_a]:py-2.5">
                {links}
                <div className="mt-3 flex gap-3">
                  {status === "authed" ? (
                    <UserMenu />
                  ) : (
                    <>
                      <Link href="/login" className="btn btn-ghost btn-sm flex-1">
                        {t("nav.signIn")}
                      </Link>
                      <Link href="/register" className="btn btn-gold btn-sm flex-1">
                        {t("nav.getStarted")}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
}
