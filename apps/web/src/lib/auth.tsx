"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ApiUser } from "@poster/shared";
import { ApiError, api, authEvents, tokenStore } from "./api";

type Status = "loading" | "authed" | "anon";

interface AuthCtx {
  user: ApiUser | null;
  status: Status;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<ApiUser>;
  register: (name: string, identifier: string, password: string) => Promise<ApiUser>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const qc = useQueryClient();

  // restore the session
  useEffect(() => {
    let cancelled = false;
    if (!tokenStore.get()) {
      setStatus("anon");
      return;
    }
    api.auth
      .me()
      .then(({ user }) => {
        if (cancelled) return;
        setUser(user);
        setStatus("authed");
      })
      .catch((e) => {
        if (cancelled) return;
        // only drop the token when the server actually rejected it — a flaky network shouldn't sign anyone out
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) tokenStore.clear();
        setStatus("anon");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // any 401 elsewhere → back to anonymous
  useEffect(() => {
    const events = authEvents;
    if (!events) return;
    const onUnauthorized = () => {
      tokenStore.clear();
      setUser(null);
      setStatus("anon");
      qc.clear();
    };
    events.addEventListener("unauthorized", onUnauthorized);
    return () => events.removeEventListener("unauthorized", onUnauthorized);
  }, [qc]);

  const finish = useCallback(
    (res: { user: ApiUser; token: string }) => {
      tokenStore.set(res.token);
      qc.clear();
      setUser(res.user);
      setStatus("authed");
      return res.user;
    },
    [qc],
  );

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      status,
      isAdmin: user?.role === "admin",
      login: async (identifier, password) => finish(await api.auth.login({ identifier, password })),
      register: async (name, identifier, password) => finish(await api.auth.register({ name, identifier, password })),
      logout: () => {
        tokenStore.clear();
        qc.clear();
        setUser(null);
        setStatus("anon");
      },
    }),
    [user, status, finish, qc],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}
