"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { parseIdentifier } from "@poster/shared";
import { Field, Spinner } from "@/components/ui/primitives";
import { useT } from "@/i18n";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type AuthMode = "login" | "register";

interface Errors {
  name?: string;
  identifier?: string;
  password?: string;
  form?: string;
}

/** Sign-in / sign-up form, shared by the pages and the studio's inline dialog. */
export function AuthForm({ mode, onModeChange, onSuccess, showDemoHint = false }: { mode: AuthMode; onModeChange?: (m: AuthMode) => void; onSuccess: () => void; showDemoHint?: boolean }) {
  const t = useT();
  const { login, register } = useAuth();
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (mode === "register" && name.trim().length < 2) next.name = t("auth.shortName");
    if (!parseIdentifier(identifier)) next.identifier = t("auth.invalidId");
    if (password.length < (mode === "register" ? 8 : 1)) next.password = t("auth.shortPass");
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const user = mode === "login" ? await login(identifier.trim(), password) : await register(name.trim(), identifier.trim(), password);
      toast.success(t("auth.welcome", { name: user.name.split(" ")[0] ?? user.name }));
      onSuccess();
    } catch (err) {
      const message = err instanceof ApiError ? (err.status === 0 ? t("common.networkError") : err.message) : t("common.genericError");
      setErrors({ form: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {mode === "register" ? (
        <Field label={t("auth.fullName")} error={errors.name}>
          {(p) => <input {...p} className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.fullNamePh")} autoComplete="name" />}
        </Field>
      ) : null}
      <Field label={t("auth.identifier")} error={errors.identifier}>
        {(p) => <input {...p} className="field" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={t("auth.identifierPh")} autoComplete="username" inputMode="email" />}
      </Field>
      <Field label={t("auth.password")} hint={mode === "register" ? t("auth.passwordHint") : undefined} error={errors.password}>
        {(p) => (
          <div className="relative">
            <input {...p} className="field !pr-12" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
              {show ? <EyeOff size={20} strokeWidth={2.4} /> : <Eye size={20} strokeWidth={2.4} />}
            </button>
          </div>
        )}
      </Field>

      {errors.form ? (
        <p role="alert" className="rounded-2xl border-[3px] border-red-deep bg-blush px-4 py-3 text-[0.95rem] font-bold text-red-deep">
          {errors.form}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className="btn btn-gold btn-lg mt-1 w-full">
        {busy ? <Spinner /> : null}
        {mode === "login" ? t("auth.signIn") : t("auth.signUp")}
        {!busy ? <ArrowRight size={21} strokeWidth={3} /> : null}
      </button>

      {onModeChange ? (
        <p className="text-center text-[0.95rem] text-ink-2">
          {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
          <button type="button" onClick={() => onModeChange(mode === "login" ? "register" : "login")} className="font-bold text-rose underline decoration-[3px] underline-offset-4 hover:text-ink">
            {mode === "login" ? t("auth.goRegister") : t("auth.goLogin")}
          </button>
        </p>
      ) : null}

      {showDemoHint && mode === "login" ? <p className="rounded-xl bg-butter px-3 py-2 text-center text-[0.85rem] font-semibold text-ink-2">{t("auth.demoHint")}</p> : null}
    </form>
  );
}
