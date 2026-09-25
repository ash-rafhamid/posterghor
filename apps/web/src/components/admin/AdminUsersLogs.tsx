"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/primitives";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDateTime } from "@/lib/utils";
import { AdminHeading, Pager } from "./AdminShell";

export function AdminUsers() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ["admin", "users", q, page], queryFn: () => api.admin.users({ q: q || undefined, page, pageSize: 15 }), placeholderData: (p) => p });
  const update = useMutation({
    mutationFn: (v: { id: string; blocked?: boolean; role?: "user" | "admin" }) => api.admin.updateUser(v.id, { blocked: v.blocked, role: v.role }),
    onSuccess: () => (toast.success("User updated"), void qc.invalidateQueries({ queryKey: ["admin", "users"] })),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <>
      <AdminHeading title="Users" sub="Suspend abusive accounts or promote a colleague to admin." />
      <div className="relative mb-6 w-full sm:w-80">
        <Search size={17} strokeWidth={2.6} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
        <input className="field !py-2 !pl-10" placeholder="Search name, email or phone…" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
      </div>
      {list.isPending ? (
        <div className="grid min-h-[30vh] place-items-center"><Spinner size={40} /></div>
      ) : (
        <div className="plate plate-flush overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b-[3px] border-ink bg-mist">
              <tr className="text-[0.78rem] font-extrabold uppercase tracking-wider text-ink-3">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Posters</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Access</th>
              </tr>
            </thead>
            <tbody>
              {list.data?.items.map((u) => (
                <tr key={u.id} className="border-b border-ink/10 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-bold">{u.name}</p>
                    <p className="text-xs text-ink-3">{u.email ?? u.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("chip !cursor-default !py-0.5 !text-[0.7rem]", u.role === "admin" && "!bg-ink !text-white")}>{u.role}</span>
                    {u.blocked ? <span className="tag ml-2 !bg-red !text-white">suspended</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{u.posterCount}</td>
                  <td className="px-4 py-3 text-ink-3">{formatDateTime(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn btn-white btn-sm" disabled={u.id === me?.id || update.isPending} onClick={() => update.mutate({ id: u.id, role: u.role === "admin" ? "user" : "admin" })}>
                        <ShieldCheck size={14} strokeWidth={2.8} /> {u.role === "admin" ? "Demote" : "Make admin"}
                      </button>
                      <button type="button" className={cn("btn btn-sm", u.blocked ? "btn-teal" : "btn-white !text-red-deep")} disabled={u.id === me?.id || update.isPending} onClick={() => update.mutate({ id: u.id, blocked: !u.blocked })}>
                        {u.blocked ? <Check size={14} /> : <Ban size={14} />} {u.blocked ? "Restore" : "Suspend"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data ? <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} /> : null}
    </>
  );
}

export function AdminLogs() {
  const [page, setPage] = useState(1);
  const [failedOnly, setFailedOnly] = useState(false);
  const list = useQuery({ queryKey: ["admin", "logs", page, failedOnly], queryFn: () => api.admin.logs({ page, pageSize: 20, failedOnly: failedOnly || undefined }), placeholderData: (p) => p, refetchInterval: 10_000 });

  return (
    <>
      <AdminHeading
        title="AI & render logs"
        sub="One row per generation attempt: Gemini prompt, tokens, latency and whether it was served from cache."
        actions={
          <button type="button" className="chip" data-active={failedOnly} aria-pressed={failedOnly} onClick={() => (setFailedOnly((v) => !v), setPage(1))}>
            Failures only
          </button>
        }
      />
      {list.isPending ? (
        <div className="grid min-h-[30vh] place-items-center"><Spinner size={40} /></div>
      ) : (
        <div className="plate plate-flush overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b-[3px] border-ink bg-mist">
              <tr className="text-[0.78rem] font-extrabold uppercase tracking-wider text-ink-3">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Poster</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Tokens</th>
                <th className="px-4 py-3 text-right">Gemini</th>
                <th className="px-4 py-3 text-right">Render</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {list.data?.items.map((l) => (
                <tr key={l.id} className="border-b border-ink/10 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-3">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.posterId.slice(-8)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("chip !cursor-default !py-0.5 !text-[0.7rem]", l.source === "gemini" && "!bg-teal !text-ink")}>{l.source}</span>
                    {l.cacheHit ? <span className="tag ml-1.5 !bg-aqua !text-[0.7rem]">cache</span> : null}
                    {l.model ? <p className="mt-1 max-w-[12rem] truncate font-mono text-[0.65rem] text-ink-3">{l.model}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{l.tokensUsed || "n/a"}</td>
                  <td className="px-4 py-3 text-right font-mono">{l.latencyMs ? `${(l.latencyMs / 1000).toFixed(1)}s` : "n/a"}</td>
                  <td className="px-4 py-3 text-right font-mono">{l.renderMs ? `${(l.renderMs / 1000).toFixed(1)}s` : "n/a"}</td>
                  <td className="px-4 py-3">
                    {l.success ? <span className="tag !bg-teal">ok</span> : <span className="tag !bg-red !text-white">failed</span>}
                    {l.error ? <p className="mt-1 max-w-xs text-xs text-red-deep">{l.error}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data ? <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} /> : null}
    </>
  );
}
