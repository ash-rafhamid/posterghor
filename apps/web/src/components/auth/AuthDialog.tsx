"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/primitives";
import { useT } from "@/i18n";
import { AuthForm, type AuthMode } from "./AuthForm";

/** Sign in without leaving the page — the studio keeps every field and photo exactly as they were. */
export function AuthDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const t = useT();
  const [mode, setMode] = useState<AuthMode>("login");
  return (
    <Dialog open={open} onClose={onClose} title={mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}>
      <p className="-mt-1 mb-5 text-[0.95rem] text-ink-2">{t("studio.signInPrompt")}</p>
      <AuthForm mode={mode} onModeChange={setMode} onSuccess={onSuccess} showDemoHint />
    </Dialog>
  );
}
