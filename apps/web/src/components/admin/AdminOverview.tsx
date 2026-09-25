"use client";

import { useQuery } from "@tanstack/react-query";
import { Bot, Database, Flag, Gauge, ImageIcon, LayoutGrid, Timer, TriangleAlert, Users, Zap } from "lucide-react";
import { OCCASIONS } from "@poster/shared";
import { Spinner } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AdminHeading } from "./AdminShell";

function Stat({ label, value, icon: Icon, tone, hint }: { label: string; value: string | number; icon: React.ComponentType<{ size?: number }>; tone: string; hint?: string }) {
  return (
    <div className="plate flex items-center gap-4 p-4">
      <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-full border-[3px] border-ink", tone)}>
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-3xl font-extrabold leading-none">{value}</p>
        <p className="mt-1.5 truncate text-[0.86rem] font-bold text-ink-3">{label}</p>
        {hint ? <p className="mt-0.5 truncate text-[0.7rem] text-ink-3">{hint}</p> : null}
      </div>
    </div>
  );
}

export function AdminOverview() {
  const q = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api.admin.stats(), refetchInterval: 15_000 });
  const s = q.data;

  if (q.isPending) return <div className="grid min-h-[40vh] place-items-center"><Spinner size={44} /></div>;
  if (!s) return <p className="tag !bg-blush !text-red-deep">Couldn&apos;t load stats.</p>;

  const maxDaily = Math.max(1, ...s.daily.map((d) => d.count));
  const maxOcc = Math.max(1, ...s.byOccasion.map((o) => o.count));
  const successRate = s.completed + s.failed ? Math.round((s.completed / (s.completed + s.failed)) * 100) : 100;
  const cachePct = s.cacheHits + s.geminiCalls ? Math.round((s.cacheHits / (s.cacheHits + s.geminiCalls)) * 100) : 0;

  return (
    <>
      <AdminHeading title="Overview" sub="Usage, AI cost and render health at a glance. Refreshes every 15 seconds." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Posters today" value={s.postersToday} icon={ImageIcon} tone="bg-gold" hint={`${s.posters} all-time`} />
        <Stat label="Registered users" value={s.users} icon={Users} tone="bg-leaf" />
        <Stat label="Active templates" value={s.activeTemplates} icon={LayoutGrid} tone="bg-pink" />
        <Stat label="Completed" value={s.completed} icon={Gauge} tone="bg-leaf" hint={`${successRate}% success rate`} />
        <Stat label="Failed" value={s.failed} icon={TriangleAlert} tone="bg-mist" />
        <Stat label="Awaiting review" value={s.flagged} icon={Flag} tone="bg-gold" hint="Flagged by moderation" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="plate p-5 sm:p-6">
          <h2 className="text-[1.5rem]">Posters per day</h2>
          <p className="mt-0.5 text-[0.9rem] font-semibold text-ink-3">Last 14 days</p>
          <div className="mt-6 flex h-48 gap-2" role="img" aria-label="Posters created per day">
            {s.daily.map((d) => (
              <div key={d.date} className="group flex h-full flex-1 flex-col items-center gap-1.5">
                <span className="font-mono text-[0.65rem] font-bold opacity-0 transition-opacity group-hover:opacity-100">{d.count}</span>
                <div className="relative w-full flex-1">
                  <div className="absolute inset-x-0 bottom-0 rounded-t-lg border-[2.5px] border-ink bg-pink transition-all group-hover:bg-gold" style={{ height: `${d.count ? Math.max(6, (d.count / maxDaily) * 100) : 3}%` }} />
                </div>
                <span className="font-mono text-[0.58rem] text-ink-3">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="plate p-5 sm:p-6">
          <h2 className="text-[1.5rem]">By occasion</h2>
          <ul className="mt-5 space-y-3.5">
            {OCCASIONS.map((o) => {
              const c = s.byOccasion.find((x) => x.occasion === o.id)?.count ?? 0;
              return (
                <li key={o.id}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{o.en}</span>
                    <span className="font-mono">{c}</span>
                  </div>
                  <div className="mt-1.5 h-4 overflow-hidden rounded-full border-[2.5px] border-ink bg-mist">
                    <div className="h-full bg-teal transition-all" style={{ width: `${(c / maxOcc) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="plate mt-6 p-5 sm:p-6">
        <h2 className="flex items-center gap-2.5 text-[1.5rem]">
          <Bot size={22} /> AI cost &amp; render performance
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Gemini calls" value={s.geminiCalls} icon={Zap} tone="bg-gold" hint="Cache misses only" />
          <Stat label="Served from cache" value={s.cacheHits} icon={Database} tone="bg-leaf" hint={`${cachePct}% of generations`} />
          <Stat label="Tokens used" value={s.totalTokens.toLocaleString()} icon={Bot} tone="bg-mist" />
          <Stat label="Avg render" value={`${(s.avgRenderMs / 1000).toFixed(1)}s`} icon={Timer} tone="bg-pink" hint={s.avgLatencyMs ? `Gemini avg ${(s.avgLatencyMs / 1000).toFixed(1)}s` : "Gemini not used yet"} />
        </div>
      </section>
    </>
  );
}
