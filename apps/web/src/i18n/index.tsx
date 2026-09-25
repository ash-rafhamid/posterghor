"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toBanglaDigits } from "@poster/shared";
import { DICTS, type Dict, type Lang } from "./dict";

export type { Lang } from "./dict";

type Paths<T> = T extends string
  ? never
  : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}` }[keyof T & string];
export type TKey = Paths<Dict>;

type Vars = Record<string, string | number>;

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: TKey, vars?: Vars) => string;
  /** localised number: ২০২৬ in Bangla, 2026 in English */
  n: (value: number | string) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export const LANG_COOKIE = "pg_lang";

function lookup(dict: Dict, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as object)) cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      document.documentElement.lang = l;
    } catch {
      /* cookies blocked — the choice just won't persist */
    }
  }, []);

  const value = useMemo<LangCtx>(() => {
    const dict = DICTS[lang];
    const fallback = DICTS.en;
    return {
      lang,
      setLang,
      toggle: () => setLang(lang === "bn" ? "en" : "bn"),
      t: (key, vars) => {
        let s = lookup(dict, key) ?? lookup(fallback, key) ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(lang === "bn" && typeof v === "number" ? toBanglaDigits(v) : v));
        return s;
      },
      n: (v) => (lang === "bn" ? toBanglaDigits(v) : String(v)),
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used inside <LangProvider>");
  return c;
}

export const useT = () => useLang().t;
